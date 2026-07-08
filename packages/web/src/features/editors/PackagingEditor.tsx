import type { PackageArgument, PackageDefinition, UnknownRecord } from "@mcp-designer/core";
import { RemovableCard, Select, TextField } from "../../components/primitives.js";
import type { EditorProps } from "./shared.js";
import { issueFor } from "./shared.js";
import { applyExtensions, EnvironmentVariablesEditor, extensionEntries, JsonObjectArrayField, MetaExtensionsEditor } from "./shared-fields.js";

const registryOptions = [
  { value: "npm", label: "npm" },
  { value: "pypi", label: "pypi" },
  { value: "cargo", label: "cargo" },
  { value: "nuget", label: "nuget" },
  { value: "oci", label: "oci" },
  { value: "mcpb", label: "mcpb" }
];

const packageTransportOptions = [
  { value: "stdio", label: "stdio" },
  { value: "streamable-http", label: "streamable-http" },
  { value: "sse", label: "sse" }
];

export function PackagingEditor({ spec, updateSpec, issues }: EditorProps) {
  const packaging = spec.packaging ?? {};
  const packages = packaging.packages ?? [];

  function patchPackage(index: number, next: Partial<PackageDefinition>) {
    updateSpec((draft) => {
      draft.packaging = { ...packaging, packages: packages.map((item, position) => (position === index ? { ...item, ...next } : item)) };
      return draft;
    });
  }

  return (
    <div className="editor-stack">
      <div className="field-block">
        <span className="field-label">Packages</span>
        <button type="button" className="ghost" onClick={() => updateSpec((draft) => ((draft.packaging = { ...packaging, packages: [...packages, { registryType: "npm", transport: { type: "stdio" } }] }), draft))}>Add package</button>
        {packages.map((pkg, index) => {
          const isMcpb = pkg.registryType === "mcpb";
          const needsTransportUrl = pkg.transport?.type === "streamable-http" || pkg.transport?.type === "sse";
          return (
            <RemovableCard key={index} title={`${pkg.registryType ?? "package"} ${pkg.identifier ?? ""}`} onRemove={() => updateSpec((draft) => ((draft.packaging = { ...packaging, packages: packages.filter((_, position) => position !== index) }), draft))}>
              <div className="form-grid">
                <Select label="Registry type" value={pkg.registryType ?? "npm"} options={registryOptions} onChange={(value) => patchPackage(index, { registryType: value })} />
                <TextField label="Identifier" required value={pkg.identifier ?? ""} error={issueFor(issues, `/packaging/packages/${index}/identifier`)} onChange={(value) => patchPackage(index, { identifier: value || undefined })} />
                <TextField label="Version" value={pkg.version ?? ""} helper="Specific version when the registry uses one; omit for OCI and optional MCPB metadata." error={issueFor(issues, `/packaging/packages/${index}/version`)} onChange={(value) => patchPackage(index, { version: value || undefined })} />
                <Select label="Transport" value={pkg.transport?.type ?? "stdio"} options={packageTransportOptions} error={issueFor(issues, `/packaging/packages/${index}/transport`)} onChange={(value) => patchPackage(index, { transport: { ...pkg.transport, type: value } })} />
                {needsTransportUrl ? <TextField label="Transport URL" required value={pkg.transport?.url ?? ""} error={issueFor(issues, `/packaging/packages/${index}/transport/url`)} onChange={(value) => patchPackage(index, { transport: { ...pkg.transport, url: value || undefined } })} /> : null}
                <TextField label="Registry base URL" type="url" value={pkg.registryBaseUrl ?? ""} onChange={(value) => patchPackage(index, { registryBaseUrl: value || undefined })} />
                <TextField label="Runtime hint" value={pkg.runtimeHint ?? ""} onChange={(value) => patchPackage(index, { runtimeHint: value || undefined })} />
              </div>
              {isMcpb ? (
                <div className="highlight-field">
                  <TextField
                    label="File SHA-256 (required for mcpb)"
                    required
                    value={pkg.fileSha256 ?? ""}
                    helper="64-char hex digest of the .mcpb bundle."
                    error={issueFor(issues, `/packaging/packages/${index}/fileSha256`)}
                    onChange={(value) => patchPackage(index, { fileSha256: value || undefined })}
                  />
                </div>
              ) : null}
              <EnvironmentVariablesEditor
                variables={pkg.environmentVariables ?? []}
                onChange={(next) => patchPackage(index, { environmentVariables: next.length ? next : undefined })}
              />
              <JsonObjectArrayField
                label="Runtime arguments"
                addLabel="Add runtime argument"
                value={(pkg.runtimeArguments as UnknownRecord[]) ?? []}
                onChange={(next) => patchPackage(index, { runtimeArguments: next as PackageArgument[] })}
              />
              <JsonObjectArrayField
                label="Package arguments"
                addLabel="Add package argument"
                value={(pkg.packageArguments as UnknownRecord[]) ?? []}
                onChange={(next) => patchPackage(index, { packageArguments: next as PackageArgument[] })}
              />
              <MetaExtensionsEditor
                meta={pkg.meta}
                onMetaChange={(next) => patchPackage(index, { meta: next })}
                extensions={extensionEntries(pkg)}
                onExtensionsChange={(next) =>
                  updateSpec((draft) => {
                    const list = draft.packaging?.packages;
                    if (list) {
                      applyExtensions(list[index], next);
                    }
                    return draft;
                  })
                }
              />
            </RemovableCard>
          );
        })}
      </div>
      <MetaExtensionsEditor
        title="Packaging meta & extensions"
        meta={packaging.meta}
        onMetaChange={(next) => updateSpec((draft) => ((draft.packaging = { ...packaging, meta: next }), draft))}
        extensions={extensionEntries(packaging)}
        onExtensionsChange={(next) =>
          updateSpec((draft) => {
            const nextPackaging = { ...packaging };
            applyExtensions(nextPackaging, next);
            draft.packaging = nextPackaging;
            return draft;
          })
        }
      />
    </div>
  );
}
