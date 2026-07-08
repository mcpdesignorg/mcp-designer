import type { JsonSchemaObject, JsonValue, McpdsDocument, PackageArgument, PackageDefinition, PromptDefinition, ResourceDefinition, ResourceTemplateDefinition, ToolDefinition, Transport } from "@mcp-designer/core";

interface DocumentationViewProps {
  html: string;
}

type TagTone = "default" | "success" | "warn" | "danger";

export function DocumentationView({ html }: DocumentationViewProps) {
  return (
    <div className="documentation-frame-wrapper">
      <iframe className="documentation-frame" title="MCP server documentation" srcDoc={html} sandbox="" />
    </div>
  );
}

export function generateMcpDocumentationHtml(spec: McpdsDocument): string {
  const serverTitle = spec.server.title || spec.server.name || "MCP Server";
  const counts = {
    transports: spec.transports?.length ?? 0,
    tools: spec.tools?.length ?? 0,
    resources: (spec.resources?.length ?? 0) + (spec.resourceTemplates?.length ?? 0),
    prompts: spec.prompts?.length ?? 0,
    packages: spec.packaging?.packages?.length ?? 0
  };

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(serverTitle)} MCP Documentation</title>
  <style>${documentationDarkCss()}</style>
</head>
<body>
  <main class="doc-shell">
    <header class="hero">
      <div class="hero-main">
        <span class="eyebrow">MCPDS ${escapeHtml(spec.mcpds)}</span>
        <h1>${escapeHtml(serverTitle)}</h1>
        <p>${escapeHtml(spec.server.description || "No server description provided.")}</p>
        <div class="hero-links">
          ${spec.server.websiteUrl ? `<a href="${escapeAttribute(spec.server.websiteUrl)}">Website</a>` : ""}
          ${spec.server.repository?.url ? `<a href="${escapeAttribute(spec.server.repository.url)}">Repository</a>` : ""}
          ${spec.server.license ? `<span>${escapeHtml(spec.server.license)}</span>` : ""}
        </div>
      </div>
      <aside class="hero-card" aria-label="Server summary">
        ${summaryRow("Name", spec.server.name)}
        ${summaryRow("Version", spec.server.version)}
        ${summaryRow("Transports", String(counts.transports))}
        ${summaryRow("Tools", String(counts.tools))}
      </aside>
    </header>

    <nav class="top-nav" aria-label="Documentation sections">
      <a href="#overview">Overview</a>
      <a href="#transports">Transports</a>
      <a href="#auth">Auth</a>
      <a href="#tools">Tools</a>
      <a href="#resources">Resources</a>
      <a href="#prompts">Prompts</a>
      <a href="#packages">Packages</a>
    </nav>

    <section id="overview" class="section-block">
      <div class="section-heading">
        <span>01</span>
        <div>
          <h2>Overview</h2>
          <p>Capabilities and implementation hints exposed by this MCP server.</p>
        </div>
      </div>
      <div class="metric-grid">
        ${metricCard("Transports", counts.transports, "Configured connection methods")}
        ${metricCard("Tools", counts.tools, "Callable operations")}
        ${metricCard("Resources", counts.resources, "Static and templated resources")}
        ${metricCard("Prompts", counts.prompts, "Reusable prompt contracts")}
        ${metricCard("Packages", counts.packages, "Distribution entries")}
      </div>
      ${spec.instructions ? `<article class="callout"><h3>Instructions</h3><p>${escapeHtml(spec.instructions)}</p></article>` : ""}
      ${capabilitiesHtml(spec)}
    </section>

    <section id="transports" class="section-block">
      <div class="section-heading">
        <span>02</span>
        <div>
          <h2>Transports</h2>
          <p>Connection surfaces available for clients.</p>
        </div>
      </div>
      ${collectionHtml(spec.transports ?? [], transportCard, "No transports are defined.")}
    </section>

    <section id="auth" class="section-block">
      <div class="section-heading">
        <span>03</span>
        <div>
          <h2>Authentication</h2>
          <p>Authentication schemes and required client-side values.</p>
        </div>
      </div>
      ${authHtml(spec)}
    </section>

    <section id="tools" class="section-block">
      <div class="section-heading">
        <span>04</span>
        <div>
          <h2>Tools</h2>
          <p>Callable model-facing operations, schemas, annotations, and examples.</p>
        </div>
      </div>
      ${collectionHtml(spec.tools ?? [], toolCard, "No tools are defined.")}
    </section>

    <section id="resources" class="section-block">
      <div class="section-heading">
        <span>05</span>
        <div>
          <h2>Resources</h2>
          <p>Readable resources and URI templates exposed by the server.</p>
        </div>
      </div>
      ${resourcesHtml(spec)}
    </section>

    <section id="prompts" class="section-block">
      <div class="section-heading">
        <span>06</span>
        <div>
          <h2>Prompts</h2>
          <p>Prompt templates and their arguments.</p>
        </div>
      </div>
      ${collectionHtml(spec.prompts ?? [], promptCard, "No prompts are defined.")}
    </section>

    <section id="packages" class="section-block">
      <div class="section-heading">
        <span>07</span>
        <div>
          <h2>Packages</h2>
          <p>Installable package metadata and runtime configuration.</p>
        </div>
      </div>
      ${collectionHtml(spec.packaging?.packages ?? [], packageCard, "No packages are defined.")}
    </section>
  </main>
