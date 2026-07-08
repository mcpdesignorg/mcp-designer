import type { ReactNode } from "react";
import { useId, useState } from "react";
import { AlertCircle, ChevronDown, ChevronRight, CircleHelp, Plus, X } from "lucide-react";

export interface FieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  helper?: string;
  error?: string;
  warning?: boolean;
  required?: boolean;
  id?: string;
  type?: "text" | "url";
}

export function TextField({ label, value, onChange, placeholder, helper, error, warning, required, id, type = "text" }: FieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const helperId = `${fieldId}-helper`;
  const issueId = `${fieldId}-issue`;
  const describedBy = describedByIds(helper ? helperId : undefined, error ? issueId : undefined);
  return (
    <label className={required ? "required-field" : undefined} htmlFor={fieldId}>
      <span>{label}</span>
      <span className={fieldControlClass(helper, error, warning)}>
        <input
          id={fieldId}
          type={type}
          value={value}
          placeholder={placeholder}
          aria-invalid={error && !warning ? true : undefined}
          aria-describedby={describedBy}
          onChange={(event) => onChange(event.target.value)}
        />
        <FieldHelp id={helperId} helper={helper} />
        <FieldIssue id={issueId} issue={error} warning={warning} />
      </span>
    </label>
  );
}

export interface InlineTextFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  warning?: boolean;
  ariaLabel: string;
}

