import type { Transport, TransportHeader, TransportVariable } from "@mcp-designer/core";
import { X } from "lucide-react";
import { Collapsible, RemovableCard, RepeatableList, Select, ChipInput, TextField, Toggle } from "../../components/primitives.js";
import type { EditorProps } from "./shared.js";
import { issueFor } from "./shared.js";
import { applyExtensions, extensionEntries, MetaExtensionsEditor } from "./shared-fields.js";

const transportOptions = [
  { value: "stdio", label: "stdio" },
  { value: "streamable-http", label: "streamable-http" },
  { value: "sse", label: "sse" }
];

export function TransportsEditor({ spec, updateSpec, issues }: EditorProps) {
  const transports = spec.transports ?? [];

  function patch(index: number, next: Partial<Transport>) {
    updateSpec((draft) => {
      draft.transports[index] = { ...draft.transports[index], ...next };
      return draft;
    });
  }

  return (
    <RepeatableList
      label="Transports"
      addLabel="Add transport"
      onAdd={() => updateSpec((draft) => ((draft.transports = [...transports, { type: "stdio" }]), draft))}
    >
      {transports.length === 0 ? <p className="field-error">At least one transport is required.</p> : null}
      {transports.map((transport, index) => {
        const isHttp = transport.type === "streamable-http" || transport.type === "sse";

        return (
          <RemovableCard
            key={index}
            title={`${transport.type}`}
            onRemove={() => updateSpec((draft) => ((draft.transports = transports.filter((_, position) => position !== index)), draft))}
          >
            {transport.type === "sse" ? (
              <p className="field-warning block">
                <strong>Legacy transport.</strong> The <code>sse</code> type is deprecated. Use <code>streamable-http</code> for new servers — it supersedes SSE per the MCP specification.
              </p>
            ) : null}
            <div className="form-grid">
              <Select label="Type" value={transport.type} options={transportOptions} onChange={(value) => patch(index, { type: value })} error={issueFor(issues, `/transports/${index}/type`)} />
              {isHttp ? (
                <TextField label="URL" type="url" required value={transport.url ?? ""} helper="Required for streamable-http/sse. Supports {variable} templating." error={issueFor(issues, `/transports/${index}/url`)} onChange={(value) => patch(index, { url: value || undefined })} />
              ) : null}
            </div>

            {isHttp ? (
              <Collapsible title="HTTP options">
                <div className="editor-stack">
                  <Toggle label="sessions" helper="Stateful sessions via Mcp-Session-Id." checked={Boolean(transport.sessions)} onChange={(value) => patch(index, { sessions: value })} />
                  <Toggle label="sse" helper="Server may stream via SSE on this transport." checked={Boolean(transport.sse)} onChange={(value) => patch(index, { sse: value })} />
                  <ChipInput
                    label="CORS allowed origins"
                    values={transport.cors?.allowedOrigins ?? []}
                    onChange={(next) => patch(index, { cors: next.length ? { allowedOrigins: next } : undefined })}
                  />
                  <VariablesEditor variables={transport.variables ?? {}} onChange={(next) => patch(index, { variables: next })} />
                  <HeadersEditor headers={transport.headers ?? []} onChange={(next) => patch(index, { headers: next.length ? next : undefined })} />
                </div>
              </Collapsible>
            ) : null}

            <MetaExtensionsEditor
              meta={transport.meta}
              onMetaChange={(next) => patch(index, { meta: next })}
              extensions={extensionEntries(transport)}
              onExtensionsChange={(next) =>
                updateSpec((draft) => {
                  applyExtensions(draft.transports[index], next);
                  return draft;
                })
              }
            />
          </RemovableCard>
        );
      })}
    </RepeatableList>
  );
}

