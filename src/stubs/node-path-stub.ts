export function dirname(path: string): string {
  const normalized = path.replace(/\\/g, "/")
  const idx = normalized.lastIndexOf("/")
  return idx >= 0 ? normalized.slice(0, idx) : path
}

export function join(...parts: string[]): string {
  return parts.join("/").replace(/\/+/g, "/")
}

export function resolve(...parts: string[]): string {
  return join(...parts)
}

export default { dirname, join, resolve }
