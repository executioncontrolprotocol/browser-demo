import type { ChatPanelState, ChatMessage } from "../types/workspace.js"

const CHAT_HEIGHT: Record<ChatPanelState, string> = {
  expanded: "min(60vh, 640px)",
  compact: "280px",
  collapsed: "56px",
}

/** Props for {@link ChatPanel}. */
export interface ChatPanelProps {
  chat: ChatPanelState
  onChatChange: (state: ChatPanelState) => void
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

/** Floating bottom chat panel (Logic Assistant). */
export function ChatPanel({
  chat,
  onChatChange,
  messages,
  status,
  prompt,
  onPromptChange,
  onSubmit,
  disabled,
  hero = false,
  capabilitySummary,
}: ChatPanelProps) {
  const visibleMessages = chat === "collapsed" ? messages.slice(-1) : messages.slice(-8)
  const collapsed = chat === "collapsed"

  return (
    <section
      className={`glass-panel fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 flex-col overflow-hidden rounded-xl border border-outline-variant shadow-2xl transition-all duration-300 ${
        hero ? "w-[min(720px,92vw)]" : "w-[min(900px,70vw)]"
      }`}
      style={{ height: CHAT_HEIGHT[chat] }}
      aria-label="Logic Assistant"
    >
      <header className="flex shrink-0 items-center justify-between border-b border-outline-variant bg-surface-container-high/60 p-4">
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
            <h3 className="font-display text-sm font-semibold leading-tight text-on-surface">
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
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="material-symbols-outlined cursor-pointer text-sm text-on-surface-variant hover:text-primary"
            onClick={() => onChatChange("expanded")}
            aria-label="Expand chat"
          >
            open_in_full
          </button>
          <button
            type="button"
            className="material-symbols-outlined cursor-pointer text-sm text-on-surface-variant hover:text-primary"
            onClick={() => onChatChange(chat === "compact" ? "expanded" : "compact")}
            aria-label="Toggle chat size"
          >
            {chat === "expanded" ? "remove" : "expand"}
          </button>
          <button
            type="button"
            className="material-symbols-outlined cursor-pointer text-sm text-on-surface-variant hover:text-primary"
            onClick={() => onChatChange("collapsed")}
            aria-label="Collapse chat"
          >
            close
          </button>
        </div>
      </header>

      {!collapsed ? (
        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-6">
          {visibleMessages.length === 0 ? (
            <p className="text-body text-on-surface-variant">
              Describe a workflow or change to get started.
            </p>
          ) : (
            visibleMessages.map((m) =>
              m.role === "user" ? (
                <div key={m.id} className="ml-auto flex max-w-[80%] flex-row-reverse items-start gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-outline-variant bg-surface-container-highest">
                    <span className="material-symbols-outlined text-[14px] text-on-surface-variant">person</span>
                  </div>
                  <div className="rounded-lg rounded-tr-none border border-primary/20 bg-primary/10 p-3">
                    <p className="text-body text-on-surface">{m.text}</p>
                  </div>
                </div>
              ) : (
                <div key={m.id} className="flex max-w-[80%] items-start gap-3">
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
      ) : null}

      <div className="shrink-0 border-t border-outline-variant bg-surface-container-low/50 p-4">
        <div className="relative">
          <input
            value={prompt}
            disabled={disabled}
            onChange={(e) => onPromptChange(e.target.value)}
            placeholder="Ask assistant to modify logic..."
            className="w-full rounded border border-outline-variant bg-surface-container-lowest py-3 pl-4 pr-24 text-body text-on-surface outline-none placeholder:text-outline focus:border-primary focus:ring-1 focus:ring-primary"
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
