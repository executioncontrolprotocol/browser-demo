import { createBrowserDemoEnvironment, createEcp, registerBrowserDefaults } from "@executioncontrolprotocol/browser"
import { registerTestExtension, type Ecp } from "@executioncontrolprotocol/core"
import type { EnvironmentDescriptor } from "@executioncontrolprotocol/types"

/** Build the browser demo app environment with workflow capabilities bound. */
export async function createDemoAppEnvironment(): Promise<{
  ecp: Ecp
  descriptor: EnvironmentDescriptor
}> {
  await registerBrowserDefaults()
  await registerTestExtension()
  const env = createBrowserDemoEnvironment("browser-demo-app")
  env.addExtensionBinding("@executioncontrolprotocol/test", {})
  const ecp = await createEcp(env, { exposeGlobal: true })
  const descriptor = await ecp.describe()
  return { ecp, descriptor }
}
