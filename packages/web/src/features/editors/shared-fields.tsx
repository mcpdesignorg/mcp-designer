import type { EnvironmentVariable, IconInfo, JsonValue, UnknownRecord } from "@mcp-designer/core";
import { X } from "lucide-react";
import { ChipInput, Collapsible, Select, TextField, Toggle } from "../../components/primitives.js";

/**
 * Shared, spec-faithful editors reused across section editors so every MCPDS
 * field has exactly one editing surface (icons, environment variables, free-form
 * JSON, and the `meta` / `x-*` extension surface every MCPDS object may carry).
 */

export function IconsEditor({ icons, onChange, title = "Icons" }: { icons: IconInfo[]; onChange: (next: IconInfo[]) => void; title?: string }) {
  function patch(index: number, next: Partial<IconInfo>) {
    onChange(icons.map((item, position) => (position === index ? { ...item, ...next } : item)));
  }

  return (
    <Collapsible title={`${title} (${icons.length})`}>
      <button type="button" className="ghost" onClick={() => onChange([...icons, { src: "" }])}>Add icon</button>
      {icons.map((icon, index) => (
        <div className="entity-card" key={index}>
          <div className="entity-card-header">
            <span style={{ display: "flex", alignItems: "center", gap: "0.5rem", minWidth: 0 }}>
              {icon.src && (
                <img
                  src={icon.src}
                  alt=""
                  aria-hidden="true"
                  style={{ width: 24, height: 24, objectFit: "contain", flexShrink: 0, borderRadius: 4, background: "rgba(255,255,255,0.06)" }}
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                />
              )}
              <strong style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{icon.src || `Icon ${index + 1}`}</strong>
            </span>
            <button type="button" className="icon-button danger" aria-label="Remove icon" onClick={() => onChange(icons.filter((_, position) => position !== index))}>
              <X size={15} aria-hidden="true" />
            </button>
          </div>
          <div className="form-grid">
            <TextField label="Src" type="url" required value={icon.src} onChange={(value) => patch(index, { src: value })} />
            <TextField label="MIME type" value={icon.mimeType ?? ""} onChange={(value) => patch(index, { mimeType: value || undefined })} />
            <Select
              label="Theme"
              value={icon.theme ?? ""}
              helper="Optional MCP icon theme."
              options={[
                { value: "", label: "Any theme" },
                { value: "light", label: "light" },
                { value: "dark", label: "dark" }
              ]}
              onChange={(value) => patch(index, { theme: value === "light" || value === "dark" ? value : undefined })}
            />
          </div>
          <ChipInput label="Sizes" values={icon.sizes ?? []} helper="e.g. any, 48x48, 96x96." onChange={(next) => patch(index, { sizes: next.length ? next : undefined })} />
        </div>
      ))}
    </Collapsible>
  );
}

export function EnvironmentVariablesEditor({ variables, onChange }: { variables: EnvironmentVariable[]; onChange: (next: EnvironmentVariable[]) => void }) {
  function patch(index: number, next: Partial<EnvironmentVariable>) {
    onChange(variables.map((item, position) => (position === index ? { ...item, ...next } : item)));
  }

  return (
    <div className="field-block">
      <div className="field-block-header">
        <span className="field-label">Environment variables</span>
        <button type="button" className="ghost" onClick={() => onChange([...variables, { name: "" }])}>Add variable</button>
      </div>
      {variables.map((variable, index) => (
        <div className="entity-card" key={index}>
          <div className="entity-card-header">
            <strong>{variable.name || "variable"}</strong>
            <button type="button" className="icon-button danger" aria-label="Remove variable" onClick={() => onChange(variables.filter((_, position) => position !== index))}>
              <X size={15} aria-hidden="true" />
            </button>
          </div>
          <div className="form-grid">
            <TextField label="Name" value={variable.name} onChange={(value) => patch(index, { name: value })} />
            <TextField label="Default" value={variable.default ?? ""} onChange={(value) => patch(index, { default: value || undefined })} />
            <TextField label="Description" value={variable.description ?? ""} onChange={(value) => patch(index, { description: value || undefined })} />
          </div>
          <Toggle label="isSecret" checked={Boolean(variable.isSecret)} onChange={(value) => patch(index, { isSecret: value || undefined })} />
          <Toggle label="isRequired" checked={Boolean(variable.isRequired)} onChange={(value) => patch(index, { isRequired: value || undefined })} />
        </div>
      ))}
    </div>
  );
}

/** Edits a free-form JSON object (or undefined). Used for `meta` and other UnknownRecord fields. */
export function JsonObjectField({ label, value, onChange, helper }: { label: string; value: UnknownRecord | undefined; onChange: (next: UnknownRecord | undefined) => void; helper?: string }) {
  return (
    <label className="wide">
      <span>{label} (JSON)</span>
      <textarea
        key={JSON.stringify(value ?? null)}
        defaultValue={value === undefined ? "" : JSON.stringify(value, null, 2)}
        onBlur={(event) => {
          const text = event.target.value.trim();
          if (!text) {
            onChange(undefined);
            return;
          }
          try {
            const parsed = JSON.parse(text) as unknown;
            if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
              onChange(parsed as UnknownRecord);
            }
          } catch {
            // keep previous value on invalid JSON
          }
        }}
      />
      {helper ? <small className="field-helper">{helper}</small> : null}
    </label>
  );
}

