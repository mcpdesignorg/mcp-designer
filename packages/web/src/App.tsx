import { createBlankSpec, parseSpec, serializeSpec, validateSpec } from "@mcp-designer/core";
import type { McpdsDocument, ToolDefinition, ValidationIssue, ValidationResult } from "@mcp-designer/core";
import { BookOpenText, Copy, Download, FileCode2, FilePlus2, FolderOpen, Home, Lock, Moon, Pencil, PencilRuler, Plus, Save, Settings, Sun, Trash2, Upload, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createSpec, deleteSpec, duplicateSpec, getSettings, listSpecs, openWorkspaceFolder, readSpec, renameSpec, saveSettings, saveSpec } from "./api/client.js";
import type { AppSettings, SpecListItem } from "./api/client.js";
import { DocumentationView, generateMcpDocumentationHtml } from "./features/documentation/DocumentationView.js";
import { ServerEditor } from "./features/editors/ServerEditor.js";
import { CapabilitiesEditor } from "./features/editors/CapabilitiesEditor.js";
import { TransportsEditor } from "./features/editors/TransportsEditor.js";
import { AuthEditor } from "./features/editors/AuthEditor.js";
import { ToolsEditor } from "./features/editors/ToolsEditor.js";
import { ResourcesEditor } from "./features/editors/ResourcesEditor.js";
import { PromptsEditor } from "./features/editors/PromptsEditor.js";
import { PackagingEditor } from "./features/editors/PackagingEditor.js";

type SectionKey = "server" | "capabilities" | "transports" | "auth" | "tools" | "resources" | "prompts" | "packaging" | "yaml" | "docs";
type AppMode = "design" | "home";
type AppRoute = { mode: "home" } | { mode: "servers" } | { mode: "design"; serverSlug: string; section?: SectionKey; toolSlug?: string };
type ColorScheme = "light" | "dark";

const issueSectionMap: Partial<Record<ValidationIssue["section"], SectionKey>> = {
  root: "yaml",
  server: "server",
  capabilities: "capabilities",
  transports: "transports",
  auth: "auth",
  tools: "tools",
  resources: "resources",
  resourceTemplates: "resources",
  prompts: "prompts",
  packaging: "packaging",
  yaml: "yaml"
};

const sections: Array<{ key: SectionKey; label: string }> = [
  { key: "server", label: "Server Info" },
  { key: "capabilities", label: "Capabilities" },
  { key: "transports", label: "Transports" },
  { key: "auth", label: "Auth" },
  { key: "tools", label: "Tools" },
  { key: "resources", label: "Resources" },
  { key: "prompts", label: "Prompts" },
  { key: "packaging", label: "Packaging" },
  { key: "yaml", label: "YAML" },
  { key: "docs", label: "Documentation" }
];

const navigationSections = sections.filter((item) => item.key !== "tools" && item.key !== "yaml" && item.key !== "docs");

const sectionSlugs: Record<SectionKey, string> = {
  server: "server-info",
  capabilities: "capabilities",
  transports: "transports",
  auth: "auth",
  tools: "tools",
  resources: "resources",
  prompts: "prompts",
  packaging: "packaging",
  yaml: "yaml",
  docs: "documentation"
};

