import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  BrowserAuthoringService,
  installBrowserWorkflowShim,
  type BrowserOperationalEcp,
} from "@executioncontrolprotocol/browser"
import {
  HARNESS_TASKS as NANO_HARNESS_TASKS,
  chatResultAnswer,
  chatResultWorkflow,
} from "@executioncontrolprotocol/harnesses-browser-nano"
import type {
  EnvironmentDescriptor,
  HarnessInvokeResult,
  ValidationResult,
  WorkflowManifest,
} from "@executioncontrolprotocol/types"
import type { Ecp } from "@executioncontrolprotocol/core"
import { compileWorkflowSource } from "@executioncontrolprotocol/core/browser"
import { ChatPanel } from "./components/ChatPanel.js"
import { ChromeInstallDialog } from "./components/ChromeInstallDialog.js"
import { ChromeInstallToast } from "./components/ChromeInstallToast.js"
import { CodePanel } from "./components/CodePanel.js"
import { FirstRunModal } from "./components/FirstRunModal.js"
import { VaultSetupModal } from "./components/VaultSetupModal.js"
import { VaultUnlockModal } from "./components/VaultUnlockModal.js"
import { MermaidCanvas } from "./components/MermaidCanvas.js"
import { StatusFooter } from "./components/StatusFooter.js"
import { TopAppBar } from "./components/TopAppBar.js"
import { WorkspaceColumn } from "./components/WorkspaceColumn.js"
import { useChatHistory } from "./hooks/useChatHistory.js"
import { useChromeModelInstall } from "./hooks/useChromeModelInstall.js"
import { useViewLayout } from "./hooks/useViewLayout.js"
import { installEsbuildWasmUrl } from "./lib/esbuild-wasm-bootstrap.js"
import { createDemoAppEnvironment } from "./lib/demo-environment.js"
import { shouldBlockForVault } from "./lib/vault-gate.js"
import {
  harnessInvokeChatError,
  logHarnessInvoke,
  logHarnessSuccess,
} from "./lib/harness-invoke-debug.js"
import { environmentSourceFromDescriptor } from "./lib/environment-source.js"
import { logUserPrompt } from "./lib/log-user-prompt.js"
import {
  logFluentChangeReceived,
  logFluentCompileResult,
  logFluentCompileScheduled,
  logFluentCompileSkipped,
  logFluentCompileStale,
  logFluentCompileStart,
  logFluentPipelineError,
  logFluentSyncComplete,
  logFluentSyncSkipped,
  logFluentSyncStart,
} from "./lib/fluent-edit-debug.js"
import { columnWidthClass } from "./lib/view-layout.js"
import {
  harnessCapabilityId,
  providerCapabilityId,
  readStoredProviderMode,
  resolveDemoSession,
  storeProviderMode,
  type AssistantMode,
  type ChromeInstallUi,
  type ProviderMode,
} from "./lib/provider-mode.js"
import {
  readOllamaSettings,
  storeOllamaSettings,
  type OllamaSettings,
} from "./lib/ollama-settings.js"
import {
  detectEcpBridge,
  isOllamaBridgeUsable,
  consumeBridgeQueryParams,
  readBridgeSettings,
  storeBridgeSettings,
  type BridgeDetectResult,
  type BridgeSettings,
} from "./lib/ecp-bridge.js"
import {
  WORKFLOW_QUICK_STARTS,
  shouldShowWorkflowQuickStarts,
} from "./lib/workflow-quick-starts.js"
import type { CodeEditorTab, FormatTab } from "./types/workspace.js"

const EMPTY_MERMAID = "flowchart TD\n  empty[No workflow]"

function ollamaBridgeHintFromDetect(result: BridgeDetectResult): string {
  if (!result.available) {
    return "Run ecp up locally to enable Ollama (Chromium required for hosted HTTPS)."
  }
  if (!result.ollamaReachable) {
    return "ecp up is running but Ollama is unreachable — start Ollama and retry."
  }
  return ""
}