/** Edits a free-form JSON value (object, array, scalar). Used for x-* extension values. */
function JsonValueField({ label, value, onChange, placeholder }: { label: string; value: JsonValue | undefined; onChange: (next: JsonValue | undefined) => void; placeholder?: string }) {
  return (
    <label className="wide">
      <span>{label} (JSON)</span>
      <textarea
        key={JSON.stringify(value ?? null)}
        placeholder={placeholder}
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

/** Edits an array of free-form JSON objects (e.g. packaging runtimeArguments / packageArguments). */
export function JsonObjectArrayField({ label, addLabel, value, onChange }: { label: string; addLabel: string; value: UnknownRecord[]; onChange: (next: UnknownRecord[] | undefined) => void }) {
  function commit(next: UnknownRecord[]) {
    onChange(next.length ? next : undefined);
  }

  return (
    <div className="field-block">
      <div className="field-block-header">
        <span className="field-label">{label}</span>
        <button type="button" className="ghost" onClick={() => commit([...value, {}])}>{addLabel}</button>
      </div>
      {value.map((item, index) => (
        <div className="entity-card" key={index}>
          <div className="entity-card-header">
            <strong>{`#${index + 1}`}</strong>
            <button type="button" className="icon-button danger" aria-label="Remove entry" onClick={() => commit(value.filter((_, position) => position !== index))}>
              <X size={15} aria-hidden="true" />
            </button>
          </div>
          <JsonValueField
            label="Entry"
            value={item as JsonValue}
            onChange={(next) => {
              const entry = next && typeof next === "object" && !Array.isArray(next) ? (next as UnknownRecord) : {};
              commit(value.map((current, position) => (position === index ? entry : current)));
            }}
          />
        </div>
      ))}
    </div>
  );
}

/** Edits a named map of free-form JSON objects (e.g. components.parameters / components.responses). */
export function JsonRecordEditor({ label, addLabel, namePrefix, record, onChange }: { label: string; addLabel: string; namePrefix: string; record: Record<string, UnknownRecord>; onChange: (next: Record<string, UnknownRecord> | undefined) => void }) {
  const entries = Object.entries(record);

  function commit(next: Array<[string, UnknownRecord]>) {
    const result: Record<string, UnknownRecord> = {};
    for (const [name, value] of next) {
      if (name) {
        result[name] = value;
      }
    }
    onChange(Object.keys(result).length ? result : undefined);
  }

  function addEntry() {
    let name = namePrefix;
    let counter = 1;
    while (record[name]) {
      name = `${namePrefix}${counter++}`;
    }
    commit([...entries, [name, {}]]);
  }

  return (
    <div className="field-block">
      <div className="field-block-header">
        <span className="field-label">{label}</span>
        <button type="button" className="ghost" onClick={addEntry}>{addLabel}</button>
      </div>
      {entries.map(([name, value], index) => (
        <div className="entity-card" key={index}>
          <div className="entity-card-header">
            <strong>{name || `entry ${index + 1}`}</strong>
            <button type="button" className="icon-button danger" aria-label="Remove entry" onClick={() => commit(entries.filter((_, position) => position !== index))}>
              <X size={15} aria-hidden="true" />
            </button>
          </div>
          <TextField label="Name" value={name} onChange={(nextName) => commit(entries.map((entry, position) => (position === index ? [nextName, entry[1]] : entry)))} />
          <JsonObjectField
            label="Definition"
            value={value}
            onChange={(next) => commit(entries.map((entry, position) => (position === index ? [entry[0], next ?? {}] : entry)))}
          />
        </div>
      ))}
    </div>
  );
}

export function extensionEntries(record: Record<string, unknown> | undefined): Array<[string, JsonValue]> {
  if (!record) {
    return [];
  }
  return Object.entries(record).filter(([key]) => key.startsWith("x-")) as Array<[string, JsonValue]>;
}

/** Removes every existing `x-*` key from target and assigns the provided entries. Mutates target. */
export function applyExtensions(target: Record<string, unknown>, entries: Array<[string, JsonValue]>): void {
  for (const key of Object.keys(target)) {
    if (key.startsWith("x-")) {
      delete target[key];
    }
  }
  for (const [key, value] of entries) {
    if (key.startsWith("x-") && value !== undefined) {
      target[key] = value;
    }
  }
}

/**
 * Editor for the `meta` (_meta) object and any number of `x-*` vendor extension
 * keys that every MCPDS object may carry.
 */
export function MetaExtensionsEditor({ meta, onMetaChange, extensions, onExtensionsChange, title = "Meta & extensions" }: { meta: UnknownRecord | undefined; onMetaChange: (next: UnknownRecord | undefined) => void; extensions: Array<[string, JsonValue]>; onExtensionsChange: (next: Array<[string, JsonValue]>) => void; title?: string }) {
  const count = (meta ? Object.keys(meta).length : 0) + extensions.length;
  return (
    <Collapsible className="meta-extensions" title={count ? `${title} (${count})` : title}>
      <JsonObjectField label="meta" helper="Maps to MCP _meta." value={meta} onChange={onMetaChange} />
      <div className="field-block">
        <div className="field-block-header">
          <span className="field-label">Extensions (x-*)</span>
          <button type="button" className="ghost" onClick={() => onExtensionsChange([...extensions, ["x-", null]])}>Add extension</button>
        </div>
        {extensions.map(([key, value], index) => (
          <div className="entity-card" key={index}>
            <div className="entity-card-header">
              <strong>{key || "x-"}</strong>
              <button type="button" className="icon-button danger" aria-label="Remove extension" onClick={() => onExtensionsChange(extensions.filter((_, position) => position !== index))}>
                <X size={15} aria-hidden="true" />
              </button>
            </div>
            <TextField label="Key" value={key} helper="Must start with x-." onChange={(nextKey) => onExtensionsChange(extensions.map((entry, position) => (position === index ? [nextKey, entry[1]] : entry)))} />
            <JsonValueField label="Value" value={value} onChange={(next) => onExtensionsChange(extensions.map((entry, position) => (position === index ? [entry[0], next ?? null] : entry)))} />
          </div>
        ))}
      </div>
    </Collapsible>
  );
}
