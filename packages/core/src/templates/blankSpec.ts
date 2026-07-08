import type { McpdsDocument } from "@mcpds/spec";

export function createBlankSpec(): McpdsDocument {
  return {
    mcpds: "1.0",
    server: {
      name: "io.github.example/hello",
      title: "Hello MCP Server",
      description: "Minimal MCP server.",
      version: "0.1.0"
    },
    transports: [{ type: "stdio" }],
    tools: [
      {
        name: "echo",
        title: "Echo",
        description: "Echo a message back to the caller.",
        inputSchema: {
          type: "object",
          properties: {
            message: { type: "string" }
          },
          required: ["message"],
          additionalProperties: false
        }
      }
    ]
  };
}