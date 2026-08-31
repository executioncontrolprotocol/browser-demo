import { describe, expect, it } from "vitest"
import { fileAcceptFromValueSchema, fileAcceptHint } from "../src/lib/file-accept.js"

describe("fileAcceptFromValueSchema", () => {
  it("maps a single contentMediaType string", () => {
    expect(fileAcceptFromValueSchema({ contentMediaType: "image/*" })).toBe("image/*")
  })

  it("joins array contentMediaType values", () => {
    expect(
      fileAcceptFromValueSchema({ contentMediaType: ["image/png", "image/jpeg"] })
    ).toBe("image/png,image/jpeg")
  })

  it("returns undefined for empty or missing hints", () => {
    expect(fileAcceptFromValueSchema(undefined)).toBeUndefined()
    expect(fileAcceptFromValueSchema({ contentMediaType: "" })).toBeUndefined()
    expect(fileAcceptFromValueSchema({ contentMediaType: [] })).toBeUndefined()
  })
})

describe("fileAcceptHint", () => {
  it("formats accept hint text", () => {
    expect(fileAcceptHint("image/*")).toBe("Accepts: image/*")
    expect(fileAcceptHint(undefined)).toBeUndefined()
  })
})
