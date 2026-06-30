import { ECP_INTENT_VALUES, type EcpIntentValue } from "@executioncontrolprotocol/types"

/**
 * Map harness {@link EcpIntentValue} to workflow-authoring vs workflow-assistant.
 * Routing policy lives in the demo shell; classification comes from the nano harness.
 */
export function intentRoutesToAuthoring(intent: EcpIntentValue): boolean {
  return (
    intent === ECP_INTENT_VALUES.WORKFLOW_CREATE || intent === ECP_INTENT_VALUES.WORKFLOW_PATCH
  )
}
