import type { Environment } from "@executioncontrolprotocol/core"

/**
 * Register and bind Azure + Adobe for the extended demo preset.
 * Returns false when optional peers are missing (Vite stubs / unresolved).
 *
 * Adobe IMS secrets stay on the host (`ecp up --env`); browser binding uses
 * catalog placeholders so Zod config validates. Mixed Azure upload runs in-tab.
 */
export async function applyExtendedDemoVendors(env: Environment): Promise<boolean> {
  const azure = await import("@executioncontrolprotocol/azure-blob-storage")
  const adobe = await import("@executioncontrolprotocol/adobe-firefly-services")
  if ("EXTENDED_VENDOR_MISSING" in azure || "EXTENDED_VENDOR_MISSING" in adobe) {
    return false
  }
  await azure.registerAzureBlobStorageExtension()
  await adobe.registerAdobeFireflyServicesExtension()
  env.addExtensionBinding("@executioncontrolprotocol/azure-blob-storage", {})
  env.addExtensionBinding("@executioncontrolprotocol/adobe-firefly-services", {
    clientId: "ecp-browser-catalog",
    clientSecret: "ecp-browser-catalog",
  })
  return true
}

/** Namespaces to allow when the extended preset is mounted. */
export const EXTENDED_DEMO_ALLOWLIST = [
  "@executioncontrolprotocol/azure-blob-storage",
  "@executioncontrolprotocol/adobe-firefly-services",
] as const
