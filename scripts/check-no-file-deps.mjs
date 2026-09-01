import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"

/**
 * Fail if any committed package.json uses `file:` or `link:` dependency specs.
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

const forbiddenPrefixes = ["file:", "link:"]

const root = process.cwd()
const files = collectPackageJsonFiles(root)
const violations = []

for (const file of files) {
  const pkg = JSON.parse(readFileSync(file, "utf8"))
  for (const field of dependencyFields) {
    const deps = pkg[field]
    if (!deps || typeof deps !== "object") continue
    for (const [name, version] of Object.entries(deps)) {
      if (typeof version !== "string") continue
      for (const prefix of forbiddenPrefixes) {
        if (version.startsWith(prefix)) {
          violations.push(`${file}: ${field}.${name} = ${version}`)
        }
      }
    }
  }
}

const lockPath = join(root, "pnpm-lock.yaml")
if (existsSync(lockPath)) {
  const lockText = readFileSync(lockPath, "utf8")
  if (/\bfile:/.test(lockText)) {
    violations.push(`${lockPath}: contains file: entries`)
  }
}

const legacyLock = join(root, "package-lock.json")
if (existsSync(legacyLock)) {
  violations.push(`${legacyLock}: remove package-lock.json after migrating to pnpm`)
}

if (violations.length > 0) {
  console.error("Forbidden committed package links:\n")
  for (const line of violations) {
    console.error(`  ${line}`)
  }
  process.exit(1)
}

console.log(`OK: no file:/link: package links in ${files.length} package.json file(s).`)
