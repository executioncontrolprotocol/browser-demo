import { describe, expect, it } from "vitest"
import { GITHUB_REPO_URL } from "../src/lib/external-links.js"

describe("external-links", () => {
  it("exports a GitHub repo URL", () => {
    expect(GITHUB_REPO_URL).toMatch(/^https:\/\/github\.com\//)
  })
})
