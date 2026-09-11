import type { AnthropicSettings } from "../lib/anthropic-settings.js"
import { ANTHROPIC_MODEL_OPTIONS } from "../lib/anthropic-settings.js"

/** Props for {@link AnthropicSettingsFields}. */
export interface AnthropicSettingsFieldsProps {
  /** Current Anthropic settings. */
  value: AnthropicSettings
  /** Persist settings changes. */
  onChange: (settings: AnthropicSettings) => void
}

/** Model picker for Anthropic / Claude in first-run and settings. */
export function AnthropicSettingsFields({ value, onChange }: AnthropicSettingsFieldsProps) {
  return (
    <div className="space-y-2 pl-6">
      <label className="flex flex-col gap-1 text-body">
        <span className="text-on-surface-variant">Claude model</span>
        <select
          className="rounded border border-outline-variant bg-surface px-2 py-1.5 font-mono text-label text-on-surface"
          value={value.model}
          onChange={(e) => onChange({ ...value, model: e.target.value })}
        >
          {ANTHROPIC_MODEL_OPTIONS.map((model) => (
            <option key={model} value={model}>
              {model}
            </option>
          ))}
          {!ANTHROPIC_MODEL_OPTIONS.includes(value.model as (typeof ANTHROPIC_MODEL_OPTIONS)[number]) ? (
            <option value={value.model}>{value.model}</option>
          ) : null}
        </select>
      </label>
      <p className="text-body text-on-surface-variant">
        Paste your Anthropic API key in the vault fields below, then Continue.
      </p>
    </div>
  )
}