</body>
</html>`;
}

function documentationDarkCss(): string {
  return `:root{color:#f3f6fb;background:#0e1525;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:14px;line-height:1.5;color-scheme:dark}*{box-sizing:border-box}html{scroll-behavior:smooth;background:#0e1525}body{margin:0;min-height:100vh;background:radial-gradient(circle at 18% -10%,rgba(56,189,248,.18),transparent 30%),linear-gradient(180deg,#0e1525 0,#111b2d 48%,#0b1220 100%);color:#f3f6fb}.doc-shell{width:min(1180px,calc(100% - 32px));margin:0 auto;padding:28px 0 56px}.hero{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:24px;align-items:stretch;padding:34px;border:1px solid #2c3852;border-radius:18px;background:linear-gradient(135deg,rgba(22,31,51,.98) 0%,rgba(29,40,64,.96) 66%,rgba(18,43,64,.92) 100%);box-shadow:0 22px 58px rgba(0,0,0,.36)}.hero-main{display:flex;flex-direction:column;gap:14px}.eyebrow{width:max-content;border:1px solid rgba(56,189,248,.35);border-radius:999px;background:rgba(56,189,248,.14);color:#7dd3fc;padding:4px 10px;font-size:12px;font-weight:750;letter-spacing:.05em;text-transform:uppercase}.hero h1{margin:0;color:#ffffff;font-size:clamp(32px,5vw,58px);line-height:.98;letter-spacing:-.04em}.hero p{max-width:720px;margin:0;color:#c2cddd;font-size:16px}.hero-links{display:flex;flex-wrap:wrap;gap:8px;margin-top:auto}.hero-links a,.hero-links span{border:1px solid #2c3852;border-radius:999px;background:#1d2840;color:#dff6ff;text-decoration:none;padding:7px 11px;font-weight:650}.hero-links a:hover{border-color:#38bdf8;background:rgba(56,189,248,.14);color:#ffffff}.hero-card{display:grid;gap:1px;overflow:hidden;border:1px solid #2c3852;border-radius:14px;background:#2c3852}.summary-row{display:flex;justify-content:space-between;gap:16px;background:#161f33;padding:13px 15px}.summary-row span:first-child{color:#8493aa}.summary-row span:last-child{font-weight:750;text-align:right;color:#f3f6fb}.top-nav{position:sticky;top:0;z-index:5;display:flex;gap:6px;overflow:auto;margin:18px 0 24px;padding:8px;border:1px solid #2c3852;border-radius:14px;background:rgba(19,28,45,.9);backdrop-filter:blur(14px);box-shadow:0 12px 30px rgba(0,0,0,.3)}.top-nav a{white-space:nowrap;border-radius:10px;color:#c2cddd;text-decoration:none;padding:8px 11px;font-weight:700}.top-nav a:hover{background:rgba(56,189,248,.14);color:#7dd3fc}.section-block{display:grid;gap:16px;margin-top:28px}.section-heading{display:flex;gap:14px;align-items:flex-start}.section-heading>span{display:grid;place-items:center;width:36px;height:36px;border:1px solid rgba(56,189,248,.28);border-radius:10px;background:rgba(56,189,248,.14);color:#7dd3fc;font-weight:800}.section-heading h2{margin:0;color:#ffffff;font-size:25px;letter-spacing:-.025em}.section-heading p{margin:2px 0 0;color:#8493aa}.metric-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px}.metric-card,.item-card,.callout,.empty-state{border:1px solid #2c3852;border-radius:14px;background:#161f33;box-shadow:0 10px 28px rgba(0,0,0,.22)}.metric-card{padding:17px}.metric-card strong{display:block;font-size:30px;line-height:1;color:#7dd3fc}.metric-card span{display:block;margin-top:7px;color:#f3f6fb;font-weight:750}.metric-card small{display:block;margin-top:3px;color:#8493aa}.item-grid{display:grid;gap:14px}.item-card{overflow:hidden}.item-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;padding:17px 18px;border-bottom:1px solid #243149;background:#1d2840}.item-head h3{margin:0;color:#ffffff;font-size:18px;letter-spacing:-.015em}.item-head p{margin:5px 0 0;color:#c2cddd}.item-body{display:grid;gap:14px;padding:17px 18px}.tag-row{display:flex;flex-wrap:wrap;gap:7px}.tag{display:inline-flex;align-items:center;gap:5px;border:1px solid #33435f;border-radius:999px;background:#1d2840;color:#c2cddd;padding:4px 9px;font-size:12px;font-weight:750}.tag-success{border-color:rgba(34,197,94,.35);background:rgba(34,197,94,.13);color:#86efac}.tag-warn{border-color:rgba(251,191,36,.35);background:rgba(251,191,36,.14);color:#fde68a}.tag-danger{border-color:rgba(251,113,133,.4);background:rgba(251,113,133,.16);color:#fda4af}.kv-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.kv{display:grid;gap:2px;border:1px solid #243149;border-radius:10px;background:#111b2d;padding:10px}.kv span{color:#8493aa;font-size:12px;font-weight:750;text-transform:uppercase;letter-spacing:.04em}.kv strong{overflow-wrap:anywhere;color:#f3f6fb}.subsection{display:grid;gap:8px}.subsection h4{margin:0;color:#c2cddd;font-size:13px;text-transform:uppercase;letter-spacing:.06em}.schema-table{width:100%;border-collapse:separate;border-spacing:0;overflow:hidden;border:1px solid #2c3852;border-radius:12px}.schema-table th,.schema-table td{text-align:left;vertical-align:top;border-bottom:1px solid #243149;padding:10px}.schema-table th{background:#1d2840;color:#c2cddd;font-size:12px;text-transform:uppercase;letter-spacing:.05em}.schema-table tr:last-child td{border-bottom:0}.schema-table code,.code-block{font-family:"JetBrains Mono",ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}.schema-table code{color:#dff6ff}.code-block{overflow:auto;border:1px solid #2c3852;border-radius:12px;background:#0b1220;color:#dbeafe;padding:13px;font-size:12px;line-height:1.6}.callout,.empty-state{padding:17px 18px}.callout h3{margin:0 0 6px;color:#ffffff;font-size:15px}.callout p,.empty-state p{margin:0;color:#c2cddd}.empty-state{border-style:dashed;background:rgba(22,31,51,.72)}.split{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}@media (max-width:860px){.doc-shell{width:min(100% - 20px,1180px);padding-top:14px}.hero{grid-template-columns:1fr;padding:22px}.hero h1{font-size:34px}.metric-grid,.kv-grid,.split{grid-template-columns:1fr}.top-nav{position:static}.section-heading h2{font-size:21px}}`;
}