export function App() {
  const layout = useViewLayout()
  const [assistantMode, setAssistantMode] = useState<AssistantMode>("authoring")
  const {
    messages: chatMessages,
    setStatus: setChatStatus,
    appendAgent,
    appendAgentError,
    appendUser,
    setGuidedWelcome,
  } = useChatHistory(assistantMode)
  const [ecp, setEcp] = useState<Ecp | null>(null)
  const [providerMode, setProviderMode] = useState<ProviderMode>(
    () => readStoredProviderMode() ?? "chrome-ai"
  )
  const [ollamaSettings, setOllamaSettings] = useState<OllamaSettings>(() => readOllamaSettings())
  const [bridgeSettings, setBridgeSettings] = useState<BridgeSettings>(() =>
    consumeBridgeQueryParams()
  )
  const [ollamaBridgeAvailable, setOllamaBridgeAvailable] = useState(false)
  const [ollamaBridgeHint, setOllamaBridgeHint] = useState(
    "Checking for local ecp up daemon…"
  )
  const [showProviderModal, setShowProviderModal] = useState(false)
  const [showVaultSetup, setShowVaultSetup] = useState(false)
  const [vaultGate, setVaultGate] = useState<"locked" | "ready">("ready")
  const [chromeSupported, setChromeSupported] = useState(false)
  const [chromeReady, setChromeReady] = useState(false)
  const [chromeInstallUi, setChromeInstallUi] = useState<ChromeInstallUi>("idle")
  const [manifest, setManifest] = useState<WorkflowManifest | null>(null)
  const [validation, setValidation] = useState<ValidationResult | null>(null)
  const [descriptor, setDescriptor] = useState<EnvironmentDescriptor | null>(null)
  const [editorTab, setEditorTab] = useState<CodeEditorTab>("workflow")
  const [formatTab, setFormatTab] = useState<FormatTab>("fluent")
  const [fluent, setFluent] = useState("// Fluent API will appear here")
  const [fluentEditorKey, setFluentEditorKey] = useState(0)
  const [json, setJson] = useState("{}")
  const [toon, setToon] = useState("")
  const [, setPatch] = useState("")
  const [mermaid, setMermaid] = useState(EMPTY_MERMAID)
  const [prompt, setPrompt] = useState("")
  const [compileError, setCompileError] = useState<string | null>(null)
  const [runOutput, setRunOutput] = useState("")
  const [runBusy, setRunBusy] = useState(false)
  const [runOverlayOpen, setRunOverlayOpen] = useState(false)
  const [chatBusy, setChatBusy] = useState(false)
  const [conversationSummary, setConversationSummary] = useState<string | undefined>()
  const compileTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const compileGeneration = useRef(0)
  const syncFromManifestRef = useRef<
    (
      nextManifest: WorkflowManifest,
      options: { refreshFluent: boolean; patchToon?: string; validation?: ValidationResult | null }
    ) => Promise<void>
  >(async () => {})
  const ecpRef = useRef<Ecp | null>(null)
  const ecpBootstrapped = useRef(false)

  const environmentSource = useMemo(
    () => environmentSourceFromDescriptor(descriptor),
    [descriptor]
  )

  const widthClass = columnWidthClass(layout.paired)

  const reloadEcp = useCallback(async (nextOllama?: OllamaSettings, nextBridge?: BridgeSettings) => {
    if (ecpRef.current) {
      await ecpRef.current.terminate()
    }
    const settings = nextOllama ?? readOllamaSettings()
    const bridge = nextBridge ?? readBridgeSettings()
    const { ecp: operational, descriptor: desc } = await createDemoAppEnvironment({
      ollama: settings,
      bridge,
    })
    ecpRef.current = operational
    setEcp(operational)
    setDescriptor(desc)
    return operational
  }, [])

  const refreshBridgeDetect = useCallback(async (baseURL?: string) => {
    const result = await detectEcpBridge(baseURL ?? readBridgeSettings().baseURL)
    setOllamaBridgeAvailable(isOllamaBridgeUsable(result))
    setOllamaBridgeHint(ollamaBridgeHintFromDetect(result))
    return result
  }, [])

  const upgradeToChromeAi = useCallback(async () => {
    await reloadEcp()
    storeProviderMode("chrome-ai")
    setProviderMode("chrome-ai")
    setAssistantMode("authoring")
    setChromeReady(true)
    setChromeInstallUi("done")
    appendAgent("Chrome AI is ready. Authoring now uses the on-device model.")
    setChatStatus("Ready (chrome-ai).")
  }, [reloadEcp, appendAgent, setChatStatus])

  const chromeInstall = useChromeModelInstall(() => {
    void upgradeToChromeAi()
  })
  const { installState: chromeInstallState, startInstall, stopPolling } = chromeInstall

  const beginChromeInstall = useCallback(
    async (surface: "dialog" | "toast") => {
      if (!ecp) return
      setChromeInstallUi(surface)
      setShowProviderModal(false)
      await startInstall(ecp)
    },
    [ecp, startInstall]
  )

  const bootstrapAfterVault = useCallback(async () => {
    if (ecpBootstrapped.current) return
    ecpBootstrapped.current = true

    const { ecp: operational, descriptor: desc } = await createDemoAppEnvironment({
      ollama: readOllamaSettings(),
      bridge: readBridgeSettings(),
    })
    ecpRef.current = operational
    setEcp(operational)
    setDescriptor(desc)

    const bridgeDetect = await refreshBridgeDetect()
    const bridgeOk = isOllamaBridgeUsable(bridgeDetect)

    const avail = await operational.invoke("@executioncontrolprotocol/chrome-ai.checkAvailability").with({}).process()
    const result =
      avail.success && typeof avail.result === "object" && avail.result !== null
        ? (avail.result as { available: boolean; supported?: boolean; status?: string })
        : { available: false, supported: false }

    const supported = result.supported ?? result.status !== "unsupported"
    const ready = Boolean(result.available)
    setChromeSupported(supported)
    setChromeReady(ready)

    const stored = readStoredProviderMode()
    if (stored === "ollama" && !bridgeOk) {
      setShowProviderModal(true)
      setChatStatus("Ollama bridge unavailable — run ecp up or choose another provider.")
    } else if (stored) {
      setProviderMode(stored)
      setAssistantMode("authoring")
      const resolved = resolveDemoSession(stored)
      setChatStatus(`Ready (${stored} / ${resolved.harness}).`)
      if (stored === "chrome-ai" && supported && !ready) {
        setChromeInstallUi("toast")
        await startInstall(operational)
      }
    } else {
      setShowProviderModal(true)
    }
  }, [setChatStatus, startInstall, refreshBridgeDetect])

  useEffect(() => {
    installEsbuildWasmUrl()
    installBrowserWorkflowShim()
    if (shouldBlockForVault()) {
      setVaultGate("locked")
      return
    }
    void bootstrapAfterVault()
  }, [bootstrapAfterVault])

  const syncFromManifest = useCallback(
    async (
      nextManifest: WorkflowManifest,
      options: { refreshFluent: boolean; patchToon?: string; validation?: ValidationResult | null }
    ) => {
      const operational = ecpRef.current
      if (!operational) {
        logFluentSyncSkipped("ecpRef.current is null")
        return
      }

      logFluentSyncStart(
        options.refreshFluent ? "assistant" : "user-compile",
        options.refreshFluent,
        nextManifest.workflow.label ?? nextManifest.workflow.id
      )

      setManifest(nextManifest)

      const service = new BrowserAuthoringService(operational as BrowserOperationalEcp)
      const panels = await service.encodePanels(nextManifest, options.patchToon ?? "")
      if (options.refreshFluent) {
        // Invalidate any pending user-compile debounce and prevent the old
        // Monaco instance from flushing stale source back into React state.
        if (compileTimer.current) clearTimeout(compileTimer.current)
        compileGeneration.current += 1
        setFluent(panels.fluent)
        setFluentEditorKey((key) => key + 1)
      }
      setJson(panels.json)
      setToon(panels.toon)
      setMermaid(panels.mermaid || EMPTY_MERMAID)
      setPatch(panels.patch)
      const val = options.validation ?? (await operational.validate(nextManifest))
      setValidation(val)
      logFluentSyncComplete({
        jsonLength: panels.json.length,
        toonLength: panels.toon.length,
        mermaidLength: (panels.mermaid || EMPTY_MERMAID).length,
        validationValid: val.valid,
      })
    },
    []
  )

  syncFromManifestRef.current = syncFromManifest

  const onProviderComplete = (mode: ProviderMode, nextOllama?: OllamaSettings) => {
    storeProviderMode(mode)
    setProviderMode(mode)
    setAssistantMode("authoring")
    setShowProviderModal(false)
    storeBridgeSettings(bridgeSettings)
    if (nextOllama) {
      storeOllamaSettings(nextOllama)
      setOllamaSettings(nextOllama)
      void reloadEcp(nextOllama, bridgeSettings).then(() => {
        const resolved = resolveDemoSession(mode)
        setChatStatus(`Ready (${mode} / ${resolved.harness}).`)
      })
      return
    }
    const resolved = resolveDemoSession(mode)
    setChatStatus(`Ready (${mode} / ${resolved.harness}).`)
  }

  const onExplore = () => {
    setAssistantMode("guided")
    setProviderMode("chrome-ai")
    setShowProviderModal(false)
    setGuidedWelcome()
    setChatStatus("Guided mode — explore the editor.")
  }

  const onChromeInstallFromModal = () => {
    setAssistantMode("guided")
    setProviderMode("chrome-ai")
    setGuidedWelcome()
    setChatStatus("Installing Chrome AI...")
    void beginChromeInstall("dialog")
  }

  const runChat = async (userRequest: string) => {
    if (!ecp) return
    const { provider, harness } = resolveDemoSession(providerMode)
    const invoked = await ecp
      .invoke(harnessCapabilityId(harness))
      .uses(providerCapabilityId(provider))
      .with({
        task: NANO_HARNESS_TASKS.CHAT,
        message: userRequest,
        ...(manifest ? { manifest } : {}),
        ...(conversationSummary ? { conversationSummary } : {}),
        ...(provider === "ollama" ? { model: ollamaSettings.model } : {}),
      })
      .process()

    logHarnessInvoke("chat", invoked)

    if (!invoked.success || !invoked.result) {
      throw new Error(harnessInvokeChatError(invoked))
    }

    const harnessResult = invoked.result as HarnessInvokeResult
    logHarnessSuccess("chat", harnessResult)

    const nextWorkflow = chatResultWorkflow(harnessResult)
    if (nextWorkflow) {
      const hadWorkflow = manifest !== null
      const harnessValidation = harnessResult.validation as ValidationResult | undefined
      await syncFromManifest(nextWorkflow, {
        refreshFluent: true,
        patchToon: harnessResult.raw,
        ...(harnessValidation ? { validation: harnessValidation } : {}),
      })
      if (!hadWorkflow) layout.onFirstWorkflow()
      else layout.openWorkspace()
      const val = harnessValidation as { valid?: boolean } | undefined
      const msg =
        val?.valid === false
          ? "Workflow updated but has validation issues. See console for raw model output."
          : "Updated workflow."
      setChatStatus(msg)
      appendAgent(msg)
      setConversationSummary(`User: ${userRequest}\nAssistant: ${msg}`)
      return
    }

    const answer = chatResultAnswer(harnessResult)
    if (answer) {
      appendAgent(answer)
      setChatStatus(assistantMode === "guided" ? "Guided mode" : "Ready")
      setConversationSummary(`User: ${userRequest}\nAssistant: ${answer.slice(0, 200)}`)
    }
  }

  const submitMessage = async (userRequest: string) => {
    const text = userRequest.trim()
    if (!ecp || !text) return
    appendUser(text)
    void logUserPrompt(text, {
      assistantMode,
      providerMode,
    })
    setChatBusy(true)

    try {
      await runChat(text)
      if (assistantMode === "guided") {
        setAssistantMode("authoring")
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error("[ecp] chat request failed:", err)
      setChatStatus("Error")
      appendAgentError(msg)
    } finally {
      setChatBusy(false)
    }
  }

  const onSubmit = () => {
    void submitMessage(prompt)
    setPrompt("")
  }

  const onFluentChange = useCallback(
    (value: string | undefined) => {
      if (value === undefined) {
        logFluentCompileSkipped("onChange value is undefined")
        return
      }
      const trimmed = value.trim()
      if (!trimmed || trimmed.startsWith("// Fluent API will appear here")) {
        logFluentCompileSkipped("placeholder or empty source", {
          sourceLength: value.length,
        })
        return
      }

      // Persist draft for remount (Monaco is uncontrolled; defaultValue is read only on mount).
      setFluent(value)

      if (compileTimer.current) clearTimeout(compileTimer.current)
      const generation = ++compileGeneration.current
      logFluentChangeReceived(value.length, generation)
      logFluentCompileScheduled(generation, 400)
      compileTimer.current = setTimeout(() => {
        void (async () => {
          try {
            logFluentCompileStart(generation, value.length)
            const compiled = await compileWorkflowSource({
              source: value,
              filename: "workflow.ts",
              resolveImports: "browser-global",
            })
            if (generation !== compileGeneration.current) {
              logFluentCompileStale(generation, compileGeneration.current)
              return
            }
            logFluentCompileResult(generation, {
              ok: compiled.ok,
              hasManifest: Boolean(compiled.manifest),
              workflowLabel: compiled.manifest?.workflow.label ?? compiled.manifest?.workflow.id,
              stepCount: compiled.manifest?.steps.length,
              compileErrors: compiled.compileErrors?.map((e) => e.message),
              validationErrors: compiled.validation?.errors?.map((e) => e.message),
            })
            if (!compiled.manifest || !ecpRef.current) {
              const validationMsg = compiled.validation?.errors?.[0]?.message
              logFluentSyncSkipped(
                !ecpRef.current ? "ecpRef.current is null after compile" : "no manifest from compile"
              )
              setCompileError(
                compiled.compileErrors?.map((e) => e.message).join("; ") ??
                  validationMsg ??
                  "Compile failed"
              )
              return
            }
            setCompileError(null)
            await syncFromManifestRef.current(compiled.manifest, {
              refreshFluent: false,
              ...(compiled.validation ? { validation: compiled.validation } : {}),
            })
            layout.openWorkspace()
          } catch (err) {
            if (generation !== compileGeneration.current) {
              logFluentCompileStale(generation, compileGeneration.current)
              return
            }
            logFluentPipelineError("compile/sync", err)
            setCompileError(err instanceof Error ? err.message : String(err))
          }
        })()
      }, 400)
    },
    [layout]
  )

  const onRun = async () => {
    if (!ecp || !manifest) return
    setRunBusy(true)
    setRunOutput("")
    layout.ensureWorkflowVisible()
    setRunOverlayOpen(true)
    try {
      const result = await ecp.run(manifest)
      setRunOutput(JSON.stringify(result, null, 2))
    } catch (err) {
      setRunOutput(err instanceof Error ? err.message : String(err))
    } finally {
      setRunBusy(false)
    }
  }

  const chatBlocked = (showProviderModal && chromeInstallUi === "dialog") || vaultGate === "locked"
  const hasWorkflow = manifest !== null
  const showInstallToast =
    chromeInstallUi === "toast" &&
    chromeInstallState.phase !== "ready" &&
    chromeInstallState.phase !== "idle"

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <TopAppBar
        views={layout.views}
        onToggleView={layout.toggleView}
        onExecute={() => void onRun()}
        executeDisabled={!ecp || !hasWorkflow}
        executeBusy={runBusy}
        onSettings={() => setShowProviderModal(true)}
      />

      <main className="flex min-h-0 w-full flex-1 overflow-hidden">
        {layout.views.chat ? (
          <ChatPanel
            visible
            widthClass={widthClass}
            paired={layout.paired}
            messages={chatMessages}
            prompt={prompt}
            onPromptChange={setPrompt}
            onSubmit={onSubmit}
            disabled={!ecp || chatBlocked}
            busy={chatBusy}
            showQuickStarts={shouldShowWorkflowQuickStarts(chatMessages)}
            quickStarts={WORKFLOW_QUICK_STARTS}
            onQuickStartClick={(text) => void submitMessage(text)}
          />
        ) : null}

        {layout.workspaceVisible ? (
          <WorkspaceColumn visible widthClass={widthClass}>
            {layout.views.workflow ? (
              <MermaidCanvas
                mermaid={mermaid}
                runOutput={runOutput}
                runBusy={runBusy}
                runOverlayOpen={runOverlayOpen}
                onCloseRunOverlay={() => setRunOverlayOpen(false)}
                onRun={onRun}
                hasWorkflow={hasWorkflow}
              />
            ) : null}
            {layout.views.code ? (
              <CodePanel
                editorTab={editorTab}
                onEditorTabChange={setEditorTab}
                formatTab={formatTab}
                onFormatTabChange={setFormatTab}
                fluent={fluent}
                fluentEditorKey={fluentEditorKey}
                json={json}
                toon={toon}
                mermaid={mermaid}
                environmentSource={environmentSource}
                compileError={compileError}
                onFluentChange={onFluentChange}
              />
            ) : null}
          </WorkspaceColumn>
        ) : null}
      </main>

      <StatusFooter validation={validation} />

      {showProviderModal ? (
        <FirstRunModal
          chromeSupported={chromeSupported}
          chromeReady={chromeReady}
          ollamaBridgeAvailable={ollamaBridgeAvailable}
          ollamaBridgeHint={ollamaBridgeHint}
          initialMode={providerMode}
          onExplore={onExplore}
          onComplete={onProviderComplete}
          onChromeInstall={onChromeInstallFromModal}
          ollamaSettings={ollamaSettings}
          onOllamaSettingsChange={setOllamaSettings}
          bridgeSettings={bridgeSettings}
          onBridgeSettingsChange={(next) => {
            setBridgeSettings(next)
            void refreshBridgeDetect(next.baseURL)
          }}
          onRequestVaultSetup={() => {
            setShowProviderModal(false)
            setShowVaultSetup(true)
          }}
        />
      ) : null}

      {vaultGate === "locked" ? (
        <VaultUnlockModal
          onUnlocked={() => {
            setVaultGate("ready")
            void bootstrapAfterVault()
          }}
          onSkip={() => {
            setVaultGate("ready")
            void bootstrapAfterVault()
          }}
        />
      ) : null}

      {showVaultSetup ? (
        <VaultSetupModal
          onComplete={() => {
            setShowVaultSetup(false)
            setShowProviderModal(true)
          }}
          onCancel={() => {
            setShowVaultSetup(false)
            setShowProviderModal(true)
          }}
        />
      ) : null}

      {chromeInstallUi === "dialog" ? (
        <ChromeInstallDialog
          state={chromeInstallState}
          onContinueInBackground={() => setChromeInstallUi("toast")}
          onCancel={() => {
            setChromeInstallUi("idle")
            stopPolling()
            setShowProviderModal(true)
          }}
        />
      ) : null}

      <ChromeInstallToast state={chromeInstallState} visible={showInstallToast} />
    </div>
  )
}
