/**
 * Vite stub when `@executioncontrolprotocol/adobe-firefly-services` is not linked.
 * @category Demo
 */
export const EXTENDED_VENDOR_MISSING = true as const

/** No-op register for missing optional peer. */
export async function registerAdobeFireflyServicesExtension(): Promise<void> {
  throw new Error(
    "Extended env requires @executioncontrolprotocol/adobe-firefly-services (pnpm run link:vendor)",
  )
}
