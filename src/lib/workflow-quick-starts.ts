import type { ChatMessage } from "../types/workspace.js"

/** A clickable workflow quick-start shown below the welcome message. */
export interface WorkflowQuickStart {
  /** Short label shown in the suggestion bubble. */
  label: string
  /** Full prompt sent to the harness when the bubble is clicked. */
  prompt: string
}

/** Default workflow quick-start suggestions for first launch. */
export const WORKFLOW_QUICK_STARTS: WorkflowQuickStart[] = [
  {
    label: "Email + Key Actions",
    prompt:
      "Build a workflow that uses Chrome AI to generate a short email, then extract key action items from it in a second step.",
  },
  {
    label: "Haiku + explain",
    prompt:
      "Create a two-step workflow: Chrome AI writes a haiku, then Chrome AI explains what it means.",
  },
  {
    label: "Trivia Q&A",
    prompt: "Build a simple three-step workflow that uses Chrome AI to answer a trivia question.",
  },
]

/** Whether workflow quick-start bubbles should be visible (no user messages yet). */
export function shouldShowWorkflowQuickStarts(messages: ChatMessage[]): boolean {
  return messages.every((m) => m.role !== "user")
}