export function InlineTextField({ value, onChange, placeholder, error, warning, ariaLabel }: InlineTextFieldProps) {
  const fieldId = useId();
  const issueId = `${fieldId}-issue`;
  return (
    <span className={fieldControlClass(undefined, error, warning)}>
      <input
        id={fieldId}
        value={value}
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-invalid={error && !warning ? true : undefined}
        aria-describedby={error ? issueId : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      <FieldIssue id={issueId} issue={error} warning={warning} />
    </span>
  );
}

export function TextArea({ label, value, onChange, placeholder, helper, error, warning, required, id }: FieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const helperId = `${fieldId}-helper`;
  const issueId = `${fieldId}-issue`;
  const describedBy = describedByIds(helper ? helperId : undefined, error ? issueId : undefined);
  return (
    <label className={`wide ${required ? "required-field" : ""}`.trim()} htmlFor={fieldId}>
      <span>{label}</span>
      <span className={`${fieldControlClass(helper, error, warning)} field-control-textarea`}>
        <textarea
          id={fieldId}
          value={value}
          placeholder={placeholder}
          aria-invalid={error && !warning ? true : undefined}
          aria-describedby={describedBy}
          onChange={(event) => onChange(event.target.value)}
        />
        <FieldHelp id={helperId} helper={helper} />
        <FieldIssue id={issueId} issue={error} warning={warning} />
      </span>
    </label>
  );
}

export interface NumberFieldProps {
  label: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  min?: number;
  max?: number;
  step?: number;
  helper?: string;
  error?: string;
  warning?: boolean;
}

export function NumberField({ label, value, onChange, min, max, step, helper, error, warning }: NumberFieldProps) {
  const fieldId = useId();
  const helperId = `${fieldId}-helper`;
  const issueId = `${fieldId}-issue`;
  const describedBy = describedByIds(helper ? helperId : undefined, error ? issueId : undefined);
  return (
    <label htmlFor={fieldId}>
      <span>{label}</span>
      <span className={fieldControlClass(helper, error, warning)}>
        <input
          id={fieldId}
          type="number"
          value={value ?? ""}
          min={min}
          max={max}
          step={step}
          aria-invalid={error && !warning ? true : undefined}
          aria-describedby={describedBy}
          onChange={(event) => onChange(event.target.value === "" ? undefined : Number(event.target.value))}
        />
        <FieldHelp id={helperId} helper={helper} />
        <FieldIssue id={issueId} issue={error} warning={warning} />
      </span>
    </label>
  );
}

export interface SelectProps {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
  helper?: string;
  error?: string;
  warning?: boolean;
}

export function Select({ label, value, options, onChange, helper, error, warning }: SelectProps) {
  const fieldId = useId();
  const helperId = `${fieldId}-helper`;
  const issueId = `${fieldId}-issue`;
  const describedBy = describedByIds(helper ? helperId : undefined, error ? issueId : undefined);
  return (
    <label htmlFor={fieldId}>
      <span>{label}</span>
      <span className={fieldControlClass(helper, error, warning)}>
        <select id={fieldId} value={value} aria-invalid={error && !warning ? true : undefined} aria-describedby={describedBy} onChange={(event) => onChange(event.target.value)}>
          {options.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <FieldHelp id={helperId} helper={helper} />
        <FieldIssue id={issueId} issue={error} warning={warning} />
      </span>
    </label>
  );
}

export interface MultiSelectProps {
  label: string;
  selected: string[];
  options: string[];
  onChange: (next: string[]) => void;
  helper?: string;
  emptyHint?: string;
}

export function MultiSelect({ label, selected, options, onChange, helper, emptyHint }: MultiSelectProps) {
  function toggle(option: string) {
    onChange(selected.includes(option) ? selected.filter((item) => item !== option) : [...selected, option]);
  }

  return (
    <div className="field-block">
      <span className="field-label">{label}</span>
      {options.length === 0 ? (
        <small className="field-helper">{emptyHint ?? "No options available."}</small>
      ) : (
        <div className="chip-row" role="group" aria-label={label}>
          {options.map((option) => (
            <button
              key={option}
              type="button"
              className={`chip ${selected.includes(option) ? "chip-selected" : ""}`}
              aria-pressed={selected.includes(option)}
              onClick={() => toggle(option)}
            >
              {option}
            </button>
          ))}
        </div>
      )}
      {helper ? <small className="field-helper">{helper}</small> : null}
    </div>
  );
}

export interface ChipInputProps {
  label: string;
  values: string[];
  onChange: (next: string[]) => void;
  helper?: string;
  error?: string;
  warning?: boolean;
}

export function ChipInput({ label, values, onChange, helper, error, warning }: ChipInputProps) {
  const [draft, setDraft] = useState("");
  const fieldId = useId();
  const helperId = `${fieldId}-helper`;
  const issueId = `${fieldId}-issue`;
  const describedBy = describedByIds(helper ? helperId : undefined, error ? issueId : undefined);

  function commit() {
    const value = draft.trim();
    if (value && !values.includes(value)) {
      onChange([...values, value]);
    }
    setDraft("");
  }

  return (
    <div className="field-block">
      <label className="field-label" htmlFor={fieldId}>{label}</label>
      <div className="chip-row">
        {values.map((tag) => (
          <span key={tag} className="chip chip-selected">
            {tag}
            <button type="button" aria-label={`Remove ${tag}`} className="chip-remove" onClick={() => onChange(values.filter((item) => item !== tag))}>
              <X size={12} />
            </button>
          </span>
        ))}
      </div>
      <span className={fieldControlClass(helper, error, warning)}>
        <input
          id={fieldId}
          value={draft}
          placeholder="Add and press Enter"
          aria-invalid={error && !warning ? true : undefined}
          aria-describedby={describedBy}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commit();
            }
          }}
          onBlur={commit}
        />
        <FieldHelp id={helperId} helper={helper} />
        <FieldIssue id={issueId} issue={error} warning={warning} />
      </span>
    </div>
  );
}

function fieldControlClass(helper?: string, issue?: string, warning?: boolean): string {
  return ["field-control", helper ? "has-field-help" : "", issue ? "has-field-issue" : "", issue && warning ? "has-field-warning" : ""].filter(Boolean).join(" ");
}

function describedByIds(...ids: Array<string | undefined>): string | undefined {
  const presentIds = ids.filter(Boolean);
  return presentIds.length ? presentIds.join(" ") : undefined;
}

function FieldHelp({ id, helper }: { id: string; helper?: string }) {
  if (!helper) {
    return null;
  }

  return (
    <span className="field-help" tabIndex={0} aria-describedby={id} aria-label="Field help">
      <CircleHelp size={15} aria-hidden="true" />
      <small id={id} role="tooltip" className="field-helper">{helper}</small>
    </span>
  );
}

