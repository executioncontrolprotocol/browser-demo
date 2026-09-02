import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative } from "node:path"
import { parse } from "yaml"

const SKIP_DIRS = new Set(["node_modules", "dist", "coverage", ".git", "archive"])
const SKIP_FILES = new Set(["pnpm-lock.yaml"])

/**
 * @param {string} dir
 * @param {string[]} out
 */
function collectYamlFiles(dir, out) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue
    const path = join(dir, name)
    const stat = statSync(path)
    if (stat.isDirectory()) {
      collectYamlFiles(path, out)
      continue
    }
    if (!/\.ya?ml$/i.test(name) || SKIP_FILES.has(name)) continue
    out.push(path)
  }
  return out
}

const root = process.cwd()
const args = process.argv.slice(2).filter((arg) => existsSync(arg))
const files = args.length > 0 ? args : collectYamlFiles(root, [])

if (files.length === 0) {
  console.log("lint-yaml: no YAML files to check")
  process.exit(0)
}

/** @type {string[]} */
const failures = []

for (const file of files) {
  try {
    parse(readFileSync(file, "utf8"))
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    failures.push(`${relative(root, file)}: ${message}`)
  }
}

if (failures.length > 0) {
  console.error("YAML parse errors:\n")
  for (const line of failures) {
    console.error(`  ${line}`)
  }
  process.exit(1)
}

console.log(`OK: ${files.length} YAML file(s) parse cleanly`)
