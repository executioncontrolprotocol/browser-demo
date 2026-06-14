export function readFileSync(): never {
  throw new Error("node:fs is not available in the browser demo")
}

export function readdirSync(): never {
  throw new Error("node:fs is not available in the browser demo")
}

export default { readFileSync, readdirSync }
