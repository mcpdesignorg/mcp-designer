import type { AuthorInfo, JsonValue, UnknownRecord } from "@mcp-designer/core";
import { Collapsible, RemovableCard, TextArea, TextField } from "../../components/primitives.js";
import type { EditorProps } from "./shared.js";
import { issueFor } from "./shared.js";
import { applyExtensions, extensionEntries, IconsEditor, MetaExtensionsEditor } from "./shared-fields.js";

export function ServerEditor({ spec, updateSpec, issues }: EditorProps) {
  const server = spec.server;
  const authors = server.authors ?? [];
  const icons = server.icons ?? [];
  const protocolVersion = typeof spec["x-mcpProtocolVersion"] === "string" ? (spec["x-mcpProtocolVersion"] as string) : "";
  const docExtensions = extensionEntries(spec).filter(([key]) => key !== "x-mcpProtocolVersion");

  return (
    <div className="form-grid">
      <TextField
        label="Name"
        required
        value={server.name}
        helper="Unique server identifier, e.g. my-server or io.github.user/server."
        error={issueFor(issues, "/server/name")}
        onChange={(value) => updateSpec((draft) => ((draft.server.name = value), draft))}
      />
      <TextField label="Title" value={server.title ?? ""} onChange={(value) => updateSpec((draft) => ((draft.server.title = value || undefined), draft))} />
      <TextField label="Version" required value={server.version} helper="SemVer recommended." error={issueFor(issues, "/server/version")} onChange={(value) => updateSpec((draft) => ((draft.server.version = value), draft))} />
      <TextField label="Website URL" type="url" value={server.websiteUrl ?? ""} onChange={(value) => updateSpec((draft) => ((draft.server.websiteUrl = value || undefined), draft))} />
      <TextField label="License (SPDX)" value={server.license ?? ""} onChange={(value) => updateSpec((draft) => ((draft.server.license = value || undefined), draft))} />
      <TextField label="MCP protocol version" value={protocolVersion} helper="x-mcpProtocolVersion, e.g. 2025-11-25." onChange={(value) => updateSpec((draft) => ((draft["x-mcpProtocolVersion"] = value || undefined), draft))} />
      <TextArea label="Description" required value={server.description} error={issueFor(issues, "/server/description")} onChange={(value) => updateSpec((draft) => ((draft.server.description = value), draft))} />
      <TextArea label="Instructions" value={spec.instructions ?? ""} helper="Injected into the model's system prompt during initialize." onChange={(value) => updateSpec((draft) => ((draft.instructions = value || undefined), draft))} />

      <div className="full-row">
        <Collapsible title="Repository">
          <div className="form-grid">
            <TextField label="URL" type="url" required value={server.repository?.url ?? ""} error={issueFor(issues, "/server/repository/url")} onChange={(value) => updateSpec((draft) => ((draft.server.repository = cleanRepository({ ...draft.server.repository, url: value || undefined })), draft))} />
            <TextField label="Source" required value={server.repository?.source ?? ""} helper="e.g. github, gitlab." error={issueFor(issues, "/server/repository/source")} onChange={(value) => updateSpec((draft) => ((draft.server.repository = cleanRepository({ ...draft.server.repository, source: value || undefined })), draft))} />
            <TextField label="ID" value={server.repository?.id ?? ""} helper="Platform-specific repo ID." onChange={(value) => updateSpec((draft) => ((draft.server.repository = cleanRepository({ ...draft.server.repository, id: value || undefined })), draft))} />
          </div>
        </Collapsible>
      </div>

      <div className="full-row">
        <Collapsible title={`Authors (${authors.length})`}>
          <button type="button" className="ghost" onClick={() => updateSpec((draft) => ((draft.server.authors = [...authors, { name: "" }]), draft))}>Add author</button>
          {authors.map((author: AuthorInfo, index: number) => (
            <RemovableCard key={index} title={author.name || `Author ${index + 1}`} onRemove={() => updateSpec((draft) => ((draft.server.authors = authors.filter((_, position) => position !== index)), draft))}>
              <div className="form-grid">
                <TextField label="Name" value={author.name} onChange={(value) => updateSpec((draft) => ((draft.server.authors![index].name = value), draft))} />
                <TextField label="URL" type="url" value={author.url ?? ""} onChange={(value) => updateSpec((draft) => ((draft.server.authors![index].url = value || undefined), draft))} />
              </div>
            </RemovableCard>
          ))}
        </Collapsible>
      </div>

      <div className="full-row">
        <IconsEditor icons={icons} onChange={(next) => updateSpec((draft) => ((draft.server.icons = next.length ? next : undefined), draft))} />
      </div>

      <div className="full-row">
        <MetaExtensionsEditor
          title="Server meta & extensions"
          meta={server.meta}
          onMetaChange={(next) => updateSpec((draft) => ((draft.server.meta = next), draft))}
          extensions={extensionEntries(server)}
          onExtensionsChange={(next) => updateSpec((draft) => (applyExtensions(draft.server, next), draft))}
        />
      </div>

      <div className="full-row">
        <MetaExtensionsEditor
          title="Document meta & extensions"
          meta={spec.meta as UnknownRecord | undefined}
          onMetaChange={(next) => updateSpec((draft) => ((draft.meta = next), draft))}
          extensions={docExtensions}
          onExtensionsChange={(next) => updateSpec((draft) => (applyDocExtensions(draft, next), draft))}
        />
      </div>
    </div>
  );
}

function cleanRepository(repo: { url?: string; source?: string; id?: string }): typeof repo | undefined {
  return repo.url || repo.source || repo.id ? repo : undefined;
}

function applyDocExtensions(draft: { [key: string]: unknown }, entries: Array<[string, JsonValue]>): void {
  const preservedProtocol = draft["x-mcpProtocolVersion"];
  for (const key of Object.keys(draft)) {
    if (key.startsWith("x-") && key !== "x-mcpProtocolVersion") {
      delete draft[key];
    }
  }
  for (const [key, value] of entries) {
    if (key.startsWith("x-") && key !== "x-mcpProtocolVersion" && value !== undefined) {
      draft[key] = value;
    }
  }
  if (preservedProtocol !== undefined) {
    draft["x-mcpProtocolVersion"] = preservedProtocol;
  }
}
