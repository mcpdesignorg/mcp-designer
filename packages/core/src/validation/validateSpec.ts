import Ajv2020Module from "ajv/dist/2020.js";
import addFormatsModule from "ajv-formats";
import { mcpdsSchema } from "@mcpds/spec";
import type { JsonSchemaObject, McpdsDocument, ValidationIssue, ValidationResult, ValidationSection } from "@mcpds/spec";

type AjvError = {
  instancePath: string;
  keyword: string;
  message?: string;
  params?: { missingProperty?: string };
};

type AjvValidator = ((data: unknown) => boolean) & { errors?: AjvError[] | null };

const Ajv2020 = Ajv2020Module as unknown as new (options: Record<string, unknown>) => {
  compile: (schema: unknown) => AjvValidator;
  errors: unknown[] | null | undefined;
  errorsText: (errors?: unknown[] | null, options?: Record<string, unknown>) => string;
  validateSchema: (schema: unknown) => boolean;
};
const addFormats = addFormatsModule as unknown as (ajv: InstanceType<typeof Ajv2020>) => void;

const allowedTransports = new Set(["stdio", "streamable-http", "sse"]);
const allowedTaskSupport = new Set(["forbidden", "optional", "required"]);
const allowedResourceAudience = new Set(["user", "assistant"]);
const noWhitespaceName = /^\S+$/

const schemaAjv = new Ajv2020({ allErrors: true, strict: false });
addFormats(schemaAjv);
const validateStructure = schemaAjv.compile(mcpdsSchema);

const jsonSchemaAjv = new Ajv2020({ allErrors: true, strict: false });
addFormats(jsonSchemaAjv);

export function validateSpec(spec: unknown): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (!validateStructure(spec)) {
    const structuralErrors = validateStructure.errors ?? [];
    const minLengthErrorPaths = new Set(structuralErrors.filter((error) => error.keyword === "minLength").map((error) => error.instancePath));

    for (const error of structuralErrors) {
      if (shouldSuppressStructuralIssue(error, minLengthErrorPaths)) {
        continue;
      }

      const mappedIssue = mapStructuralIssue(error);
      if (mappedIssue) {
        issues.push(mappedIssue);
        continue;
      }

      issues.push({
        path: error.instancePath || "/",
        section: sectionForPath(error.instancePath),
        severity: "error",
        code: `schema-${error.keyword}`,
        message: humanizeAjvError(error.message ?? "Invalid value.", error.instancePath)
      });
    }
  }

  if (!spec || typeof spec !== "object" || Array.isArray(spec)) {
    return finalize(issues);
  }

  const document = spec as McpdsDocument;
  addCrossFieldIssues(document, issues);
  return finalize(issues);
}

function addCrossFieldIssues(spec: McpdsDocument, issues: ValidationIssue[]): void {
  if (!Array.isArray(spec.transports) || spec.transports.length === 0) {
    issues.push(issue("/transports", "transports", "required-transport", "At least one transport is required."));
  }

  if (spec.server?.name && !noWhitespaceName.test(spec.server.name)) {
    issues.push(issue("/server/name", "server", "invalid-server-name", "Server name must not contain whitespace."));
  }

  spec.transports?.forEach((transport, index) => {
    if (!allowedTransports.has(transport.type)) {
      issues.push(issue(`/transports/${index}/type`, "transports", "invalid-transport-type", "Transport type must be stdio, streamable-http, or sse."));
    }
    if ((transport.type === "streamable-http" || transport.type === "sse") && !transport.url && !hasIssue(issues, `/transports/${index}/url`, "missing-transport-url")) {
      issues.push(issue(`/transports/${index}/url`, "transports", "missing-transport-url", "streamable-http and sse transports require a url."));
    }
  });

  checkUnique(spec.tools, "tools", issues);
  checkUnique(spec.resources, "resources", issues);
  checkUnique(spec.resourceTemplates, "resourceTemplates", issues);
  checkUnique(spec.prompts, "prompts", issues);

  spec.resources?.forEach((resource, index) => {
    checkResourceAnnotations(resource.annotations, `/resources/${index}/annotations`, issues);
  });

  spec.resourceTemplates?.forEach((template, index) => {
    checkResourceAnnotations(template.annotations, `/resourceTemplates/${index}/annotations`, issues);
    checkResourceTemplateParameters(template.uriTemplate, template.parameters, index, issues);
  });

  spec.tools?.forEach((tool, index) => {
    if (tool.inputSchema !== undefined) {
      checkToolSchema(tool.inputSchema, `/tools/${index}/inputSchema`, issues);
    }
    if (tool.outputSchema) {
      checkToolSchema(tool.outputSchema, `/tools/${index}/outputSchema`, issues);
    }

    if (typeof tool.description !== "string" || tool.description.trim() === "") {
      issues.push({
        path: `/tools/${index}/description`,
        section: "tools",
        severity: "warning",
        code: "missing-tool-description",
        message: "Tool has no description. A description is strongly recommended as prompt context for the model."
      });
    }

    const taskSupport = tool.execution?.taskSupport;
    if (taskSupport !== undefined && !allowedTaskSupport.has(taskSupport)) {
      issues.push(issue(`/tools/${index}/execution/taskSupport`, "tools", "invalid-task-support", "execution.taskSupport must be forbidden, optional, or required."));
    }
    if (taskSupport && taskSupport !== "forbidden" && !spec.capabilities?.tasks) {
      issues.push({
        path: `/tools/${index}/execution/taskSupport`,
        section: "tools",
        severity: "warning",
        code: "task-support-without-capability",
        message: "Tool opts into task execution but capabilities.tasks is not declared."
      });
    }
  });

  spec.packaging?.packages?.forEach((pkg, index) => {
    if (pkg.registryType === "mcpb" && !pkg.fileSha256 && !hasIssue(issues, `/packaging/packages/${index}/fileSha256`, "missing-mcpb-sha")) {
      issues.push(issue(`/packaging/packages/${index}/fileSha256`, "packaging", "missing-mcpb-sha", "mcpb packages require fileSha256."));
    }
  });

  for (const refPath of collectRefs(spec)) {
    if (!resolvePointer(spec, refPath.ref)) {
      issues.push(issue(refPath.path, sectionForPath(refPath.path), "unresolved-ref", `Reference ${refPath.ref} does not resolve within this document.`));
    }
  }
}

