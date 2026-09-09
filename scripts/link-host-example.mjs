#!/usr/bin/env node
/**
 * Prepare browser-demo/host for `ecp up` against linked local packages.
 */
import { readFileSync, existsSync, mkdirSync, rmSync, symlinkSync } from "node:fs"
import { spawnSync } from "node:child_process"
import path from "node:path"
import { fileURLToPath } from "node:url"

const demoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const ecpRoot = path.resolve(process.env.ECP_ROOT ?? path.join(demoRoot, "..", "executioncontrolprotocol"))
const extensionsRoot = path.resolve(
  process.env.EXTENSIONS_ROOT ?? path.join(demoRoot, "..", "extensions")
)
const hostRoot = path.resolve(process.env.HOST_EXAMPLE_ROOT ?? path.join(demoRoot, "host"))
const linkType = process.platform === "win32" ? "junction" : "dir"

/** Core monorepo packages the host env imports (registry + linked). */
const HOST_MONOREPO_PACKAGES = [
  "@executioncontrolprotocol/types",
  "@executioncontrolprotocol/core",
  "@executioncontrolprotocol/policies",
  "@executioncontrolprotocol/node",
  "@executioncontrolprotocol/cli",
  "@executioncontrolprotocol/extension-openai",
  "@executioncontrolprotocol/claude",
  "@executioncontrolprotocol/extension-ollama",
]

/** Vendor packages from the extensions monorepo. */
const HOST_VENDOR_PACKAGES = ["image-sharp", "fal"]

function run(command, args, cwd, env = process.env) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: "inherit",
    shell: process.platform === "win32",
    env,
  })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

function ensureSymlink(linkPath, targetPath) {
  rmSync(linkPath, { recursive: true, force: true })
  mkdirSync(path.dirname(linkPath), { recursive: true })
  symlinkSync(targetPath, linkPath, linkType)
}

function verifyHostBlobHopSupport() {
  const ecpDist = path.join(
    hostRoot,
    "node_modules",
    "@executioncontrolprotocol",
    "core",
    "dist",
    "environment",
    "ecp.js"
  )
  if (!existsSync(ecpDist)) {
    console.error(`Linked core dist missing at ${ecpDist}. Run npm run build in ECP.`)
    process.exit(1)
  }
  const source = readFileSync(ecpDist, "utf8")
  if (!source.includes("getBlobStore")) {
    console.error(
      "Host @executioncontrolprotocol/core is stale (no getBlobStore). " +
        "Re-run npm run link:host after npm run build in ECP."
    )
    process.exit(1)
  }
}

function linkVendorPackage(name) {
  const pkgRoot = path.join(extensionsRoot, "packages", name)
  if (!existsSync(pkgRoot)) {
    console.warn(`${name} not found at ${pkgRoot} — host may miss that extension`)
    return
  }
  ensureSymlink(
    path.join(hostRoot, "node_modules", "@executioncontrolprotocol", name),
    pkgRoot
  )
  for (const peer of ["types", "core"]) {
    ensureSymlink(
      path.join(pkgRoot, "node_modules", "@executioncontrolprotocol", peer),
      path.join(ecpRoot, "packages", peer)
    )
  }
  console.log(`Linked @executioncontrolprotocol/${name} and peer deps for host`)
}

function main() {
  if (!existsSync(path.join(hostRoot, "environment.ts"))) {
    console.error(`Host example not found at ${hostRoot}. Set HOST_EXAMPLE_ROOT.`)
    process.exit(1)
  }

  console.log(`Preparing host example at ${hostRoot}`)

  // Install registry deps first — junctions must run after npm install or npm overwrites them.
  run("npm", ["install", "--legacy-peer-deps"], hostRoot)

  run(
    "node",
    [
      path.join(demoRoot, "scripts", "link-ecp-packages.mjs"),
      `--packages=${HOST_MONOREPO_PACKAGES.join(",")}`,
    ],
    demoRoot,
    { ...process.env, ECP_ROOT: ecpRoot, LINK_TARGET: hostRoot }
  )

  for (const name of HOST_VENDOR_PACKAGES) {
    linkVendorPackage(name)
  }

  verifyHostBlobHopSupport()

  const cliRoot = path.join(ecpRoot, "packages", "cli")
  if (existsSync(cliRoot)) {
    run("npm", ["link"], cliRoot)
    console.log("Registered global ecp CLI from linked monorepo package")
  }
}

main()
