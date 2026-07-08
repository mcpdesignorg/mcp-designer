# @mcp-designer/core

Browser-safe core library of MCP Designer: **YAML parse/serialize, AJV
validation, and templates**. It serves as the shared foundation for both `server`
and `web`. MCPDS types and the canonical `mcpdsSchema` are owned by the
standalone [`@mcpds/spec`](../../../spec) package and re-exported
from here (see [`docs/analysis/update.md`](../../docs/analysis/update.md)).

> **The schema and MCPDS types live in `@mcpds/spec`** (TypeScript source of
> truth). This package re-exports `mcpdsSchema` and the types; do not redefine
> them here. The generated `mcpds-0.9.schema.json` lives in the spec repo.

## Environment constraints

The package **must stay browser-safe** — no `node:*` imports and no `createRequire`,
because it is also bundled into the web app (Vite SPA). File handling belongs in
`server`, not here.

## Public API

Everything below is imported from the package root (`@mcp-designer/core`).

### Schema

| Export | Type | Description |
|---|---|---|
| `mcpdsSchema` | JSON Schema (2020-12) object | The canonical MCPDS schema, re-exported from `@mcpds/spec`. **Source of truth lives in the spec repo.** Drives AJV validation. |

```ts
import { mcpdsSchema } from "@mcp-designer/core";
```

### Validation

| Export | Signature | Description |
|---|---|---|
| `validateSpec` | `(spec: unknown) => ValidationResult` | Structural AJV validation + cross-field rules (duplicate names, unresolved `$ref`, required transports/URL, mcpb SHA…). |

```ts
import { validateSpec } from "@mcp-designer/core";

const result = validateSpec(doc);
// result.valid: boolean
// result.issues: ValidationIssue[]  (severity "error" | "warning")
```

Validation is the **single source of structural truth** — consumers should
display it, not bypass it. Saving an invalid document is allowed (with a warning),
but the validity state must be visible.

### YAML parse / serialize

| Export | Signature | Description |
|---|---|---|
| `parseSpec` | `(source: string) => ParsedSpecDocument` | Parses YAML into `McpdsDocument`. Returns `{ source, spec?, diagnostics }`. |
| `serializeSpec` | `(spec: McpdsDocument, options?: SerializeSpecOptions) => string` | Serializes to canonical 2-space YAML. A no-op save (`mutated: false` + `originalSource`) returns the original bytes. |

```ts
import { parseSpec, serializeSpec } from "@mcp-designer/core";
```

The YAML round-trip preserves unknown keys, `x-*` extensions and `meta`.

### Templates

| Export | Signature | Description |
|---|---|---|
| `createBlankSpec` | `() => McpdsDocument` | A minimal valid MCPDS document as a starting point. |

### Versioning

| Export | Type | Description |
|---|---|---|
| `SUPPORTED_MCPDS_VERSIONS` | `readonly ["0.9"]` | Supported MCPDS versions. |
| `isSupportedVersion` | `(version: unknown) => version is SupportedMcpdsVersion` | Type guard for the `mcpds` field. |
| `SupportedMcpdsVersion` | type | Union of supported versions. |

### MCPDS types

Re-export of all MCPDS types from `@mcpds/spec` (`export type *`). Main ones:

- `McpdsDocument` — the root document (`mcpds`, `server`, `transports`, `tools`, …).
- `ServerInfo`, `RepositoryInfo`, `IconInfo`, `AuthorInfo` — server identity.
- `Capabilities`, `Transport`, `AuthConfig`, `Packaging` — sections.
- `ToolDefinition`, `ResourceDefinition`, `ResourceTemplateDefinition`, `PromptDefinition` — the capability contract.
- `ValidationResult`, `ValidationIssue`, `ValidationSection` — validation output.
- `ParsedSpecDocument`, `SerializeSpecOptions` — I/O types.
- `ExtensibleObject`, `ExtensionKey`, `JsonValue` — extensibility (`meta` + `x-*`).

```ts
import type { McpdsDocument, ValidationResult } from "@mcp-designer/core";
```

## Commands

```bash
npm run build       # tsc → dist (.js + .d.ts)
npm run typecheck   # tsc --noEmit
npm test            # vitest run
```

The MCPDS schema (`mcpdsSchema`) and its JSON artifact are owned by the
[`@mcpds/spec`](../../../spec) package; regenerate the JSON there
with `npm run gen:schema`.
