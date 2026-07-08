#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
UI_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SERVER_DIR="$UI_ROOT/packages/server"

cd "$UI_ROOT"

NEW_VERSION=$(node <<'NODE'
const { readFileSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");

const packagePaths = [
	"package.json",
	"packages/core/package.json",
	"packages/server/package.json",
	"packages/web/package.json"
];

function readJson(path) {
	return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path, value) {
	writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function bumpPatch(version) {
	const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
	if (!match) {
		throw new Error(`Cannot bump non-standard semver version: ${version}`);
	}

	return `${match[1]}.${match[2]}.${Number(match[3]) + 1}`;
}

const serverPackagePath = join("packages", "server", "package.json");
const newVersion = bumpPatch(readJson(serverPackagePath).version);

for (const packagePath of packagePaths) {
	const packageJson = readJson(packagePath);
	packageJson.version = newVersion;

	if (packageJson.dependencies?.["@mcp-designer/core"]) {
		packageJson.dependencies["@mcp-designer/core"] = newVersion;
	}

	if (packageJson.devDependencies?.["@mcp-designer/core"]) {
		packageJson.devDependencies["@mcp-designer/core"] = newVersion;
	}

	writeJson(packagePath, packageJson);
}

process.stdout.write(newVersion);
NODE
)

echo "Bumped MCP Designer packages to $NEW_VERSION"

npm install --package-lock-only --ignore-scripts
npm run typecheck
npm test
npm run build

cd "$SERVER_DIR"

npm publish --auth-type=web "$@"
