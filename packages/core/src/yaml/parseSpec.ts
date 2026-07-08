import { parse } from "yaml";
import type { McpdsDocument, ParsedSpecDocument, ValidationIssue } from "@mcpds/spec";

export function parseSpec(source: string): ParsedSpecDocument {
  try {
    const parsed = parse(source, { prettyErrors: true }) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { source, diagnostics: [yamlIssue("Document must be a YAML mapping.")] };
    }

    return {
      source,
      spec: parsed as McpdsDocument,
      diagnostics: []
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid YAML.";
    return { source, diagnostics: [yamlIssue(message)] };
  }
}

function yamlIssue(message: string): ValidationIssue {
  return {
    path: "/",
    section: "yaml",
    severity: "error",
    code: "invalid-yaml",
    message
  };
}