export function App() {
  const [specs, setSpecs] = useState<SpecListItem[]>([]);
  const [activeFile, setActiveFile] = useState<string>();
  const [spec, setSpec] = useState<McpdsDocument>(() => createBlankSpec());
  const [originalSource, setOriginalSource] = useState("");
  const [dirty, setDirty] = useState(false);
  const [appMode, setAppMode] = useState<AppMode>(() => parseRoute(window.location.pathname).mode === "design" ? "design" : "home");
  const [section, setSection] = useState<SectionKey>("server");
  const [selectedToolIndex, setSelectedToolIndex] = useState(0);
  const [route, setRoute] = useState<AppRoute>(() => parseRoute(window.location.pathname));
  const [colorScheme, setColorScheme] = useState<ColorScheme>(() => readStoredColorScheme());
  const [validation, setValidation] = useState<ValidationResult>({ valid: true, issues: [] });
  const [error, setError] = useState<string>();
  const [settings, setSettings] = useState<AppSettings>();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  const yamlPreview = useMemo(() => serializeSpec(spec, { originalSource, mutated: dirty }), [dirty, originalSource, spec]);
  const documentationHtml = useMemo(() => generateMcpDocumentationHtml(spec), [spec]);
  const issuesBySection = useMemo(() => groupIssues(validation.issues), [validation.issues]);

  useEffect(() => {
    refreshSpecs().catch(showError);
    getSettings().then(setSettings).catch(() => undefined);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = colorScheme;
    window.localStorage.setItem("mcp-designer-theme", colorScheme);
  }, [colorScheme]);

  useEffect(() => {
    const handler = () => setRoute(parseRoute(window.location.pathname));
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, []);

  useEffect(() => {
    applyRoute(route, specs).catch(showError);
  }, [route, specs]);

  useEffect(() => {
    setValidation(validateSpec(spec));
  }, [spec]);

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (dirty) {
        event.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const syncStateRef = useRef({ activeFile, dirty });
  syncStateRef.current = { activeFile, dirty };

  useEffect(() => {
    if (!settings?.syncEnabled) {
      return;
    }

    const source = new EventSource("/api/events");
    source.addEventListener("change", () => {
      refreshSpecs().catch(() => undefined);
      const current = syncStateRef.current;
      if (current.activeFile && !current.dirty) {
        openSpec(current.activeFile, false).catch(() => undefined);
      }
    });

    return () => source.close();
  }, [settings?.syncEnabled]);

  async function refreshSpecs() {
    const nextSpecs = await listSpecs();
    setSpecs(nextSpecs);
  }

  async function openSpec(fileName: string, confirmDirty = true): Promise<McpdsDocument | undefined> {
    if (confirmDirty && dirty && !window.confirm("Discard unsaved changes?")) {
      return undefined;
    }

    const source = await readSpec(fileName);
    const parsed = parseSpec(source);
    const nextSpec = parsed.spec ?? createBlankSpec();
    if (parsed.spec) {
      setSpec(nextSpec);
      setValidation(validateSpec(nextSpec));
    } else {
      setSpec(nextSpec);
      setValidation({ valid: false, issues: parsed.diagnostics });
    }
    setOriginalSource(source);
    setActiveFile(fileName);
    setDirty(false);
    setError(undefined);
    return nextSpec;
  }

  async function openSpecForDesign(fileName: string) {
    const item = specs.find((s) => s.name === fileName);
    if (item && !item.versionSupported) {
      setError(`Cannot open "${fileName}": unsupported MCPDS version "${item.specVersion ?? "unknown"}". This application only supports version 1.0.`);
      return;
    }
    const openedSpec = await openSpec(fileName);
    if (openedSpec) {
      navigateToRoute({ mode: "design", serverSlug: serverRouteSlug(openedSpec, fileName) });
    }
  }

  async function applyRoute(nextRoute: AppRoute, availableSpecs: SpecListItem[]) {
    if (nextRoute.mode === "home" || nextRoute.mode === "servers") {
      setAppMode("home");
      return;
    }

    setAppMode("design");

    const targetFile = nextRoute.mode === "design"
      ? findSpecFileForServerSlug(nextRoute.serverSlug, availableSpecs)
      : activeFile ?? availableSpecs[0]?.name;

    if (!targetFile) {
      if (nextRoute.mode === "design" && availableSpecs.length) {
        setAppMode("home");
        setError(`Server route "${nextRoute.serverSlug}" was not found.`);
      }
      return;
    }

    const openedSpec = targetFile === activeFile ? spec : await openSpec(targetFile);
    if (!openedSpec) {
      return;
    }

    const nextSection = nextRoute.mode === "design" ? nextRoute.section ?? "server" : "server";
    setSection(nextSection);

    if (nextSection === "tools") {
      const toolIndex = nextRoute.mode === "design" && nextRoute.toolSlug
        ? findToolIndex(openedSpec, nextRoute.toolSlug)
        : 0;
      setSelectedToolIndex(toolIndex);
    } else {
      setSelectedToolIndex(0);
    }
  }

  function updateSpec(updater: (draft: McpdsDocument) => McpdsDocument) {
    setSpec((current: McpdsDocument) => updater(structuredClone(current)));
    setDirty(true);
    // The save guard surfaces a "Cannot save: N validation errors" banner. Once
    // the user edits the spec that count is stale (and may already be resolved),
    // so drop it here while preserving unrelated errors.
    setError((current) => (current?.startsWith("Cannot save:") ? undefined : current));
  }

  async function createNewSpec() {
    const fileName = window.prompt("New spec file name", "mcp.yaml");
    if (!fileName) {
      return;
    }

    const created = await createSpec(fileName);
    await refreshSpecs();
    setActiveFile(created.file);
    const createdSpec = parseSpec(created.source).spec ?? createBlankSpec();
    setSpec(createdSpec);
    setOriginalSource(created.source);
    setDirty(false);
    navigateToRoute({ mode: "design", serverSlug: serverRouteSlug(createdSpec, created.file) });
  }

  function pickYamlFile() {
    importInputRef.current?.click();
  }

  async function importYamlFile(file: File) {
    const fileName = window.prompt("Import as file", file.name || "imported.mcp.yaml");
    if (!fileName) {
      return;
    }

    const source = await file.text();

    const created = await createSpec(fileName, source);
    await refreshSpecs();
    const openedSpec = await openSpec(created.file, false);
    if (openedSpec) {
      navigateToRoute({ mode: "design", serverSlug: serverRouteSlug(openedSpec, created.file) });
    }
  }

  async function saveActiveSpec() {
    if (!activeFile) {
      await createNewSpec();
      return;
    }

    const currentValidation = validateSpec(spec);
    setValidation(currentValidation);
    if (!currentValidation.valid) {
      const errorCount = currentValidation.issues.filter((validationIssue) => validationIssue.severity === "error").length;
      const firstError = currentValidation.issues.find((validationIssue) => validationIssue.severity === "error");
      const firstErrorSection = firstError ? sectionKeyForIssue(firstError) : undefined;
      if (firstErrorSection && firstErrorSection in sectionSlugs) {
        setSection(firstErrorSection);
      }
      showError(new Error(`Cannot save: the spec has ${errorCount} validation ${errorCount === 1 ? "error" : "errors"}. Fix them before saving.`));
      return;
    }

    const nextValidation = await saveSpec(activeFile, { spec, originalSource, mutated: dirty });
    const nextSource = serializeSpec(spec, { originalSource, mutated: dirty });
    setValidation(nextValidation);
    setOriginalSource(nextSource);
    setDirty(false);
    await refreshSpecs();
  }

  async function renameSpecFile(currentFileName: string) {
    const fileName = window.prompt("Rename spec", currentFileName);
    if (!fileName || fileName === currentFileName) {
      return;
    }
    await renameSpec(currentFileName, fileName);
    if (currentFileName === activeFile) {
      setActiveFile(fileName);
    }
    await refreshSpecs();
  }

  async function duplicateSpecFile(currentFileName: string) {
    const fileName = window.prompt("Duplicate as", currentFileName.replace(/\.mcp\.yaml$/, "-copy.mcp.yaml"));
    if (!fileName) {
      return;
    }
    await duplicateSpec(currentFileName, fileName);
    await refreshSpecs();
  }

  async function deleteSpecFile(currentFileName: string) {
    if (!window.confirm(`Delete ${currentFileName}?`)) {
      return;
    }
    await deleteSpec(currentFileName);
    if (currentFileName === activeFile) {
      setActiveFile(undefined);
      setDirty(false);
    }
    await refreshSpecs();
    navigateToRoute({ mode: "home" });
  }

  async function copyYaml() {
    await navigator.clipboard.writeText(yamlPreview);
  }

  function downloadYamlContent(fileName: string, source: string) {
    const blob = new Blob([source], { type: "application/yaml" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function downloadYaml() {
    downloadYamlContent(activeFile ?? "mcp.yaml", yamlPreview);
  }

  function downloadDocumentation() {
    const baseName = activeFile?.replace(/\.ya?ml$/i, "") || slugifyRoutePart(spec.server.name || "mcp-server");
    const blob = new Blob([documentationHtml], { type: "text/html" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${baseName}.documentation.html`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  async function downloadSpecFile(fileName: string) {
    const source = fileName === activeFile ? yamlPreview : await readSpec(fileName);
    downloadYamlContent(fileName, source);
  }

  function showError(nextError: unknown) {
    setError(nextError instanceof Error ? nextError.message : "Unexpected error");
  }

  async function applySettings(update: { workspaceDir?: string; syncEnabled?: boolean }) {
    const next = await saveSettings(update);
    setSettings(next);
    await refreshSpecs();
  }

  function navigateToRoute(nextRoute: AppRoute, replace = false) {
    const path = routeToPath(nextRoute);
    if (window.location.pathname !== path) {
      window.history[replace ? "replaceState" : "pushState"]({}, "", path);
    }
    setRoute(parseRoute(path));
  }

  function findSpecFileForServerSlug(serverSlug: string, availableSpecs: SpecListItem[]): string | undefined {
    return availableSpecs.find((item) => slugifyRoutePart(item.serverId ?? item.name) === serverSlug)?.name
      ?? (activeFile && slugifyRoutePart(spec.server.name || activeFile) === serverSlug ? activeFile : undefined);
  }

  function navigateActiveSection(nextSection: SectionKey) {
    if (!activeFile) {
      setSection(nextSection);
      return;
    }

    navigateToRoute({
      mode: "design",
      serverSlug: serverRouteSlug(spec, activeFile),
      section: nextSection === "server" ? undefined : nextSection
    });
  }

  function navigateActiveTool(index: number) {
    const tool = spec.tools?.[index];
    if (!activeFile || !tool) {
      setSection("tools");
      setSelectedToolIndex(index);
      return;
    }

    navigateToRoute({
      mode: "design",
      serverSlug: serverRouteSlug(spec, activeFile),
      section: "tools",
      toolSlug: slugifyRoutePart(tool.name || `tool-${index + 1}`)
    });
  }

  function navigateSelectedServerDesign() {
    if (!activeFile) {
      return;
    }

    navigateToRoute({ mode: "design", serverSlug: serverRouteSlug(spec, activeFile) });
  }

  function addTool() {
    const index = spec.tools?.length ?? 0;
    const tool = newTool(index);
    updateSpec((draft) => {
      draft.tools = [...(draft.tools ?? []), tool];
      return draft;
    });

    if (!activeFile) {
      setSection("tools");
      setSelectedToolIndex(index);
      return;
    }

    navigateToRoute({
      mode: "design",
      serverSlug: serverRouteSlug(spec, activeFile),
      section: "tools",
      toolSlug: slugifyRoutePart(tool.name || `tool-${index + 1}`)
    });
  }

  return (
    <main className="app-shell">
      <aside className="nav-rail" aria-label="Application navigation">
        <button className={`rail-button ${route.mode === "home" || route.mode === "servers" ? "active" : ""}`} title="Home" aria-label="Home" onClick={() => navigateToRoute({ mode: "home" })}>
          <Home size={18} />
        </button>
        {activeFile ? (
          <>
            <div className="rail-divider rail-context-divider" />
            <button className={`rail-button rail-design-button ${route.mode === "design" && section !== "yaml" && section !== "docs" ? "active" : ""}`} title="Design selected server" aria-label="Design selected server" onClick={navigateSelectedServerDesign}>
              <PencilRuler size={18} />
            </button>
            <button className={`rail-button ${section === "yaml" && route.mode === "design" ? "active" : ""}`} title="YAML preview" aria-label="YAML preview" onClick={() => navigateActiveSection("yaml")}>
              <FileCode2 size={18} />
              {issuesBySection.yaml ? <span className="badge rail-badge">{issuesBySection.yaml}</span> : null}
            </button>
            <button className={`rail-button ${section === "docs" && route.mode === "design" ? "active" : ""}`} title="Documentation" aria-label="Documentation" onClick={() => navigateActiveSection("docs")}>
              <BookOpenText size={18} />
            </button>
          </>
        ) : null}
        <div className="rail-spacer" />
        <button
          className={`rail-button rail-settings-button ${settingsOpen ? "active" : ""}`}
          title="Settings"
          aria-label="Settings"
          onClick={() => setSettingsOpen(true)}
        >
          <Settings size={18} />
        </button>
        <button
          className="rail-button rail-theme-button"
          title={colorScheme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          aria-label={colorScheme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          onClick={() => setColorScheme((current) => current === "dark" ? "light" : "dark")}
        >
          {colorScheme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <input
          ref={importInputRef}
          className="visually-hidden"
          hidden
          type="file"
          accept=".yaml,.yml,application/yaml,text/yaml,text/plain"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            event.currentTarget.value = "";
            if (file) {
              importYamlFile(file).catch(showError);
            }
          }}
        />
      </aside>

      {appMode === "home" ? (
        <section className="panel home-panel" aria-label="Home">
          <HomeView
            specs={specs}
            activeFile={activeFile}
            dirty={dirty}
            workspaceDir={settings?.workspaceDir}
            onOpenWorkspace={() => openWorkspaceFolder().catch(showError)}
            onCreate={() => createNewSpec().catch(showError)}
            onImport={pickYamlFile}
            onExport={(fileName) => downloadSpecFile(fileName).catch(showError)}
            onDesign={(fileName) => openSpecForDesign(fileName).catch(showError)}
            onRename={(fileName) => renameSpecFile(fileName).catch(showError)}
            onDuplicate={(fileName) => duplicateSpecFile(fileName).catch(showError)}
            onDelete={(fileName) => deleteSpecFile(fileName).catch(showError)}
          />
        </section>
      ) : (
        <>
          {section !== "yaml" && section !== "docs" ? (<aside className="panel sections-panel" aria-label="Sections">
            <nav className="section-list">
              {navigationSections.map((item) => (
                <button key={item.key} className={section === item.key ? "active" : ""} onClick={() => navigateActiveSection(item.key)}>
                  <span>{item.label}</span>
                  {issuesBySection[item.key] ? <span className="badge">{issuesBySection[item.key]}</span> : null}
                </button>
              ))}
            </nav>
            <div className="entity-list tool-list">
              <div className="entity-list-header">
                <span>Tools</span>
                {issuesBySection.tools ? <span className="badge">{issuesBySection.tools}</span> : null}
              </div>
              {(spec.tools ?? []).map((tool, index) => (
                <button key={`${tool.name}-${index}`} className={section === "tools" && selectedToolIndex === index ? "active" : ""} onClick={() => navigateActiveTool(index)}>
                  {tool.name || `tool ${index + 1}`}
                </button>
              ))}
              <button type="button" className="ghost add-tool-button" onClick={addTool}>
                <Plus size={15} /> add tool
              </button>
            </div>
          </aside>) : null}

          <section className={`panel editor-panel ${section === "yaml" || section === "docs" ? "editor-panel-full" : ""}`} aria-label="Editor">
            <div className="editor-toolbar">
              <div>
                <h2>{sections.find((item) => item.key === section)?.label}</h2>
              </div>
              <div className="icon-row">
                {section === "docs" ? (
                  <button onClick={downloadDocumentation}><Download size={16} /> Download</button>
                ) : (
                  <>
                    <IconButton label="Copy YAML" onClick={() => copyYaml().catch(showError)} icon={<Copy size={16} />} />
                    <IconButton label="Download YAML" onClick={downloadYaml} icon={<Download size={16} />} />
                  </>
                )}
                <button className="primary" onClick={() => saveActiveSpec().catch(showError)} disabled={!dirty}><Save size={16} /> Save</button>
              </div>
            </div>

            {error ? <div className="error-banner">{error}</div> : null}
            <Editor
              section={section}
              spec={spec}
              updateSpec={updateSpec}
              yamlPreview={yamlPreview}
              documentationHtml={documentationHtml}
              issues={validation.issues}
              selectedToolIndex={selectedToolIndex}
              onSelectTool={navigateActiveTool}
            />
          </section>
        </>
      )}

      <footer className="status-bar" aria-live="polite">
        <div className="status-group">
          {(() => {
            const errorCount = validation.issues.filter(i => i.severity === "error").length;
            const warnCount = validation.issues.filter(i => i.severity === "warning").length;
            const dotClass = errorCount > 0 ? "invalid" : warnCount > 0 ? "warn" : "valid";
            const label = errorCount > 0
              ? `${errorCount} error${errorCount !== 1 ? "s" : ""}${warnCount > 0 ? `, ${warnCount} warning${warnCount !== 1 ? "s" : ""}` : ""}`
              : warnCount > 0 ? `${warnCount} warning${warnCount !== 1 ? "s" : ""}`
              : "valid";
            return <><span className={`status-dot ${dotClass}`} /><span>{label}</span></>;
          })()}
          <span>{dirty ? "unsaved" : "saved"}</span>
          <span className="status-file">{activeFile ?? "No file selected"}</span>
        </div>
        <div className="footer-credit">
          <span>MCP Designer</span>
          <a href="https://mcpdesign.org" target="_blank" rel="noreferrer">mcpdesign.org</a>
        </div>
      </footer>

      {settingsOpen ? (
        <SettingsDialog
          settings={settings}
          onClose={() => setSettingsOpen(false)}
          onSave={applySettings}
        />
      ) : null}
    </main>
  );
}

interface ServerListViewProps {
  specs: SpecListItem[];
  activeFile?: string;
  dirty: boolean;
  workspaceDir?: string;
  onOpenWorkspace: () => void;
  onCreate: () => void;
  onImport: () => void;
  onExport: (fileName: string) => void;
  onDesign: (fileName: string) => void;
  onRename: (fileName: string) => void;
  onDuplicate: (fileName: string) => void;
  onDelete: (fileName: string) => void;
}

function HomeView(props: ServerListViewProps) {
  return (
    <div className="home-view">
      <div className="home-header">
        <div>
          <h1>MCP Designer</h1>
          <p>{props.specs.length ? `${props.specs.length} YAML specifications` : "No specifications yet"}</p>
        </div>
      </div>

      <div className="action-tile-grid" aria-label="Quick actions">
        <button type="button" className="action-tile" onClick={props.onImport}>
          <span className="action-tile-icon"><Upload size={19} /></span>
          <span>
            <strong>Import YAML</strong>
            <small>Add an existing MCP specification</small>
          </span>
        </button>
        <button type="button" className="action-tile" onClick={props.onCreate}>
          <span className="action-tile-icon"><FilePlus2 size={19} /></span>
          <span>
            <strong>New server</strong>
            <small>Create a blank specification</small>
          </span>
        </button>
      </div>

      <ServerListView {...props} showToolbar={false} />
    </div>
  );
}

function ServerListView({ specs, activeFile, dirty, workspaceDir, onOpenWorkspace, onCreate, onImport, onExport, onDesign, onRename, onDuplicate, onDelete, showToolbar = true }: ServerListViewProps & { showToolbar?: boolean }) {
  const workspaceInfo = workspaceDir ? (
    <button type="button" className="workspace-link" title={workspaceDir} onClick={onOpenWorkspace}>
      <FolderOpen size={16} />
      <span className="workspace-link-label">YAML folder</span>
      <span className="workspace-link-path">{workspaceDir}</span>
    </button>
  ) : null;

  return (
    <div className="server-list-view">
      {showToolbar ? (
        <div className="list-toolbar">
          <div>
            <h1>MCP Servers</h1>
            <p>{specs.length ? `${specs.length} YAML specifications` : "No specifications yet"}</p>
            {workspaceInfo}
          </div>
          <div className="icon-row">
            <button onClick={onCreate}><FilePlus2 size={16} /> Add new</button>
            <button onClick={onImport}><Upload size={16} /> Import</button>
          </div>
        </div>
      ) : (
        <div className="server-list-heading">
          <div>
            <h2>MCP Servers</h2>
            <p>{specs.length ? `${specs.length} YAML specifications` : "No specifications yet"}</p>
          </div>
          {workspaceInfo}
        </div>
      )}

      <div className="server-table" role="list">
        {specs.map((item) => {
          const isActive = item.name === activeFile;
          const unsupported = !item.versionSupported;

          return (
            <article
              key={item.name}
              className={`server-row ${isActive ? "active" : ""} ${unsupported ? "unsupported" : ""}`}
              role="listitem"
              tabIndex={unsupported ? -1 : 0}
              onClick={() => !unsupported && onDesign(item.name)}
              onKeyDown={(event) => {
                if (event.target !== event.currentTarget || unsupported) {
                  return;
                }
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onDesign(item.name);
                }
              }}>
              <div className="server-row-main">
                <span className={`status-dot ${unsupported ? "unsupported" : item.valid ? "valid" : "invalid"}`} />
                <div>
                  <h2>{item.name}{isActive && dirty ? <span className="dirty-dot">*</span> : null}</h2>
                  {unsupported
                    ? <p className="unsupported-label">Unsupported version: mcpds {item.specVersion ?? "unknown"}</p>
                    : <p>{item.valid ? "Valid specification" : `${item.errorCount} validation errors`}</p>
                  }
                </div>
              </div>
              <div className="server-row-actions">
                <button onClick={(event) => {
                  event.stopPropagation();
                  onExport(item.name);
                }}><Download size={15} /> Export</button>
                <button onClick={(event) => {
                  event.stopPropagation();
                  onRename(item.name);
                }}>Rename</button>
                <button onClick={(event) => {
                  event.stopPropagation();
                  onDuplicate(item.name);
                }}>Duplicate</button>
                <button className="danger" onClick={(event) => {
                  event.stopPropagation();
                  onDelete(item.name);
                }}><Trash2 size={15} /> Delete</button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

interface EditorShellProps {
  section: SectionKey;
  spec: McpdsDocument;
  updateSpec: (updater: (draft: McpdsDocument) => McpdsDocument) => void;
  yamlPreview: string;
  documentationHtml: string;
  issues: ValidationIssue[];
  selectedToolIndex: number;
  onSelectTool: (index: number) => void;
}

function YamlEditor({ yamlPreview, updateSpec }: { yamlPreview: string; updateSpec: (updater: (draft: McpdsDocument) => McpdsDocument) => void }) {
  const [editMode, setEditMode] = useState(false);
  const [editText, setEditText] = useState("");

  function enterEditMode() {
    setEditText(yamlPreview);
    setEditMode(true);
  }

  function applyEdit() {
    const parsed = parseSpec(editText);
    if (parsed.spec) {
      updateSpec(() => parsed.spec!);
    }
    setEditMode(false);
  }

  function cancelEdit() {
    setEditMode(false);
  }

  return (
    <div className="yaml-editor-wrapper">
      {editMode
        ? <textarea className="yaml-edit-area" value={editText} onChange={e => setEditText(e.target.value)} spellCheck={false} />
        : <pre className="yaml-preview">{yamlPreview}</pre>
      }
      <div className="yaml-editor-corner">
        {editMode ? (
          <>
            <button className="yaml-edit-btn" onClick={applyEdit}>Apply</button>
            <button className="yaml-edit-btn secondary" onClick={cancelEdit}>Cancel</button>
          </>
        ) : (
          <button className="icon-button" title="Edit YAML directly" onClick={enterEditMode}><Pencil size={13} /></button>
        )}
      </div>
    </div>
  );
}

function Editor({ section, spec, updateSpec, yamlPreview, documentationHtml, issues, selectedToolIndex, onSelectTool }: EditorShellProps) {
  switch (section) {
    case "yaml":
      return <YamlEditor yamlPreview={yamlPreview} updateSpec={updateSpec} />;
    case "docs":
      return <DocumentationView html={documentationHtml} />;
    case "server":
      return <ServerEditor spec={spec} updateSpec={updateSpec} issues={issues} />;
    case "capabilities":
      return <CapabilitiesEditor spec={spec} updateSpec={updateSpec} issues={issues} />;
    case "transports":
      return <TransportsEditor spec={spec} updateSpec={updateSpec} issues={issues} />;
    case "auth":
      return <AuthEditor spec={spec} updateSpec={updateSpec} issues={issues} />;
    case "tools":
      return <ToolsEditor spec={spec} updateSpec={updateSpec} issues={issues} selectedIndex={selectedToolIndex} onSelect={onSelectTool} />;
    case "resources":
      return <ResourcesEditor spec={spec} updateSpec={updateSpec} issues={issues} />;
    case "prompts":
      return <PromptsEditor spec={spec} updateSpec={updateSpec} issues={issues} />;
    case "packaging":
      return <PackagingEditor spec={spec} updateSpec={updateSpec} issues={issues} />;
    default:
      return null;
  }
}

function IconButton({ label, icon, onClick }: { label: string; icon: React.ReactNode; onClick: () => void }) {
  return <button className="icon-button" title={label} aria-label={label} onClick={onClick}>{icon}</button>;
}

interface SettingsDialogProps {
  settings?: AppSettings;
  onClose: () => void;
  onSave: (update: { workspaceDir?: string; syncEnabled?: boolean }) => Promise<void>;
}

function SettingsDialog({ settings, onClose, onSave }: SettingsDialogProps) {
  const [workspaceDir, setWorkspaceDir] = useState(settings?.workspaceDir ?? "");
  const [syncEnabled, setSyncEnabled] = useState(settings?.syncEnabled ?? false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  const defaultDir = settings?.defaultWorkspaceDir ?? "";

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  async function handleSave() {
    setSaving(true);
    setError(undefined);
    try {
      await onSave({ workspaceDir: workspaceDir.trim() || defaultDir, syncEnabled });
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" role="presentation" onClick={onClose}>
      <div className="modal-card" role="dialog" aria-modal="true" aria-label="Settings" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h2>Settings</h2>
          <button className="icon-button" title="Close" aria-label="Close" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="modal-body">
          <div className="settings-field">
            <label htmlFor="settings-workspace-dir">Workspace directory</label>
            <input
              id="settings-workspace-dir"
              className="settings-input"
              type="text"
              value={workspaceDir}
              placeholder={defaultDir}
              spellCheck={false}
              onChange={(event) => setWorkspaceDir(event.target.value)}
            />
            <small className="settings-helper">
              Absolute path to the folder where <code>*.mcp.yaml</code> files are read and saved.
              On macOS use e.g. <code>/Users/you/mcp-specs</code>, on Windows e.g. <code>C:\Users\you\mcp-specs</code>.
              {defaultDir ? <> Leave empty to use the default: <code>{defaultDir}</code>.</> : null}
            </small>
          </div>

          <div className="settings-field">
            <div className="settings-toggle-row">
              <div>
                <span className="settings-toggle-label">Live sync with disk</span>
                <small className="settings-helper">
                  Watch the workspace folder and reload automatically when files change outside the app
                  (e.g. when edited in VS Code). Off by default. Unsaved changes are never overwritten.
                </small>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={syncEnabled}
                className={`toggle ${syncEnabled ? "toggle-on" : ""}`}
                onClick={() => setSyncEnabled((current) => !current)}
              >
                <span className="toggle-thumb" />
              </button>
            </div>
          </div>

          {error ? <div className="error-banner">{error}</div> : null}
        </div>

        <div className="modal-footer">
          <button onClick={onClose}>Cancel</button>
          <button className="primary" onClick={() => void handleSave()} disabled={saving}>
            <Save size={16} /> {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function parseRoute(pathname: string): AppRoute {
  const segments = pathname.split("/").filter(Boolean).map(decodeRouteSegment);
  const [root, serverSlug, sectionSlug, toolSlug] = segments;

  if (!root || root === "home") {
    return { mode: "home" };
  }

  if (root !== "mcp-servers") {
    return { mode: "home" };
  }

  if (!serverSlug) {
    return { mode: "servers" };
  }

  const section = sectionFromSlug(sectionSlug);
  return {
    mode: "design",
    serverSlug,
    section,
    toolSlug: section === "tools" ? toolSlug : undefined
  };
}

function routeToPath(route: AppRoute): string {
  if (route.mode === "home") {
    return "/home";
  }

  if (route.mode === "servers") {
    return "/mcp-servers";
  }

  const sectionPath = route.section && route.section !== "server" ? `/${sectionSlugs[route.section]}` : "";
  const toolPath = route.section === "tools" && route.toolSlug ? `/${route.toolSlug}` : "";
  return `/mcp-servers/${route.serverSlug}${sectionPath}${toolPath}`;
}

function sectionFromSlug(slug: string | undefined): SectionKey | undefined {
  if (!slug) {
    return undefined;
  }

  if (slug === "server") {
    return "server";
  }

  return sections.find((item) => sectionSlugs[item.key] === slug)?.key;
}

function serverRouteSlug(spec: McpdsDocument, fileName: string): string {
  return slugifyRoutePart(spec.server.name || fileName);
}

function findToolIndex(spec: McpdsDocument, toolSlug: string): number {
  const index = (spec.tools ?? []).findIndex((tool, position) => slugifyRoutePart(tool.name || `tool-${position + 1}`) === toolSlug);
  return Math.max(0, index);
}

function slugifyRoutePart(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "server";
}

function decodeRouteSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

function readStoredColorScheme(): ColorScheme {
  const stored = window.localStorage.getItem("mcp-designer-theme");
  return stored === "dark" ? "dark" : "light";
}

function groupIssues(issues: ValidationIssue[]): Partial<Record<SectionKey, number>> {
  return issues.reduce<Partial<Record<SectionKey, number>>>((accumulator, issue) => {
    const key = sectionKeyForIssue(issue);
    if (key) {
      accumulator[key] = (accumulator[key] ?? 0) + 1;
    }
    return accumulator;
  }, {});
}

function sectionKeyForIssue(issue: ValidationIssue): SectionKey | undefined {
  return issueSectionMap[issue.section];
}

function newTool(count: number): ToolDefinition {
  return {
    name: count === 0 ? "new_tool" : `new_tool_${count}`,
    title: "New Tool",
    description: "Describe when and how the model should use this tool.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false }
  };
}