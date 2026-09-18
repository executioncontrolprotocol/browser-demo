#!/usr/bin/env node
/**
 * Two-track CI setup for ECP consumer repos (extensions, browser-demo).
 *
 * development track: checkout siblings at development, build, junction-link into consumer.
 * main track: install from registry (frozen lockfile), then install optional vendor peers
 *   skipped by auto-install-peers=false so typecheck/build can resolve them.
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
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
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

/** Vendor packages live in the sibling extensions monorepo (not core). */
const VENDOR_EXTENSION_PACKAGES = [
  "@executioncontrolprotocol/adobe-firefly-services",
  "@executioncontrolprotocol/azure-blob-storage",
  "@executioncontrolprotocol/fal",
  "@executioncontrolprotocol/image-sharp",
  "@executioncontrolprotocol/jsonata",
]

function isVendorExtensionPackage(name) {
  return VENDOR_EXTENSION_PACKAGES.includes(name)
}

function linkPackagesIntoConsumer(packageNames) {
  for (const name of packageNames) {
    let src
    if (isVendorExtensionPackage(name)) {
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

function linkCorePeersForExtensions() {
  const vendorPackages = VENDOR_EXTENSION_PACKAGES.map((name) => name.split("/")[1])
  const peers = ["@executioncontrolprotocol/core", "@executioncontrolprotocol/types"]
  for (const peer of peers) {
    const peerTarget = corePackageDir(peer)
    const rootLink = path.join(extensionsRoot, "node_modules", ...peer.split("/"))
    ensureSymlink(rootLink, peerTarget)
    for (const name of vendorPackages) {
      const pkgPeerLink = path.join(
        extensionsRoot,
        "packages",
        name,
        "node_modules",
        ...peer.split("/")
      )
      ensureSymlink(pkgPeerLink, peerTarget)
    }
  }
}

function parseLinkList() {
  const raw = process.env.CI_LINK_PACKAGES ?? ""
  const explicit = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
  const names = new Set(explicit)

  if (names.size === 0) {
    const pkgPath = path.join(consumerRoot, "package.json")
    if (existsSync(pkgPath)) {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf8"))
      for (const section of ["dependencies", "devDependencies", "peerDependencies"]) {
        const block = pkg[section]
        if (!block || typeof block !== "object") continue
        for (const name of Object.keys(block)) {
          if (name.startsWith("@executioncontrolprotocol/")) names.add(name)
        }
      }
    }
  }

  return [...names]
}

/** Read `catalogs.ecp` range for a package from pnpm-workspace.yaml. */
function readEcpCatalogSpec(pkgName) {
  const yamlPath = path.join(consumerRoot, "pnpm-workspace.yaml")
  if (!existsSync(yamlPath)) {
    throw new Error(`Missing pnpm-workspace.yaml at ${yamlPath}`)
  }
  const text = readFileSync(yamlPath, "utf8")
  const escaped = pkgName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const match = text.match(new RegExp(`['"]${escaped}['"]\\s*:\\s*([^\\s#]+)`))
  if (!match) {
    throw new Error(`No catalogs.ecp entry for ${pkgName} in pnpm-workspace.yaml`)
  }
  return match[1].replace(/['"]/g, "")
}

/**
 * Optional vendor peers are not in the lockfile (auto-install-peers=false).
 * Install them from the catalog into a temp tree and link into node_modules.
 */
function installPublishedOptionalPeers() {
  const pkgPath = path.join(consumerRoot, "package.json")
  if (!existsSync(pkgPath)) return
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"))
  const peers = Object.keys(pkg.peerDependencies ?? {}).filter((name) =>
    name.startsWith("@executioncontrolprotocol/")
  )
  if (peers.length === 0) return

  const deps = Object.fromEntries(peers.map((name) => [name, readEcpCatalogSpec(name)]))
  const peerRoot = mkdtempSync(path.join(tmpdir(), "ecp-demo-peers-"))
  writeFileSync(
    path.join(peerRoot, "package.json"),
    `${JSON.stringify({ name: "ci-demo-peers", private: true, dependencies: deps }, null, 2)}\n`
  )
  console.log("\nMain track: installing optional vendor peers from registry…")
  run("pnpm", ["install", "--ignore-workspace"], peerRoot)

  for (const name of peers) {
    const src = path.join(peerRoot, "node_modules", ...name.split("/"))
    if (!existsSync(path.join(src, "package.json"))) {
      console.error(`Failed to install ${name} from registry at ${src}`)
      process.exit(1)
    }
    const dest = path.join(consumerRoot, "node_modules", ...name.split("/"))
    ensureSymlink(dest, src)
    // Avoid dual core/types catalogs: force vendor packages onto the consumer copies.
    for (const peer of ["@executioncontrolprotocol/core", "@executioncontrolprotocol/types"]) {
      const consumerPeer = path.join(consumerRoot, "node_modules", ...peer.split("/"))
      if (!existsSync(consumerPeer)) continue
      ensureSymlink(path.join(src, "node_modules", ...peer.split("/")), consumerPeer)
    }
    console.log(`Linked peer ${name} -> ${src}`)
  }
}

const track = detectTrack()
console.log(`CI track: ${track}`)

if (track === "main") {
  console.log("Main track: install consumer from registry (no sibling link).")
  run("pnpm", ["install", "--frozen-lockfile"])
  installPublishedOptionalPeers()
  console.log("\nCI main setup complete.")
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
const needsExtensions = linkPackages.some((n) => isVendorExtensionPackage(n))

if (needsExtensions) {
  if (!existsSync(path.join(extensionsRoot, "package.json"))) {
    console.error(`Extensions repo not found at ${extensionsRoot}. Set EXTENSIONS_ROOT.`)
    process.exit(1)
  }
  installDependencies(extensionsRoot)
  linkCorePeersForExtensions()
  runPackageScript(extensionsRoot, "build")
}

run("pnpm", ["install", "--frozen-lockfile"])
if (linkPackages.length > 0) {
  linkPackagesIntoConsumer(linkPackages)
}

console.log("\nCI development setup complete.")
