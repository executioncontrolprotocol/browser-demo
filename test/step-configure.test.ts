import { describe, expect, it } from "vitest"
import {
  editorKindForPort,
  editorKindForTypeLabel,
  editorKindForValueSchema,
  enumOptionsFromValueSchema,
  findStepById,
  isLongTextParam,
  parseEditedLiteral,
  rewriteStateRefPath,
  unboundPorts,
} from "../src/lib/step-configure.js"
import type { ReactFlowStepData } from "@executioncontrolprotocol/format-reactflow"

describe("step-configure helpers", () => {
  it("finds nested steps by id", () => {
    const found = findStepById(
      [
        {
          type: "parallel",
          id: "p1",
          branches: [[{ id: "inner", uses: "@x/y", input: { prompt: "hi" }, as: "a" }]],
        },
      ],
      "inner"
    )
    expect(found?.id).toBe("inner")
    expect(found?.input?.prompt).toBe("hi")
  })

  it("treats prompt as long text", () => {
    expect(isLongTextParam("prompt", "short")).toBe(true)
    expect(isLongTextParam("model", "gpt")).toBe(false)
    expect(isLongTextParam("notes", "x".repeat(100))).toBe(true)
  })

  it("maps type labels to editor kinds", () => {
    expect(editorKindForTypeLabel("string!")).toBe("string")
    expect(editorKindForTypeLabel("number")).toBe("number")
    expect(editorKindForTypeLabel("boolean")).toBe("boolean")
    expect(editorKindForTypeLabel("object")).toBe("json")
    expect(editorKindForTypeLabel("unknown")).toBe("json")
  })

  it("maps valueSchema string+enum to enum editor kind", () => {
    expect(
      editorKindForValueSchema({ type: "string", enum: ["fast", "slow"] })
    ).toBe("enum")
    expect(enumOptionsFromValueSchema({ type: "string", enum: ["fast", "slow"] })).toEqual([
      "fast",
      "slow",
    ])
    expect(editorKindForValueSchema({ type: "string" })).toBe("string")
    expect(editorKindForValueSchema({ type: "number" })).toBe("number")
    expect(
      editorKindForPort({
        typeLabel: "string!",
        valueSchema: { type: "string", enum: ["a", "b"] },
      })
    ).toBe("enum")
    expect(editorKindForPort({ typeLabel: "number" })).toBe("number")
  })

  it("lists unbound schema ports", () => {
    const step: ReactFlowStepData = {
      label: "Gen",
      inputs: [
        { id: "prompt", name: "prompt", typeLabel: "string!", binding: "literal", valueTitle: "hi" },
        { id: "system", name: "system", typeLabel: "string" },
        { id: "context", name: "context", typeLabel: "unknown", binding: "ref", refPath: "a.text" },
      ],
      outputs: [],
    }
    expect(unboundPorts(step).map((p) => p.name)).toEqual(["system"])
  })

  it("rewrites state refs when renaming as keys", () => {
    expect(rewriteStateRefPath("state.email.text", "email", "summary")).toBe("state.summary.text")
    expect(rewriteStateRefPath("email.text", "email", "summary")).toBe("state.summary.text")
    expect(rewriteStateRefPath("state.email", "email", "summary")).toBe("state.summary")
    expect(rewriteStateRefPath("state.other.text", "email", "summary")).toBe("state.other.text")
  })

  it("parses edited literals by original type or typeLabel", () => {
    expect(parseEditedLiteral("hello", "old")).toEqual({ ok: true, value: "hello" })
    expect(parseEditedLiteral("42", 1)).toEqual({ ok: true, value: 42 })
    expect(parseEditedLiteral("true", false)).toEqual({ ok: true, value: true })
    expect(parseEditedLiteral('{"a":1}', { a: 0 })).toEqual({ ok: true, value: { a: 1 } })
    expect(parseEditedLiteral("{", { a: 1 }).ok).toBe(false)
    expect(parseEditedLiteral("3.5", undefined, "number")).toEqual({ ok: true, value: 3.5 })
    expect(parseEditedLiteral("true", undefined, "boolean!")).toEqual({ ok: true, value: true })
    expect(parseEditedLiteral('{"x":1}', undefined, "object")).toEqual({ ok: true, value: { x: 1 } })
  })

  it("parses enum drafts against valueSchema options", () => {
    const schema = { type: "string", enum: ["fast", "slow"] }
    expect(parseEditedLiteral("slow", undefined, "string", schema)).toEqual({
      ok: true,
      value: "slow",
    })
    expect(parseEditedLiteral("nope", undefined, "string", schema).ok).toBe(false)
  })
})
