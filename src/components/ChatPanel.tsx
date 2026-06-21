import type { ChatMessage } from "../types/workspace.js"

/** Props for {@link ChatPanel}. */
export interface ChatPanelProps {
  visible: boolean
  widthClass: "is-half" | "is-full"
  paired: boolean
  messages: ChatMessage[]
  status: string
  prompt: string
  onPromptChange: (value: string) => void
  onSubmit: () => void
  disabled?: boolean
  hero?: boolean
  /** Compact list of registered capability ids. */
  capabilitySummary?: string
}

/** Full-height chat column (Logic Assistant). */
export function ChatPanel({
  visible,
  widthClass,
  paired,
  messages,
  status,
  prompt,
  onPromptChange,
  onSubmit,
  disabled,
  hero = false,
  capabilitySummary,
}: ChatPanelProps) {
  if (!visible) return null

  return (
    <section
      className={`chat-drawer flex h-full min-w-0 flex-col overflow-hidden border-outline-variant bg-surface-container ${widthClass}${paired ? " shrink-0" : ""}`}
      id="chat-drawer"
      aria-label="Logic Assistant"
    >
      <header className="flex shrink-0 items-center border-b border-outline-variant bg-surface-container-high p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-primary-container">
            <span
              className="material-symbols-outlined text-sm text-on-primary-container"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              smart_toy
            </span>
          </div>
          <div>
            <h3 className="font-display text-[14px] font-semibold leading-tight text-on-surface">
              {hero ? "ECP Logic Assistant" : "Logic Assistant"}
            </h3>
            <p className="text-[11px] text-on-surface-variant">{status || "Solaris Architect"}</p>
            {capabilitySummary ? (
              <p className="mt-0.5 text-[10px] leading-snug text-on-surface-variant/80" title={capabilitySummary}>
                Registered: {capabilitySummary}
              </p>
            ) : null}
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto bg-surface-container/50 p-6">
        {messages.length === 0 ? (
          <p className="text-body text-on-surface-variant">Describe a workflow or change to get started.</p>
        ) : (
          messages.map((m) =>
            m.role === "user" ? (
              <div key={m.id} className="ml-auto flex max-w-[90%] flex-row-reverse items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full border border-outline-variant">
                  <span className="material-symbols-outlined text-[14px] text-on-surface-variant">person</span>
                </div>
                <div className="rounded-lg rounded-tr-none border border-primary/20 bg-primary/10 p-3">
                  <p className="text-body text-on-surface">{m.text}</p>
                </div>
              </div>
            ) : (
              <div key={m.id} className="flex max-w-[90%] items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-outline-variant bg-surface-container-highest">
                  <span className="material-symbols-outlined text-[14px] text-primary">auto_awesome</span>
                </div>
                <div
                  className={`rounded-lg rounded-tl-none border p-3 ${
                    m.variant === "error"
                      ? "border-error/40 bg-error-container/30"
                      : "border-outline-variant/30 bg-surface-container-high"
                  }`}
                >
                  <p
                    className={`whitespace-pre-wrap text-body ${
                      m.variant === "error" ? "text-on-error-container" : "text-on-surface"
                    }`}
                  >
                    {m.text}
                  </p>
                </div>
              </div>
            )
          )
        )}
      </div>

      <div className="composer-bar">
        <div className="composer-bar-row relative">
          <input
            value={prompt}
            disabled={disabled}
            onChange={(e) => onPromptChange(e.target.value)}
            placeholder="Ask assistant to modify logic..."
            className="w-full rounded border border-outline-variant bg-surface-container-lowest py-3 pl-4 pr-14 text-body text-on-surface outline-none placeholder:text-outline focus:border-primary focus:ring-1 focus:ring-primary"
            onKeyDown={(e) => {
              if (e.key === "Enter") onSubmit()
            }}
          />
          <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-2">
            <button
              type="button"
              disabled={disabled}
              onClick={onSubmit}
              className="flex h-8 w-8 items-center justify-center rounded bg-primary text-on-primary transition-transform hover:brightness-110 active:scale-90 disabled:opacity-50"
              aria-label="Send"
            >
              <span className="material-symbols-outlined text-[18px]">send</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
