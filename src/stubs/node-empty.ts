export function fileURLToPath(url: string | URL): string {
  const value = typeof url === "string" ? url : url.href
  return value.replace(/^file:\/\//, "")
}

export function readFileSync(): never {
  throw new Error("node:fs is not available in the browser demo")
}

export default { fileURLToPath, readFileSync }
