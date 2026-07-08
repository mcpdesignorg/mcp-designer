import type { JsonSchemaObject, JsonValue } from "@mcp-designer/core";
import { Plus, X } from "lucide-react";
import { useId } from "react";

const SCHEMA_TYPES = ["string", "number", "integer", "boolean", "object", "array", "null"] as const;
type SchemaType = (typeof SCHEMA_TYPES)[number];

export interface SchemaBuilderProps {
  schema: JsonSchemaObject;
  onChange: (next: JsonSchemaObject) => void;
  enforceTopLevelObject?: boolean;
}

export function SchemaBuilder({ schema, onChange, enforceTopLevelObject = false }: SchemaBuilderProps) {
  const topLevelType = currentType(schema);
  const showObjectWarning = enforceTopLevelObject && topLevelType !== "object";

  function setRootString(key: "$schema" | "$id" | "title" | "description", value: string) {
    const next = { ...schema } as Record<string, unknown>;
    if (value === "") {
      delete next[key];
    } else {
      next[key] = value;
    }
    onChange(next as JsonSchemaObject);
  }

  return (
    <div className="schema-builder">
      {showObjectWarning ? (
        <p className="field-error" role="alert">Tool input/output schemas must have top-level type: object.</p>
      ) : null}
      <details className="schema-root-meta">
        <summary>Schema info ($schema, $id, title, description)</summary>
        <div className="form-grid">
          <label>
            <span>title</span>
            <input value={schema.title ?? ""} onChange={(event) => setRootString("title", event.target.value)} />
          </label>
          <label>
            <span>$schema (dialect)</span>
            <input value={schema.$schema ?? ""} placeholder="default: JSON Schema 2020-12" onChange={(event) => setRootString("$schema", event.target.value)} />
          </label>
          <label>
            <span>$id</span>
            <input value={schema.$id ?? ""} onChange={(event) => setRootString("$id", event.target.value)} />
          </label>
          <label className="wide">
            <span>description</span>
            <input value={schema.description ?? ""} onChange={(event) => setRootString("description", event.target.value)} />
          </label>
        </div>
      </details>
      <ObjectEditor schema={schema} onChange={onChange} root />
    </div>
  );
}

function ObjectEditor({ schema, onChange, root }: { schema: JsonSchemaObject; onChange: (next: JsonSchemaObject) => void; root?: boolean }) {
  const properties = schema.properties ?? {};
  const required = schema.required ?? [];

  function addProperty() {
    const baseName = "newProperty";
    let name = baseName;
    let counter = 1;
    while (properties[name]) {
      name = `${baseName}${counter++}`;
    }
    onChange({ ...schema, type: "object", properties: { ...properties, [name]: { type: "string" } } });
  }

  function renameProperty(oldName: string, newName: string) {
    if (!newName || newName === oldName || properties[newName]) {
      return;
    }
    const nextProperties: Record<string, JsonSchemaObject> = {};
    for (const [key, value] of Object.entries(properties)) {
      nextProperties[key === oldName ? newName : key] = value;
    }
    onChange({
      ...schema,
      properties: nextProperties,
      required: required.map((item) => (item === oldName ? newName : item))
    });
  }

  function updateProperty(name: string, next: JsonSchemaObject) {
    onChange({ ...schema, properties: { ...properties, [name]: next } });
  }

  function removeProperty(name: string) {
    const nextProperties = { ...properties };
    delete nextProperties[name];
    onChange({ ...schema, properties: nextProperties, required: required.filter((item) => item !== name) });
  }

  function toggleRequired(name: string, value: boolean) {
    onChange({ ...schema, required: value ? [...new Set([...required, name])] : required.filter((item) => item !== name) });
  }

  function toggleAdditional(value: boolean) {
    onChange({ ...schema, additionalProperties: value });
  }

  return (
    <div className="object-editor">
      <div className="property-list">
        {Object.entries(properties).map(([name, propertySchema]) => (
          <PropertyEditor
            key={name}
            name={name}
            schema={propertySchema}
            required={required.includes(name)}
            onRename={(newName) => renameProperty(name, newName)}
            onChange={(next) => updateProperty(name, next)}
            onRemove={() => removeProperty(name)}
            onToggleRequired={(value) => toggleRequired(name, value)}
          />
        ))}
      </div>
      <div className="object-editor-footer">
        <button type="button" className="ghost" onClick={addProperty}>
          <Plus size={14} /> Add property
        </button>
        <label className="inline-toggle">
          <input
            type="checkbox"
            checked={schema.additionalProperties === false}
            onChange={(event) => toggleAdditional(!event.target.checked)}
          />
          <span>Reject unknown properties</span>
        </label>
      </div>
      {root ? null : null}
    </div>
  );
}

