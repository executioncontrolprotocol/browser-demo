import { warmBrowserWorkflowCompile } from "@executioncontrolprotocol/core/browser"
import {
  browser,
  createBrowserEnvironment,
  createEcp,
  extension,
  globalRegistry,
  harness,
  policy,
  registerBrowserHost,
} from "@executioncontrolprotocol/browser"
import type { Ecp, Environment } from "@executioncontrolprotocol/core"
import type { EnvironmentDescriptor } from "@executioncontrolprotocol/types"
import {
  BROWSER_NANO_HARNESS_ID,
  HARNESS_NANO_BINDING,
  registerBrowserNanoHarnesses,
} from "@executioncontrolprotocol/harnesses-browser-nano"
import {
  BROWSER_CODING_HARNESS_ID,
  HARNESS_CODING_BINDING,
  registerBrowserCodingHarnesses,
} from "@executioncontrolprotocol/harnesses-browser-coding"
import { registerChromeAiExtension } from "@executioncontrolprotocol/chrome-ai"
import { registerOpenaiExtension } from "@executioncontrolprotocol/extension-openai"
import { registerAnthropicExtension } from "@executioncontrolprotocol/anthropic"
import { registerOllamaExtension } from "@executioncontrolprotocol/extension-ollama"
import { registerFalExtension } from "@executioncontrolprotocol/fal"
import { registerImageSharpExtension } from "@executioncontrolprotocol/image-sharp"
import { registerJsonataExtension } from "@executioncontrolprotocol/jsonata"
import { registerFormatEqlExtension } from "@executioncontrolprotocol/format-eql"
import { registerFormatToonExtension } from "@executioncontrolprotocol/format-toon"
import { registerFormatMermaidExtension } from "@executioncontrolprotocol/format-mermaid"
import { registerFormatReactflowExtension } from "@executioncontrolprotocol/format-reactflow"
import "@executioncontrolprotocol/chrome-ai"
import "@executioncontrolprotocol/extension-openai"
import "@executioncontrolprotocol/anthropic"
import "@executioncontrolprotocol/extension-ollama"
import "@executioncontrolprotocol/fal"
import "@executioncontrolprotocol/image-sharp"
import "@executioncontrolprotocol/jsonata"
import "@executioncontrolprotocol/format-eql"
import "@executioncontrolprotocol/format-toon"
import "@executioncontrolprotocol/format-mermaid"
import "@executioncontrolprotocol/format-reactflow"
import { readOllamaSettings, type OllamaSettings } from "./ollama-settings.js"
import {
  readAnthropicSettings,
  type AnthropicSettings,
} from "./anthropic-settings.js"
import { readBridgeSettings, type BridgeSettings } from "./ecp-bridge.js"
import {
  applyExtendedDemoVendors,
} from "./demo-environment-extended.js"
import { readDemoEnvPreset, type DemoEnvPreset } from "./demo-env-preset.js"

/** Options for {@link createDemoAppEnvironment}. */
export interface CreateDemoAppEnvironmentOptions {
  /** Ollama model (and legacy baseURL for display). */
  ollama?: OllamaSettings
  /** Anthropic / Claude model settings. */
  anthropic?: AnthropicSettings
  /** Local `ecp up` pairing settings (required for Ollama / coding harness). */
  bridge?: BridgeSettings
  /** Mountable env preset (`default` | `extended`). */
  preset?: DemoEnvPreset
}

/**
 * Browser host bindings with auto-bind disabled so registered format/bridge extensions
 * stay catalog-only until explicitly bound (authoring inventory stays workflow-focused).
 */
function withDemoBrowserHostBindings(env: Environment): void {
  env.withExtensions([
    extension("@executioncontrolprotocol/browser-secrets").with({}),
    extension("@executioncontrolprotocol/browser-registry").with({
      freezeOn: "environment:beforeRun",
      autoBindRegisteredExtensions: false,
      exposeGlobal: true,
      globalName: "ecp",
    }),
    extension("@executioncontrolprotocol/browser-session-config").with({ persist: false }),
    extension("@executioncontrolprotocol/browser-local-config").with({}),
    extension("@executioncontrolprotocol/browser").with({}),
  ])
}

