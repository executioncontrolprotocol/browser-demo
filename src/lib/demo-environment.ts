import { warmBrowserWorkflowCompile } from "@executioncontrolprotocol/core/browser"
import {
  browser,
  createBrowserEnvironment,
  createEcp,
  globalRegistry,
  harness,
  policy,
  registerBrowserHost,
} from "@executioncontrolprotocol/browser"
import type { Ecp } from "@executioncontrolprotocol/core"
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
import { registerClaudeExtension } from "@executioncontrolprotocol/claude"
import { registerOllamaExtension } from "@executioncontrolprotocol/extension-ollama"
import { registerFormatEqlExtension } from "@executioncontrolprotocol/format-eql"
import { registerFormatToonExtension } from "@executioncontrolprotocol/format-toon"
import { registerFormatMermaidExtension } from "@executioncontrolprotocol/format-mermaid"
import { registerFormatReactflowExtension } from "@executioncontrolprotocol/format-reactflow"
import "@executioncontrolprotocol/chrome-ai"
import "@executioncontrolprotocol/extension-openai"
import "@executioncontrolprotocol/claude"
import "@executioncontrolprotocol/extension-ollama"
import "@executioncontrolprotocol/format-eql"
import "@executioncontrolprotocol/format-toon"
import "@executioncontrolprotocol/format-mermaid"
import "@executioncontrolprotocol/format-reactflow"
import { readOllamaSettings, type OllamaSettings } from "./ollama-settings.js"
import { readBridgeSettings, type BridgeSettings } from "./ecp-bridge.js"

/** Options for {@link createDemoAppEnvironment}. */
export interface CreateDemoAppEnvironmentOptions {
  /** Ollama model (and legacy baseURL for display). */
  ollama?: OllamaSettings
  /** Local `ecp up` pairing settings (required for Ollama / coding harness). */
  bridge?: BridgeSettings
}

/** Build the browser demo app environment (app owns harness + provider composition). */
export async function createDemoAppEnvironment(
  options?: CreateDemoAppEnvironmentOptions
): Promise<{
  ecp: Ecp
  descriptor: EnvironmentDescriptor
}> {
  const ollama = options?.ollama ?? readOllamaSettings()
  const bridge = options?.bridge ?? readBridgeSettings()

  await registerBrowserHost(globalRegistry)
  registerBrowserNanoHarnesses()
  registerBrowserCodingHarnesses()
  await registerChromeAiExtension(globalRegistry)
  await registerOpenaiExtension(globalRegistry)
  await registerClaudeExtension(globalRegistry)
  await registerOllamaExtension(globalRegistry)
  await registerFormatEqlExtension(globalRegistry)
  await registerFormatToonExtension(globalRegistry)
  await registerFormatMermaidExtension(globalRegistry)
  await registerFormatReactflowExtension(globalRegistry)

  const env = createBrowserEnvironment("browser-demo-app")
  env.addExtensionBinding("@executioncontrolprotocol/format-eql", {})
  env.addExtensionBinding("@executioncontrolprotocol/format-toon", {})
  env.addExtensionBinding("@executioncontrolprotocol/format-mermaid", {})
  env.addExtensionBinding("@executioncontrolprotocol/format-reactflow", {})
  env.addExtensionBinding("@executioncontrolprotocol/format-json", {})
  env.addExtensionBinding("@executioncontrolprotocol/chrome-ai", {})
  env.addExtensionBinding("@executioncontrolprotocol/ollama", {
    baseURL: ollama.baseURL,
    defaultModel: ollama.model,
  })
  env.addExtensionBinding("@executioncontrolprotocol/openai", {
    apiKey: browser("OPENAI_API_KEY", { optional: true }),
  })
  env.addExtensionBinding("@executioncontrolprotocol/claude", {
    apiKey: browser("ANTHROPIC_API_KEY", { optional: true }),
  })

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
      allowedExtensionNamespaces: [
        "@executioncontrolprotocol/chrome-ai",
        "@executioncontrolprotocol/openai",
        "@executioncontrolprotocol/claude",
        "@executioncontrolprotocol/ollama",
        "@executioncontrolprotocol/fal",
        "@executioncontrolprotocol/image-sharp",
        "@executioncontrolprotocol/azure-blob-storage",
        "@executioncontrolprotocol/browser",
        "@customer/*",
      ],
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
  return { ecp, descriptor }
}
