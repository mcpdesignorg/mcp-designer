import type { ResourceDefinition, ResourceTemplateDefinition, TemplateParameter } from "@mcp-designer/core";
import { X } from "lucide-react";
import { useState } from "react";
import { Collapsible, InlineTextField, MultiSelect, NumberField, RemovableCard, Slider, TextArea, TextField } from "../../components/primitives.js";
import type { EditorProps } from "./shared.js";
import { issueFor, issueIsWarning } from "./shared.js";
import { applyExtensions, extensionEntries, IconsEditor, MetaExtensionsEditor } from "./shared-fields.js";

type SubTab = "resources" | "templates";

export function ResourcesEditor({ spec, updateSpec, issues }: EditorProps) {
  const [tab, setTab] = useState<SubTab>("resources");

  return (
    <div className="editor-stack">
      <div className="sub-tabs" role="tablist" aria-label="Resource kinds">
        <button role="tab" aria-selected={tab === "resources"} className={tab === "resources" ? "active" : ""} onClick={() => setTab("resources")}>
          Resources ({spec.resources?.length ?? 0})
        </button>
        <button role="tab" aria-selected={tab === "templates"} className={tab === "templates" ? "active" : ""} onClick={() => setTab("templates")}>
          Templates ({spec.resourceTemplates?.length ?? 0})
        </button>
      </div>

      {tab === "resources" ? <StaticResources spec={spec} updateSpec={updateSpec} issues={issues} /> : <Templates spec={spec} updateSpec={updateSpec} issues={issues} />}
    </div>
  );
}

function StaticResources({ spec, updateSpec, issues }: EditorProps) {
  const resources = spec.resources ?? [];

  function patch(index: number, next: Partial<ResourceDefinition>) {
    updateSpec((draft) => {
      draft.resources![index] = { ...draft.resources![index], ...next };
      return draft;
    });
  }

  return (
    <div className="editor-stack">
      <button type="button" className="ghost" onClick={() => updateSpec((draft) => ((draft.resources = [{ uri: "", name: "" }, ...resources]), draft))}>Add resource</button>
      {resources.map((resource, index) => {
        const annotations = resource.annotations ?? {};
        return (
          <RemovableCard key={index} collapsible defaultOpen={false} title={resource.name || resource.uri || `Resource ${index + 1}`} onRemove={() => updateSpec((draft) => ((draft.resources = resources.filter((_, position) => position !== index)), draft))}>
            <div className="form-grid">
              <TextField label="URI" required value={resource.uri} error={issueFor(issues, `/resources/${index}/uri`)} onChange={(value) => patch(index, { uri: value })} />
              <TextField label="Name" required value={resource.name} error={issueFor(issues, `/resources/${index}/name`)} onChange={(value) => patch(index, { name: value })} />
              <TextField label="Title" value={resource.title ?? ""} onChange={(value) => patch(index, { title: value || undefined })} />
              <TextField label="MIME type" value={resource.mimeType ?? ""} onChange={(value) => patch(index, { mimeType: value || undefined })} />
              <NumberField label="Size (bytes)" value={typeof resource.size === "number" ? resource.size : undefined} onChange={(value) => patch(index, { size: value })} />
            </div>
            <TextArea label="Description" value={resource.description ?? ""} onChange={(value) => patch(index, { description: value || undefined })} />
            <Annotations annotations={annotations} onChange={(next) => patch(index, { annotations: next })} />
            <IconsEditor icons={resource.icons ?? []} onChange={(next) => patch(index, { icons: next.length ? next : undefined })} />
            <MetaExtensionsEditor
              meta={resource.meta}
              onMetaChange={(next) => patch(index, { meta: next })}
              extensions={extensionEntries(resource)}
              onExtensionsChange={(next) =>
                updateSpec((draft) => {
                  applyExtensions(draft.resources![index], next);
                  return draft;
                })
              }
            />
          </RemovableCard>
        );
      })}
    </div>
  );
}

