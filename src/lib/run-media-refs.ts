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
 * Collect media only from the workflow's final `output` (skip intermediate `state.*` artifacts).
 * Also skips Sharp-style input echoes (`source.image` beside a result `image`) so resize/transform
 * previews show the result once, not the input again.
 * @category Demo
 */
export function collectFinalOutputMediaRefs(runResult: unknown): CollectedMediaRef[] {
  if (runResult !== null && typeof runResult === "object" && !Array.isArray(runResult)) {
    const output = (runResult as { output?: unknown }).output
    if (output !== undefined) {
      return collectMediaRefs(output, "output", { skipSourceEchoes: true })
    }
  }
  return []
}

/**
 * Walk a run result (or any JSON value) and collect ImageRef / locator media values.
 * @category Demo
 */
export function collectMediaRefs(
  value: unknown,
  basePath = "",
  options: { skipSourceEchoes?: boolean } = {}
): CollectedMediaRef[] {
  const out: CollectedMediaRef[] = []
  walk(value, basePath, out, options.skipSourceEchoes === true)
  return out
}

/** Whether `value` looks like an ImageRef object. @category Demo */
function isImageRefShape(value: unknown): boolean {
  if (!isRecord(value)) return false
  const kind = typeof value.kind === "string" ? value.kind : undefined
  return Boolean(kind && IMAGE_REF_KINDS.has(kind))
}

/**
 * Sharp transform/derive outputs echo the input as `source.image` next to the result.
 * Skip that key when the parent already exposes a result `image` or `variants`.
 * @category Demo
 */
export function shouldSkipSourceEchoKey(parent: Record<string, unknown>, key: string): boolean {
  if (key !== "source") return false
  if (isImageRefShape(parent.image)) return true
  if (isRecord(parent.variants)) return true
  return false
}

function walk(
  value: unknown,
  path: string,
  out: CollectedMediaRef[],
  skipSourceEchoes: boolean
): void {
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
    value.forEach((item, i) =>
      walk(item, path ? `${path}[${i}]` : `[${i}]`, out, skipSourceEchoes)
    )
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
    if (skipSourceEchoes && shouldSkipSourceEchoKey(value, key)) continue
    walk(child, path ? `${path}.${key}` : key, out, skipSourceEchoes)
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
