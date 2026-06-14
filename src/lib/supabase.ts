import { createClient, type SupabaseClient } from "@supabase/supabase-js"

export interface PromptLogRow {
  id: number
  prompt: string
  assistant_mode: string
  provider_mode: string
  created_at: string
}

export const PROMPT_LOG_TABLE = "ecp_browser_demo_prompts"

function createSupabaseClient(): SupabaseClient | null {
  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

export const supabase = createSupabaseClient()
