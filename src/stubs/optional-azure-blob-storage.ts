/**
 * Vite stub when `@executioncontrolprotocol/azure-blob-storage` is not linked.
 * @category Demo
 */
export const EXTENDED_VENDOR_MISSING = true as const

/** No-op register for missing optional peer. */
export async function registerAzureBlobStorageExtension(): Promise<void> {
  throw new Error(
    "Extended env requires @executioncontrolprotocol/azure-blob-storage (pnpm run link:vendor)",
  )
}
