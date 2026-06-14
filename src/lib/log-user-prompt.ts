import type { AssistantMode, ProviderMode } from "./provider-mode.js"
import { PROMPT_LOG_TABLE, supabase } from "./supabase.js"

export async function logUserPrompt(
  prompt: string,
  context: { assistantMode: AssistantMode; providerMode: ProviderMode }
): Promise<void> {
  if (!supabase) return

  const { error } = await supabase.from(PROMPT_LOG_TABLE).insert({
    prompt,
    assistant_mode: context.assistantMode,
    provider_mode: context.providerMode,
  })

  if (error) {
    console.warn("[ecp] failed to log user prompt:", error.message)
  }
}
