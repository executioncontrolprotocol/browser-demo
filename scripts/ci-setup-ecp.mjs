#!/usr/bin/env node
/**
 * Two-track CI setup for ECP consumer repos (extensions, browser-demo).
 *
 * development track: checkout siblings at development, build, junction-link into consumer.
 * main track: caller only installs consumer from registry (no sibling checkout).
 *
 * Usage (from consumer repo root):
 *   node scripts/ci-setup-ecp.mjs
 *
 * Environment:
 *   ECP_ROOT           — core monorepo path (default: ../executioncontrolprotocol)
 *   EXTENSIONS_ROOT    — extensions monorepo (demo only; default: ../extensions)
 *   GITHUB_REF         — set by Actions
 *   GITHUB_BASE_REF    — set by Actions on pull_request
 *   CI_CONSUMER_ROOT   — consumer repo root (default: cwd)
 *   CI_LINK_PACKAGES   — comma-separated @scope/pkg names to link (required for demo)
 */
import { spawnSync } from "node:child_process"
import { existsSync, mkdirSync, readFileSync, rmSync, symlinkSync } from "node:fs"
import path from "node:path"

const consumerRoot = path.resolve(process.env.CI_CONSUMER_ROOT ?? process.cwd())
const ecpRoot = path.resolve(process.env.ECP_ROOT ?? path.join(consumerRoot, "..", "executioncontrolprotocol"))
const extensionsRoot = path.resolve(
  process.env.EXTENSIONS_ROOT ?? path.join(consumerRoot, "..", "extensions")
)
const linkType = process.platform === "win32" ? "junction" : "dir"