function FieldIssue({ id, issue, warning }: { id: string; issue?: string; warning?: boolean }) {
  if (!issue) {
    return null;
  }

  return (
    <span className={`field-issue ${warning ? "field-issue-warning" : "field-issue-error"}`} tabIndex={0} aria-describedby={id} aria-label={`${warning ? "Warning" : "Error"}: ${issue}`}>
      <AlertCircle size={15} aria-hidden="true" />
      <small id={id} role="tooltip" className="field-issue-tooltip">{issue}</small>
    </span>
  );
}

export interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  helper?: string;
  warning?: boolean;
}

export function Toggle({ label, checked, onChange, helper, warning }: ToggleProps) {
  const fieldId = useId();
  return (
    <div className="toggle-row">
      <input id={fieldId} type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <div>
        <label htmlFor={fieldId} className={warning && checked ? "toggle-warning" : undefined}>
          {label}
          {warning && checked ? <span className="warning-badge">destructive</span> : null}
        </label>
        {helper ? <small className="field-helper">{helper}</small> : null}
      </div>
    </div>
  );
}

export interface SliderProps {
  label: string;
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

export function Slider({ label, value, onChange, min = 0, max = 1, step = 0.1 }: SliderProps) {
  const fieldId = useId();
  return (
    <label htmlFor={fieldId}>
      <span>{label}: {value}</span>
      <input id={fieldId} type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

export interface CollapsibleProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

export function Collapsible({ title, children, defaultOpen = false, className }: CollapsibleProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`collapsible ${className ?? ""}`.trim()}>
      <button type="button" className="collapsible-header" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        <span>{title}</span>
      </button>
      {open ? <div className="collapsible-body">{children}</div> : null}
    </div>
  );
}

export interface RepeatableListProps {
  label: string;
  addLabel: string;
  onAdd: () => void;
  children: ReactNode;
}

export function RepeatableList({ label, addLabel, onAdd, children }: RepeatableListProps) {
  return (
    <div className="field-block">
      <span className="field-label">{label}</span>
      <button type="button" className="ghost" onClick={onAdd}>
        <Plus size={14} /> {addLabel}
      </button>
      <div className="editor-stack">{children}</div>
    </div>
  );
}

export interface KeyValueRowsProps {
  label: string;
  rows: Array<[string, string]>;
  onChange: (next: Array<[string, string]>) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
}

export function KeyValueRows({ label, rows, onChange, keyPlaceholder = "key", valuePlaceholder = "value" }: KeyValueRowsProps) {
  function update(index: number, position: 0 | 1, value: string) {
    const next = rows.map((row) => [...row] as [string, string]);
    next[index][position] = value;
    onChange(next);
  }

  return (
    <div className="field-block">
      <div className="field-block-header">
        <span className="field-label">{label}</span>
        <button type="button" className="ghost" onClick={() => onChange([...rows, ["", ""]])}>
          <Plus size={14} /> Add row
        </button>
      </div>
      {rows.map((row, index) => (
        <div className="inline-row" key={index}>
          <input value={row[0]} placeholder={keyPlaceholder} onChange={(event) => update(index, 0, event.target.value)} />
          <input value={row[1]} placeholder={valuePlaceholder} onChange={(event) => update(index, 1, event.target.value)} />
          <button type="button" className="icon-button danger" aria-label="Remove row" onClick={() => onChange(rows.filter((_, position) => position !== index))}>
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

export interface RemovableCardProps {
  title: string;
  onRemove: () => void;
  children: ReactNode;
  fieldId?: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
}

export function RemovableCard({ title, onRemove, children, fieldId, collapsible = false, defaultOpen = true }: RemovableCardProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={`entity-card ${collapsible ? "entity-card-collapsible" : ""}`.trim()} id={fieldId}>
      <div className="entity-card-header">
        {collapsible ? (
          <button type="button" className="entity-card-toggle" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
            {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            <strong>{title}</strong>
          </button>
        ) : (
          <strong>{title}</strong>
        )}
        <button type="button" className="icon-button danger" aria-label={`Remove ${title}`} onClick={onRemove}>
          <X size={15} />
        </button>
      </div>
      {open || !collapsible ? children : null}
    </div>
  );
}
