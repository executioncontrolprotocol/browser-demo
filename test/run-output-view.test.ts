import { describe, expect, it } from "vitest"
import {
  filterUnmappedMediaRefs,
  formatOutputDebugJson,
  formatScalarDisplay,
  isMediaReturnValue,
  mappedMediaPathPrefixes,
  mediaRefsForReturnValue,
  valueForReturnPort,
} from "../src/lib/run-output-view.js"
import { runFormPortsFromReturns } from "../src/lib/workflow-io.js"
import type { ReactFlowPort } from "@executioncontrolprotocol/format-reactflow"

describe("runFormPortsFromReturns", () => {
  it("maps returns schema properties to ports", () => {
    const ports = runFormPortsFromReturns({
      type: "object",
      properties: {
        echo: { type: "string" },
        count: { type: "number" },
      },
      required: ["echo"],
    })
    expect(ports.map((p) => p.name)).toEqual(["echo", "count"])
    expect(ports[0]?.required).toBe(true)
    expect(ports[0]?.typeLabel).toBe("string!")
    expect(ports[1]?.typeLabel).toBe("number")
  })

  it("returns empty for missing schema", () => {
    expect(runFormPortsFromReturns(undefined)).toEqual([])
  })
})

describe("valueForReturnPort", () => {
  it("reads present keys", () => {
    expect(valueForReturnPort({ echo: "hi", n: 1 }, "echo")).toBe("hi")
  })

  it("returns undefined for missing keys and non-objects", () => {
    expect(valueForReturnPort({ echo: "hi" }, "missing")).toBeUndefined()
    expect(valueForReturnPort(null, "echo")).toBeUndefined()
    expect(valueForReturnPort("x", "echo")).toBeUndefined()
  })
})

describe("formatScalarDisplay", () => {
  it("formats booleans and numbers", () => {
    expect(formatScalarDisplay(true, "boolean")).toBe("true")
    expect(formatScalarDisplay(false, "boolean")).toBe("false")
    expect(formatScalarDisplay(42, "number")).toBe("42")
  })

  it("formats strings and multiselect", () => {
    expect(formatScalarDisplay("hello", "string")).toBe("hello")
    expect(formatScalarDisplay(["a", "b"], "multiselect")).toBe("a, b")
  })

  it("unwraps model generate { text } instead of [object Object]", () => {
    expect(formatScalarDisplay({ text: "Skip Echo" }, "string")).toBe("Skip Echo")
  })

  it("pretty-prints non-text objects for string ports", () => {
    expect(formatScalarDisplay({ echo: "hi" }, "string")).toContain('"echo"')
    expect(formatScalarDisplay({ echo: "hi" }, "string")).not.toContain("[object Object]")
  })

  it("pretty-prints json objects", () => {
    expect(formatScalarDisplay({ a: 1 }, "json")).toContain('"a": 1')
  })
})

describe("media mapping", () => {
  const filePort: ReactFlowPort = {
    id: "image",
    name: "image",
    typeLabel: "file",
    valueSchema: { type: "object", properties: { kind: { type: "string", enum: ["artifact"] } } },
  }
  const stringPort: ReactFlowPort = {
    id: "echo",
    name: "echo",
    typeLabel: "string",
    valueSchema: { type: "string" },
  }

  it("detects file ports as media", () => {
    expect(
      isMediaReturnValue(filePort, {
        kind: "artifact",
        uri: "ecp://artifacts/images/a.webp",
        mediaType: "image/webp",
      })
    ).toBe(true)
    expect(isMediaReturnValue(stringPort, "hi")).toBe(false)
  })

  it("collects media under a return field", () => {
    const refs = mediaRefsForReturnValue("image", {
      kind: "artifact",
      uri: "ecp://artifacts/images/a.webp",
      mediaType: "image/webp",
    })
    expect(refs.length).toBe(1)
    expect(refs[0]?.path).toBe("image")
  })

  it("filters mapped media from leftover lists", () => {
    const output = {
      image: {
        kind: "artifact",
        uri: "ecp://artifacts/images/a.webp",
        mediaType: "image/webp",
      },
      note: "x",
    }
    const prefixes = mappedMediaPathPrefixes([filePort, stringPort], output)
    expect(prefixes.has("image")).toBe(true)
    const leftover = filterUnmappedMediaRefs(
      [
        { path: "image", kind: "artifact", locator: "ecp://artifacts/images/a.webp" },
        { path: "extra", kind: "artifact", locator: "ecp://artifacts/images/b.webp" },
      ],
      prefixes
    )
    expect(leftover.map((r) => r.path)).toEqual(["extra"])
  })

  it("ignores extras not in schema for mapped prefixes", () => {
    const prefixes = mappedMediaPathPrefixes([stringPort], {
      echo: "hi",
      image: { kind: "artifact", uri: "ecp://artifacts/images/a.webp", mediaType: "image/webp" },
    })
    expect(prefixes.has("image")).toBe(false)
  })
})

describe("formatOutputDebugJson", () => {
  it("pretty prints or empties", () => {
    expect(formatOutputDebugJson(undefined)).toBe("")
    expect(formatOutputDebugJson({ a: 1 })).toContain('"a": 1')
  })
})