function documentationCss(): string {
  return `:root{color:#172033;background:#f6f8fb;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:14px;line-height:1.5}*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:linear-gradient(180deg,#f8fbff 0,#eef3f8 100%);color:#172033}.doc-shell{width:min(1180px,calc(100% - 32px));margin:0 auto;padding:28px 0 56px}.hero{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:24px;align-items:stretch;padding:34px;border:1px solid #dbe4ef;border-radius:18px;background:linear-gradient(135deg,#ffffff 0%,#f4f8fc 68%,#edf6f8 100%);box-shadow:0 18px 48px rgba(21,35,59,.08)}.hero-main{display:flex;flex-direction:column;gap:14px}.eyebrow{width:max-content;border:1px solid #bfd6ea;border-radius:999px;background:#e8f3ff;color:#075985;padding:4px 10px;font-size:12px;font-weight:750;letter-spacing:.05em;text-transform:uppercase}.hero h1{margin:0;font-size:clamp(32px,5vw,58px);line-height:.98;letter-spacing:-.04em}.hero p{max-width:720px;margin:0;color:#536176;font-size:16px}.hero-links{display:flex;flex-wrap:wrap;gap:8px;margin-top:auto}.hero-links a,.hero-links span{border:1px solid #d7e1ec;border-radius:999px;background:#fff;color:#1e4f7a;text-decoration:none;padding:7px 11px;font-weight:650}.hero-card{display:grid;gap:1px;overflow:hidden;border:1px solid #d8e2ee;border-radius:14px;background:#d8e2ee}.summary-row{display:flex;justify-content:space-between;gap:16px;background:#fff;padding:13px 15px}.summary-row span:first-child{color:#64748b}.summary-row span:last-child{font-weight:750;text-align:right}.top-nav{position:sticky;top:0;z-index:5;display:flex;gap:6px;overflow:auto;margin:18px 0 24px;padding:8px;border:1px solid #dbe4ef;border-radius:14px;background:rgba(255,255,255,.9);backdrop-filter:blur(14px);box-shadow:0 10px 26px rgba(21,35,59,.06)}.top-nav a{white-space:nowrap;border-radius:10px;color:#536176;text-decoration:none;padding:8px 11px;font-weight:700}.top-nav a:hover{background:#e8f3ff;color:#075985}.section-block{display:grid;gap:16px;margin-top:28px}.section-heading{display:flex;gap:14px;align-items:flex-start}.section-heading>span{display:grid;place-items:center;width:36px;height:36px;border-radius:10px;background:#10233d;color:#fff;font-weight:800}.section-heading h2{margin:0;font-size:25px;letter-spacing:-.025em}.section-heading p{margin:2px 0 0;color:#65758b}.metric-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px}.metric-card,.item-card,.callout,.empty-state{border:1px solid #dce5ef;border-radius:14px;background:#fff;box-shadow:0 8px 24px rgba(21,35,59,.045)}.metric-card{padding:17px}.metric-card strong{display:block;font-size:30px;line-height:1;color:#0f5f91}.metric-card span{display:block;margin-top:7px;color:#172033;font-weight:750}.metric-card small{display:block;margin-top:3px;color:#64748b}.item-grid{display:grid;gap:14px}.item-card{overflow:hidden}.item-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;padding:17px 18px;border-bottom:1px solid #edf1f6;background:#fbfdff}.item-head h3{margin:0;font-size:18px;letter-spacing:-.015em}.item-head p{margin:5px 0 0;color:#64748b}.item-body{display:grid;gap:14px;padding:17px 18px}.tag-row{display:flex;flex-wrap:wrap;gap:7px}.tag{display:inline-flex;align-items:center;gap:5px;border:1px solid #d8e3ee;border-radius:999px;background:#f8fafc;color:#475569;padding:4px 9px;font-size:12px;font-weight:750}.tag-success{border-color:#bbf7d0;background:#ecfdf5;color:#15803d}.tag-warn{border-color:#fde68a;background:#fffbeb;color:#a16207}.tag-danger{border-color:#fecdd3;background:#fff1f2;color:#be123c}.kv-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.kv{display:grid;gap:2px;border:1px solid #e6edf5;border-radius:10px;background:#f8fafc;padding:10px}.kv span{color:#64748b;font-size:12px;font-weight:750;text-transform:uppercase;letter-spacing:.04em}.kv strong{overflow-wrap:anywhere}.subsection{display:grid;gap:8px}.subsection h4{margin:0;color:#334155;font-size:13px;text-transform:uppercase;letter-spacing:.06em}.schema-table{width:100%;border-collapse:separate;border-spacing:0;overflow:hidden;border:1px solid #e1e8f0;border-radius:12px}.schema-table th,.schema-table td{text-align:left;vertical-align:top;border-bottom:1px solid #e8eef5;padding:10px}.schema-table th{background:#f2f6fa;color:#475569;font-size:12px;text-transform:uppercase;letter-spacing:.05em}.schema-table tr:last-child td{border-bottom:0}.schema-table code,.code-block{font-family:"JetBrains Mono",ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}.code-block{overflow:auto;border:1px solid #e1e8f0;border-radius:12px;background:#0f172a;color:#dbeafe;padding:13px;font-size:12px;line-height:1.6}.callout,.empty-state{padding:17px 18px}.callout h3{margin:0 0 6px;font-size:15px}.callout p,.empty-state p{margin:0;color:#64748b}.empty-state{border-style:dashed}.split{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}@media (max-width:860px){.doc-shell{width:min(100% - 20px,1180px);padding-top:14px}.hero{grid-template-columns:1fr;padding:22px}.hero h1{font-size:34px}.metric-grid,.kv-grid,.split{grid-template-columns:1fr}.top-nav{position:static}.section-heading h2{font-size:21px}}`;
}

