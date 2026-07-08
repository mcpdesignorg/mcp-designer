import { watch } from "node:fs";
import type { FSWatcher } from "node:fs";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import type { Request, Response } from "express";
import { isAllowedSpecFile, type WorkspaceContext } from "./fs/workspace.js";

export interface AppSettings {
  workspaceDir: string;
  syncEnabled: boolean;
}

export interface PublicSettings extends AppSettings {
  defaultWorkspaceDir: string;
}

const CONFIG_DIR = join(homedir(), ".mcp-designer");
const CONFIG_FILE = join(CONFIG_DIR, "settings.json");

function configFile(): string {
  return process.env.MCP_DESIGNER_CONFIG?.trim() || CONFIG_FILE;
}

export function settingsFilePath(): string {
  return configFile();
}

export async function loadPersistedSettings(defaultWorkspaceDir: string): Promise<AppSettings> {
  const fallback: AppSettings = { workspaceDir: resolve(defaultWorkspaceDir), syncEnabled: false };

  try {
    const raw = await readFile(configFile(), "utf8");
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    const workspaceDir = typeof parsed.workspaceDir === "string" && parsed.workspaceDir.trim()
      ? resolve(parsed.workspaceDir.trim())
      : fallback.workspaceDir;

    if (!(await isDirectory(workspaceDir))) {
      return fallback;
    }

    return { workspaceDir, syncEnabled: parsed.syncEnabled === true };
  } catch {
    return fallback;
  }
}

async function persistSettings(settings: AppSettings): Promise<void> {
  const target = configFile();
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
}

async function isDirectory(target: string): Promise<boolean> {
  try {
    return (await stat(target)).isDirectory();
  } catch {
    return false;
  }
}

export interface SettingsUpdate {
  workspaceDir?: unknown;
  syncEnabled?: unknown;
}

export interface SettingsController {
  getSettings(): PublicSettings;
  updateSettings(update: SettingsUpdate): Promise<PublicSettings>;
  handleEvents(request: Request, response: Response): void;
  close(): void;
}

export function createSettingsController(
  workspace: WorkspaceContext,
  defaultWorkspaceDir: string,
  initial: AppSettings
): SettingsController {
  const resolvedDefault = resolve(defaultWorkspaceDir);
  let syncEnabled = initial.syncEnabled;
  workspace.rootDir = initial.workspaceDir;

  const clients = new Set<Response>();
  let watcher: FSWatcher | undefined;
  let debounce: ReturnType<typeof setTimeout> | undefined;

  function getSettings(): PublicSettings {
    return { workspaceDir: workspace.rootDir, syncEnabled, defaultWorkspaceDir: resolvedDefault };
  }

  function broadcast(): void {
    const payload = `event: change\ndata: ${JSON.stringify({ at: Date.now() })}\n\n`;
    for (const client of clients) {
      client.write(payload);
    }
  }

  function stopWatcher(): void {
    if (debounce) {
      clearTimeout(debounce);
      debounce = undefined;
    }
    watcher?.close();
    watcher = undefined;
  }

  function startWatcher(): void {
    stopWatcher();
    try {
      watcher = watch(workspace.rootDir, { persistent: false }, (_event, filename) => {
        const name = filename ? filename.toString() : undefined;
        if (name && !isAllowedSpecFile(name)) {
          return;
        }
        if (debounce) {
          clearTimeout(debounce);
        }
        debounce = setTimeout(broadcast, 150);
      });
    } catch {
      watcher = undefined;
    }
  }

  function syncWatcher(): void {
    if (syncEnabled && clients.size > 0) {
      startWatcher();
    } else {
      stopWatcher();
    }
  }

  async function updateSettings(update: SettingsUpdate): Promise<PublicSettings> {
    if (typeof update.workspaceDir === "string" && update.workspaceDir.trim()) {
      const nextDir = resolve(update.workspaceDir.trim());
      if (!(await isDirectory(nextDir))) {
        throw Object.assign(new Error("Workspace path must point to an existing directory."), { statusCode: 400 });
      }
      workspace.rootDir = nextDir;
    }

    if (typeof update.syncEnabled === "boolean") {
      syncEnabled = update.syncEnabled;
    }

    syncWatcher();
    await persistSettings({ workspaceDir: workspace.rootDir, syncEnabled });
    return getSettings();
  }

  function handleEvents(request: Request, response: Response): void {
    response.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive"
    });
    response.write("retry: 5000\n\n");
    response.write("event: ready\ndata: {}\n\n");

    clients.add(response);
    syncWatcher();

    const heartbeat = setInterval(() => response.write(": ping\n\n"), 25000);
    request.on("close", () => {
      clearInterval(heartbeat);
      clients.delete(response);
      syncWatcher();
    });
  }

  function close(): void {
    stopWatcher();
    for (const client of clients) {
      client.end();
    }
    clients.clear();
  }

  return { getSettings, updateSettings, handleEvents, close };
}