function HeadersEditor({ headers, onChange }: { headers: TransportHeader[]; onChange: (next: TransportHeader[]) => void }) {
  return (
    <div className="field-block">
      <div className="field-block-header">
        <span className="field-label">Headers</span>
        <button type="button" className="ghost" onClick={() => onChange([...headers, { name: "" }])}>Add header</button>
      </div>
      {headers.map((header, index) => (
        <div className="entity-card" key={index}>
          <div className="entity-card-header">
            <strong>{header.name || "header"}</strong>
            <button type="button" className="icon-button danger" aria-label="Remove header" onClick={() => onChange(headers.filter((_, position) => position !== index))}>
              <X size={15} aria-hidden="true" />
            </button>
          </div>
          <div className="form-grid">
            <TextField label="Name" value={header.name} onChange={(value) => onChange(headers.map((item, position) => (position === index ? { ...item, name: value } : item)))} />
            <TextField label="Default" value={header.default ?? ""} onChange={(value) => onChange(headers.map((item, position) => (position === index ? { ...item, default: value || undefined } : item)))} />
            <TextField label="Description" value={header.description ?? ""} onChange={(value) => onChange(headers.map((item, position) => (position === index ? { ...item, description: value || undefined } : item)))} />
          </div>
          <Toggle label="isRequired" checked={Boolean(header.isRequired)} onChange={(value) => onChange(headers.map((item, position) => (position === index ? { ...item, isRequired: value || undefined } : item)))} />
          <Toggle label="isSecret" checked={Boolean(header.isSecret)} onChange={(value) => onChange(headers.map((item, position) => (position === index ? { ...item, isSecret: value || undefined } : item)))} />
          <ChipInput
            label="Choices"
            values={header.choices ?? []}
            onChange={(next) => onChange(headers.map((item, position) => (position === index ? { ...item, choices: next.length ? next : undefined } : item)))}
          />
        </div>
      ))}
    </div>
  );
}

function VariablesEditor({ variables, onChange }: { variables: Record<string, TransportVariable>; onChange: (next: Record<string, TransportVariable> | undefined) => void }) {
  const entries = Object.entries(variables);

  function commit(next: Array<[string, TransportVariable]>) {
    const result: Record<string, TransportVariable> = {};
    for (const [name, variable] of next) {
      if (name) {
        result[name] = variable;
      }
    }
    onChange(Object.keys(result).length ? result : undefined);
  }

  function patchVariable(index: number, next: Partial<TransportVariable>) {
    commit(entries.map((entry, position) => (position === index ? [entry[0], { ...entry[1], ...next }] : entry)));
  }

  function renameVariable(index: number, name: string) {
    commit(entries.map((entry, position) => (position === index ? [name, entry[1]] : entry)));
  }

  return (
    <div className="field-block">
      <div className="field-block-header">
        <span className="field-label">Template variables</span>
        <button type="button" className="ghost" onClick={() => commit([...entries, ["", {}]])}>Add variable</button>
      </div>
      {entries.map(([name, variable], index) => (
        <div className="entity-card" key={index}>
          <div className="entity-card-header">
            <strong>{name || "variable"}</strong>
            <button type="button" className="icon-button danger" aria-label="Remove variable" onClick={() => commit(entries.filter((_, position) => position !== index))}>
              <X size={15} aria-hidden="true" />
            </button>
          </div>
          <div className="form-grid">
            <TextField label="Name" value={name} onChange={(value) => renameVariable(index, value)} />
            <TextField label="Default" value={variable.default === undefined || variable.default === null ? "" : String(variable.default)} onChange={(value) => patchVariable(index, { default: value || undefined })} />
            <TextField label="Description" value={variable.description ?? ""} onChange={(value) => patchVariable(index, { description: value || undefined })} />
          </div>
          <Toggle label="isRequired" checked={Boolean(variable.isRequired)} onChange={(value) => patchVariable(index, { isRequired: value || undefined })} />
          <ChipInput
            label="Choices"
            values={(variable.choices ?? []).map((choice) => String(choice))}
            onChange={(next) => patchVariable(index, { choices: next.length ? next : undefined })}
          />
        </div>
      ))}
    </div>
  );
}

