# MCP Designer

Design MCP servers visually, save the contract as clean `*.mcp.yaml`, and keep
tools, resources, prompts, auth, transports, and packaging in one source of
truth.

[![npm](https://img.shields.io/npm/v/mcp-designer)](https://www.npmjs.com/package/mcp-designer)
[![license](https://img.shields.io/npm/l/mcp-designer)](https://github.com/mcpdesignorg/mcp-designer/blob/main/LICENSE)
[![node](https://img.shields.io/node/v/mcp-designer)](https://www.npmjs.com/package/mcp-designer)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/mcpdesignorg/mcp-designer)

```bash
npx mcp-designer [workspace-dir]
```

MCP Designer starts a local web editor, opens it in your browser, and writes
MCP Design Specification files to the selected workspace directory. The server
binds to `127.0.0.1` and does not require an account, cloud service, or telemetry.

![MCP Designer in action](https://raw.githubusercontent.com/mcpdesignorg/mcp-designer/main/docs/demo.gif)

## Why use it?

MCP server definitions tend to spread across implementation code, docs, client
configuration, and hand-written JSON schemas. MCP Designer gives you a visual
contract-first workflow instead:

- Design tools, resources, prompts, transports, auth, metadata, and packaging.
- Build JSON Schema inputs and outputs without hand-writing every field.
- Validate live against the MCP Design Specification.
- Save human-readable `*.mcp.yaml` files that can drive docs, scaffolding, and implementation.
- Work locally with files on disk.

## Install

Run without installing globally:

```bash
npx mcp-designer [workspace-dir]
```

Or install the CLI:

```bash
npm install -g mcp-designer
mcp-designer [workspace-dir]
```

`[workspace-dir]` defaults to the current directory.

## CLI options

MCP Designer is intentionally small: the main argument is the workspace folder.
Runtime behavior can be adjusted with environment variables:

| Variable | Description |
|---|---|
| `MCP_DESIGNER_PORT` | Use a specific local port instead of a random available port. |
| `MCP_DESIGNER_NO_OPEN=1` | Start the local server without opening the browser automatically. |

## What gets installed?

This npm package contains the MCP Designer CLI, local Express server, bundled web
editor, and runtime validation support. It uses the published
[`@mcpds/spec`](https://www.npmjs.com/package/@mcpds/spec) package for MCPDS
types and schema validation.

## Requirements

- Node.js 20+
- npm 10+

## Links

- Source and development docs: https://github.com/mcpdesignorg/mcp-designer
- MCPDS package: https://www.npmjs.com/package/@mcpds/spec
- License: https://github.com/mcpdesignorg/mcp-designer/blob/main/LICENSE