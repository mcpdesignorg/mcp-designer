import type { AuthScheme, EnvironmentVariable, UnknownRecord } from "@mcp-designer/core";
import { RemovableCard, Select, TextField } from "../../components/primitives.js";
import type { EditorProps } from "./shared.js";
import { applyExtensions, EnvironmentVariablesEditor, extensionEntries, MetaExtensionsEditor } from "./shared-fields.js";

const schemeTypeOptions = [
  { value: "none", label: "none" },
  { value: "oauth2", label: "oauth2" },
  { value: "env", label: "env" }
];

export function AuthEditor({ spec, updateSpec }: EditorProps) {
  const schemes = spec.auth?.schemes ?? {};
  const transports = spec.transports ?? [];
  const hasHttpTransport = transports.some((transport) => transport.type === "streamable-http" || transport.type === "sse");
  const hasStdioTransport = transports.some((transport) => transport.type === "stdio");

  function setScheme(key: string, next: AuthScheme) {
    updateSpec((draft) => {
      draft.auth = { ...draft.auth, schemes: { ...schemes, [key]: next } };
      return draft;
    });
  }

  function renameScheme(oldKey: string, newKey: string) {
    if (!newKey || newKey === oldKey || schemes[newKey]) {
      return;
    }
    updateSpec((draft) => {
      const nextSchemes: Record<string, AuthScheme> = {};
      for (const [key, value] of Object.entries(schemes)) {
        nextSchemes[key === oldKey ? newKey : key] = value;
      }
      draft.auth = { ...draft.auth, schemes: nextSchemes };
      return draft;
    });
  }

  function removeScheme(key: string) {
    updateSpec((draft) => {
      const nextSchemes = { ...schemes };
      delete nextSchemes[key];
      draft.auth = { ...draft.auth, schemes: nextSchemes };
      return draft;
    });
  }

  function addScheme() {
    let key = "scheme";
    let counter = 1;
    while (schemes[key]) {
      key = `scheme${counter++}`;
    }
    setScheme(key, { type: "none" });
  }

  return (
    <div className="editor-stack">
      <p className="field-helper">
        MCP auth follows the protocol surface: <code>oauth2</code> for HTTP transports, <code>env</code> for stdio secrets, or <code>none</code>. API keys and bearer headers belong under HTTP transport headers.
      </p>
      <button type="button" className="ghost" onClick={addScheme}>Add scheme</button>
      {Object.entries(schemes).map(([key, scheme]) => {
        const schemeType = (scheme as { type?: string }).type ?? "none";
        const options = schemeTypeOptions.some((option) => option.value === schemeType) ? schemeTypeOptions : [...schemeTypeOptions, { value: schemeType, label: `${schemeType} (legacy)` }];
        const unusedOauth2 = schemeType === "oauth2" && !hasHttpTransport;
        const unusedEnv = schemeType === "env" && !hasStdioTransport;
        return (
          <RemovableCard key={key} title={`${key} (${schemeType})`} onRemove={() => removeScheme(key)}>
            {unusedOauth2 ? (
              <p className="field-warning block">
                <strong>Unused scheme.</strong> An <code>oauth2</code> scheme applies to HTTP transports, but no
                {" "}<code>streamable-http</code> or <code>sse</code> transport is defined in Transports — this scheme will not be used.
              </p>
            ) : null}
            {unusedEnv ? (
              <p className="field-warning block">
                <strong>Unused scheme.</strong> An <code>env</code> scheme provides secrets to a local stdio process, but no
                {" "}<code>stdio</code> transport is defined in Transports — this scheme will not be used.
              </p>
            ) : null}
            <div className="form-grid">
              <TextField label="Key" value={key} onChange={(value) => renameScheme(key, value)} />
              <Select label="Type" value={schemeType} options={options} onChange={(value) => setScheme(key, normalizeScheme(value))} />
            </div>
            <SchemeFields schemeKey={key} scheme={scheme} setScheme={setScheme} />
            <MetaExtensionsEditor
              meta={(scheme as { meta?: UnknownRecord }).meta}
              onMetaChange={(next) => setScheme(key, { ...(scheme as Record<string, unknown>), meta: next } as AuthScheme)}
              extensions={extensionEntries(scheme as Record<string, unknown>)}
              onExtensionsChange={(next) => {
                const nextScheme = { ...(scheme as Record<string, unknown>) };
                applyExtensions(nextScheme, next);
                setScheme(key, nextScheme as AuthScheme);
              }}
            />
          </RemovableCard>
        );
      })}
      <MetaExtensionsEditor
        title="Auth meta & extensions"
        meta={spec.auth?.meta}
        onMetaChange={(next) => updateSpec((draft) => ((draft.auth = { ...draft.auth, meta: next }), draft))}
        extensions={extensionEntries(spec.auth)}
        onExtensionsChange={(next) =>
          updateSpec((draft) => {
            const nextAuth = { ...draft.auth };
            applyExtensions(nextAuth, next);
            draft.auth = nextAuth;
            return draft;
          })
        }
      />
    </div>
  );
}

function normalizeScheme(type: string): AuthScheme {
  switch (type) {
    case "oauth2":
      return { type: "oauth2", flows: {} };
    case "env":
      return { type: "env", variables: [] };
    default:
      return { type: "none" };
  }
}

function SchemeFields({ schemeKey, scheme, setScheme }: { schemeKey: string; scheme: AuthScheme; setScheme: (key: string, next: AuthScheme) => void }) {
  const type = (scheme as { type?: string }).type;

  if (type === "oauth2") {
    const oauth = scheme as { resourceMetadataUrl?: string };
    return (
      <div className="form-grid">
        <TextField label="Resource metadata URL" type="url" value={oauth.resourceMetadataUrl ?? ""} onChange={(value) => setScheme(schemeKey, { ...scheme, resourceMetadataUrl: value || undefined })} />
        <p className="field-helper full-row">OAuth flows can be authored in the YAML preview; key URLs are surfaced here.</p>
      </div>
    );
  }

  if (type === "env") {
    const env = scheme as { variables?: EnvironmentVariable[] };
    const variables = env.variables ?? [];
    return (
      <EnvironmentVariablesEditor variables={variables} onChange={(next) => setScheme(schemeKey, { ...scheme, variables: next })} />
    );
  }

  if (type && type !== "none") {
    return <p className="field-helper">Legacy auth scheme. Convert API keys or bearer tokens to HTTP transport headers, or use oauth2/env/none for MCP auth.</p>;
  }

  return <p className="field-helper">No additional configuration for this scheme type.</p>;
}
