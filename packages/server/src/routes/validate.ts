import type { Router } from "express";
import express from "express";
import { parseSpec, validateSpec } from "@mcp-designer/core";

export function createValidateRouter(): Router {
  const router = express.Router();

  router.post("/", (request, response) => {
    if (typeof request.body?.source === "string") {
      const parsed = parseSpec(request.body.source);
      response.json(parsed.spec ? validateSpec(parsed.spec) : { valid: false, issues: parsed.diagnostics });
      return;
    }

    response.json(validateSpec(request.body?.spec ?? request.body));
  });

  return router;
}