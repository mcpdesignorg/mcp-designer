import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Toggle } from "../../components/primitives.js";
import type { Capabilities } from "@mcpds/spec";
import type { EditorProps } from "./shared.js";
import { applyExtensions, extensionEntries, MetaExtensionsEditor } from "./shared-fields.js";

export function CapabilitiesEditor({ spec, updateSpec }: EditorProps) {
  const capabilities = spec.capabilities ?? {};

  // Local editable state so in-progress rows with empty keys can exist.
  const [experimentalEntries, setExperimentalEntries] = useState<[string, boolean][]>(
    () => Object.entries(capabilities.experimental ?? {}) as [string, boolean][],
  );

  function cap(partial: Capabilities): Capabilities {
    return { ...capabilities, ...partial } as Capabilities;
  }

  function commitExperimental(entries: [string, boolean][]) {
    updateSpec((draft) => {
      const experimental: Record<string, boolean> = {};
      for (const [key, value] of entries) {
        if (key) experimental[key] = value;
      }
      draft.capabilities = cap({ experimental: Object.keys(experimental).length ? experimental : undefined });
      return draft;
    });
  }

  function updateExperimental(entries: [string, boolean][]) {
    setExperimentalEntries(entries);
    commitExperimental(entries);
  }

  return (
    <div className="editor-stack">
      <Toggle
        label="tools.listChanged"
        helper="Server may emit notifications/tools/list_changed."
        checked={Boolean(capabilities.tools?.listChanged)}
        onChange={(value) => updateSpec((draft) => ((draft.capabilities = cap({ tools: { ...capabilities.tools, listChanged: value } })), draft))}
      />
      <Toggle
        label="resources.subscribe"
        helper="Clients may subscribe to resource updates."
        checked={Boolean(capabilities.resources?.subscribe)}
        onChange={(value) => updateSpec((draft) => ((draft.capabilities = cap({ resources: { ...capabilities.resources, subscribe: value } })), draft))}
      />
      <Toggle
        label="resources.listChanged"
        helper="Server may emit notifications/resources/list_changed."
        checked={Boolean(capabilities.resources?.listChanged)}
        onChange={(value) => updateSpec((draft) => ((draft.capabilities = cap({ resources: { ...capabilities.resources, listChanged: value } })), draft))}
      />
      <Toggle
        label="prompts.listChanged"
        helper="Server may emit notifications/prompts/list_changed."
        checked={Boolean(capabilities.prompts?.listChanged)}
        onChange={(value) => updateSpec((draft) => ((draft.capabilities = cap({ prompts: { ...capabilities.prompts, listChanged: value } })), draft))}
      />
      <Toggle
        label="logging"
        helper="Server supports logging/setLevel and log notifications."
        checked={Boolean(capabilities.logging)}
        onChange={(value) => updateSpec((draft) => ((draft.capabilities = cap({ logging: value })), draft))}
      />
      <Toggle
        label="completions"
        helper="Server supports argument completion."
        checked={Boolean(capabilities.completions)}
        onChange={(value) => updateSpec((draft) => ((draft.capabilities = cap({ completions: value })), draft))}
      />
      <Toggle
        label="tasks"
        helper="Server supports task-augmented execution (protocol rev. 2025-11-25)."
        checked={Boolean(capabilities.tasks)}
        onChange={(value) => updateSpec((draft) => ((draft.capabilities = cap({ tasks: value ? { ...capabilities.tasks } : undefined })), draft))}
      />
      {capabilities.tasks ? (
        <div className="editor-stack" style={{ marginLeft: "1.5rem" }}>
          <Toggle
            label="tasks.list"
            helper="Server supports tasks/list."
            checked={Boolean(capabilities.tasks.list)}
            onChange={(value) => updateSpec((draft) => ((draft.capabilities = cap({ tasks: { ...capabilities.tasks, list: value } })), draft))}
          />
          <Toggle
            label="tasks.cancel"
            helper="Server supports tasks/cancel."
            checked={Boolean(capabilities.tasks.cancel)}
            onChange={(value) => updateSpec((draft) => ((draft.capabilities = cap({ tasks: { ...capabilities.tasks, cancel: value } })), draft))}
          />
          <Toggle
            label="tasks.requests.tools.call"
            helper="tools/call may be executed as a task."
            checked={Boolean(capabilities.tasks.requests?.tools?.call)}
            onChange={(value) =>
              updateSpec((draft) => {
                const tasks = capabilities.tasks ?? {};
                draft.capabilities = cap({ tasks: { ...tasks, requests: { ...tasks.requests, tools: { ...tasks.requests?.tools, call: value } } } });
                return draft;
              })
            }
          />
        </div>
      ) : null}
      <div className="field-block">
        <div className="field-block-header">
          <span className="field-label">Experimental capabilities</span>
          <button type="button" className="ghost" onClick={() => updateExperimental([...experimentalEntries, ["", false]])}>
            <Plus size={14} /> Add
          </button>
        </div>
        {experimentalEntries.map(([key, value], index) => (
          <div className="toggle-row" key={index}>
            <input
              type="checkbox"
              checked={value}
              style={{ marginTop: "0.25rem" }}
              onChange={(e) => {
                const next = experimentalEntries.map((entry, i) => i === index ? [entry[0], e.target.checked] : entry) as [string, boolean][];
                updateExperimental(next);
              }}
            />
            <div style={{ flex: 1 }}>
              <input
                type="text"
                value={key}
                placeholder="capability name"
                style={{ width: "100%" }}
                onChange={(e) => {
                  const next = experimentalEntries.map((entry, i) => i === index ? [e.target.value, entry[1]] : entry) as [string, boolean][];
                  updateExperimental(next);
                }}
              />
            </div>
            <button
              type="button"
              className="icon-button danger"
              aria-label="Remove"
              onClick={() => updateExperimental(experimentalEntries.filter((_, i) => i !== index))}
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
      <span className="field-label" style={{ marginTop: "0.6rem" }}>Requires client capabilities</span>
      <Toggle
        label="sampling"
        helper="Server calls sampling/createMessage — requests LLM inference via the client."
        checked={Boolean(spec.requiresClientCapabilities?.includes("sampling"))}
        onChange={(value) =>
          updateSpec((draft) => {
            const current = draft.requiresClientCapabilities ?? [];
            const next = value ? [...current, "sampling"] : current.filter((c) => c !== "sampling");
            draft.requiresClientCapabilities = next.length ? next : undefined;
            return draft;
          })
        }
      />
      <Toggle
        label="elicitation"
        helper="Server calls elicitation/create — requests additional user input via the client."
        checked={Boolean(spec.requiresClientCapabilities?.includes("elicitation"))}
        onChange={(value) =>
          updateSpec((draft) => {
            const current = draft.requiresClientCapabilities ?? [];
            const next = value ? [...current, "elicitation"] : current.filter((c) => c !== "elicitation");
            draft.requiresClientCapabilities = next.length ? next : undefined;
            return draft;
          })
        }
      />
      <Toggle
        label="roots"
        helper="Server calls roots/list — discovers workspace root URIs from the client."
        checked={Boolean(spec.requiresClientCapabilities?.includes("roots"))}
        onChange={(value) =>
          updateSpec((draft) => {
            const current = draft.requiresClientCapabilities ?? [];
            const next = value ? [...current, "roots"] : current.filter((c) => c !== "roots");
            draft.requiresClientCapabilities = next.length ? next : undefined;
            return draft;
          })
        }
      />
      <MetaExtensionsEditor
        title="Capabilities meta & extensions"
        meta={capabilities.meta}
        onMetaChange={(next) => updateSpec((draft) => ((draft.capabilities = cap({ meta: next })), draft))}
        extensions={extensionEntries(capabilities)}
        onExtensionsChange={(next) =>
          updateSpec((draft) => {
            const nextCapabilities: Capabilities = { ...capabilities };
            applyExtensions(nextCapabilities, next);
            draft.capabilities = nextCapabilities;
            return draft;
          })
        }
      />
    </div>
  );
}
