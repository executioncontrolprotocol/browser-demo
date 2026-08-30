import { describe, expect, it } from "vitest"
import { artifactFetchUrl } from "../src/lib/fetch-artifact.js"

describe("artifactFetchUrl", () => {
  const bridge = {
    baseURL: "http://127.0.0.1:3090",
    token: "test-token",
  }

  it("embeds filename in the path for browser URL hints", () => {
    const url = artifactFetchUrl(bridge, "ecp://artifacts/images/output.webp", {
      name: "output.webp",
      mediaType: "image/webp",
    })
    expect(url).toContain("/v1/artifacts/output.webp?")
    expect(url).toContain("uri=ecp%3A%2F%2Fartifacts%2Fimages%2Foutput.webp")
    expect(url).toContain("token=test-token")
  })

  it("derives extension from mediaType when name is missing", () => {
    const url = artifactFetchUrl(bridge, "ecp://artifacts/media/x", {
      mediaType: "image/png",
    })
    expect(url).toMatch(/\/v1\/artifacts\/[^/?]+\.png\?/)
  })
})