function PropertyEditor({
  name,
  schema,
  required,
  onRename,
  onChange,
  onRemove,
  onToggleRequired
}: {
  name: string;
  schema: JsonSchemaObject;
  required: boolean;
  onRename: (newName: string) => void;
  onChange: (next: JsonSchemaObject) => void;
  onRemove: () => void;
  onToggleRequired: (value: boolean) => void;
}) {
  const nameId = useId();
  const type = currentType(schema);

  function setType(nextType: SchemaType) {
    const next: JsonSchemaObject = { ...schema, type: nextType };
    delete next.$ref;
    if (nextType !== "object") {
      delete next.properties;
      delete next.required;
      delete next.additionalProperties;
    }
    if (nextType !== "array") {
      delete next.items;
    }
    if (nextType === "array" && !next.items) {
      next.items = { type: "string" };
    }
    onChange(next);
  }

  return (
    <div className="property-editor">
      <div className="property-editor-row">
        <label htmlFor={nameId} className="property-name">
          <span>Property</span>
          <input id={nameId} defaultValue={name} onBlur={(event) => onRename(event.target.value.trim())} />
        </label>
        <label className="property-type">
          <span>Type</span>
          <select
            value={type}
            onChange={(event) => setType(event.target.value as SchemaType)}
          >
            {SCHEMA_TYPES.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </label>
        <label className="inline-toggle">
          <input type="checkbox" checked={required} onChange={(event) => onToggleRequired(event.target.checked)} />
          <span>Required</span>
        </label>
        <button type="button" className="icon-button danger" aria-label={`Remove ${name}`} onClick={onRemove}>
          <X size={14} />
        </button>
      </div>

      <label className="wide">
        <span>Description</span>
        <input value={schema.description ?? ""} onChange={(event) => onChange({ ...schema, description: event.target.value || undefined })} />
      </label>
      <Constraints schema={schema} type={type} onChange={onChange} />
      {type === "object" ? (
        <div className="nested-editor">
          <span className="field-label">Nested properties</span>
          <ObjectEditor schema={schema} onChange={onChange} />
        </div>
      ) : null}
      {type === "array" ? (
        <div className="nested-editor">
          <span className="field-label">Array items</span>
          <PropertyEditor
            name="items"
            schema={(Array.isArray(schema.items) ? schema.items[0] : schema.items) ?? { type: "string" }}
            required={false}
            onRename={() => undefined}
            onChange={(next) => onChange({ ...schema, items: next })}
            onRemove={() => onChange({ ...schema, items: { type: "string" } })}
            onToggleRequired={() => undefined}
          />
        </div>
      ) : null}
    </div>
  );
}

function Constraints({ schema, type, onChange }: { schema: JsonSchemaObject; type: SchemaType; onChange: (next: JsonSchemaObject) => void }) {
  function setNumber(key: string, value: string) {
    const next = { ...schema } as Record<string, unknown>;
    if (value === "") {
      delete next[key];
    } else {
      next[key] = Number(value);
    }
    onChange(next as JsonSchemaObject);
  }

  function setString(key: string, value: string) {
    const next = { ...schema } as Record<string, unknown>;
    if (value === "") {
      delete next[key];
    } else {
      next[key] = value;
    }
    onChange(next as JsonSchemaObject);
  }

  function setEnum(value: string) {
    const items = value.split(",").map((item) => item.trim()).filter(Boolean);
    const next = { ...schema };
    if (items.length === 0) {
      delete next.enum;
    } else {
      next.enum = items as JsonValue[];
    }
    onChange(next);
  }

  const numericSchema = schema as Record<string, unknown>;

  return (
    <div className="constraints-grid">
      {type === "string" ? (
        <>
          <ConstraintInput label="minLength" value={numericSchema.minLength} onChange={(value) => setNumber("minLength", value)} numeric />
          <ConstraintInput label="maxLength" value={numericSchema.maxLength} onChange={(value) => setNumber("maxLength", value)} numeric />
          <ConstraintInput label="pattern" value={numericSchema.pattern} onChange={(value) => setString("pattern", value)} />
          <ConstraintInput label="format" value={numericSchema.format} onChange={(value) => setString("format", value)} />
        </>
      ) : null}
      {type === "number" || type === "integer" ? (
        <>
          <ConstraintInput label="minimum" value={numericSchema.minimum} onChange={(value) => setNumber("minimum", value)} numeric />
          <ConstraintInput label="maximum" value={numericSchema.maximum} onChange={(value) => setNumber("maximum", value)} numeric />
          <ConstraintInput label="multipleOf" value={numericSchema.multipleOf} onChange={(value) => setNumber("multipleOf", value)} numeric />
        </>
      ) : null}
      {type === "array" ? (
        <>
          <ConstraintInput label="minItems" value={numericSchema.minItems} onChange={(value) => setNumber("minItems", value)} numeric />
          <ConstraintInput label="maxItems" value={numericSchema.maxItems} onChange={(value) => setNumber("maxItems", value)} numeric />
        </>
      ) : null}
      {type === "string" || type === "number" || type === "integer" ? (
        <ConstraintInput label="enum (comma separated)" value={Array.isArray(schema.enum) ? schema.enum.join(", ") : ""} onChange={setEnum} />
      ) : null}
    </div>
  );
}

function ConstraintInput({ label, value, onChange, numeric }: { label: string; value: unknown; onChange: (value: string) => void; numeric?: boolean }) {
  const fieldId = useId();
  return (
    <label htmlFor={fieldId}>
      <span>{label}</span>
      <input id={fieldId} type={numeric ? "number" : "text"} value={value === undefined || value === null ? "" : String(value)} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function currentType(schema: JsonSchemaObject): SchemaType {
  if (Array.isArray(schema.type)) {
    return (schema.type[0] as SchemaType) ?? "object";
  }
  return (schema.type as SchemaType) ?? "object";
}
