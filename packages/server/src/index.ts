#!/usr/bin/env node
import { spawn } from "node:child_process";
import { realpathSync } from "node:fs";
import { resolve } from "node:path";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { createApp } from "./app.js";
import { loadPersistedSettings, type AppSettings } from "./settings.js";

export interface StartServerOptions {
  defaultWorkspaceDir?: string;
  settings?: AppSettings;
}

export async function startServer(workspaceDir = process.cwd(), preferredPort = 0, options: StartServerOptions = {}): Promise<{ url: string; close: () => Promise<void> }> {
  const app = createApp(resolve(workspaceDir), {
    defaultWorkspaceDir: options.defaultWorkspaceDir ?? workspaceDir,
    settings: options.settings
  });
  const server = createServer(app);

  await new Promise<void>((resolveListen) => {
    server.listen(preferredPort, "127.0.0.1", resolveListen);
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Unable to determine listening address.");
  }

  return {
    url: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolveClose, reject) => server.close((error) => (error ? reject(error) : resolveClose())))
  };
}

if (isCliEntrypoint()) {
  const cliWorkspaceDir = process.argv[2] ? resolve(process.argv[2]) : process.cwd();
  const settings = await loadPersistedSettings(cliWorkspaceDir);
  const preferredPort = Number(process.env.MCP_DESIGNER_PORT ?? 0);
  const { url } = await startServer(settings.workspaceDir, Number.isFinite(preferredPort) ? preferredPort : 0, {
    defaultWorkspaceDir: cliWorkspaceDir,
    settings
  });
  console.log(`MCP Designer running at ${url}`);
  console.log(`Workspace: ${settings.workspaceDir}`);
  const opened = openBrowser(url);
  console.log(opened ? "Opening browser..." : "Browser auto-open disabled by MCP_DESIGNER_NO_OPEN=1.");
}

function isCliEntrypoint(): boolean {
  if (!process.argv[1]) {
    return false;
  }

  return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1]);
}

function openBrowser(url: string): boolean {
  if (process.env.MCP_DESIGNER_NO_OPEN === "1") {
    return false;
  }

  const command = process.platform === "darwin" ? "open" : process.platform === "win32" ? "cmd" : "xdg-open";
  const args = process.platform === "win32" ? ["/c", "start", "", url] : [url];
  const child = spawn(command, args, { stdio: "ignore", detached: true });
  child.on("error", () => {
    console.warn(`Unable to open the browser automatically. Open ${url} manually.`);
  });
  child.unref();
  return true;
}