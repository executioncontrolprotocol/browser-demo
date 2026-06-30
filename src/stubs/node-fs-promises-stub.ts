/** Stub for `node:fs/promises` in the browser demo bundle. */
export async function readFile(): Promise<never> {
  throw new Error("node:fs/promises is not available in the browser demo")
}
