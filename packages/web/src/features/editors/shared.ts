import type { McpdsDocument, ValidationIssue } from "@mcp-designer/core";

export type SpecUpdater = (updater: (draft: McpdsDocument) => McpdsDocument) => void;

export interface EditorProps {
  spec: McpdsDocument;
  updateSpec: SpecUpdater;
  issues: ValidationIssue[];
}

export function issueFor(issues: ValidationIssue[], path: string): string | undefined {
  return issues.find((issue) => issue.path === path)?.message;
}

export function issueIsWarning(issues: ValidationIssue[], path: string): boolean {
  const found = issues.find((issue) => issue.path === path);
  return found?.severity === "warning";
}
