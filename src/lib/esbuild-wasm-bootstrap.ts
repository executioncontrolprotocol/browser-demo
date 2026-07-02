import { ESBUILD_WASM_URL_KEY } from "@executioncontrolprotocol/core/browser"
import esbuildWasmAssetUrl from "esbuild-wasm/esbuild.wasm?url"

/** Point core browser compile at the same esbuild.wasm as the installed esbuild-wasm package. */
export function installEsbuildWasmUrl(): void {
  const globalRecord = globalThis as typeof globalThis & {
    [ESBUILD_WASM_URL_KEY]?: string
  }
  globalRecord[ESBUILD_WASM_URL_KEY] = esbuildWasmAssetUrl
}
