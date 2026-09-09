/** Demo environment preset ids (finite mountable envs). @category Demo */
export const DEMO_ENV_PRESETS = ["default", "extended"] as const

/** Browser demo environment preset. @category Demo */
export type DemoEnvPreset = (typeof DEMO_ENV_PRESETS)[number]

/** localStorage key for the selected demo env preset. */
export const DEMO_ENV_PRESET_STORAGE_KEY = "ecp:browser-demo:env-preset"

/** Whether `value` is a known {@link DemoEnvPreset}. */
export function isDemoEnvPreset(value: unknown): value is DemoEnvPreset {
  return value === "default" || value === "extended"
}

/** Read the persisted demo env preset (defaults to `default`). */
export function readDemoEnvPreset(): DemoEnvPreset {
  if (typeof localStorage === "undefined") return "default"
  const raw = localStorage.getItem(DEMO_ENV_PRESET_STORAGE_KEY)
  return isDemoEnvPreset(raw) ? raw : "default"
}

/** Persist the demo env preset. */
export function storeDemoEnvPreset(preset: DemoEnvPreset): void {
  if (typeof localStorage === "undefined") return
  localStorage.setItem(DEMO_ENV_PRESET_STORAGE_KEY, preset)
}

/**
 * Parse `?env=extended|default` from a query string.
 * Returns undefined when the param is absent or invalid.
 */
export function parseDemoEnvPresetQuery(search: string): DemoEnvPreset | undefined {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search)
  const raw = params.get("env")?.trim()
  return isDemoEnvPreset(raw) ? raw : undefined
}
