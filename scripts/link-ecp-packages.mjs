#!/usr/bin/env node
/**
 * Junction-link @executioncontrolprotocol/* packages from the ECP monorepo into a target app.
 * Avoids `npm link` in the consumer, which can rewrite registry installs on Windows.
 *
 * Usage:
 *   node scripts/link-ecp-packages.mjs
 *   ECP_ROOT=../executioncontrolprotocol LINK_TARGET=../browser-demo node scripts/link-ecp-packages.mjs
 *   node scripts/link-ecp-packages.mjs --packages @executioncontrolprotocol/core,@executioncontrolprotocol/types
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, symlinkSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const demoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const ecpRoot = path.resolve(process.env.ECP_ROOT ?? path.join(demoRoot, "..", "executioncontrolprotocol"))
const linkTarget = path.resolve(process.env.LINK_TARGET ?? demoRoot)
const linkType = process.platform === "win32" ? "junction" : "dir"

function parseArgs(argv) {
  const packagesArg = argv.find((a) => a.startsWith("--packages="))?.slice("--packages=".length)
  return {
    packages: packagesArg
      ? packagesArg.split(",").map((p) => p.trim()).filter(Boolean)
      : undefined,
  }
}

function readPackageName(dir) {
  const pkgPath = path.join(dir, "package.json")
  if (!existsSync(pkgPath)) return undefined
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8"))
    return typeof pkg.name === "string" ? pkg.name : undefined
  } catch {
    return undefined
  }
}

/** @returns {Map<string, string>} name → absolute package dir */
function discoverEcpPackages(root) {
  const out = new Map()
  const roots = [
    path.join(root, "packages", "types"),
    path.join(root, "packages", "core"),
    path.join(root, "packages", "policies"),
    path.join(root, "packages", "cli"),
    path.join(root, "packages", "mcp"),
    path.join(root, "packages", "evals"),
  ]
  for (const group of ["harnesses", "extensions", "runtimes"]) {
    const base = path.join(root, "packages", group)
    if (!existsSync(base)) continue
    for (const entry of readdirSync(base, { withFileTypes: true })) {
      if (entry.isDirectory()) roots.push(path.join(base, entry.name))
    }
  }
  for (const dir of roots) {
    const name = readPackageName(dir)
    if (name?.startsWith("@executioncontrolprotocol/")) {
      out.set(name, dir)
    }
  }
  return out
}

function ecpPackageNamesFromPkgJson(pkgJsonPath) {
  const pkg = JSON.parse(readFileSync(pkgJsonPath, "utf8"))
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

function ensureSymlink(linkPath, targetPath) {
  rmSync(linkPath, { recursive: true, force: true })
  mkdirSync(path.dirname(linkPath), { recursive: true })
  symlinkSync(targetPath, linkPath, linkType)
}

function main() {
  const { packages: filter } = parseArgs(process.argv.slice(2))
  if (!existsSync(path.join(ecpRoot, "package.json"))) {
    console.error(`ECP monorepo not found at ${ecpRoot}. Set ECP_ROOT.`)
    process.exit(1)
  }
  if (!existsSync(path.join(linkTarget, "package.json"))) {
    console.error(`Link target not found at ${linkTarget}. Set LINK_TARGET.`)
    process.exit(1)
  }

  const catalog = discoverEcpPackages(ecpRoot)
  const wanted = filter ?? ecpPackageNamesFromPkgJson(path.join(linkTarget, "package.json"))
  const missing = []

  console.log(`Linking ECP packages from ${ecpRoot}`)
  console.log(`Target: ${linkTarget}`)

  for (const name of wanted) {
    const src = catalog.get(name)
    if (!src) {
      missing.push(name)
      continue
    }
    if (!existsSync(path.join(src, "dist"))) {
      console.warn(`Warning: ${name} has no dist/ — run npm run build in ECP first`)
    }
    const dest = path.join(linkTarget, "node_modules", ...name.split("/"))
    ensureSymlink(dest, src)
    console.log(`Linked ${name}`)
  }

  if (missing.length > 0) {
    console.log(`Not in ECP monorepo (vendor or optional): ${missing.join(", ")}`)
  }
}

main()
