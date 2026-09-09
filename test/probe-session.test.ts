import { describe, expect, it, vi } from "vitest"
import type { Ecp } from "@executioncontrolprotocol/core"
import type {
  TestSessionSnapshot,
  WorkflowManifest,
} from "@executioncontrolprotocol/types"
import {
  buildProbeContextFromState,
  findDiscoveryCursor,
  runProbeSession,
} from "../src/lib/probe-session.js"

const workflow: WorkflowManifest = {
  schema: "@executioncontrolprotocol.workflow",
  version: "1.0",
  workflow: { id: "probe-workflow" },
  steps: [
    {
      id: "load",
      uses: "@executioncontrolprotocol/test.load",
      as: "source",
    },
    {
      id: "discover",
      uses: "@executioncontrolprotocol/adobe-firefly-services.generate-manifest",
      as: "psdManifest",
    },
  ],
}

function snapshotWithState(state: Record<string, unknown>): TestSessionSnapshot {
  return {
    schema: "@executioncontrolprotocol.test.session",
    version: "1.0",
    sessionId: "probe-1",
    workflow,
    input: {},
    state,
    history: {},
    cursor: "discover",
    status: "paused",
  }
}

function probeEcp(snapshot: TestSessionSnapshot): Pick<Ecp, "test"> {
  const runTo = vi.fn().mockResolvedValue(snapshot)
  const start = vi.fn().mockResolvedValue({ runTo })
  const withOptions = vi.fn().mockReturnValue({ start })
  return {
    test: vi.fn().mockReturnValue({ with: withOptions }),
  } as unknown as Pick<Ecp, "test">
}

describe("runProbeSession", () => {
  it("builds generic options from the selected state key", () => {
    const snapshot = snapshotWithState({ discovery: [{ id: "first" }] })
    const context = buildProbeContextFromState({
      snapshot,
      stepAs: "discovery",
      domain: "generic",
      buildOptions: (value) =>
        Array.isArray(value)
          ? value.map((item) => {
              const id = String((item as { id: unknown }).id)
              return { id, label: id }
            })
          : [],
    })

    expect(context.options).toEqual([{ id: "first", label: "first" }])
    expect(context.stepAs).toBe("discovery")
  })

  it("turns nested Photoshop layers into selectable options", async () => {
    const snapshot = snapshotWithState({
      psdManifest: {
        layers: [
          {
            id: "hero",
            name: "Hero",
            type: "group",
            children: [{ id: "title", name: "Title", type: "text" }],
          },
        ],
      },
    })

    const result = await runProbeSession(probeEcp(snapshot), workflow)

    expect(result?.snapshot).toBe(snapshot)
    expect(result?.probeContext.options).toEqual([
      {
        id: "hero",
        label: "Hero",
        path: "layers.0",
        meta: { type: "group" },
      },
      {
        id: "title",
        label: "Title",
        path: "layers.0.0",
        meta: { type: "text" },
      },
    ])
  })

  it("returns an empty context when the layer list is empty", async () => {
    const result = await runProbeSession(
      probeEcp(snapshotWithState({ psdManifest: { layers: [] } })),
      workflow
    )

    expect(result?.probeContext.options).toEqual([])
    expect(result?.probeContext.summary).toContain("No Photoshop layers")
  })

  it("returns an empty context when layer data is missing", async () => {
    const result = await runProbeSession(
      probeEcp(snapshotWithState({ psdManifest: { document: "example.psd" } })),
      workflow
    )

    expect(result?.probeContext.options).toEqual([])
    expect(result?.probeContext.stepAs).toBe("psdManifest")
  })

  it("gracefully skips workflows without a discovery cursor", async () => {
    const withoutDiscovery: WorkflowManifest = {
      ...workflow,
      steps: [workflow.steps[0]!],
    }

    expect(findDiscoveryCursor(withoutDiscovery)).toBeUndefined()
    expect(await runProbeSession(probeEcp(snapshotWithState({})), withoutDiscovery)).toBeUndefined()
  })
})
