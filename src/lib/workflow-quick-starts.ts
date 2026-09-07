import type { ChatMessage } from "../types/workspace.js"

/** A clickable workflow quick-start shown below the welcome message. */
export interface WorkflowQuickStart {
  /** Short label shown in the suggestion bubble. */
  label: string
  /** Full prompt sent to the harness when the bubble is clicked. */
  prompt: string
}

/**
 * Canonical quickstart prompts — keep byte-identical to harness create few-shot
 * `message` fields in browser-nano / browser-coding workflow-authoring-create prompts.
 */
export const QUICKSTART_EMAIL_PROMPT =
  "Build a workflow that uses Chrome AI to generate a short sample email with a meeting summary, then extract key action items from it in a second step."

/** @see QUICKSTART_EMAIL_PROMPT */
export const QUICKSTART_HAIKU_PROMPT =
  "Create a two-step workflow: Chrome AI writes a haiku, then Chrome AI explains what it means."

/** @see QUICKSTART_EMAIL_PROMPT */
export const QUICKSTART_TRIVIA_PROMPT =
  "Build a three-step Chrome AI workflow: ask a trivia question, draft an answer, then critique the answer."

/** Default workflow quick-start suggestions for first launch. */
export const WORKFLOW_QUICK_STARTS: WorkflowQuickStart[] = [
  {
    label: "Email + Key Actions",
    prompt: QUICKSTART_EMAIL_PROMPT,
  },
  {
    label: "Haiku + explain",
    prompt: QUICKSTART_HAIKU_PROMPT,
  },
  {
    label: "Trivia Q&A",
    prompt: QUICKSTART_TRIVIA_PROMPT,
  },
]

/** Whether workflow quick-start bubbles should be visible (no user messages yet). */
export function shouldShowWorkflowQuickStarts(messages: ChatMessage[]): boolean {
  return messages.every((m) => m.role !== "user")
}
