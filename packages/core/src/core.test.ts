import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createBlankSpec, parseSpec, serializeSpec, validateSpec } from "./index.js";
import type { McpdsDocument } from "@mcpds/spec";

const examplePath = resolve(process.cwd(), "../../spec/example.mcp.yaml");

describe("MCPDS core", () => {
  it("parses and validates the reference fixture", () => {
    const source = readFileSync(examplePath, "utf8");
    const parsed = parseSpec(source);

    expect(parsed.diagnostics).toEqual([]);
    expect(parsed.spec?.server.name).toBe("org.mcpdesign/notes-server");
    expect(validateSpec(parsed.spec).valid).toBe(true);
  });

  it("preserves original bytes for no-op saves", () => {
    const source = readFileSync(examplePath, "utf8");
    const parsed = parseSpec(source);

    expect(serializeSpec(parsed.spec!, { originalSource: source, mutated: false })).toBe(source);
  });

  it("emits canonical YAML after mutation and preserves unknown extension keys", () => {
    const spec = createBlankSpec();
    spec.server.title = "Changed";
    spec["x-designer"] = { preserved: true };

    const output = serializeSpec(spec, { mutated: true });
    const reparsed = parseSpec(output);

    expect(output).toContain('mcpds: "1.0"');
    expect(output).toContain("  title: Changed");
    expect(reparsed.spec?.["x-designer"]).toEqual({ preserved: true });
  });

  it("returns YAML diagnostics for malformed input", () => {
    const parsed = parseSpec("mcpds: [");

    expect(parsed.spec).toBeUndefined();
    expect(parsed.diagnostics[0]?.code).toBe("invalid-yaml");
  });

  it("detects duplicate names, unresolved refs, and mcpb hashes", () => {
    const spec: McpdsDocument = {
      ...createBlankSpec(),
      tools: [
        {
          name: "echo",
          description: "Echo.",
          inputSchema: { type: "object", properties: { note: { $ref: "#/components/schemas/Missing" } } }
        },
        {
          name: "echo",
          description: "Echo again.",
          inputSchema: { type: "string" }
        }
      ],
      packaging: {
        packages: [{ registryType: "mcpb" }]
      }
    };

    const result = validateSpec(spec);
    const codes = result.issues.map((issue) => issue.code);

    expect(codes).toContain("duplicate-name");
    expect(codes).toContain("unresolved-ref");
    expect(codes).toContain("missing-mcpb-sha");
    expect(codes.filter((code) => code === "missing-mcpb-sha")).toHaveLength(1);
    expect(codes).not.toContain("schema-if");
    expect(codes).toContain("tool-schema-not-object");
  });

  it("requires a url for streamable-http and sse transports", () => {
    const spec: McpdsDocument = {
      ...createBlankSpec(),
      transports: [{ type: "streamable-http" }, { type: "sse" }, { type: "stdio" }]
    };

    const result = validateSpec(spec);
    const urlIssues = result.issues.filter((issue) => issue.code === "missing-transport-url");
    const codes = result.issues.map((issue) => issue.code);

    expect(urlIssues.map((issue) => issue.path)).toEqual(["/transports/0/url", "/transports/1/url"]);
    expect(codes).not.toContain("schema-if");
    expect(result.valid).toBe(false);
  });

  it("validates resource audiences and warns about resource template parameters", () => {
    const spec: McpdsDocument = {
      ...createBlankSpec(),
      resources: [
        {
          uri: "note://index",
          name: "note-index",
          annotations: { audience: ["model"] }
        }
      ],
      resourceTemplates: [
        {
          uriTemplate: "note://{id}/{section}",
          name: "note-by-id",
          parameters: [{ name: "noteId" }, { name: "id" }]
        }
      ]
    };

    const result = validateSpec(spec);
    const issuesByCode = new Map(result.issues.map((validationIssue) => [validationIssue.code, validationIssue]));

    expect(issuesByCode.get("invalid-resource-audience")?.path).toBe("/resources/0/annotations/audience/0");
    expect(issuesByCode.get("template-parameter-not-in-uri")?.path).toBe("/resourceTemplates/0/parameters/0/name");
    expect(issuesByCode.get("missing-template-parameter")?.path).toBe("/resourceTemplates/0/uriTemplate");
    expect(issuesByCode.get("template-parameter-not-in-uri")?.severity).toBe("warning");
    expect(issuesByCode.get("missing-template-parameter")?.severity).toBe("warning");
    expect(result.valid).toBe(false);
  });

  it("warns (not errors) when a tool has no description", () => {
    const spec: McpdsDocument = {
      ...createBlankSpec(),
      tools: [
        {
          name: "no_desc",
          inputSchema: { type: "object", properties: {} }
        }
      ]
    };

    const result = validateSpec(spec);
    const descIssue = result.issues.find((issue) => issue.code === "missing-tool-description");

    expect(descIssue?.severity).toBe("warning");
    expect(result.valid).toBe(true);
  });

  it("requires tool input schemas", () => {
    const spec = createBlankSpec();
    delete (spec.tools![0] as Partial<NonNullable<McpdsDocument["tools"]>[number]>).inputSchema;

    const result = validateSpec(spec);
    const issue = result.issues.find((validationIssue) => validationIssue.path === "/tools/0/inputSchema");

    expect(issue?.code).toBe("schema-required");
    expect(result.valid).toBe(false);
  });

  it("validates tool output schemas when present", () => {
    const spec = createBlankSpec();
    spec.tools![0].outputSchema = { type: "string" };

    const result = validateSpec(spec);
    const issue = result.issues.find((validationIssue) => validationIssue.path === "/tools/0/outputSchema/type");

    expect(issue?.code).toBe("tool-schema-not-object");
    expect(result.valid).toBe(false);
  });

  it("structurally requires icon.src, repository url/source, and package fields", () => {
    const spec = createBlankSpec();
    spec.server.icons = [{ src: "" }];
    spec.server.repository = { id: "only-id" };
    spec.packaging = { packages: [{ registryType: "npm" }] };

    const result = validateSpec(spec);
    const errorPaths = result.issues.filter((issue) => issue.severity === "error").map((issue) => issue.path);

    expect(errorPaths).toContain("/server/icons/0/src");
    expect(errorPaths).toContain("/server/repository/url");
    expect(errorPaths).toContain("/server/repository/source");
    expect(errorPaths).toContain("/packaging/packages/0/identifier");
    expect(errorPaths).toContain("/packaging/packages/0/transport");
    expect(errorPaths).not.toContain("/packaging/packages/0/version");
    expect(result.valid).toBe(false);
  });

  it("reports a single structural error for an empty icon src", () => {
    const spec = createBlankSpec();
    spec.server.icons = [{ src: "" }];

    const result = validateSpec(spec);
    const srcIssues = result.issues.filter((issue) => issue.path === "/server/icons/0/src");

    expect(srcIssues).toHaveLength(1);
    expect(srcIssues[0]?.code).toBe("schema-minLength");
    expect(result.valid).toBe(false);
  });
});