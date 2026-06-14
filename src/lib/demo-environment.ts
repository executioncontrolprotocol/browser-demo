import { createBrowserDemoEnvironment, createEcp, registerBrowserDefaults } from "@executioncontextprotocol/browser"
import { registerTestExtension, type Ecp } from "@executioncontextprotocol/core"
import type { EnvironmentDescriptor } from "@executioncontextprotocol/types"

/** Build the browser demo app environment with workflow capabilities bound. */
export async function createDemoAppEnvironment(): Promise<{
  ecp: Ecp
  descriptor: EnvironmentDescriptor
}> {
  await registerBrowserDefaults()
  await registerTestExtension()
  const env = createBrowserDemoEnvironment("browser-demo-app")
  env.addExtensionBinding("@executioncontextprotocol/test", {})
  const ecp = await createEcp(env, { exposeGlobal: true })
  const descriptor = await ecp.describe()
  return { ecp, descriptor }
}
