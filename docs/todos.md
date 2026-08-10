# Browser demo follow-ups

Track temporary workarounds and protocol-side work that this app depends on.

## Open

### Remove harness prompt fixture glob shim

| | |
| --- | --- |
| **Status** | Open |
| **Why** | Published `@executioncontrolprotocol/harnesses-browser-nano@0.10.0` (and coding) ships `import.meta.glob("../../../fixtures/harness-prompts/*.prompt.json")` from `dist/prompts/`. That path resolves above the package root, so Vite inlines an empty fixture map and chat fails with `Harness prompt fixture not found: intent-classification`. |
| **Demo shim** | `rewriteHarnessPromptFixtureGlob` in [`vite-browser-prompts-plugin.ts`](../vite-browser-prompts-plugin.ts) rewrites `../../../fixtures/...` → `../../fixtures/...` during Vite transform. Covered by [`test/vite-browser-prompts-plugin.test.ts`](../test/vite-browser-prompts-plugin.test.ts). |
| **Already fixed in ECP** | Monorepo source uses `../../fixtures/...` (e.g. on `feat/ollama-provider` / `development`). Not on npm/`main` yet. |
| **Done when** | 1. ECP merges the glob fix to `main` and publishes harness packages `> 0.10.0` (and any consumers that pin them). 2. This demo bumps `@executioncontrolprotocol/browser` (and transitive harnesses) to that release. 3. Delete `BROKEN_HARNESS_PROMPT_FIXTURE_GLOB`, `HARNESS_PROMPT_FIXTURE_GLOB`, `rewriteHarnessPromptFixtureGlob`, the plugin `transform` hook, and the rewrite unit tests — keep the existing `resolveId` loader redirects. |

## Done

_(none yet)_
