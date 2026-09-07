#!/usr/bin/env node
/**
 * Rebuild linked ECP packages, refresh junctions, and start the browser demo + host daemon.
 *
 * Usage (from browser-demo root):
 *   npm run dev:linked
 *   npm run dev:linked -- --skip-build
 *   npm run dev:linked -- --no-host
 *   npm run dev:linked -- --no-vite
 *
 * Environment:
 *   ECP_ROOT          — path to executioncontrolprotocol monorepo (default: ../executioncontrolprotocol)
 *   EXTENSIONS_ROOT   — path to extensions monorepo (default: ../extensions)
 *   HOST_EXAMPLE_ROOT — path to ecp up example (default: ./host)
 *   ECP_HOST_PORT     — ecp up port (default: 3090)
 *   VITE_PORT         — Vite port (default: 5173)
 */
import { spawn, spawnSync } from "node:child_process"
import { existsSync, mkdirSync, openSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const demoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const ecpRoot = path.resolve(process.env.ECP_ROOT ?? path.join(demoRoot, "..", "executioncontrolprotocol"))
const extensionsRoot = path.resolve(
  process.env.EXTENSIONS_ROOT ?? path.join(demoRoot, "..", "extensions")
)
const hostRoot = path.resolve(process.env.HOST_EXAMPLE_ROOT ?? path.join(demoRoot, "host"))
const hostPort = process.env.ECP_HOST_PORT ?? "3090"
const vitePort = process.env.VITE_PORT ?? "5173"

const flags = new Set(process.argv.slice(2))
const skipBuild = flags.has("--skip-build")
const noHost = flags.has("--no-host")
const noVite = flags.has("--no-vite")

function run(command, args, cwd, env = process.env) {
  console.log(`\n> ${command} ${args.join(" ")}  (${cwd})`)
  const result = spawnSync(command, args, {
    cwd,
    stdio: "inherit",
    shell: process.platform === "win32",
    env,
  })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

/** Stop lingering `ecp up` daemons (port kill alone can miss long-lived Node processes on Windows). */
function killEcpUpDaemons() {
  if (process.platform === "win32") {
    spawnSync(
      "powershell",
      [
        "-NoProfile",
        "-Command",
        "Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" | " +
          "Where-Object { $_.CommandLine -match 'ecp(\\\\.(js|cmd))?' -and $_.CommandLine -match '\\\\bup\\\\b' } | " +
          "ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }",
      ],
      { stdio: "ignore", shell: true }
    )
    return
  }
  spawnSync("sh", ["-c", "pkill -f 'ecp.* up' || true"], { stdio: "ignore" })
}

function killViteDaemons() {
  if (process.platform === "win32") {
    spawnSync(
      "powershell",
      [
        "-NoProfile",
        "-Command",
        "Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" | " +
          "Where-Object { $_.CommandLine -match '\\bvite\\b' } | " +
          "ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }",
      ],
      { stdio: "ignore", shell: true }
    )
    return
  }
  spawnSync("sh", ["-c", "pkill -f 'vite' || true"], { stdio: "ignore" })
}

function killPort(port) {
  if (process.platform === "win32") {
    spawnSync(
      "powershell",
      [
        "-NoProfile",
        "-Command",
        `Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }`,
      ],
      { stdio: "ignore", shell: true }
    )
    return
  }
  spawnSync("sh", ["-c", `lsof -ti:${port} | xargs -r kill -9`], { stdio: "ignore" })
}

function ensureExtensionsDeps() {
  const zodPkg = path.join(extensionsRoot, "node_modules", "zod", "package.json")
  if (!existsSync(zodPkg)) {
    console.log("\nExtensions node_modules missing zod — running npm install…")
    run("pnpm", ["install"], extensionsRoot)
  }
}

function quoteCmdArg(value) {
  const text = String(value)
  return /\s|"/.test(text) ? `"${text.replace(/"/g, '\\"')}"` : text
}

/**
 * Start a long-running dev process in its own terminal (Windows/macOS) or log file (Linux).
 * Detached spawns with stdio:inherit exit immediately on Windows and hide pairing output.
 */
function spawnInOwnTerminal(title, command, args, cwd) {
  const resolvedCommand =
    process.platform === "win32" && command === "npm" ? "npm.cmd" : command
  const cmdLine = [resolvedCommand, ...args].map(quoteCmdArg).join(" ")

  if (process.platform === "win32") {
    // `start` requires a quoted window title. spawn argv form only auto-quotes args
    // that contain spaces, so title "Vite" becomes bare `Vite` and is run as the
    // command (PATH vite.cmd gets `cmd /k …` as args and never cds). Use shell:true
    // so `start "Vite"` keeps its quotes (Node's CreateProcess escaping would turn
    // them into `\"` inside a single `/c` argument and hang).
    const windowTitle = String(title).replace(/"/g, "")
    const line = `start "${windowTitle}" /D ${quoteCmdArg(cwd)} cmd /k ${quoteCmdArg(cmdLine)}`
    const child = spawn(line, {
      shell: true,
      stdio: "ignore",
      detached: true,
      windowsHide: false,
    })
    child.unref()
    return
  }

  if (process.platform === "darwin") {
    const script =
      `tell application "Terminal" to do script ` +
      `"cd ${cwd.replace(/\\/g, "\\\\").replace(/"/g, '\\"')} && ${cmdLine.replace(/"/g, '\\"')}"`
    spawnSync("osascript", ["-e", script], { stdio: "ignore" })
    return
  }

  const logDir = path.join(demoRoot, ".dev-logs")
  mkdirSync(logDir, { recursive: true })
  const logFile = path.join(
    logDir,
    `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}.log`
  )
  const logFd = openSync(logFile, "a")
  const child = spawn(command, args, {
    cwd,
    detached: true,
    stdio: ["ignore", logFd, logFd],
    shell: false,
  })
  child.unref()
  console.log(`  ${title} log: ${logFile}`)
}

function resolveLinkedEcpBin() {
  const fromMonorepo = path.join(ecpRoot, "packages", "cli", "bin", "ecp.js")
  const fromHost = path.join(hostRoot, "node_modules", "@executioncontrolprotocol", "cli", "bin", "ecp.js")
  if (existsSync(fromMonorepo)) return fromMonorepo
  if (existsSync(fromHost)) return fromHost
  console.error("Linked ecp CLI not found. Run npm run link:host or npm run build in ECP.")
  process.exit(1)
}

function main() {
  if (!existsSync(path.join(ecpRoot, "package.json"))) {
    console.error(`ECP monorepo not found at ${ecpRoot}. Set ECP_ROOT.`)
    process.exit(1)
  }

  if (!skipBuild) {
    run("pnpm", ["run", "build"], ecpRoot)
    run("pnpm", ["run", "generate:schema"], ecpRoot)
    if (existsSync(path.join(extensionsRoot, "package.json"))) {
      // --filter must precede the script name; otherwise tsc receives --filter as a build option.
      run("pnpm", ["--filter", "@executioncontrolprotocol/image-sharp", "run", "build"], extensionsRoot)
      run("pnpm", ["--filter", "@executioncontrolprotocol/fal", "run", "build"], extensionsRoot)
    }
  }

  killEcpUpDaemons()
  killViteDaemons()
  killPort(hostPort)
  killPort(vitePort)

  if (existsSync(path.join(extensionsRoot, "package.json"))) {
    ensureExtensionsDeps()
  }

  run("node", [path.join(demoRoot, "scripts", "link-ecp-packages.mjs")], demoRoot, {
    ...process.env,
    ECP_ROOT: ecpRoot,
    LINK_TARGET: demoRoot,
  })

  if (existsSync(path.join(extensionsRoot, "package.json"))) {
    run(
      "node",
      [path.join(demoRoot, "scripts", "link-vendor-extensions.mjs"), "--skip-install"],
      demoRoot,
      {
        ...process.env,
        EXTENSIONS_ROOT: extensionsRoot,
      }
    )
  }

  if (!noHost) {
    run("node", [path.join(demoRoot, "scripts", "link-host-example.mjs")], demoRoot, {
      ...process.env,
      ECP_ROOT: ecpRoot,
      EXTENSIONS_ROOT: extensionsRoot,
      HOST_EXAMPLE_ROOT: hostRoot,
    })
  }

  if (!noHost) {
    const ecpBin = resolveLinkedEcpBin()
    console.log(`\nStarting ecp up on port ${hostPort}…`)
    spawnInOwnTerminal("ECP up", "node", [
      ecpBin,
      "up",
      "--env",
      "environment.ts",
      "--port",
      hostPort,
      "--open-url",
      `http://127.0.0.1:${vitePort}/`,
      "--no-open",
    ], hostRoot)
  }

  if (!noVite) {
    console.log(`\nStarting Vite on port ${vitePort}…`)
    // Prefer `pnpm exec vite` over `pnpm run dev -- --port` so the `--` separator is
    // not forwarded into Vite's argv (which makes Vite ignore `--port` and bind 5173).
    spawnInOwnTerminal(
      "Vite",
      "pnpm",
      ["exec", "vite", "--port", vitePort, "--strictPort"],
      demoRoot
    )
  }

  console.log("\nDev stack starting.")
  if (!noHost) {
    console.log(`  Host:  http://127.0.0.1:${hostPort}`)
    console.log("  Pairing token + demo URL: see the ECP up terminal window")
  }
  if (!noVite) {
    console.log(`  Demo:  http://127.0.0.1:${vitePort}/`)
    console.log("  If the page 404s, close old Vite terminals and re-run dev:linked.")
  }
  console.log("\nRe-run after ECP changes: pnpm run dev:linked -- --skip-build")
}

main()
