/** Anthropic model settings persisted in localStorage (API key stays in vault). */
export interface AnthropicSettings {
  /** Claude model alias for generate. */
  model: string
}

/** Default Anthropic coding model. */
export const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-4-5"

/** Default Anthropic settings. */
export const DEFAULT_ANTHROPIC_SETTINGS: AnthropicSettings = {
  model: DEFAULT_ANTHROPIC_MODEL,
}

/** Selectable Claude model aliases for the demo. */
export const ANTHROPIC_MODEL_OPTIONS = [
  "claude-sonnet-4-5",
  "claude-haiku-4-5",
  "claude-opus-4-5",
] as const

/** MIME types accepted by Anthropic generate files (demo attach filter). */
export const ANTHROPIC_CHAT_FILE_MEDIA_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
] as const

/** HTML accept attribute for Anthropic chat file input. */
export const ANTHROPIC_CHAT_FILE_ACCEPT = [
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".pdf",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
].join(",")

/** localStorage key for Anthropic model settings. */
export const ANTHROPIC_SETTINGS_STORAGE_KEY = "ecp:browser-demo:anthropic-settings"

/** Whether a MIME type is allowed for Anthropic chat attachments. */
export function isAnthropicChatFileMediaType(mediaType: string): boolean {
  const normalized = mediaType.split(";")[0]?.trim().toLowerCase() ?? ""
  const effective = normalized === "image/jpg" ? "image/jpeg" : normalized
  return (ANTHROPIC_CHAT_FILE_MEDIA_TYPES as readonly string[]).includes(effective)
}

/** Read persisted Anthropic settings. */
export function readAnthropicSettings(): AnthropicSettings {
  if (typeof localStorage === "undefined") return { ...DEFAULT_ANTHROPIC_SETTINGS }
  try {
    const raw = localStorage.getItem(ANTHROPIC_SETTINGS_STORAGE_KEY)
    if (!raw) return { ...DEFAULT_ANTHROPIC_SETTINGS }
    const parsed = JSON.parse(raw) as Partial<AnthropicSettings>
    const model =
      typeof parsed.model === "string" && parsed.model.trim()
        ? parsed.model.trim()
        : DEFAULT_ANTHROPIC_MODEL
    return { model }
  } catch {
    return { ...DEFAULT_ANTHROPIC_SETTINGS }
  }
}

/** Persist Anthropic settings. */
export function storeAnthropicSettings(settings: AnthropicSettings): void {
  if (typeof localStorage === "undefined") return
  localStorage.setItem(ANTHROPIC_SETTINGS_STORAGE_KEY, JSON.stringify(settings))
}
