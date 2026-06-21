import { createBrowserDemoEnvironment, createEcp, registerBrowserDefaults } from "@executioncontrolprotocol/browser"
import type { Ecp } from "@executioncontrolprotocol/core"
import type { EnvironmentDescriptor } from "@executioncontrolprotocol/types"

/** Build the browser demo app environment with workflow capabilities bound. */
export async function createDemoAppEnvironment(): Promise<{
  ecp: Ecp
  descriptor: EnvironmentDescriptor
}> {
  await registerBrowserDefaults()
  const env = createBrowserDemoEnvironment("browser-demo-app")
  const ecp = await createEcp(env, { exposeGlobal: true })
  const descriptor = await ecp.describe()
  return { ecp, descriptor }
}
