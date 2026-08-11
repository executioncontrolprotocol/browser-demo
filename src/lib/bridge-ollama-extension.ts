import {
  capabilityFor,
  catalogExtension,
  defineExtension,
  globalRegistry,
} from "@executioncontrolprotocol/core"
import { modelGenerateInputSchema, modelGenerateOutputSchema } from "@executioncontrolprotocol/types"
import { z } from "zod"
import { invokeViaBridge } from "./ecp-bridge.js"

/** Extension id for bridge-backed Ollama generate. */
export const BRIDGE_OLLAMA_EXTENSION_ID = "@browser-demo/bridge-ollama"

/** Generate capability id used by the coding harness in bridge mode. */
export const BRIDGE_OLLAMA_GENERATE_ID = "@browser-demo/bridge-ollama.generate"

/**
 * Demo-local extension: proxies generate to `ecp up` → `@executioncontrolprotocol/ollama.generate`.
 */
export const bridgeOllamaExtension = defineExtension("@browser-demo", "bridge-ollama")
  .withConfig({
    bridgeBaseURL: z.string(),
    token: z.string(),
    defaultModel: z.string().optional(),
  })
  .withCapabilities([
    capabilityFor("@browser-demo/bridge-ollama", "generate")
      .withInput(modelGenerateInputSchema)
      .withOutput(modelGenerateOutputSchema)
      .withHandler(async (input, ctx) => {
        const parsed = input as {
          prompt: string
          system?: string
          model?: string
          context?: unknown
          options?: Record<string, unknown>
        }
        const cfg = (ctx as { extensionConfig?: Record<string, unknown> }).extensionConfig ?? {}
        const bridgeBaseURL = String(cfg.bridgeBaseURL ?? "")
        const token = String(cfg.token ?? "")
        const defaultModel =
          typeof cfg.defaultModel === "string" ? cfg.defaultModel : undefined
        ctx.usage.increment({ modelCalls: 1 })
        const out = await invokeViaBridge<{ text?: string }>({
          baseURL: bridgeBaseURL,
          token,
          capability: "@executioncontrolprotocol/ollama.generate",
          input: {
            prompt: parsed.prompt,
            system: parsed.system,
            model: parsed.model ?? defaultModel,
            context: parsed.context,
            options: parsed.options,
          },
        })
        if (!out.success) {
          const msg = out.diagnostics?.[0]?.message ?? "bridge generate failed"
          throw new Error(msg)
        }
        const text = out.result?.text
        if (typeof text !== "string") {
          throw new Error("bridge generate returned no text")
        }
        return { text }
      }),
  ])
  .build()

catalogExtension(bridgeOllamaExtension)

/** Register the demo bridge-ollama extension. */
export async function registerBridgeOllamaExtension(
  registry = globalRegistry
): Promise<void> {
  if (!registry.getExtension(BRIDGE_OLLAMA_EXTENSION_ID)) {
    await registry.registerExtension(bridgeOllamaExtension)
  }
}
