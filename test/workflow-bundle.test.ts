import { describe, expect, it } from "vitest"
import {
  WORKFLOW_BUNDLE_SCHEMA,
  WORKFLOW_MANIFEST_SCHEMA,
  downloadWorkflowFluent,
  parseDroppedWorkflowFile,
  sanitizeWorkflowFilename,
  workflowFluentDownloadName,
  workflowManifestDownloadName,
} from "../src/lib/workflow-bundle.js"

const sampleManifest = {
  schema: WORKFLOW_MANIFEST_SCHEMA,
  version: "1.0",
  workflow: { id: "demo", label: "Demo flow" },
  steps: [],
}

describe("workflow-bundle (single-format)", () => {
  it("positive: parses plain workflow manifest JSON", () => {
    const parsed = parseDroppedWorkflowFile(JSON.stringify(sampleManifest), "demo.workflow.json")
    expect(parsed.kind).toBe("manifest")
    if (parsed.kind === "manifest") {
      expect(parsed.manifest.schema).toBe(WORKFLOW_MANIFEST_SCHEMA)
      expect(parsed.manifest.workflow.id).toBe("demo")
    }
  })

  it("positive: parses Fluent .ts by extension", () => {
    const src = 'export default workflow("Demo flow")\n'
    const parsed = parseDroppedWorkflowFile(src, "demo.workflow.ts")
    expect(parsed).toEqual({ kind: "fluent", fluent: src })
  })

  it("positive: parses legacy dual bundle", () => {
    const bundle = {
      schema: WORKFLOW_BUNDLE_SCHEMA,
      version: "1.0",
      id: "demo",
      label: "Demo flow",
      updatedAt: "2026-01-01T00:00:00.000Z",
      fluent: 'export default workflow("Demo flow")',
      manifest: sampleManifest,
    }
    const parsed = parseDroppedWorkflowFile(JSON.stringify(bundle), "demo.ecp-workflow.json")
    expect(parsed.kind).toBe("legacy-bundle")
    if (parsed.kind === "legacy-bundle") {
      expect(parsed.fluent).toContain("Demo flow")
      expect(parsed.manifest.schema).toBe(WORKFLOW_MANIFEST_SCHEMA)
    }
  })

  it("negative: rejects unrecognized JSON schema", () => {
    expect(() =>
      parseDroppedWorkflowFile(JSON.stringify({ schema: "nope" }), "x.json")
    ).toThrow(/Unrecognized workflow JSON/)
  })

  it("negative: rejects empty Fluent file", () => {
    expect(() => parseDroppedWorkflowFile("  ", "empty.workflow.ts")).toThrow(/empty/)
  })

  it("edge: sanitizes download filenames", () => {
    expect(sanitizeWorkflowFilename("My Flow!/v2")).toBe("v2")
    expect(sanitizeWorkflowFilename("  cool flow  ")).toBe("cool-flow")
    expect(workflowFluentDownloadName("Hello World")).toBe("Hello-World.workflow.ts")
    expect(workflowManifestDownloadName("Hello World")).toBe("Hello-World.workflow.json")
  })

  it("edge: downloadWorkflowFluent is defined for browser wiring", () => {
    expect(typeof downloadWorkflowFluent).toBe("function")
  })
})