function capabilitiesHtml(spec: McpdsDocument): string {
  const capabilities = spec.capabilities;
  const clientCapabilities = spec.requiresClientCapabilities ?? [];
  const tags: string[] = [];

  if (capabilities?.tools) tags.push(tag("Tools", "success"));
  if (capabilities?.resources) tags.push(tag("Resources", "success"));
  if (capabilities?.prompts) tags.push(tag("Prompts", "success"));
  if (capabilities?.logging) tags.push(tag("Logging", "default"));
  if (capabilities?.completions) tags.push(tag("Completions", "default"));
  if (capabilities?.tasks) tags.push(tag("Tasks", "default"));
  for (const [name, enabled] of Object.entries(capabilities?.experimental ?? {})) {
    if (enabled) tags.push(tag(`Experimental: ${name}`, "warn"));
  }

  return `<article class="callout"><h3>Capabilities</h3><div class="tag-row">${tags.length ? tags.join("") : tag("No capabilities declared", "warn")}</div>${clientCapabilities.length ? `<p>Requires client capabilities: ${clientCapabilities.map(escapeHtml).join(", ")}</p>` : ""}</article>`;
}

function authHtml(spec: McpdsDocument): string {
  const schemes = Object.entries(spec.auth?.schemes ?? {});
  if (!schemes.length) {
    return emptyState("No authentication schemes are defined.");
  }

  return `<div class="item-grid">${schemes.map(([name, scheme]) => {
    const schemeRecord = scheme as Record<string, unknown>;
    const variables = Array.isArray(schemeRecord.variables) ? schemeRecord.variables as Array<Record<string, unknown>> : [];
    return `<article class="item-card">
      <div class="item-head"><div><h3>${escapeHtml(name)}</h3><p>${escapeHtml(String(schemeRecord.type ?? "custom"))}</p></div>${tag(String(schemeRecord.type ?? "custom"))}</div>
      <div class="item-body">
        ${schemeRecord.resourceMetadataUrl ? kvGrid([["Metadata URL", String(schemeRecord.resourceMetadataUrl)]]) : ""}
        ${variables.length ? `<div class="subsection"><h4>Environment variables</h4>${schemaTable(variables.map((variable) => ({ name: String(variable.name ?? ""), type: variable.isSecret ? "secret" : "string", required: Boolean(variable.isRequired), description: String(variable.description ?? "") })))}</div>` : ""}
      </div>
    </article>`;
  }).join("")}</div>`;
}

