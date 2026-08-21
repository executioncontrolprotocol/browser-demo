import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"

/**
 * Fail if any package.json dependency field or package-lock.json uses a `file:` link.
 * Local unpublished packages must use `npm link`, never committed file: deps.
 */
function collectPackageJsonFiles(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "dist" || name === ".git" || name === "coverage") {
      continue
    }
    const path = join(dir, name)
    const stat = statSync(path)
    if (stat.isDirectory()) {
      collectPackageJsonFiles(path, out)
    } else if (name === "package.json") {
      out.push(path)
    }
  }
  return out
}

const dependencyFields = [
  "dependencies",
  "devDependencies",
  "peerDependencies",
  "optionalDependencies",
]

const root = process.cwd()
const files = collectPackageJsonFiles(root)
const violations = []

for (const file of files) {
  const pkg = JSON.parse(readFileSync(file, "utf8"))
  for (const field of dependencyFields) {
    const deps = pkg[field]
    if (!deps || typeof deps !== "object") continue
    for (const [name, version] of Object.entries(deps)) {
      if (typeof version === "string" && version.startsWith("file:")) {
        violations.push(`${file}: ${field}.${name} = ${version}`)
      }
    }
  }
}

const lockPath = join(root, "package-lock.json")
if (existsSync(lockPath)) {
  const lockText = readFileSync(lockPath, "utf8")
  if (/"file:/.test(lockText)) {
    violations.push(
      `${lockPath}: contains file: entries (regenerate with registry ranges; use npm link locally)`
    )
  }
}

if (violations.length > 0) {
  console.error("Forbidden file: package links (use npm link or registry ranges):\n")
  for (const line of violations) {
    console.error(`  ${line}`)
  }
  process.exit(1)
}

console.log(`OK: no file: package links in ${files.length} package.json file(s).`)
