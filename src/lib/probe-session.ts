import {
  buildPhotoshopLayersProbeContext,
  flattenTestStepOrder,
  type Ecp,
} from "@executioncontrolprotocol/core"
import {
  PROBE_CONTEXT_DOMAINS,
  type ProbeContext,
  type ProbeOption,
  type StepNode,
  type TestSessionSnapshot,
  type WorkflowManifest,
} from "@executioncontrolprotocol/types"

const DISCOVERY_STATE_KEYS = new Set(["manifest", "psdmanifest", "discovery"])

/** Result of running a workflow through its discovery step. @category Demo */
export interface ProbeSessionResult {
  /** Serializable test session state for later continuation. */
  snapshot: TestSessionSnapshot
  /** Prompt-safe discovery context passed into later chat turns. */
  probeContext: ProbeContext
}

/** Inputs for building a domain-neutral probe context from session state. @category Demo */
export interface ProbeContextFromStateOptions {
  /** Completed test session snapshot. */
  snapshot: TestSessionSnapshot
  /** State key containing discovery output. */
  stepAs: string
  /** Probe domain used by the harness prompt. */
  domain: string
  /** Convert the discovered value into selectable options. */
  buildOptions: (value: unknown) => ProbeOption[]
  /** Optional summary override. */
  summary?: string
}

/** Find the last workflow step that appears to produce discovery state. @category Demo */
export function findDiscoveryCursor(workflow: WorkflowManifest): StepNode | undefined {
  return flattenTestStepOrder(workflow.steps)
    .filter(
      (step) =>
        String(step.uses).toLowerCase().includes("generate-manifest") ||
        (step.as !== undefined && DISCOVERY_STATE_KEYS.has(step.as.toLowerCase()))
    )
    .at(-1)
}

/** Build a generic probe context from a named test-session state value. @category Demo */
export function buildProbeContextFromState(
  options: ProbeContextFromStateOptions
): ProbeContext {
  const probeOptions = options.buildOptions(options.snapshot.state[options.stepAs])
  return {
    probeId: options.snapshot.sessionId,
    domain: options.domain,
    ...(options.snapshot.cursor ? { cursor: options.snapshot.cursor } : {}),
    stepAs: options.stepAs,
    summary:
      options.summary ??
      (probeOptions.length > 0
        ? `Discovered ${probeOptions.length} option(s).`
        : "No options discovered."),
    options: probeOptions,
  }
}

/** Run the workflow to its discovery cursor and build Photoshop layer options. @category Demo */
export async function runProbeSession(
  ecp: Pick<Ecp, "test">,
  workflow: WorkflowManifest,
  input?: Record<string, unknown>
): Promise<ProbeSessionResult | undefined> {
  const cursor = findDiscoveryCursor(workflow)
  if (!cursor) return undefined

  try {
    const session = await ecp.test(workflow).with({ input: input ?? {} }).start()
    const snapshot = await session.runTo(cursor.id)
    const stepAs = cursor.as ?? findPhotoshopStateKey(snapshot.state)
    if (!stepAs) {
      return {
        snapshot,
        probeContext: {
          probeId: snapshot.sessionId,
          domain: PROBE_CONTEXT_DOMAINS.PHOTOSHOP_LAYERS,
          ...(snapshot.cursor ? { cursor: snapshot.cursor } : {}),
          summary: "The probe completed without Photoshop layer state.",
          options: [],
        },
      }
    }

    return {
      snapshot,
      probeContext: buildPhotoshopLayersProbeContext({
        probeId: snapshot.sessionId,
        manifest: snapshot.state[stepAs],
        ...(snapshot.cursor ? { cursor: snapshot.cursor } : {}),
        stepAs,
      }),
    }
  } catch {
    return undefined
  }
}

/** Format discovered options as a compact agent chat message. @category Demo */
export function formatProbeOptionsMessage(probe: ProbeContext): string {
  if (probe.options.length === 0) return probe.summary
  const choices = probe.options.map((option) => `${option.label} (${option.id})`).join(", ")
  return `${probe.summary} Choose one or more: ${choices}.`
}

function findPhotoshopStateKey(state: Record<string, unknown>): string | undefined {
  return Object.keys(state).find((key) => hasPhotoshopLayers(state[key]))
}

function hasPhotoshopLayers(value: unknown): boolean {
  if (!value || typeof value !== "object") return false
  const record = value as Record<string, unknown>
  if (Array.isArray(record.layers)) return true
  return hasPhotoshopLayers(record.manifest) || hasPhotoshopLayers(record.result)
}
