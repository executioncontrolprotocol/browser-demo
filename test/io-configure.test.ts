import { describe, expect, it } from "vitest"
import {
  buildIoFieldsFromConfigureRows,
  mergeIoFieldValueSchemaOnTypeChange,
} from "../src/lib/io-configure.js"
import { schemaFromIoFields, type WorkflowIoField } from "../src/lib/workflow-io.js"

describe("io-configure helpers", () => {
  it("preserves enum constraints when coarse type would reset schema", () => {
    const current = { type: "string", enum: ["fast", "slow"] }
    expect(mergeIoFieldValueSchemaOnTypeChange(current, "string")).toEqual(current)
    expect(mergeIoFieldValueSchemaOnTypeChange(current, "number")).toMatchObject({
      type: "number",
      enum: ["fast", "slow"],
    })
  })

  it("writes default values into accepts fields on save", () => {
    const rows: WorkflowIoField[] = [
      {
        name: "mode",
        type: "string",
        required: true,
        valueSchema: { type: "string", enum: ["fast", "slow"] },
      },
    ]
    const built = buildIoFieldsFromConfigureRows(rows, { mode: "slow" }, "accepts")
    expect(built.ok).toBe(true)
    if (built.ok) {
      expect(built.fields[0]?.valueSchema.default).toBe("slow")
    }
  })

  it("rejects invalid default drafts", () => {
    const rows: WorkflowIoField[] = [
      {
        name: "mode",
        type: "string",
        required: true,
        valueSchema: { type: "string", enum: ["fast", "slow"] },
      },
    ]
    const built = buildIoFieldsFromConfigureRows(rows, { mode: "nope" }, "accepts")
    expect(built.ok).toBe(false)
  })

  it("clears default when draft is empty", () => {
    const rows: WorkflowIoField[] = [
      {
        name: "mode",
        type: "string",
        required: true,
        valueSchema: { type: "string", enum: ["fast", "slow"], default: "fast" },
      },
    ]
    const built = buildIoFieldsFromConfigureRows(rows, { mode: "" }, "accepts")
    expect(built.ok).toBe(true)
    if (built.ok) {
      expect(built.fields[0]?.valueSchema.default).toBeUndefined()
      expect(schemaFromIoFields(built.fields)?.properties).toEqual({
        mode: { type: "string", enum: ["fast", "slow"] },
      })
    }
  })
})
