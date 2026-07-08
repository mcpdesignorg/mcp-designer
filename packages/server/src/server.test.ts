import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "./app.js";

describe("server API", () => {
  it("lists, reads, creates, renames, duplicates, and deletes root specs", async () => {
    const dir = await mkdtemp(join(tmpdir(), "mcp-designer-"));
    await writeFile(join(dir, "demo.mcp.yaml"), "mcpds: \"0.9\"\nserver:\n  name: \"io.github.demo/server\"\n  description: \"Demo\"\n  version: \"0.1.0\"\ntransports:\n  - type: stdio\n", "utf8");
    const app = createApp(dir);

    const healthResponse = await request(app).get("/api/health").expect(200).expect("Content-Type", /json/);
    expect(healthResponse.body.ok).toBe(true);

    const listResponse = await request(app).get("/api/specs").expect(200);
    expect(listResponse.body.specs[0].name).toBe("demo.mcp.yaml");

    await request(app).get("/api/specs/demo.mcp.yaml").expect(200);
    await request(app).post("/api/specs").send({ fileName: "created.mcp.yaml" }).expect(201);
    await request(app).patch("/api/specs/created.mcp.yaml").send({ fileName: "renamed.mcp.yaml" }).expect(200);
    await request(app).post("/api/specs/renamed.mcp.yaml/duplicate").send({ fileName: "copy.mcp.yaml" }).expect(201);
    await request(app).delete("/api/specs/copy.mcp.yaml").expect(204);

    await expect(readFile(join(dir, "renamed.mcp.yaml"), "utf8")).resolves.toContain("mcpds");
  });

  it("rejects nested paths and non-MCP YAML filenames", async () => {
    const dir = await mkdtemp(join(tmpdir(), "mcp-designer-"));
    const app = createApp(dir);

    await request(app).post("/api/specs").send({ fileName: "nested/demo.mcp.yaml" }).expect(400);
    await request(app).post("/api/specs").send({ fileName: "openapi.yaml" }).expect(400);
  });

  it("exposes settings and toggles sync without persisting an invalid workspace", async () => {
    const dir = await mkdtemp(join(tmpdir(), "mcp-designer-"));
    process.env.MCP_DESIGNER_CONFIG = join(dir, "settings.json");
    const app = createApp(dir);

    const getResponse = await request(app).get("/api/settings").expect(200);
    expect(getResponse.body.syncEnabled).toBe(false);
    expect(getResponse.body.defaultWorkspaceDir).toBe(dir);

    const putResponse = await request(app).put("/api/settings").send({ syncEnabled: true }).expect(200);
    expect(putResponse.body.syncEnabled).toBe(true);
    expect(putResponse.body.workspaceDir).toBe(dir);

    await request(app).put("/api/settings").send({ workspaceDir: join(dir, "does-not-exist") }).expect(400);
    delete process.env.MCP_DESIGNER_CONFIG;
  });
});