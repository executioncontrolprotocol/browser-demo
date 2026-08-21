import { describe, expect, it } from "vitest"
import {
  collectMediaRefs,
  previewKindForMediaType,
} from "../src/lib/run-media-refs.js"

describe("collectMediaRefs", () => {
  it("finds ImageRef artifacts in nested state", () => {
    const refs = collectMediaRefs({
      state: {
        thumb: {
          image: {
            kind: "artifact",
            uri: "ecp://artifacts/images/a.webp",
            mediaType: "image/webp",
            name: "a.webp",
          },
        },
      },
    })
    expect(refs).toEqual([
      expect.objectContaining({
        path: "state.thumb.image",
        kind: "artifact",
        locator: "ecp://artifacts/images/a.webp",
        mediaType: "image/webp",
      }),
    ])
  })

  it("finds buffer and browser locator refs", () => {
    const refs = collectMediaRefs({
      output: {
        image: { kind: "buffer", data: "AQID", mediaType: "image/png" },
      },
      state: {
        image: { kind: "file", path: "ecp://browser/abc", mediaType: "image/jpeg" },
      },
    })
    expect(refs.map((r) => r.kind).sort()).toEqual(["buffer", "file"])
  })

  it("ignores unrelated strings", () => {
    expect(collectMediaRefs({ note: "hello", n: 1 })).toEqual([])
  })
})

describe("previewKindForMediaType", () => {
  it("maps common MIME types", () => {
    expect(previewKindForMediaType("image/webp")).toBe("image")
    expect(previewKindForMediaType("video/mp4")).toBe("video")
    expect(previewKindForMediaType("audio/mpeg")).toBe("audio")
    expect(previewKindForMediaType("application/pdf")).toBe("pdf")
    expect(previewKindForMediaType("application/octet-stream")).toBe("download")
  })
})