function checkUnique(items: { name?: unknown }[] | undefined, section: ValidationSection, issues: ValidationIssue[]): void {
  const seen = new Map<string, number>();
  items?.forEach((item, index) => {
    if (typeof item.name !== "string") {
      return;
    }

    const firstIndex = seen.get(item.name);
    if (firstIndex !== undefined) {
      issues.push(issue(`/${section}/${index}/name`, section, "duplicate-name", `Name must be unique; ${item.name} is already used at index ${firstIndex}.`));
    } else {
      seen.set(item.name, index);
    }
  });
}

function checkToolSchema(schema: JsonSchemaObject | undefined, path: string, issues: ValidationIssue[]): void {
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) {
    issues.push(issue(path, "tools", "invalid-tool-schema", "Tool schema must be an object."));
    return;
  }

  if (schema.type !== "object") {
    issues.push(issue(`${path}/type`, "tools", "tool-schema-not-object", "Tool input and output schemas must have top-level type: object."));
  }

  // JSON Schema 2020-12 is the default dialect; a different dialect may be selected
  // via an explicit $schema. Only meta-validate against 2020-12 when no other
  // dialect was requested, so legitimate draft-07 (etc.) schemas are not rejected.
  if (!usesNonDefaultDialect(schema) && !jsonSchemaAjv.validateSchema(schema)) {
    const message = jsonSchemaAjv.errorsText(jsonSchemaAjv.errors, { separator: "; " });
    issues.push(issue(path, "tools", "invalid-json-schema", message || "Schema is not a valid JSON Schema 2020-12 document."));
  }
}

function checkResourceAnnotations(annotations: { audience?: string[] } | undefined, path: string, issues: ValidationIssue[]): void {
  annotations?.audience?.forEach((audience, index) => {
    if (!allowedResourceAudience.has(audience)) {
      issues.push(issue(`${path}/audience/${index}`, sectionForPath(path), "invalid-resource-audience", "Resource audience must be user or assistant."));
    }
  });
}

function checkResourceTemplateParameters(uriTemplate: string | undefined, parameters: { name?: string }[] | undefined, templateIndex: number, issues: ValidationIssue[]): void {
  if (typeof uriTemplate !== "string" || !parameters?.length) {
    return;
  }

  const templateVariables = extractUriTemplateVariables(uriTemplate);
  const parameterNames = new Set<string>();

  parameters.forEach((parameter, parameterIndex) => {
    if (!parameter.name) {
      return;
    }

    parameterNames.add(parameter.name);
    if (!templateVariables.has(parameter.name)) {
      issues.push(warning(`/resourceTemplates/${templateIndex}/parameters/${parameterIndex}/name`, "resourceTemplates", "template-parameter-not-in-uri", `Parameter '${parameter.name}' is not used in uriTemplate.`));
    }
  });

  for (const variable of templateVariables) {
    if (!parameterNames.has(variable)) {
      issues.push(warning(`/resourceTemplates/${templateIndex}/uriTemplate`, "resourceTemplates", "missing-template-parameter", `uriTemplate variable '${variable}' has no matching parameter.`));
    }
  }
}

