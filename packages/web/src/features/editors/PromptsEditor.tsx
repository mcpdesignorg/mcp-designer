import type { PromptArgument, PromptDefinition } from "@mcp-designer/core";
import { X } from "lucide-react";
import { RemovableCard, TextArea, TextField, Toggle } from "../../components/primitives.js";
import type { EditorProps } from "./shared.js";
import { issueFor } from "./shared.js";
import { applyExtensions, extensionEntries, IconsEditor, MetaExtensionsEditor } from "./shared-fields.js";

export function PromptsEditor({ spec, updateSpec, issues }: EditorProps) {
  const prompts = spec.prompts ?? [];

  function patch(index: number, next: Partial<PromptDefinition>) {
    updateSpec((draft) => {
      draft.prompts![index] = { ...draft.prompts![index], ...next };
      return draft;
    });
  }

  return (
    <div className="editor-stack">
      <button type="button" className="ghost" onClick={() => updateSpec((draft) => ((draft.prompts = [...prompts, { name: "" }]), draft))}>Add prompt</button>
      {prompts.map((prompt, index) => {
        const args = prompt.arguments ?? [];

        function patchArgument(argumentIndex: number, next: Partial<PromptArgument>) {
          patch(index, { arguments: args.map((item, position) => (position === argumentIndex ? { ...item, ...next } : item)) });
        }

        return (
          <RemovableCard key={index} title={prompt.name || `Prompt ${index + 1}`} onRemove={() => updateSpec((draft) => ((draft.prompts = prompts.filter((_, position) => position !== index)), draft))}>
            <div className="form-grid">
              <TextField label="Name" required value={prompt.name} error={issueFor(issues, `/prompts/${index}/name`)} onChange={(value) => patch(index, { name: value })} />
              <TextField label="Title" value={prompt.title ?? ""} onChange={(value) => patch(index, { title: value || undefined })} />
            </div>
            <TextArea label="Description" value={prompt.description ?? ""} onChange={(value) => patch(index, { description: value || undefined })} />

            <div className="field-block">
              <div className="field-block-header">
                <span className="field-label">Arguments</span>
                <button type="button" className="ghost" onClick={() => patch(index, { arguments: [...args, { name: "" }] })}>Add argument</button>
              </div>
              {args.map((argument: PromptArgument, argumentIndex) => (
                <div className="entity-card" key={argumentIndex}>
                  <div className="entity-card-header">
                    <strong>{argument.name || `argument ${argumentIndex + 1}`}</strong>
                    <button type="button" className="icon-button danger" aria-label="Remove argument" onClick={() => patch(index, { arguments: args.filter((_, position) => position !== argumentIndex) })}>
                      <X size={15} aria-hidden="true" />
                    </button>
                  </div>
                  <div className="form-grid">
                    <TextField label="Name" required value={argument.name} error={issueFor(issues, `/prompts/${index}/arguments/${argumentIndex}/name`)} onChange={(value) => patchArgument(argumentIndex, { name: value })} />
                    <TextField label="Title" value={argument.title ?? ""} onChange={(value) => patchArgument(argumentIndex, { title: value || undefined })} />
                  </div>
                  <TextField label="Description" value={argument.description ?? ""} onChange={(value) => patchArgument(argumentIndex, { description: value || undefined })} />
                  <Toggle label="required" checked={Boolean(argument.required)} onChange={(value) => patchArgument(argumentIndex, { required: value || undefined })} />
                </div>
              ))}
            </div>

            <IconsEditor icons={prompt.icons ?? []} onChange={(next) => patch(index, { icons: next.length ? next : undefined })} />

            <MetaExtensionsEditor
              meta={prompt.meta}
              onMetaChange={(next) => patch(index, { meta: next })}
              extensions={extensionEntries(prompt)}
              onExtensionsChange={(next) =>
                updateSpec((draft) => {
                  applyExtensions(draft.prompts![index], next);
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
