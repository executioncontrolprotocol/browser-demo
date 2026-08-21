import type { ReactFlowPort } from "@executioncontrolprotocol/format-reactflow"
import { MonacoCodeEditor } from "./MonacoCodeEditor.js"
import {
  editorKindForPort,
  optionsForPort,
  parseMultiselectDraft,
  toggleMultiselectDraft,
  type ConfigEditorKind,
} from "../lib/step-configure.js"
import { isBrowserFileLocator } from "@executioncontrolprotocol/core"

function BooleanToggle({
  value,
  busy,
  onChange,
}: {
  value: string
  busy: boolean
  onChange: (next: string) => void
}) {
  const checked = value.trim().toLowerCase() === "true"
  return (
    <label className="inline-flex cursor-pointer items-center gap-3 font-mono text-sm text-on-surface">
      <span className="relative inline-flex h-6 w-11 shrink-0 items-center">
        <input
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          onChange={(e) => onChange(e.target.checked ? "true" : "false")}
          disabled={busy}
        />
        <span className="absolute inset-0 rounded-full border border-outline-variant bg-surface-container-high transition-colors peer-checked:border-primary peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-primary/40 peer-disabled:opacity-50" />
        <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-on-surface shadow transition-transform peer-checked:translate-x-5 peer-checked:bg-on-primary" />
      </span>
      {checked ? "true" : "false"}
    </label>
  )
}

function FileFieldControl({
  name,
  value,
  busy,
  disabled,
  hint,
  onFile,
}: {
  name: string
  value: string
  busy: boolean
  disabled: boolean
  hint?: string
  onFile?: (file: File) => void
}) {
  const summary = fileDraftSummary(value)
  return (
    <div className="space-y-1">
      <input
        type="file"
        aria-label={name}
        className="block w-full font-mono text-label text-on-surface-variant file:mr-2 file:rounded file:border file:border-outline-variant file:bg-surface-container-high file:px-2 file:py-1 file:font-mono file:text-label"
        disabled={busy || disabled || !onFile}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file && onFile) onFile(file)
        }}
      />
      {summary ? (
        <span className="block font-mono text-label text-on-surface-variant">{summary}</span>
      ) : null}
      {hint ? <span className="block text-label text-on-surface-variant">{hint}</span> : null}
    </div>
  )
}

function fileDraftSummary(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  if (isBrowserFileLocator(trimmed)) return `Selected: ${trimmed}`
  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as { kind?: string; path?: string; mediaType?: string }
      if (parsed.kind === "file" && typeof parsed.path === "string") {
        return `Selected file ref${parsed.mediaType ? ` (${parsed.mediaType})` : ""}: ${parsed.path}`
      }
    } catch {
      /* ignore */
    }
  }
  return `Value set (${trimmed.length} chars)`
}

/** Schema-driven editor used by step configure and the run-input form. */
export function ConfigFieldControl({
  kind,
  fieldId,
  name,
  value,
  busy,
  onChange,
  enumOptions,
  filePickerEnabled = true,
  fileHint,
  onFile,
}: {
  kind: ConfigEditorKind
  fieldId: string
  name: string
  value: string
  busy: boolean
  onChange: (next: string) => void
  enumOptions?: Array<string | number | boolean>
  filePickerEnabled?: boolean
  fileHint?: string
  onFile?: (file: File) => void
}) {
  if (kind === "file") {
    return (
      <FileFieldControl
        name={name}
        value={value}
        busy={busy}
        disabled={!filePickerEnabled}
        hint={
          fileHint ??
          (!filePickerEnabled
            ? "File picker requires a local host. Start `ecp up --env …` for host / mixed steps."
            : undefined)
        }
        onFile={onFile}
      />
    )
  }

  if ((kind === "enum" || kind === "enum-radio") && enumOptions && enumOptions.length > 0) {
    if (kind === "enum-radio") {
      return (
        <div className="flex flex-col gap-2" role="radiogroup" aria-label={name}>
          {enumOptions.map((opt) => {
            const key = String(opt)
            return (
              <label
                key={key}
                className="flex cursor-pointer items-center gap-2 font-mono text-sm text-on-surface"
              >
                <input
                  type="radio"
                  className="h-4 w-4 accent-primary"
                  name={`ecp-enum-${fieldId}-${name}`}
                  value={key}
                  checked={value === key}
                  onChange={() => onChange(key)}
                  disabled={busy}
                />
                {key}
              </label>
            )
          })}
        </div>
      )
    }

    return (
      <select
        className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 font-mono text-sm text-on-surface outline-none focus:border-outline"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={busy}
      >
        {enumOptions.map((opt) => (
          <option key={String(opt)} value={String(opt)}>
            {String(opt)}
          </option>
        ))}
      </select>
    )
  }

  if (kind === "multiselect" && enumOptions && enumOptions.length > 0) {
    const selected = new Set(parseMultiselectDraft(value))
    return (
      <div className="flex flex-col gap-2" role="group" aria-label={name}>
        {enumOptions.map((opt) => {
          const key = String(opt)
          return (
            <label
              key={key}
              className="flex cursor-pointer items-center gap-2 font-mono text-sm text-on-surface"
            >
              <input
                type="checkbox"
                className="h-4 w-4 accent-primary"
                checked={selected.has(key)}
                onChange={(e) => onChange(toggleMultiselectDraft(value, opt, e.target.checked))}
                disabled={busy}
              />
              {key}
            </label>
          )
        })}
      </div>
    )
  }

  if (kind === "boolean") {
    return <BooleanToggle value={value} busy={busy} onChange={onChange} />
  }

  if (kind === "number") {
    return (
      <input
        type="number"
        className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 font-mono text-sm text-on-surface outline-none focus:border-outline"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={busy}
      />
    )
  }

  if (kind === "json") {
    return (
      <div className="h-[180px] overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest">
        <MonacoCodeEditor
          path={`file:///ecp-configure/${fieldId}/${name}.json`}
          language="json"
          value={value}
          onChange={(next) => onChange(next ?? "")}
          readOnly={busy}
        />
      </div>
    )
  }

  if (kind === "longtext") {
    return (
      <textarea
        className="min-h-[9rem] w-full resize-y rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 font-mono text-sm text-on-surface outline-none focus:border-outline"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={busy}
        spellCheck
      />
    )
  }

  return (
    <input
      type="text"
      className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 font-mono text-sm text-on-surface outline-none focus:border-outline"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={busy}
    />
  )
}

/** Port-driven wrapper around {@link ConfigFieldControl}. */
export function ConfigPortControl({
  fieldId,
  port,
  value,
  busy,
  onChange,
  filePickerEnabled = true,
  fileHint,
  onFile,
}: {
  fieldId: string
  port: ReactFlowPort
  value: string
  busy: boolean
  onChange: (next: string) => void
  filePickerEnabled?: boolean
  fileHint?: string
  onFile?: (file: File) => void
}) {
  return (
    <ConfigFieldControl
      kind={editorKindForPort(port)}
      fieldId={fieldId}
      name={port.name}
      value={value}
      busy={busy}
      onChange={onChange}
      enumOptions={optionsForPort(port)}
      filePickerEnabled={filePickerEnabled}
      fileHint={fileHint}
      onFile={onFile}
    />
  )
}