function transportCard(transport: Transport, index: number): string {
  const variables = Object.entries(transport.variables ?? {}).map(([name, variable]) => ({ name, type: valueType(variable.default), required: Boolean(variable.isRequired), description: variable.description ?? "" }));
  const headers = (transport.headers ?? []).map((header) => ({ name: header.name, type: header.isSecret ? "secret" : "string", required: Boolean(header.isRequired), description: header.description ?? "" }));

  return `<article class="item-card">
    <div class="item-head"><div><h3>${escapeHtml(transport.type || `transport-${index + 1}`)}</h3><p>${escapeHtml(transport.url || "Local process transport")}</p></div>${tag(transport.type || "transport")}</div>
    <div class="item-body">
      ${kvGrid([["URL", transport.url], ["Sessions", boolText(transport.sessions)], ["SSE", boolText(transport.sse)], ["CORS origins", transport.cors?.allowedOrigins?.join(", ")]])}
      ${variables.length ? `<div class="subsection"><h4>Variables</h4>${schemaTable(variables)}</div>` : ""}
      ${headers.length ? `<div class="subsection"><h4>Headers</h4>${schemaTable(headers)}</div>` : ""}
    </div>
  </article>`;
}

function toolCard(tool: ToolDefinition): string {
  const annotationTags = [
    tool.annotations?.readOnlyHint ? tag("read only", "success") : "",
    tool.annotations?.destructiveHint ? tag("destructive", "danger") : "",
    tool.annotations?.idempotentHint ? tag("idempotent", "default") : "",
    tool.annotations?.openWorldHint ? tag("open world", "warn") : "",
    tool.execution?.taskSupport ? tag(`tasks: ${tool.execution.taskSupport}`) : ""
  ].filter(Boolean).join("");

  return `<article class="item-card">
    <div class="item-head"><div><h3>${escapeHtml(tool.title || tool.name)}</h3><p>${escapeHtml(tool.description || "No tool description provided.")}</p></div>${tag(tool.name)}</div>
    <div class="item-body">
      ${annotationTags ? `<div class="tag-row">${annotationTags}</div>` : ""}
      <div class="split">
        <div class="subsection"><h4>Input schema</h4>${schemaObjectHtml(tool.inputSchema)}</div>
        <div class="subsection"><h4>Output schema</h4>${tool.outputSchema ? schemaObjectHtml(tool.outputSchema) : emptyState("No output schema defined.")}</div>
      </div>
      ${tool.examples?.length ? `<div class="subsection"><h4>Examples</h4>${tool.examples.map((example) => `<pre class="code-block">${escapeHtml(JSON.stringify(example, null, 2))}</pre>`).join("")}</div>` : ""}
    </div>
  </article>`;
}

