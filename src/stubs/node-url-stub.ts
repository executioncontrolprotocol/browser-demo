export function fileURLToPath(url: string | URL): string {
  const value = typeof url === "string" ? url : url.href
  return value.replace(/^file:\/\//, "")
}

export default { fileURLToPath }
