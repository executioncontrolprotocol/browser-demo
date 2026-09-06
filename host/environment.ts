/**
 * Default `ecp up` environment for browser-demo `pnpm run dev:linked`.
 * Mirrors host/mixed bindings the demo app exposes so host-compat checks pass.
 */
import {
  imageSharpExtension,
  registerImageSharpExtension,
} from "@executioncontrolprotocol/image-sharp"
import { registerFalExtension } from "@executioncontrolprotocol/fal"
import { registerOpenaiExtension } from "@executioncontrolprotocol/extension-openai"
import { registerClaudeExtension } from "@executioncontrolprotocol/claude"
import { environment, extension, policy, env } from "@executioncontrolprotocol/node"
import { registerImagePolicy } from "@executioncontrolprotocol/policies"

await registerImageSharpExtension()
await registerFalExtension()
await registerOpenaiExtension()
await registerClaudeExtension()
await registerImagePolicy()

export default (await environment("browser-demo-host", "Browser demo host"))
  .withExtensions([
    extension(imageSharpExtension, "Sharp").with({
      limits: {
        allowRemoteUrls: false,
      },
      defaults: {
        format: "webp",
        quality: 84,
        stripMetadata: true,
      },
    }),
    extension("@executioncontrolprotocol/fal", "FAL").with({
      apiKey: env("FAL_KEY", { optional: true }),
      defaultMode: "subscribe",
    }),
    extension("@executioncontrolprotocol/openai", "OpenAI").with({
      apiKey: env("OPENAI_API_KEY", { optional: true }),
    }),
    extension("@executioncontrolprotocol/claude", "Claude").with({
      apiKey: env("ANTHROPIC_API_KEY", { optional: true }),
    }),
  ])
  .withPolicies([
    policy("@executioncontrolprotocol/image-policy", "Image policy").with({
      allowedInputKinds: ["file", "artifact", "buffer"],
      allowedOutputFormats: ["webp", "png", "jpeg"],
      maxImageRefsPerStep: 8,
      denyRawOutput: true,
    }),
  ])