function resourcesHtml(spec: McpdsDocument): string {
  const resourceCards = (spec.resources ?? []).map(resourceCard).join("");
  const templateCards = (spec.resourceTemplates ?? []).map(templateCard).join("");
  return resourceCards || templateCards ? `<div class="item-grid">${resourceCards}${templateCards}</div>` : emptyState("No resources are defined.");
}

function resourceCard(resource: ResourceDefinition): string {
  return `<article class="item-card">
    <div class="item-head"><div><h3>${escapeHtml(resource.title || resource.name)}</h3><p>${escapeHtml(resource.description || resource.uri)}</p></div>${tag("resource")}</div>
    <div class="item-body">${kvGrid([["URI", resource.uri], ["MIME type", resource.mimeType], ["Size", resource.size == null ? undefined : String(resource.size)], ["Priority", resource.annotations?.priority == null ? undefined : String(resource.annotations.priority)], ["Audience", resource.annotations?.audience?.join(", ")], ["Last modified", resource.annotations?.lastModified]])}</div>
  </article>`;
}

function templateCard(template: ResourceTemplateDefinition): string {
  const parameters = (template.parameters ?? []).map((parameter) => ({ name: parameter.name, type: parameter.completion ? "completion" : "string", required: Boolean(parameter.required), description: parameter.description ?? "" }));
  return `<article class="item-card">
    <div class="item-head"><div><h3>${escapeHtml(template.title || template.name)}</h3><p>${escapeHtml(template.description || template.uriTemplate)}</p></div>${tag("template", "warn")}</div>
    <div class="item-body">
      ${kvGrid([["URI template", template.uriTemplate], ["MIME type", template.mimeType], ["Audience", template.annotations?.audience?.join(", ")]])}
      ${parameters.length ? `<div class="subsection"><h4>Parameters</h4>${schemaTable(parameters)}</div>` : ""}
    </div>
  </article>`;
}

function promptCard(prompt: PromptDefinition): string {
  const argumentsTable = (prompt.arguments ?? []).map((argument) => ({ name: argument.name, type: argument.title || "string", required: Boolean(argument.required), description: argument.description ?? "" }));
  return `<article class="item-card">
    <div class="item-head"><div><h3>${escapeHtml(prompt.title || prompt.name)}</h3><p>${escapeHtml(prompt.description || "No prompt description provided.")}</p></div>${tag(prompt.name)}</div>
    <div class="item-body">${argumentsTable.length ? `<div class="subsection"><h4>Arguments</h4>${schemaTable(argumentsTable)}</div>` : emptyState("No arguments defined.")}</div>
  </article>`;
}