/** Build the browser demo app environment (app owns harness + provider composition). */
export async function createDemoAppEnvironment(
  options?: CreateDemoAppEnvironmentOptions
): Promise<{
  ecp: Ecp
  descriptor: EnvironmentDescriptor
  preset: DemoEnvPreset
}> {
  const ollama = options?.ollama ?? readOllamaSettings()
  const anthropic = options?.anthropic ?? readAnthropicSettings()
  const bridge = options?.bridge ?? readBridgeSettings()
  const preset = options?.preset ?? readDemoEnvPreset()

  await registerBrowserHost(globalRegistry)
  registerBrowserNanoHarnesses()
  registerBrowserCodingHarnesses()
  await registerChromeAiExtension(globalRegistry)
  await registerOpenaiExtension(globalRegistry)
  await registerAnthropicExtension(globalRegistry)
  await registerOllamaExtension(globalRegistry)
  await registerFalExtension(globalRegistry)
  await registerImageSharpExtension(globalRegistry)
  await registerJsonataExtension(globalRegistry)
  await registerFormatEqlExtension(globalRegistry)
  await registerFormatToonExtension(globalRegistry)
  await registerFormatMermaidExtension(globalRegistry)
  await registerFormatReactflowExtension(globalRegistry)

  // Formats stay registered for panel encode/decode (.uses(...)) but are not bound
  // into the authoring environment — except format-reactflow, which must be bound
  // so its lifecycle hooks drive canvas run progress (marching ants, node pulse).
  const env = createBrowserEnvironment(
    preset === "extended" ? "browser-demo-extended" : "browser-demo-app"
  )
  withDemoBrowserHostBindings(env)
  env.addExtensionBinding("@executioncontrolprotocol/format-reactflow", {})
  env.addExtensionBinding("@executioncontrolprotocol/chrome-ai", {})
  env.addExtensionBinding("@executioncontrolprotocol/ollama", {
    baseURL: ollama.baseURL,
    defaultModel: ollama.model,
  })
  env.addExtensionBinding("@executioncontrolprotocol/openai", {
    apiKey: browser("OPENAI_API_KEY", { optional: true }),
  })
  env.addExtensionBinding("@executioncontrolprotocol/anthropic", {
    apiKey: browser("ANTHROPIC_API_KEY", { optional: true }),
    defaultModel: anthropic.model,
  })
  env.addExtensionBinding("@executioncontrolprotocol/fal", {
    apiKey: browser("FAL_KEY", { optional: true }),
    defaultMode: "subscribe",
  })
  env.addExtensionBinding("@executioncontrolprotocol/image-sharp", {})
  env.addExtensionBinding("@executioncontrolprotocol/jsonata", {})

  const allowlist = [
    "@executioncontrolprotocol/chrome-ai",
    "@executioncontrolprotocol/openai",
    "@executioncontrolprotocol/anthropic",
    "@executioncontrolprotocol/ollama",
    "@browser-demo/bridge-ollama",
    "@executioncontrolprotocol/fal",
    "@executioncontrolprotocol/image-sharp",
    "@executioncontrolprotocol/jsonata",
    "@executioncontrolprotocol/azure-blob-storage",
    "@executioncontrolprotocol/adobe-firefly-services",
    "@executioncontrolprotocol/browser",
    "@customer/*",
  ]

  if (preset === "extended") {
    const ok = await applyExtendedDemoVendors(env)
    if (!ok) {
      throw new Error(
        "Extended demo env requires linked Azure + Adobe packages (pnpm run link:vendor).",
      )
    }
  }

  env.withHarnesses([
    harness(BROWSER_NANO_HARNESS_ID, "Nano Harness")
      .uses("@executioncontrolprotocol/chrome-ai.generate")
      .with({ ...HARNESS_NANO_BINDING }),
    harness(BROWSER_CODING_HARNESS_ID, "Coding Harness")
      .uses("@executioncontrolprotocol/ollama.generate")
      .with({ ...HARNESS_CODING_BINDING }),
  ])

  env.withPolicies([
    policy("@executioncontrolprotocol/registry-control").with({
      allowedExtensionNamespaces: allowlist,
      deniedExtensionNamespaces: [],
      allowDynamicExtensionRegistration: true,
      allowAutoBind: true,
    }),
  ])

  const token = bridge.token.trim()
  if (token) {
    env.withRemoteInvoke({ url: bridge.baseURL, token })
  }

  const ecp = await createEcp(env, { exposeGlobal: true })
  await warmBrowserWorkflowCompile()
  const descriptor = await ecp.describe()
  return { ecp, descriptor, preset }
}

/** Whether extended vendors resolve (linked packages, not Vite stubs). */
export async function isExtendedDemoEnvAvailable(): Promise<boolean> {
  try {
    const azure = await import("@executioncontrolprotocol/azure-blob-storage")
    const adobe = await import("@executioncontrolprotocol/adobe-firefly-services")
    return !("EXTENDED_VENDOR_MISSING" in azure || "EXTENDED_VENDOR_MISSING" in adobe)
  } catch {
    return false
  }
}
