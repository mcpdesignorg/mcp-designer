import type { JsonSchemaObject, JsonValue, TaskSupport, ToolDefinition } from "@mcp-designer/core";
import { Collapsible, RemovableCard, Select, TextArea, TextField, Toggle } from "../../components/primitives.js";
import { SchemaBuilder } from "../schema-builder/SchemaBuilder.js";
import type { EditorProps } from "./shared.js";
import { issueFor, issueIsWarning } from "./shared.js";
import { applyExtensions, extensionEntries, IconsEditor, MetaExtensionsEditor } from "./shared-fields.js";

export interface ToolsEditorProps extends EditorProps {
  selectedIndex: number;
  onSelect: (index: number) => void;
}

export function ToolsEditor({ spec, updateSpec, issues, selectedIndex, onSelect }: ToolsEditorProps) {
  const tools = spec.tools ?? [];

  function patch(index: number, next: Partial<ToolDefinition>) {
    updateSpec((draft) => {
      draft.tools![index] = { ...draft.tools![index], ...next };
      return draft;
    });
  }

  if (tools.length === 0) {
    return (
      <div className="empty-state">
        <p>No tools yet.</p>
      </div>
    );
  }

  const tool = tools[Math.min(selectedIndex, tools.length - 1)];
  const index = Math.min(selectedIndex, tools.length - 1);
  const annotations = tool.annotations ?? {};
  const taskSupport = tool.execution?.taskSupport ?? "forbidden";
  const inputSchemaIssue = issueFor(issues, `/tools/${index}/inputSchema`);
  const outputSchemaIssue = issueFor(issues, `/tools/${index}/outputSchema`);

  return (
    <div className="tools-editor">
      <RemovableCard
        title={tool.name || "Tool"}
        onRemove={() => {
          updateSpec((draft) => ((draft.tools = tools.filter((_, position) => position !== index)), draft));
          onSelect(Math.max(0, index - 1));
        }}
      >
        <div className="form-grid">
          <TextField label="Name" required value={tool.name} helper="snake_case advised, unique." error={issueFor(issues, `/tools/${index}/name`)} onChange={(value) => patch(index, { name: value })} />
          <TextField label="Title" value={tool.title ?? ""} onChange={(value) => patch(index, { title: value || undefined })} />
        </div>
        <TextArea label="Description" value={tool.description ?? ""} helper="Recommended prompt context: what it does AND when to use it." error={issueFor(issues, `/tools/${index}/description`)} warning={issueIsWarning(issues, `/tools/${index}/description`)} onChange={(value) => patch(index, { description: value })} />

        <Collapsible title="Input schema" className="schema-section">
          {inputSchemaIssue ? <p className="field-error" role="alert">{inputSchemaIssue}</p> : null}
          {tool.inputSchema ? (
            <SchemaBuilder
              schema={tool.inputSchema}
              enforceTopLevelObject
              onChange={(next: JsonSchemaObject) => patch(index, { inputSchema: next })}
            />
          ) : (
            <button type="button" className="ghost" onClick={() => patch(index, { inputSchema: { type: "object", additionalProperties: false } })}>Create input schema</button>
          )}
        </Collapsible>

        <Collapsible title="Output schema">
          {tool.outputSchema ? (
            <div className="schema-toolbar">
              <button type="button" className="ghost danger" onClick={() => patch(index, { outputSchema: undefined })}>Remove output schema</button>
            </div>
          ) : (
            <button type="button" className="ghost" onClick={() => patch(index, { outputSchema: { type: "object", properties: {} } })}>Add output schema</button>
          )}
          {tool.outputSchema ? (
            <>
              {outputSchemaIssue ? <p className="field-error" role="alert">{outputSchemaIssue}</p> : null}
              <SchemaBuilder schema={tool.outputSchema} enforceTopLevelObject onChange={(next: JsonSchemaObject) => patch(index, { outputSchema: next })} />
            </>
          ) : null}
        </Collapsible>

        <Collapsible title="Annotations">
          <div className="editor-stack">
            <TextField label="Annotation title" value={annotations.title ?? ""} onChange={(value) => patch(index, { annotations: { ...annotations, title: value || undefined } })} />
            <Toggle label="readOnlyHint" helper="Tool does not modify its environment." checked={Boolean(annotations.readOnlyHint)} onChange={(value) => patch(index, { annotations: { ...annotations, readOnlyHint: value } })} />
            <Toggle label="destructiveHint" warning helper="Tool may perform irreversible updates." checked={Boolean(annotations.destructiveHint)} onChange={(value) => patch(index, { annotations: { ...annotations, destructiveHint: value } })} />
            <Toggle label="idempotentHint" helper="Repeated identical calls have no additional effect." checked={Boolean(annotations.idempotentHint)} onChange={(value) => patch(index, { annotations: { ...annotations, idempotentHint: value } })} />
            <Toggle label="openWorldHint" helper="Tool touches external/open systems." checked={Boolean(annotations.openWorldHint)} onChange={(value) => patch(index, { annotations: { ...annotations, openWorldHint: value } })} />
          </div>
        </Collapsible>

        <Collapsible title="Execution">
          <Select
            label="Task support"
            value={taskSupport}
            helper="Task-augmented execution (protocol rev. 2025-11-25). Requires capabilities.tasks when not 'forbidden'."
            options={[
              { value: "forbidden", label: "forbidden (default)" },
              { value: "optional", label: "optional" },
              { value: "required", label: "required" }
            ]}
            onChange={(value) =>
              patch(index, { execution: value === "forbidden" ? undefined : { ...tool.execution, taskSupport: value as TaskSupport } })
            }
          />
        </Collapsible>

        <Collapsible title={`Examples (${tool.examples?.length ?? 0})`}>
          <button type="button" className="ghost" onClick={() => patch(index, { examples: [...(tool.examples ?? []), { name: "", input: {} }] })}>Add example</button>
          {(tool.examples ?? []).map((example, exampleIndex) => (
            <RemovableCard key={exampleIndex} title={example.name || `Example ${exampleIndex + 1}`} onRemove={() => patch(index, { examples: (tool.examples ?? []).filter((_, position) => position !== exampleIndex) })}>
              <TextField label="Name" value={example.name ?? ""} onChange={(value) => patch(index, { examples: (tool.examples ?? []).map((item, position) => (position === exampleIndex ? { ...item, name: value } : item)) })} />
              <JsonField label="Input" value={example.input} onChange={(value) => patch(index, { examples: (tool.examples ?? []).map((item, position) => (position === exampleIndex ? { ...item, input: value } : item)) })} />
              <JsonField label="Output" value={example.output} onChange={(value) => patch(index, { examples: (tool.examples ?? []).map((item, position) => (position === exampleIndex ? { ...item, output: value } : item)) })} />
            </RemovableCard>
          ))}
        </Collapsible>

        <IconsEditor icons={tool.icons ?? []} onChange={(next) => patch(index, { icons: next.length ? next : undefined })} />

        <MetaExtensionsEditor
          meta={tool.meta}
          onMetaChange={(next) => patch(index, { meta: next })}
          extensions={extensionEntries(tool)}
          onExtensionsChange={(next) =>
            updateSpec((draft) => {
              applyExtensions(draft.tools![index], next);
              return draft;
            })
          }
        />
      </RemovableCard>
    </div>
  );
}

function JsonField({ label, value, onChange }: { label: string; value: JsonValue | undefined; onChange: (value: JsonValue | undefined) => void }) {
  return (
    <label className="wide">
      <span>{label} (JSON)</span>
      <textarea
        defaultValue={value === undefined ? "" : JSON.stringify(value, null, 2)}
        onBlur={(event) => {
          const text = event.target.value.trim();
          if (!text) {
            onChange(undefined);
            return;
          }
          try {
            onChange(JSON.parse(text) as JsonValue);
          } catch {
            // keep previous value on invalid JSON
          }
        }}
      />
    </label>
  );
}

