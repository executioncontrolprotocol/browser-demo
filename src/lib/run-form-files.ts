import type { ReactFlowPort } from "@executioncontrolprotocol/format-reactflow"
import type { CapabilityBlob } from "@executioncontrolprotocol/core"

const FILE_FIELD_RE = /^(image|file|filePath|source|blob|photo|upload)$/i

/**
 * Whether a run-form port should offer a file picker (locator string in JSON).
 */
export function isRunFormFilePort(port: ReactFlowPort): boolean {
  const schemaType = port.valueSchema?.type
  const typeOk = schemaType === undefined || schemaType === "string"
  if (!typeOk) return false
  if (FILE_FIELD_RE.test(port.name)) return true
  const media = port.valueSchema?.contentMediaType
  return typeof media === "string" && media.length > 0
}

/** Adapt a browser File to the capability blob map. */
export function capabilityBlobFromFile(file: File): CapabilityBlob {
  return {
    name: file.name,
    type: file.type,
    size: file.size,
    arrayBuffer: () => file.arrayBuffer(),
  }
}
