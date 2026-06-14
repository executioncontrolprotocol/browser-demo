import type { HarnessInvokeResult, InvokeResult } from "@executioncontextprotocol/types"

const CHAT_RAW_SNIPPET_CHARS = 280

function formatRawOutput(raw: unknown): string | undefined {
  if (typeof raw === "string") {
    const trimmed = raw.trim()
    return trimmed.length > 0 ? raw : undefined
  }
  if (raw === undefined || raw === null) return undefined
  try {
    return JSON.stringify(raw, null, 2)
  } catch {
    return String(raw)
  }
}

function asHarnessResult(result: unknown): HarnessInvokeResult | undefined {
  if (result === null || typeof result !== "object") return undefined
  const candidate = result as HarnessInvokeResult
  return typeof candidate.raw === "string" && candidate.trace ? candidate : undefined
}

/** Log harness invoke details (including raw model text) to the browser console. */
export function logHarnessInvoke(label: string, invoked: InvokeResult): void {
  const harness = asHarnessResult(invoked.result)

  console.group(`[ecp harness] ${label}`)
  console.log("success:", invoked.success)
  console.log("capability:", invoked.capabilityId)
  if (invoked.diagnostics.length > 0) {
    console.warn("diagnostics:", invoked.diagnostics)
  }
  if (harness) {
    console.log("artifact:", harness.artifact)
    console.log("validation:", harness.validation)
    console.log("trace:", harness.trace)
    const raw = formatRawOutput(harness.trace?.rawOutput ?? harness.raw)
    if (raw) {
      console.log("raw model output:", raw)
    }
  }
  console.groupEnd()
}

/** User-facing chat error from a failed harness invoke. */
export function harnessInvokeChatError(invoked: InvokeResult): string {
  const parts: string[] = []

  for (const d of invoked.diagnostics) {
    const line = d.path ? `${d.message} (${d.path})` : d.message
    if (line && !parts.includes(line)) parts.push(line)
  }

  const harness = asHarnessResult(invoked.result)
  if (harness?.validation && !harness.validation.valid && harness.validation.errors?.length) {
    for (const e of harness.validation.errors) {
      const line = e.path ? `${e.message} (${e.path})` : e.message
      if (line && !parts.includes(line)) parts.push(line)
    }
  }

  const raw = formatRawOutput(harness?.trace?.rawOutput ?? harness?.raw)
  if (raw) {
    const snippet =
      raw.length > CHAT_RAW_SNIPPET_CHARS
        ? `${raw.slice(0, CHAT_RAW_SNIPPET_CHARS)}…`
        : raw
    parts.push(`Model output: ${snippet}`)
  }

  if (parts.length === 0 && invoked.diagnostics.length > 0) {
    for (const d of invoked.diagnostics) {
      const rawMatch = /rawModelOutput:\s*([\s\S]*)$/i.exec(d.message)
      if (rawMatch?.[1]?.trim()) {
        const snippet =
          rawMatch[1].length > CHAT_RAW_SNIPPET_CHARS
            ? `${rawMatch[1].slice(0, CHAT_RAW_SNIPPET_CHARS)}…`
            : rawMatch[1].trim()
        parts.push(`Model output: ${snippet}`)
        break
      }
    }
  }

  if (parts.length === 0) {
    return "The agent request failed. See the browser console for details."
  }

  return parts.join("\n\n")
}

/** Log successful harness output (raw model text) to the console. */
export function logHarnessSuccess(label: string, harness: HarnessInvokeResult): void {
  const raw = formatRawOutput(harness.trace?.rawOutput ?? harness.raw)
  console.group(`[ecp harness] ${label}`)
  console.log("trace:", harness.trace)
  if (raw) {
    console.log("raw model output:", raw)
  }
  if (harness.validation && !harness.validation.valid) {
    console.warn("validation:", harness.validation)
  }
  console.groupEnd()
}
