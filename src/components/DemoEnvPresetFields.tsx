import { useEffect, useState } from "react"
import type { DemoEnvPreset } from "../lib/demo-env-preset.js"
import { isExtendedDemoEnvAvailable } from "../lib/demo-environment.js"

/** Props for {@link DemoEnvPresetFields}. */
export interface DemoEnvPresetFieldsProps {
  value: DemoEnvPreset
  onChange: (next: DemoEnvPreset) => void
}

/** Mountable demo environment preset (default vs Azure+Adobe extended). */
export function DemoEnvPresetFields({ value, onChange }: DemoEnvPresetFieldsProps) {
  const [extendedOk, setExtendedOk] = useState(false)

  useEffect(() => {
    void isExtendedDemoEnvAvailable().then(setExtendedOk)
  }, [])

  return (
    <div className="space-y-3 rounded-lg border border-outline-variant p-3">
      <p className="font-mono text-label font-bold text-on-surface">Demo environment</p>
      <p className="text-body text-on-surface-variant">
        Mount a known browser catalog. Extended adds Azure Blob (mixed upload) and Adobe Firefly
        Services (host hop). Pair{" "}
        <code className="font-mono text-label">ecp up --env</code> with a matching host example.
      </p>
      <label className="flex flex-col gap-1 text-body">
        <span>Preset</span>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value as DemoEnvPreset)}
          className="rounded border border-outline-variant bg-surface px-3 py-2 font-mono text-body"
          aria-label="Demo environment preset"
        >
          <option value="default">default</option>
          <option value="extended" disabled={!extendedOk}>
            extended (Azure + Adobe){extendedOk ? "" : " — run link:vendor"}
          </option>
        </select>
      </label>
    </div>
  )
}
