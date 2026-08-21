import type { CapabilityBlob, CapabilityBlobStore } from "@executioncontrolprotocol/core"
import type { BridgeSettings } from "./ecp-bridge.js"
import { artifactFetchUrl, fetchHostArtifact } from "./fetch-artifact.js"
import type { CollectedMediaRef } from "./run-media-refs.js"
import { previewKindForMediaType, type MediaPreviewKind } from "./run-media-refs.js"

/** Resolved preview for a collected media ref. @category Demo */
export interface ResolvedMediaPreview {
  /** Source path in the run result. */
  path: string
  /** MIME type used for the blob / open URL. */
  mediaType: string
  /** Native preview kind. */
  previewKind: MediaPreviewKind
  /** Object URL or remote URL for `<img>` / Open. */
  url: string
  /** Whether `url` is a `blob:` that must be revoked. */
  revokeUrl: boolean
  /** Direct host URL with token (preferred for window.open when available). */
  hostOpenUrl?: string
  /** Optional filename. */
  name?: string
  /** Error message when resolution failed. */
  error?: string
}

function base64ToUint8Array(data: string): Uint8Array {
  const binary = atob(data)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

async function blobFromCapabilityBlob(blob: CapabilityBlob): Promise<Blob> {
  const buffer = await blob.arrayBuffer()
  return new Blob([buffer], { type: blob.type || "application/octet-stream" })
}

/**
 * Resolve a collected media ref into a browser-openable URL.
 * @category Demo
 */
export async function resolveMediaPreview(
  ref: CollectedMediaRef,
  options: {
    bridge?: BridgeSettings
    blobs?: CapabilityBlobStore
  }
): Promise<ResolvedMediaPreview> {
  const base = {
    path: ref.path,
    name: ref.name,
  }

  try {
    if (ref.kind === "buffer" && ref.dataBase64) {
      const bytes = base64ToUint8Array(ref.dataBase64)
      const mediaType = ref.mediaType || "application/octet-stream"
      const copy = new Uint8Array(bytes.byteLength)
      copy.set(bytes)
      const url = URL.createObjectURL(new Blob([copy], { type: mediaType }))
      return {
        ...base,
        mediaType,
        previewKind: previewKindForMediaType(mediaType),
        url,
        revokeUrl: true,
      }
    }

    if (ref.kind === "url" && ref.locator) {
      const mediaType = ref.mediaType || "application/octet-stream"
      return {
        ...base,
        mediaType,
        previewKind: previewKindForMediaType(mediaType),
        url: ref.locator,
        revokeUrl: false,
      }
    }

    const locator = ref.locator
    if (!locator) {
      return {
        ...base,
        mediaType: ref.mediaType || "application/octet-stream",
        previewKind: "download",
        url: "",
        revokeUrl: false,
        error: "Missing locator",
      }
    }

    if (locator.startsWith("ecp://browser/")) {
      const blob = options.blobs?.get(locator)
      if (!blob) {
        return {
          ...base,
          mediaType: ref.mediaType || "application/octet-stream",
          previewKind: "download",
          url: "",
          revokeUrl: false,
          error: "Browser file is no longer in memory for this run",
        }
      }
      const fileBlob = await blobFromCapabilityBlob(blob)
      const mediaType = ref.mediaType || blob.type || "application/octet-stream"
      return {
        ...base,
        mediaType,
        previewKind: previewKindForMediaType(mediaType),
        url: URL.createObjectURL(fileBlob),
        revokeUrl: true,
        name: ref.name || blob.name,
      }
    }

    if (locator.startsWith("ecp://artifacts/") || locator.startsWith("ecp://storage/")) {
      const bridge = options.bridge
      if (!bridge?.baseURL || !bridge.token.trim()) {
        return {
          ...base,
          mediaType: ref.mediaType || "application/octet-stream",
          previewKind: "download",
          url: "",
          revokeUrl: false,
          error: "Pair `ecp up` to preview host artifacts",
        }
      }
      const fetched = await fetchHostArtifact(bridge, locator)
      const mediaType = fetched.mediaType || ref.mediaType || "application/octet-stream"
      const url = URL.createObjectURL(
        new Blob([fetched.bytes], { type: mediaType })
      )
      return {
        ...base,
        mediaType,
        previewKind: previewKindForMediaType(mediaType),
        url,
        revokeUrl: true,
        hostOpenUrl: artifactFetchUrl(bridge, locator),
        name: ref.name || fetched.filename,
      }
    }

    return {
      ...base,
      mediaType: ref.mediaType || "application/octet-stream",
      previewKind: "download",
      url: "",
      revokeUrl: false,
      error: "Host filesystem paths cannot be previewed in the browser",
    }
  } catch (err) {
    return {
      ...base,
      mediaType: ref.mediaType || "application/octet-stream",
      previewKind: "download",
      url: "",
      revokeUrl: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}