function extractUriTemplateVariables(uriTemplate: string): Set<string> {
  const variables = new Set<string>();
  const expressions = uriTemplate.matchAll(/\{([^{}]+)\}/g);

  for (const expression of expressions) {
    const expressionBody = expression[1] ?? "";
    const variableList = /^[+#./;?&]/.test(expressionBody) ? expressionBody.slice(1) : expressionBody;
    for (const variableSpec of variableList.split(",")) {
      const variableName = variableSpec.replace(/[\*:].*$/, "").trim();
      if (variableName) {
        variables.add(variableName);
      }
    }
  }

  return variables;
}

function usesNonDefaultDialect(schema: JsonSchemaObject): boolean {
  return typeof schema.$schema === "string" && !schema.$schema.includes("2020-12");
}

function collectRefs(value: unknown, path = ""): Array<{ path: string; ref: string }> {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => collectRefs(item, `${path}/${index}`));
  }

  if (!value || typeof value !== "object") {
    return [];
  }

  const record = value as Record<string, unknown>;
  const refs: Array<{ path: string; ref: string }> = [];
  if (typeof record.$ref === "string" && record.$ref.startsWith("#")) {
    refs.push({ path: `${path}/$ref`, ref: record.$ref });
  }

  for (const [key, child] of Object.entries(record)) {
    refs.push(...collectRefs(child, `${path}/${escapePointer(key)}`));
  }

  return refs;
}

function resolvePointer(root: unknown, ref: string): unknown {
  if (ref === "#") {
    return root;
  }

  if (!ref.startsWith("#/")) {
    return undefined;
  }

  return ref
    .slice(2)
    .split("/")
    .map((part) => part.replace(/~1/g, "/").replace(/~0/g, "~"))
    .reduce<unknown>((current, part) => {
      if (!current || typeof current !== "object") {
        return undefined;
      }

      return (current as Record<string, unknown>)[part];
    }, root);
}

function escapePointer(value: string): string {
  return value.replace(/~/g, "~0").replace(/\//g, "~1");
}

function finalize(issues: ValidationIssue[]): ValidationResult {
  const sortedIssues = issues.sort((left, right) => left.path.localeCompare(right.path) || left.code.localeCompare(right.code));
  return {
    valid: sortedIssues.every((validationIssue) => validationIssue.severity !== "error"),
    issues: sortedIssues
  };
}

function mapStructuralIssue(error: AjvError): ValidationIssue | undefined {
  if (error.keyword !== "required") {
    return undefined;
  }

  if (error.instancePath.match(/^\/transports\/\d+$/) && error.params?.missingProperty === "url") {
    return issue(`${error.instancePath}/url`, "transports", "missing-transport-url", "streamable-http and sse transports require a url.");
  }

  if (error.instancePath.match(/^\/packaging\/packages\/\d+$/) && error.params?.missingProperty === "fileSha256") {
    return issue(`${error.instancePath}/fileSha256`, "packaging", "missing-mcpb-sha", "mcpb packages require fileSha256.");
  }

  if (error.instancePath === "/server/repository" && error.params?.missingProperty) {
    const prop = error.params.missingProperty;
    return issue(`/server/repository/${prop}`, "server", `missing-repository-${prop}`, `repository.${prop} is required when a repository is set.`);
  }

  // Generic fallback: AJV reports `required` errors on the *parent* object, but
  // the editors highlight the missing field itself. Re-target the issue at the
  // specific property path so every required field lights up in the UI.
  if (error.params?.missingProperty) {
    const prop = error.params.missingProperty;
    const path = `${error.instancePath}/${prop}`;
    return issue(path, sectionForPath(path), "schema-required", `Missing required property '${prop}'.`);
  }

  return undefined;
}

function shouldSuppressStructuralIssue(error: AjvError, minLengthErrorPaths: Set<string>): boolean {
  return error.keyword === "if" || (error.keyword === "format" && minLengthErrorPaths.has(error.instancePath));
}

function hasIssue(issues: ValidationIssue[], path: string, code: string): boolean {
  return issues.some((validationIssue) => validationIssue.path === path && validationIssue.code === code);
}

function issue(path: string, section: ValidationSection, code: string, message: string): ValidationIssue {
  return { path, section, severity: "error", code, message };
}

function warning(path: string, section: ValidationSection, code: string, message: string): ValidationIssue {
  return { path, section, severity: "warning", code, message };
}

function sectionForPath(path = ""): ValidationSection {
  const topLevel = path.split("/").filter(Boolean)[0];
  const sections = new Set<ValidationSection>([
    "server",
    "capabilities",
    "transports",
    "auth",
    "tools",
    "resources",
    "resourceTemplates",
    "prompts",
    "packaging"
  ]);

  return sections.has(topLevel as ValidationSection) ? (topLevel as ValidationSection) : "root";
}

function humanizeAjvError(message: string, path: string): string {
  return path ? `${path}: ${message}` : message;
}