function packageCard(packageDefinition: PackageDefinition): string {
  const runtimeArguments = argumentRows(packageDefinition.runtimeArguments ?? []);
  const packageArguments = argumentRows(packageDefinition.packageArguments ?? []);
  const environmentVariables = (packageDefinition.environmentVariables ?? []).map((variable) => ({ name: variable.name, type: variable.isSecret ? "secret" : variable.format ?? "string", required: Boolean(variable.isRequired), description: variable.description ?? "" }));
  return `<article class="item-card">
    <div class="item-head"><div><h3>${escapeHtml(packageDefinition.identifier || "Package")}</h3><p>${escapeHtml(packageDefinition.registryType || "custom registry")}</p></div>${tag(packageDefinition.version || "package")}</div>
    <div class="item-body">
      ${kvGrid([["Registry", packageDefinition.registryType], ["Registry URL", packageDefinition.registryBaseUrl], ["Version", packageDefinition.version], ["Runtime", packageDefinition.runtimeHint], ["Transport", packageDefinition.transport?.type], ["Package SHA-256", packageDefinition.fileSha256]])}
      ${runtimeArguments.length ? `<div class="subsection"><h4>Runtime arguments</h4>${schemaTable(runtimeArguments)}</div>` : ""}
      ${packageArguments.length ? `<div class="subsection"><h4>Package arguments</h4>${schemaTable(packageArguments)}</div>` : ""}
      ${environmentVariables.length ? `<div class="subsection"><h4>Environment variables</h4>${schemaTable(environmentVariables)}</div>` : ""}
    </div>
  </article>`;
}

function argumentRows(argumentsList: PackageArgument[]) {
  return argumentsList.map((argument) => ({ name: argument.name || argument.valueHint || argument.type, type: argument.type, required: Boolean(argument.isRequired), description: argument.description ?? "" }));
}

function schemaObjectHtml(schema: JsonSchemaObject): string {
  const propertyRows = Object.entries(schema.properties ?? {}).map(([name, property]) => ({
    name,
    type: schemaType(property),
    required: schema.required?.includes(name) ?? false,
    description: property.description ?? property.title ?? enumText(property.enum) ?? ""
  }));

  if (propertyRows.length) {
    return schemaTable(propertyRows);
  }

  return `<pre class="code-block">${escapeHtml(JSON.stringify(schema, null, 2))}</pre>`;
}

function schemaTable(rows: Array<{ name: string; type?: string; required?: boolean; description?: string }>): string {
  return `<table class="schema-table"><thead><tr><th>Name</th><th>Type</th><th>Required</th><th>Description</th></tr></thead><tbody>${rows.map((row) => `<tr><td><code>${escapeHtml(row.name)}</code></td><td>${escapeHtml(row.type || "value")}</td><td>${row.required ? tag("required", "warn") : tag("optional")}</td><td>${escapeHtml(row.description || "")}</td></tr>`).join("")}</tbody></table>`;
}

function collectionHtml<T>(items: T[], renderItem: (item: T, index: number) => string, emptyMessage: string): string {
  return items.length ? `<div class="item-grid">${items.map(renderItem).join("")}</div>` : emptyState(emptyMessage);
}

function metricCard(label: string, value: number, description: string): string {
  return `<article class="metric-card"><strong>${value}</strong><span>${escapeHtml(label)}</span><small>${escapeHtml(description)}</small></article>`;
}

function summaryRow(label: string, value: string | undefined): string {
  return `<div class="summary-row"><span>${escapeHtml(label)}</span><span>${escapeHtml(value || "Not specified")}</span></div>`;
}

function kvGrid(values: Array<[string, string | undefined]>): string {
  const rows = values.filter(([, value]) => value !== undefined && value !== "");
  return rows.length ? `<div class="kv-grid">${rows.map(([label, value]) => `<div class="kv"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value ?? "")}</strong></div>`).join("")}</div>` : "";
}

function tag(label: string, tone: TagTone = "default"): string {
  const toneClass = tone === "default" ? "" : ` tag-${tone}`;
  return `<span class="tag${toneClass}">${escapeHtml(label)}</span>`;
}

function emptyState(message: string): string {
  return `<article class="empty-state"><p>${escapeHtml(message)}</p></article>`;
}

function schemaType(schema: JsonSchemaObject): string {
  if (schema.$ref) return schema.$ref;
  if (Array.isArray(schema.type)) return schema.type.join(" | ");
  if (schema.type) return schema.type;
  if (schema.enum) return "enum";
  if (schema.properties) return "object";
  if (schema.items) return "array";
  return "value";
}

function enumText(values: JsonValue[] | undefined): string | undefined {
  return values?.length ? `Allowed values: ${values.map((value) => JSON.stringify(value)).join(", ")}` : undefined;
}

function valueType(value: JsonValue | undefined): string {
  if (value === undefined) return "value";
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function boolText(value: boolean | undefined): string | undefined {
  return value === undefined ? undefined : value ? "Yes" : "No";
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(value: string): string {
  return escapeHtml(value).replace(/`/g, "&#96;");
}