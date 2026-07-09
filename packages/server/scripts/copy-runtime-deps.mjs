import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const uiRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const serverDist = resolve(uiRoot, "packages/server/dist");

await copyCorePackage();
await copySpecPackage();

async function copyCorePackage() {
  const source = resolve(uiRoot, "packages/core");
  const target = resolve(serverDist, "node_modules/@mcp-designer/core");
  const packageJson = JSON.parse(await readFile(resolve(source, "package.json"), "utf8"));

  await rm(target, { recursive: true, force: true });
  await mkdir(target, { recursive: true });
  await cp(resolve(source, "dist"), resolve(target, "dist"), { recursive: true, force: true });
  await writeFile(
    resolve(target, "package.json"),
    `${JSON.stringify({
      name: packageJson.name,
      version: packageJson.version,
      type: packageJson.type,
      main: packageJson.main,
      types: packageJson.types,
      exports: packageJson.exports
    }, null, 2)}\n`,
    "utf8"
  );
}

async function copySpecPackage() {
  const source = resolve(uiRoot, "node_modules/@mcpds/spec");
  const target = resolve(serverDist, "node_modules/@mcpds/spec");
  const packageJson = JSON.parse(await readFile(resolve(source, "package.json"), "utf8"));

  await rm(target, { recursive: true, force: true });
  await mkdir(target, { recursive: true });
  await cp(resolve(source, "dist"), resolve(target, "dist"), { recursive: true, force: true });
  await cp(resolve(source, "schemas"), resolve(target, "schemas"), { recursive: true, force: true });
  await writeFile(
    resolve(target, "package.json"),
    `${JSON.stringify({
      name: packageJson.name,
      version: packageJson.version,
      type: packageJson.type,
      bin: packageJson.bin,
      main: packageJson.main,
      types: packageJson.types,
      exports: packageJson.exports
    }, null, 2)}\n`,
    "utf8"
  );
}