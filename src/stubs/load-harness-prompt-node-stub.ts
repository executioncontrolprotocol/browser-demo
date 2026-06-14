/** Fallback if Node prompt loader is resolved in the browser bundle (should not run). */
export function loadHarnessPromptFixtureNode(): never {
  throw new Error(
    "Harness prompt loader resolved Node path in browser — restart dev server after vite config changes"
  )
}
