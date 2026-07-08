import { stringify } from "yaml";
import type { McpdsDocument } from "@mcpds/spec";

const TOP_LEVEL_ORDER = [
  "mcpds",
  "server",
  "instructions",
  "capabilities",
  "requiresClientCapabilities",
  "transports",
  "auth",
  "packaging",
  "tools",
  "resources",
  "resourceTemplates",
  "prompts",
  "meta"
];

const SERVER_ORDER = [
  "name",
  "title",
  "description",
  "version",
  "websiteUrl",
  "repository",
  "icons",
  "authors",
  "license",
  "meta"
];

export interface SerializeSpecOptions {
  originalSource?: string;
  mutated?: boolean;
}

export function serializeSpec(spec: McpdsDocument, options: SerializeSpecOptions = {}): string {
  if (!options.mutated && options.originalSource !== undefined) {
    return options.originalSource;
  }

  return stringify(orderObject(spec), {
    indent: 2,
    lineWidth: 0,
    sortMapEntries: false
  });
}

function orderObject(value: unknown, parentKey?: string): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => orderObject(item));
  }

  if (!isPlainObject(value)) {
    return value;
  }

  const source = value as Record<string, unknown>;
  const ordered: Record<string, unknown> = {};
  const preferred = parentKey === undefined ? TOP_LEVEL_ORDER : parentKey === "server" ? SERVER_ORDER : [];

  for (const key of preferred) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      ordered[key] = orderObject(source[key], key);
    }
  }

  for (const key of Object.keys(source)) {
    if (!Object.prototype.hasOwnProperty.call(ordered, key) && !key.startsWith("x-")) {
      ordered[key] = orderObject(source[key], key);
    }
  }

  for (const key of Object.keys(source).filter((candidate) => candidate.startsWith("x-")).sort()) {
    ordered[key] = orderObject(source[key], key);
  }

  return ordered;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype;
}