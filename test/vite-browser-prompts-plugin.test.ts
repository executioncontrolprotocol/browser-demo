import { describe, expect, it } from "vitest"
import {
  BROKEN_HARNESS_PROMPT_FIXTURE_GLOB,
  HARNESS_PROMPT_FIXTURE_GLOB,
  rewriteHarnessPromptFixtureGlob,
} from "../vite-browser-prompts-plugin.js"

describe("rewriteHarnessPromptFixtureGlob", () => {
  it("rewrites the published 0.10.0 one-level-too-high glob", () => {
    const input = `const modules = import.meta.glob(${JSON.stringify(BROKEN_HARNESS_PROMPT_FIXTURE_GLOB)}, { eager: true })`
    const output = rewriteHarnessPromptFixtureGlob(input)
    expect(output).toContain(JSON.stringify(HARNESS_PROMPT_FIXTURE_GLOB))
    expect(output).not.toContain(JSON.stringify(BROKEN_HARNESS_PROMPT_FIXTURE_GLOB))
  })

  it("is a no-op when the glob is already correct", () => {
    const input = `const modules = import.meta.glob(${JSON.stringify(HARNESS_PROMPT_FIXTURE_GLOB)}, { eager: true })`
    expect(rewriteHarnessPromptFixtureGlob(input)).toBe(input)
  })
})
