import { describe, expect, it } from "vitest"
import { IMAGE_REF_KINDS } from "@executioncontrolprotocol/types"
import {
  encodeFileForConfigure,
  encodeFileForPort,
  filePortEncoding,
  isFilePort,
  isImageRefValueSchema,
  isRunFormFilePort,
  locatorFromFileDraft,
  WORKFLOW_FILE_VALUE_SCHEMA,
} from "../src/lib/run-form-files.js"
import { editorKindForPort, editorKindForTypeLabel, parseEditedLiteral } from "../src/lib/step-configure.js"
import {
  ioFieldsFromSchema,
  schemaFromIoFields,
  withNormalizedFileAccepts,
} from "../src/lib/workflow-io.js"

describe("file port detection", () => {
  it("treats image/filePath/source string ports as files", () => {
    expect(isRunFormFilePort({ id: "image", name: "image", typeLabel: "string" })).toBe(true)
    expect(isRunFormFilePort({ id: "filePath", name: "filePath", typeLabel: "string" })).toBe(true)
    expect(isRunFormFilePort({ id: "source", name: "source", typeLabel: "string" })).toBe(true)
  })

  it("ignores unrelated strings and non-file objects", () => {
    expect(isRunFormFilePort({ id: "prompt", name: "prompt", typeLabel: "string" })).toBe(false)
    expect(
      isRunFormFilePort({
        id: "meta",
        name: "meta",
        typeLabel: "object",
        valueSchema: { type: "object", properties: { a: { type: "string" } } },
      })
    ).toBe(false)
  })

  it("treats contentMediaType, x-ecp-file, and typeLabel file as files", () => {
    expect(
      isFilePort({
        name: "asset",
        typeLabel: "string",
        valueSchema: { type: "string", contentMediaType: "image/png" },
      })
    ).toBe(true)
    expect(editorKindForTypeLabel("file!")).toBe("file")
  })

  it("detects ImageRef schemas as file-ref encoding", () => {
    const imageRefSchema = {
      oneOf: [
        {
          type: "object",
          properties: { kind: { const: "buffer" }, data: { type: "string" } },
        },
        {
          type: "object",
          properties: { kind: { enum: ["file", "url", "artifact"] }, path: { type: "string" } },
        },
      ],
    }
    expect(isImageRefValueSchema(imageRefSchema)).toBe(true)
    expect(filePortEncoding({ name: "image", typeLabel: "object", valueSchema: imageRefSchema })).toBe(
      "image-ref-file"
    )
    expect(filePortEncoding({ name: "source", typeLabel: "string" })).toBe("locator")
  })
})

describe("file encode + parse", () => {
  it("encodes demo file ports as ImageRef file refs (no base64 data)", async () => {
    const file = new File([new Uint8Array([1, 2, 3])], "a.png", { type: "image/png" })
    const encoded = await encodeFileForPort(file, {
      name: "image",
      typeLabel: "file!",
      valueSchema: { ...WORKFLOW_FILE_VALUE_SCHEMA },
    })
    expect(encoded.locator).toMatch(/^ecp:\/\/browser\//)
    const value = JSON.parse(encoded.draft) as { kind: string; path: string; mediaType: string }
    expect(value.kind).toBe(IMAGE_REF_KINDS.FILE)
    expect(value.path).toBe(encoded.locator)
    expect(value.mediaType).toBe("image/png")
    expect(encoded.draft.includes('"data"')).toBe(false)
    const parsed = parseEditedLiteral(
      encoded.draft,
      undefined,
      "file!",
      WORKFLOW_FILE_VALUE_SCHEMA,
      "image"
    )
    expect(parsed.ok).toBe(true)
    if (parsed.ok) expect(parsed.value).toEqual(value)
  })

  it("encodes Azure source ports as plain locators", async () => {
    const file = new File([new Uint8Array([1, 2, 3])], "a.png", { type: "image/png" })
    const encoded = await encodeFileForPort(file, {
      name: "source",
      typeLabel: "string",
      valueSchema: { type: "string" },
    })
    expect(encoded.draft).toBe(encoded.locator)
    expect(locatorFromFileDraft(encoded.draft)).toBe(encoded.locator)
  })

  it("configure encode also uses refs, never base64 payloads", async () => {
    const file = new File([new Uint8Array([4])], "c.bin", { type: "application/octet-stream" })
    const encoded = await encodeFileForConfigure(file, {
      name: "image",
      typeLabel: "file!",
      valueSchema: { ...WORKFLOW_FILE_VALUE_SCHEMA },
    })
    expect(JSON.parse(encoded.draft).kind).toBe(IMAGE_REF_KINDS.FILE)
    expect(encoded.draft.includes('"data"')).toBe(false)
  })
})

describe("workflow io file type", () => {
  it("round-trips file fields as ImageRef file-ref schemas", () => {
    const schema = schemaFromIoFields([
      {
        name: "photo",
        type: "file",
        required: true,
        valueSchema: { ...WORKFLOW_FILE_VALUE_SCHEMA },
      },
    ])
    expect((schema?.properties as Record<string, unknown>).photo).toMatchObject({
      type: "object",
      "x-ecp-file": true,
    })
    const fields = ioFieldsFromSchema(schema)
    expect(fields[0]?.type).toBe("file")
    expect(
      filePortEncoding({
        name: "photo",
        typeLabel: "file!",
        valueSchema: fields[0]!.valueSchema,
      })
    ).toBe("image-ref-file")
  })

  it("upgrades legacy string file accepts for run validation", () => {
    const legacy = {
      schema: "@executioncontrolprotocol.workflow" as const,
      version: "1.0",
      workflow: {
        id: "w",
        accepts: {
          type: "object",
          properties: {
            image: {
              type: "string",
              contentMediaType: "application/octet-stream",
              "x-ecp-file": true,
            },
          },
          required: ["image"],
        },
      },
      steps: [],
    }
    const next = withNormalizedFileAccepts(legacy)
    expect(
      (next.workflow.accepts as { properties: Record<string, unknown> }).properties.image
    ).toMatchObject({
      type: "object",
      "x-ecp-file": true,
    })
  })
})
