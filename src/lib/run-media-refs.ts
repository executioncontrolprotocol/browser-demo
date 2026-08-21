/** Discovered media-like value from a run result. @category Demo */
export interface CollectedMediaRef {
  /** Dot/bracket path for display (e.g. `state.thumb.image`). */
  path: string
  /** Discriminator when known. */
  kind?: "artifact" | "file" | "url" | "buffer" | "locator"
  /** Artifact / file / browser locator URI or remote URL. */
  locator?: string
  /** Base64 payload for buffer refs. */
  dataBase64?: string
  /** MIME type when known. */
  mediaType?: string
  /** Optional display name. */
  name?: string
  /** Optional size. */
  sizeBytes?: number
}

const IMAGE_REF_KINDS = new Set(["artifact", "file", "url", "buffer"])

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

function isBrowserLocator(value: string): boolean {
  return value.startsWith("ecp://browser/") && value.length > "ecp://browser/".length
}

function isArtifactLocator(value: string): boolean {
  return value.startsWith("ecp://artifacts/") || value.startsWith("ecp://storage/")
}

/**
 * Walk a run result (or any JSON value) and collect ImageRef / locator media values.
 * @category Demo
 */
export function collectMediaRefs(value: unknown, basePath = ""): CollectedMediaRef[] {
  const out: CollectedMediaRef[] = []
  walk(value, basePath, out)
  return out
}

function walk(value: unknown, path: string, out: CollectedMediaRef[]): void {
  if (typeof value === "string") {
    if (isBrowserLocator(value) || isArtifactLocator(value)) {
      out.push({
        path: path || "(root)",
        kind: isBrowserLocator(value) ? "locator" : "artifact",
        locator: value,
      })
    }
    return
  }
  if (Array.isArray(value)) {
    value.forEach((item, i) => walk(item, path ? `${path}[${i}]` : `[${i}]`, out))
    return
  }
  if (!isRecord(value)) return

  const kind = typeof value.kind === "string" ? value.kind : undefined
  if (kind && IMAGE_REF_KINDS.has(kind)) {
    const mediaType = typeof value.mediaType === "string" ? value.mediaType : undefined
    const name = typeof value.name === "string" ? value.name : undefined
    const sizeBytes = typeof value.sizeBytes === "number" ? value.sizeBytes : undefined
    if (kind === "buffer" && typeof value.data === "string") {
      out.push({
        path: path || "(root)",
        kind: "buffer",
        dataBase64: value.data,
        mediaType,
        name,
        sizeBytes,
      })
      return
    }
    if (kind === "url" && typeof value.url === "string") {
      out.push({
        path: path || "(root)",
        kind: "url",
        locator: value.url,
        mediaType,
        name,
        sizeBytes,
      })
      return
    }
    if (kind === "artifact" && typeof value.uri === "string") {
      out.push({
        path: path || "(root)",
        kind: "artifact",
        locator: value.uri,
        mediaType,
        name,
        sizeBytes,
      })
      return
    }
    if (kind === "file" && typeof value.path === "string") {
      out.push({
        path: path || "(root)",
        kind: "file",
        locator: value.path,
        mediaType,
        name,
        sizeBytes,
      })
      return
    }
  }

  for (const [key, child] of Object.entries(value)) {
    walk(child, path ? `${path}.${key}` : key, out)
  }
}

/** Native preview element kind for a MIME type. @category Demo */
export type MediaPreviewKind = "image" | "video" | "audio" | "pdf" | "download"

/**
 * Map a MIME type to a native preview element.
 * @category Demo
 */
export function previewKindForMediaType(mediaType: string | undefined): MediaPreviewKind {
  const t = (mediaType ?? "").toLowerCase().split(";")[0]?.trim() ?? ""
  if (t.startsWith("image/")) return "image"
  if (t.startsWith("video/")) return "video"
  if (t.startsWith("audio/")) return "audio"
  if (t === "application/pdf") return "pdf"
  return "download"
}