function Templates({ spec, updateSpec, issues }: EditorProps) {
  const templates = spec.resourceTemplates ?? [];

  function patch(index: number, next: Partial<ResourceTemplateDefinition>) {
    updateSpec((draft) => {
      draft.resourceTemplates![index] = { ...draft.resourceTemplates![index], ...next };
      return draft;
    });
  }

  return (
    <div className="editor-stack">
      <button type="button" className="ghost" onClick={() => updateSpec((draft) => ((draft.resourceTemplates = [{ uriTemplate: "", name: "" }, ...templates]), draft))}>Add template</button>
      {templates.map((template, index) => {
        const parameters = template.parameters ?? [];
        const uriTemplateIssue = issueFor(issues, `/resourceTemplates/${index}/uriTemplate`);
        const uriTemplateWarning = issueIsWarning(issues, `/resourceTemplates/${index}/uriTemplate`);
        return (
          <RemovableCard key={index} collapsible defaultOpen={false} title={template.name || template.uriTemplate || `Template ${index + 1}`} onRemove={() => updateSpec((draft) => ((draft.resourceTemplates = templates.filter((_, position) => position !== index)), draft))}>
            <div className="form-grid">
              <TextField label="URI template" required value={template.uriTemplate} helper="RFC 6570, e.g. file:///logs/{date}.log" error={uriTemplateIssue} warning={uriTemplateWarning} onChange={(value) => patch(index, { uriTemplate: value })} />
              <TextField label="Name" required value={template.name} error={issueFor(issues, `/resourceTemplates/${index}/name`)} onChange={(value) => patch(index, { name: value })} />
              <TextField label="Title" value={template.title ?? ""} onChange={(value) => patch(index, { title: value || undefined })} />
              <TextField label="MIME type" value={template.mimeType ?? ""} onChange={(value) => patch(index, { mimeType: value || undefined })} />
            </div>
            <TextArea label="Description" value={template.description ?? ""} onChange={(value) => patch(index, { description: value || undefined })} />
            <Annotations annotations={template.annotations ?? {}} onChange={(next) => patch(index, { annotations: next })} />

            <div className="field-block">
              <div className="field-block-header">
                <span className="field-label">Parameters</span>
                <button type="button" className="ghost" onClick={() => patch(index, { parameters: [...parameters, { name: "" }] })}>Add parameter</button>
              </div>
              {parameters.map((parameter: TemplateParameter, parameterIndex) => {
                const parameterNameIssue = issueFor(issues, `/resourceTemplates/${index}/parameters/${parameterIndex}/name`);
                const parameterNameWarning = issueIsWarning(issues, `/resourceTemplates/${index}/parameters/${parameterIndex}/name`);
                return (
                  <div className="inline-row" key={parameterIndex}>
                    <InlineTextField value={parameter.name} placeholder="name" ariaLabel="Parameter name" error={parameterNameIssue} warning={parameterNameWarning} onChange={(value) => patch(index, { parameters: parameters.map((item, position) => (position === parameterIndex ? { ...item, name: value } : item)) })} />
                    <input value={parameter.description ?? ""} placeholder="description" onChange={(event) => patch(index, { parameters: parameters.map((item, position) => (position === parameterIndex ? { ...item, description: event.target.value || undefined } : item)) })} />
                    <label className="inline-toggle"><input type="checkbox" checked={Boolean(parameter.required)} onChange={(event) => patch(index, { parameters: parameters.map((item, position) => (position === parameterIndex ? { ...item, required: event.target.checked } : item)) })} /><span>required</span></label>
                    <label className="inline-toggle"><input type="checkbox" checked={Boolean(parameter.completion)} onChange={(event) => patch(index, { parameters: parameters.map((item, position) => (position === parameterIndex ? { ...item, completion: event.target.checked } : item)) })} /><span>completion</span></label>
                    <button type="button" className="icon-button danger" aria-label="Remove parameter" onClick={() => patch(index, { parameters: parameters.filter((_, position) => position !== parameterIndex) })}>
                      <X aria-hidden="true" />
                    </button>
                  </div>
                );
              })}
            </div>
            <IconsEditor icons={template.icons ?? []} onChange={(next) => patch(index, { icons: next.length ? next : undefined })} />
            <MetaExtensionsEditor
              meta={template.meta}
              onMetaChange={(next) => patch(index, { meta: next })}
              extensions={extensionEntries(template)}
              onExtensionsChange={(next) =>
                updateSpec((draft) => {
                  applyExtensions(draft.resourceTemplates![index], next);
                  return draft;
                })
              }
            />
          </RemovableCard>
        );
      })}
    </div>
  );
}

function Annotations({ annotations, onChange }: { annotations: { audience?: string[]; priority?: number; lastModified?: string }; onChange: (next: { audience?: string[]; priority?: number; lastModified?: string }) => void }) {
  return (
    <Collapsible title="Annotations">
      <MultiSelect label="Audience" selected={annotations.audience ?? []} options={["user", "assistant"]} onChange={(next) => onChange({ ...annotations, audience: next.length ? next : undefined })} />
      <Slider label="Priority" min={0} max={1} step={0.1} value={annotations.priority ?? 0} onChange={(value) => onChange({ ...annotations, priority: value })} />
      <TextField label="Last modified" value={annotations.lastModified ?? ""} helper="ISO 8601 timestamp, e.g. 2025-11-25T10:00:00Z." onChange={(value) => onChange({ ...annotations, lastModified: value || undefined })} />
    </Collapsible>
  );
}
