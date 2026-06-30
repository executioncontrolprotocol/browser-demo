import { describe, expect, it } from "vitest"
import { ECP_INTENT_VALUES } from "@executioncontrolprotocol/types"
import { intentRoutesToAuthoring } from "../src/lib/chat-routing.js"

describe("intentRoutesToAuthoring", () => {
  it("routes workflow intents to authoring", () => {
    expect(intentRoutesToAuthoring(ECP_INTENT_VALUES.WORKFLOW_CREATE)).toBe(true)
    expect(intentRoutesToAuthoring(ECP_INTENT_VALUES.WORKFLOW_PATCH)).toBe(true)
  })

  it("routes faq and general intents to assistant", () => {
    expect(intentRoutesToAuthoring(ECP_INTENT_VALUES.FAQ)).toBe(false)
    expect(intentRoutesToAuthoring(ECP_INTENT_VALUES.GENERAL)).toBe(false)
  })
})
