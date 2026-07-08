import { readdir, readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { createBlankSpec, isSupportedVersion, parseSpec, serializeSpec, validateSpec } from "@mcp-designer/core";

export interface SpecListItem {
  name: string;
  path: string;
  serverId?: string;
  serverTitle?: string;
  specVersion?: string;
  versionSupported: boolean;
  mtime: string;
  valid: boolean;
  errorCount: number;
}

export interface WorkspaceContext {
  rootDir: string;
}

export function createWorkspace(rootDir: string): WorkspaceContext {
  return { rootDir: resolve(rootDir) };
}

export function isAllowedSpecFile(fileName: string): boolean {
  return basename(fileName) === fileName && (fileName === "mcp.yaml" || fileName.endsWith(".mcp.yaml"));
}

export function resolveSpecPath(workspace: WorkspaceContext, fileName: string): string {
  if (!isAllowedSpecFile(fileName)) {
    throw Object.assign(new Error("Only root-level mcp.yaml or *.mcp.yaml files are allowed."), { statusCode: 400 });
  }

  const target = resolve(workspace.rootDir, fileName);
  if (!target.startsWith(`${workspace.rootDir}/`) && target !== workspace.rootDir) {
    throw Object.assign(new Error("Path traversal is not allowed."), { statusCode: 400 });
  }

  return target;
}

export async function listSpecs(workspace: WorkspaceContext): Promise<SpecListItem[]> {
  const entries = await readdir(workspace.rootDir, { withFileTypes: true });
  const specs = entries.filter((entry) => entry.isFile() && isAllowedSpecFile(entry.name));

  return Promise.all(
    specs.map(async (entry) => {
      const filePath = resolveSpecPath(workspace, entry.name);
      const [stats, source] = await Promise.all([stat(filePath), readFile(filePath, "utf8")]);
      const parsed = parseSpec(source);
      const validation = parsed.spec ? validateSpec(parsed.spec) : { valid: false, issues: parsed.diagnostics };

      const specVersion = typeof parsed.spec?.mcpds === "string" ? parsed.spec.mcpds : undefined;
      return {
        name: entry.name,
        path: entry.name,
        serverId: parsed.spec?.server?.name,
        serverTitle: parsed.spec?.server?.title,
        specVersion,
        versionSupported: isSupportedVersion(specVersion),
        mtime: stats.mtime.toISOString(),
        valid: validation.valid,
        errorCount: validation.issues.length
      };
    })
  );
}

export async function readSpec(workspace: WorkspaceContext, fileName: string): Promise<string> {
  return readFile(resolveSpecPath(workspace, fileName), "utf8");
}

export async function writeSpec(workspace: WorkspaceContext, fileName: string, source: string): Promise<void> {
  await writeFile(resolveSpecPath(workspace, fileName), source, "utf8");
}

export async function createSpec(workspace: WorkspaceContext, fileName: string, source?: string): Promise<string> {
  const content = source ?? serializeSpec(createBlankSpec(), { mutated: true });
  await writeSpec(workspace, fileName, content);
  return content;
}

export async function renameSpec(workspace: WorkspaceContext, oldName: string, newName: string): Promise<void> {
  await rename(resolveSpecPath(workspace, oldName), resolveSpecPath(workspace, newName));
}

export async function duplicateSpec(workspace: WorkspaceContext, sourceName: string, targetName: string): Promise<string> {
  const source = await readSpec(workspace, sourceName);
  await writeSpec(workspace, targetName, source);
  return source;
}

export async function deleteSpec(workspace: WorkspaceContext, fileName: string): Promise<void> {
  await unlink(resolveSpecPath(workspace, fileName));
}