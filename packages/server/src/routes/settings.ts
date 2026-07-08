import { spawn } from "node:child_process";
import type { Router } from "express";
import express from "express";
import type { SettingsController } from "../settings.js";

export function createSettingsRouter(controller: SettingsController): Router {
  const router = express.Router();

  router.get("/", (_request, response) => {
    response.json(controller.getSettings());
  });

  router.post("/open-workspace", async (_request, response, next) => {
    try {
      await openDirectory(controller.getSettings().workspaceDir);
      response.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  router.put("/", async (request, response, next) => {
    try {
      const settings = await controller.updateSettings({
        workspaceDir: request.body?.workspaceDir,
        syncEnabled: request.body?.syncEnabled
      });
      response.json(settings);
    } catch (error) {
      next(error);
    }
  });

  return router;
}

function openDirectory(path: string): Promise<void> {
  const command = process.platform === "darwin" ? "open" : process.platform === "win32" ? "explorer" : "xdg-open";

  return new Promise((resolve, reject) => {
    const child = spawn(command, [path], { detached: true, stdio: "ignore" });
    child.once("error", reject);
    child.once("spawn", () => {
      child.unref();
      resolve();
    });
  });
}
