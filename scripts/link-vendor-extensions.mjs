#!/usr/bin/env node
/**
 * Symlink unpublished vendor extensions into this app (no file: in package.json).
 * Avoids `npm link <pkg>` in the app, which rewrites registry installs and can
 * replace locally linked @executioncontrolprotocol/core.
 *
 * Usage (from browser-demo root):
 *   node scripts/link-vendor-extensions.mjs
 *   EXTENSIONS_ROOT=/path/to/extensions node scripts/link-vendor-extensions.mjs
 */
import { spawnSync } from "node:child_process"
import { existsSync, mkdirSync, rmSync, symlinkSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const PACKAGES = ["fal", "image-sharp"]
const SHARED_PEERS = ["@executioncontrolprotocol/core", "@executioncontrolprotocol/types"]

const demoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const extensionsRoot = path.resolve(
  process.env.EXTENSIONS_ROOT ?? path.join(demoRoot, "..", "extensions")
)
const linkType = process.platform === "win32" ? "junction" : "dir"

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: "inherit",
    shell: process.platform === "win32",
  })
  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

function ensureSymlink(linkPath, targetPath) {
  rmSync(linkPath, { recursive: true, force: true })
  mkdirSync(path.dirname(linkPath), { recursive: true })
  symlinkSync(targetPath, linkPath, linkType)
}

if (!existsSync(path.join(extensionsRoot, "package.json"))) {
  console.error(
    `Extensions repo not found at ${extensionsRoot}. Set EXTENSIONS_ROOT or clone sibling executioncontrolprotocol/extensions.`
  )
  process.exit(1)
}

console.log(`Linking vendor extensions from ${extensionsRoot}`)
run("npm", ["ci"], extensionsRoot)
for (const name of PACKAGES) {
  run("npm", ["run", "build", "-w", `@executioncontrolprotocol/${name}`], extensionsRoot)
}

for (const peer of SHARED_PEERS) {
  const peerTarget = path.join(demoRoot, "node_modules", ...peer.split("/"))
  if (!existsSync(peerTarget)) {
    console.error(`Missing ${peer} in browser-demo node_modules (run npm ci / npm link first).`)
    process.exit(1)
  }
  for (const name of PACKAGES) {
    const peerLink = path.join(
      extensionsRoot,
      "packages",
      name,
      "node_modules",
      ...peer.split("/")
    )
    ensureSymlink(peerLink, peerTarget)
  }
}

for (const name of PACKAGES) {
  const pkgRoot = path.join(extensionsRoot, "packages", name)
  const appLink = path.join(demoRoot, "node_modules", "@executioncontrolprotocol", name)
  ensureSymlink(appLink, pkgRoot)
  console.log(`Linked @executioncontrolprotocol/${name} -> ${pkgRoot}`)
}