function run(command, args, cwd = consumerRoot, env = process.env) {
  console.log(`\n> ${command} ${args.join(" ")}  (${cwd})`)
  const result = spawnSync(command, args, {
    cwd,
    stdio: "inherit",
    shell: process.platform === "win32",
    env,
  })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

function detectTrack() {
  const ref = process.env.GITHUB_REF ?? ""
  const baseRef = process.env.GITHUB_BASE_REF ?? ""
  return ref === "refs/heads/main" || baseRef === "main" ? "main" : "development"
}

function ensureSymlink(linkPath, targetPath) {
  rmSync(linkPath, { recursive: true, force: true })
  mkdirSync(path.dirname(linkPath), { recursive: true })
  symlinkSync(targetPath, linkPath, linkType)
}

/** @returns {"pnpm" | "npm"} */
function detectPackageManager(repoRoot) {
  if (existsSync(path.join(repoRoot, "pnpm-lock.yaml"))) return "pnpm"
  if (existsSync(path.join(repoRoot, "package-lock.json"))) return "npm"
  const pkgPath = path.join(repoRoot, "package.json")
  if (existsSync(pkgPath)) {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8"))
    if (typeof pkg.packageManager === "string" && pkg.packageManager.startsWith("pnpm")) {
      return "pnpm"
    }
  }
  return "npm"
}

function installDependencies(repoRoot) {
  const pm = detectPackageManager(repoRoot)
  if (pm === "pnpm") {
    run("pnpm", ["install", "--frozen-lockfile"], repoRoot)
    return
  }
  run("npm", ["ci"], repoRoot)
}

function runPackageScript(repoRoot, scriptName) {
  const pm = detectPackageManager(repoRoot)
  if (pm === "pnpm") {
    run("pnpm", ["run", scriptName], repoRoot)
    return
  }
  run("npm", ["run", scriptName], repoRoot)
}

/** @param {string} pkgName e.g. @executioncontrolprotocol/core */
function corePackageDir(pkgName) {
  const segment = pkgName.split("/")[1]
  const direct = path.join(ecpRoot, "packages", segment)
  if (existsSync(path.join(direct, "package.json"))) return direct
  const runtimes = path.join(ecpRoot, "packages", "runtimes", segment)
  if (existsSync(path.join(runtimes, "package.json"))) return runtimes
  const harnesses = path.join(ecpRoot, "packages", "harnesses", segment)
  if (existsSync(path.join(harnesses, "package.json"))) return harnesses
  const extensions = path.join(ecpRoot, "packages", "extensions", segment)
  if (existsSync(path.join(extensions, "package.json"))) return extensions
  if (segment === "extension-ollama") {
    return path.join(ecpRoot, "packages", "extensions", "ollama")
  }
  if (segment === "extension-openai") {
    return path.join(ecpRoot, "packages", "extensions", "openai")
  }
  if (segment.startsWith("harnesses-")) {
    const short = segment.replace(/^harnesses-/, "")
    return path.join(ecpRoot, "packages", "harnesses", short)
  }
  throw new Error(`Cannot resolve core package path for ${pkgName}`)
}

function linkPackagesIntoConsumer(packageNames) {
  for (const name of packageNames) {
    let src
    if (name === "@executioncontrolprotocol/fal" || name === "@executioncontrolprotocol/image-sharp") {
      const segment = name.split("/")[1]
      src = path.join(extensionsRoot, "packages", segment)
    } else {
      src = corePackageDir(name)
    }
    if (!existsSync(path.join(src, "dist"))) {
      console.error(`Missing dist/ for ${name} at ${src} — build sibling repo first`)
      process.exit(1)
    }
    const dest = path.join(consumerRoot, "node_modules", ...name.split("/"))
    ensureSymlink(dest, src)
    console.log(`Linked ${name} -> ${src}`)
  }
}

function parseLinkList() {
  const raw = process.env.CI_LINK_PACKAGES ?? ""
  const explicit = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
  if (explicit.length > 0) return explicit

  const pkgPath = path.join(consumerRoot, "package.json")
  if (!existsSync(pkgPath)) return []
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"))
  const names = new Set()
  for (const section of ["dependencies", "devDependencies", "peerDependencies"]) {
    const block = pkg[section]
    if (!block || typeof block !== "object") continue
    for (const name of Object.keys(block)) {
      if (name.startsWith("@executioncontrolprotocol/")) names.add(name)
    }
  }
  return [...names]
}

const track = detectTrack()
console.log(`CI track: ${track}`)

if (track === "main") {
  console.log("Main track: install consumer from registry only (no sibling link).")
  run("pnpm", ["install", "--frozen-lockfile"])
  process.exit(0)
}

console.log("Development track: build siblings at development and link.")

if (!existsSync(path.join(ecpRoot, "package.json"))) {
  console.error(`Core monorepo not found at ${ecpRoot}. Set ECP_ROOT.`)
  process.exit(1)
}

installDependencies(ecpRoot)
runPackageScript(ecpRoot, "build")
runPackageScript(ecpRoot, "generate:schema")

const linkPackages = parseLinkList()
const needsExtensions = linkPackages.some(
  (n) => n === "@executioncontrolprotocol/fal" || n === "@executioncontrolprotocol/image-sharp"
)

if (needsExtensions) {
  if (!existsSync(path.join(extensionsRoot, "package.json"))) {
    console.error(`Extensions repo not found at ${extensionsRoot}. Set EXTENSIONS_ROOT.`)
    process.exit(1)
  }
  installDependencies(extensionsRoot)
  for (const peer of ["@executioncontrolprotocol/core", "@executioncontrolprotocol/types"]) {
    const peerTarget = path.join(ecpRoot, "packages", peer.split("/")[1])
    const peerLink = path.join(extensionsRoot, "node_modules", ...peer.split("/"))
    ensureSymlink(peerLink, peerTarget)
  }
  runPackageScript(extensionsRoot, "build")
}

run("pnpm", ["install", "--frozen-lockfile"])
if (linkPackages.length > 0) {
  linkPackagesIntoConsumer(linkPackages)
}

console.log("\nCI development setup complete.")
