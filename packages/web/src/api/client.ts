import type { ValidationResult } from "@mcp-designer/core";

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

export async function listSpecs(): Promise<SpecListItem[]> {
  const response = await fetchJson<{ specs: SpecListItem[] }>("/api/specs");
  return response.specs;
}

export async function readSpec(fileName: string): Promise<string> {
  const response = await fetch(`/api/specs/${encodeURIComponent(fileName)}`);
  if (!response.ok) {
    throw new Error(await errorMessage(response));
  }
  return response.text();
}

export async function saveSpec(fileName: string, payload: unknown): Promise<ValidationResult> {
  const response = await fetchJson<{ validation: ValidationResult }>(`/api/specs/${encodeURIComponent(fileName)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return response.validation;
}

export async function createSpec(fileName: string, source?: string): Promise<{ file: string; source: string; validation: ValidationResult }> {
  return fetchJson("/api/specs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName, source })
  });
}

export async function renameSpec(fileName: string, nextFileName: string): Promise<void> {
  await fetchJson(`/api/specs/${encodeURIComponent(fileName)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName: nextFileName })
  });
}

export async function duplicateSpec(fileName: string, nextFileName: string): Promise<void> {
  await fetchJson(`/api/specs/${encodeURIComponent(fileName)}/duplicate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName: nextFileName })
  });
}

export async function deleteSpec(fileName: string): Promise<void> {
  const response = await fetch(`/api/specs/${encodeURIComponent(fileName)}`, { method: "DELETE" });
  if (!response.ok) {
    throw new Error(await errorMessage(response));
  }
}

export async function validateSource(source: string): Promise<ValidationResult> {
  return fetchJson("/api/validate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ source })
  });
}

export interface AppSettings {
  workspaceDir: string;
  defaultWorkspaceDir: string;
  syncEnabled: boolean;
}

export async function getSettings(): Promise<AppSettings> {
  return fetchJson("/api/settings");
}

export async function saveSettings(update: { workspaceDir?: string; syncEnabled?: boolean }): Promise<AppSettings> {
  return fetchJson("/api/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(update)
  });
}

export async function openWorkspaceFolder(): Promise<void> {
  await fetchJson<void>("/api/settings/open-workspace", { method: "POST" });
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(await errorMessage(response));
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

async function errorMessage(response: Response): Promise<string> {
  try {
    const body = await response.json();
    return body.error ?? response.statusText;
  } catch {
    return response.statusText;
  }
}