import type { BridgeSettings } from "./ecp-bridge.js"
import { artifactFetchPathname } from "@executioncontrolprotocol/core"

/** Options for {@link artifactFetchUrl}. @category Demo */
export interface ArtifactFetchUrlOptions {
  /** Known artifact display name. */
  name?: string
  /** Known artifact MIME type. */
  mediaType?: string
}

/** Fetched host artifact payload. @category Demo */
export interface FetchedArtifact {
  /** Raw bytes. */
  bytes: ArrayBuffer
  /** Content-Type from the host. */
  mediaType: string
  /** Suggested filename when present. */
  filename?: string
}

/**
 * Build a `GET /v1/artifacts/<filename>` URL (includes `?token=` for tab open without Bearer).
 * The path segment gives browsers a filename/extension hint beyond Content-Type / Content-Disposition.
 * @category Demo
 */
export function artifactFetchUrl(
  bridge: BridgeSettings,
  uri: string,
  options?: ArtifactFetchUrlOptions
): string {
  const base = bridge.baseURL.replace(/\/+$/, "")
  const url = new URL(`${base}${artifactFetchPathname(uri, options)}`)
  url.searchParams.set("uri", uri)
  if (bridge.token.trim()) url.searchParams.set("token", bridge.token.trim())
  return url.toString()
}

/**
 * Fetch host artifact bytes from `ecp up` / `ecp serve`.
 * @category Demo
 */
export async function fetchHostArtifact(
  bridge: BridgeSettings,
  uri: string,
  options?: ArtifactFetchUrlOptions,
  init?: RequestInit
): Promise<FetchedArtifact> {
  const headers = new Headers(init?.headers)
  if (bridge.token.trim() && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${bridge.token.trim()}`)
  }
  const res = await fetch(artifactFetchUrl(bridge, uri, options), {
    ...init,
    method: "GET",
    headers,
  })
  if (!res.ok) {
    let detail = res.statusText
    try {
      const json = (await res.json()) as { error?: string }
      if (json.error) detail = json.error
    } catch {
      /* ignore */
    }
    throw new Error(`Artifact fetch failed (${res.status}): ${detail}`)
  }
  const mediaType = res.headers.get("content-type") || "application/octet-stream"
  const disposition = res.headers.get("content-disposition") || ""
  const match = /filename="([^"]+)"/i.exec(disposition)
  return {
    bytes: await res.arrayBuffer(),
    mediaType,
    ...(match?.[1] ? { filename: match[1] } : {}),
  }
}
