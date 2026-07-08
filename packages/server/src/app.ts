import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { createWorkspace } from "./fs/workspace.js";
import { createSpecsRouter } from "./routes/specs.js";
import { createValidateRouter } from "./routes/validate.js";
import { createSettingsRouter } from "./routes/settings.js";
import { createSettingsController, type AppSettings } from "./settings.js";

export interface CreateAppOptions {
  defaultWorkspaceDir?: string;
  settings?: AppSettings;
}

export function createApp(workspaceDir: string, options: CreateAppOptions = {}): express.Express {
  const app = express();
  const workspace = createWorkspace(workspaceDir);
  const defaultWorkspaceDir = resolve(options.defaultWorkspaceDir ?? workspaceDir);
  const initialSettings: AppSettings = options.settings ?? { workspaceDir: workspace.rootDir, syncEnabled: false };
  const settings = createSettingsController(workspace, defaultWorkspaceDir, initialSettings);

  app.use(express.json({ limit: "5mb" }));
  app.use(express.text({ type: ["text/*", "application/yaml"], limit: "5mb" }));

  app.get("/api/health", (_request, response) => {
    response.json({ ok: true, workspace: workspace.rootDir });
  });

  app.get("/api/events", (request, response) => settings.handleEvents(request, response));
  app.use("/api/settings", createSettingsRouter(settings));
  app.use("/api/specs", createSpecsRouter(workspace));
  app.use("/api/validate", createValidateRouter());

  const webDir = resolve(dirname(fileURLToPath(import.meta.url)), "web");
  if (existsSync(webDir)) {
    app.use(express.static(webDir));
    app.get("*", (request, response, next) => {
      if (request.path.startsWith("/api/")) {
        next();
        return;
      }
      response.sendFile(resolve(webDir, "index.html"));
    });
  }

  app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
    const statusCode = typeof error === "object" && error && "statusCode" in error ? Number(error.statusCode) : 500;
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    response.status(Number.isFinite(statusCode) ? statusCode : 500).json({ error: message });
  });

  return app;
}