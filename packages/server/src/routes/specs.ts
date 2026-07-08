import type { Router } from "express";
import express from "express";
import { isSupportedVersion, parseSpec, serializeSpec, validateSpec } from "@mcp-designer/core";
import type { WorkspaceContext } from "../fs/workspace.js";
import { createSpec, deleteSpec, duplicateSpec, listSpecs, readSpec, renameSpec, writeSpec } from "../fs/workspace.js";

export function createSpecsRouter(workspace: WorkspaceContext): Router {
  const router = express.Router();

  router.get("/", async (_request, response, next) => {
    try {
      response.json({ specs: await listSpecs(workspace) });
    } catch (error) {
      next(error);
    }
  });

  router.post("/", async (request, response, next) => {
    try {
      const fileName = String(request.body?.fileName ?? "mcp.yaml");
      const source = typeof request.body?.source === "string" ? request.body.source : undefined;

      if (source !== undefined) {
        const parsed = parseSpec(source);
        const version = parsed.spec?.mcpds;
        if (!isSupportedVersion(version)) {
          response.status(400).json({
            error: `Unsupported MCPDS version: "${version ?? "unknown"}". This application supports: ${["0.9"].join(", ")}.`
          });
          return;
        }
      }

      const content = await createSpec(workspace, fileName, source);
      const parsed = parseSpec(content);
      const validation = parsed.spec ? validateSpec(parsed.spec) : { valid: false, issues: parsed.diagnostics };

      response.status(201).json({ file: fileName, source: content, validation });
    } catch (error) {
      next(error);
    }
  });

  router.get("/:file", async (request, response, next) => {
    try {
      response.type("text/yaml").send(await readSpec(workspace, request.params.file));
    } catch (error) {
      next(error);
    }
  });

  router.put("/:file", async (request, response, next) => {
    try {
      const source = resolveWritableSource(request.body);
      await writeSpec(workspace, request.params.file, source);
      const parsed = parseSpec(source);
      const validation = parsed.spec ? validateSpec(parsed.spec) : { valid: false, issues: parsed.diagnostics };

      response.json({ file: request.params.file, validation });
    } catch (error) {
      next(error);
    }
  });

  router.patch("/:file", async (request, response, next) => {
    try {
      const nextFileName = String(request.body?.fileName ?? "");
      await renameSpec(workspace, request.params.file, nextFileName);
      response.json({ file: nextFileName });
    } catch (error) {
      next(error);
    }
  });

  router.post("/:file/duplicate", async (request, response, next) => {
    try {
      const nextFileName = String(request.body?.fileName ?? "");
      const source = await duplicateSpec(workspace, request.params.file, nextFileName);
      response.status(201).json({ file: nextFileName, source });
    } catch (error) {
      next(error);
    }
  });

  router.delete("/:file", async (request, response, next) => {
    try {
      await deleteSpec(workspace, request.params.file);
      response.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  return router;
}

function resolveWritableSource(body: unknown): string {
  if (typeof body === "string") {
    return body;
  }

  if (!body || typeof body !== "object") {
    throw Object.assign(new Error("Request body must contain source or spec."), { statusCode: 400 });
  }

  const record = body as Record<string, unknown>;
  if (typeof record.source === "string" && !record.spec) {
    return record.source;
  }

  if (record.spec && typeof record.spec === "object") {
    return serializeSpec(record.spec as never, {
      originalSource: typeof record.originalSource === "string" ? record.originalSource : undefined,
      mutated: record.mutated !== false
    });
  }

  throw Object.assign(new Error("Request body must contain source or spec."), { statusCode: 400 });
}