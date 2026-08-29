/** Map `valueSchema.contentMediaType` to an HTML file input `accept` string. @category Demo */
export function fileAcceptFromValueSchema(
  schema?: Record<string, unknown>
): string | undefined {
  if (!schema) return undefined
  const raw = schema.contentMediaType
  if (typeof raw === "string") {
    const trimmed = raw.trim()
    return trimmed.length > 0 ? trimmed : undefined
  }
  if (Array.isArray(raw)) {
    const parts = raw.filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    return parts.length > 0 ? parts.join(",") : undefined
  }
  return undefined
}

/** Human-readable accept hint for file picker UI. @category Demo */
export function fileAcceptHint(accept: string | undefined): string | undefined {
  if (!accept) return undefined
  return `Accepts: ${accept}`
}
