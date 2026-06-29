import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  BrowserAuthoringService,
  HARNESS_TASKS,
  BROWSER_NANO_HARNESS_CAPABILITY,
  chatResultAnswer,
  chatResultWorkflow,
  installBrowserWorkflowShim,
  type BrowserOperationalEcp,
} from "@executioncontrolprotocol/browser"
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
import { createDemoAppEnvironment } from "./lib/demo-environment.js"
import { shouldBlockForVault } from "./lib/vault-gate.js"
import {
  harnessInvokeChatError,
  logHarnessInvoke,
  logHarnessSuccess,
} from "./lib/harness-invoke-debug.js"
import { environmentSourceFromDescriptor } from "./lib/environment-source.js"
import { logUserPrompt } from "./lib/log-user-prompt.js"
import { columnWidthClass } from "./lib/view-layout.js"
import {
  providerCapabilityId,
  readStoredProviderMode,
  storeProviderMode,
  type AssistantMode,
  type ChromeInstallUi,
  type ProviderMode,
} from "./lib/provider-mode.js"
import type { CodeEditorTab, FormatTab } from "./types/workspace.js"

const EMPTY_MERMAID = "flowchart TD\n  empty[No workflow]"

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
  const [providerMode, setProviderMode] = useState<ProviderMode>("demo")
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
  const ecpRef = useRef<Ecp | null>(null)
  const ecpBootstrapped = useRef(false)

  const environmentSource = useMemo(
    () => environmentSourceFromDescriptor(descriptor),
    [descriptor]
  )

  const widthClass = columnWidthClass(layout.paired)

  const reloadEcp = useCallback(async () => {
    if (ecpRef.current) {
      await ecpRef.current.terminate()
    }
    const { ecp: operational, descriptor: desc } = await createDemoAppEnvironment()
    ecpRef.current = operational
    setEcp(operational)
    setDescriptor(desc)
    return operational
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

    const { ecp: operational, descriptor: desc } = await createDemoAppEnvironment()
    ecpRef.current = operational
    setEcp(operational)
    setDescriptor(desc)

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
    if (stored) {
      setProviderMode(stored)
      setAssistantMode("authoring")
      setChatStatus(`Ready (${stored}).`)
      if (stored === "chrome-ai" && supported && !ready) {
        setChromeInstallUi("toast")
        await startInstall(operational)
      }
    } else {
      setShowProviderModal(true)
    }
  }, [setChatStatus, startInstall])

  useEffect(() => {
    installBrowserWorkflowShim()
    if (shouldBlockForVault()) {
      setVaultGate("locked")
      return
    }
    void bootstrapAfterVault()
  }, [bootstrapAfterVault])

  const applyPanels = useCallback(
    async (nextManifest: WorkflowManifest, patchToon = "") => {
      if (!ecp) return
      const service = new BrowserAuthoringService(ecp as BrowserOperationalEcp)
      const panels = await service.encodePanels(nextManifest, patchToon)
      setManifest(nextManifest)
      setFluent(panels.fluent)
      setJson(panels.json)
      setToon(panels.toon)
      setMermaid(panels.mermaid || EMPTY_MERMAID)
      setPatch(panels.patch)
      const val = await ecp.validate(nextManifest)
      setValidation(val)
    },
    [ecp]
  )

  const onProviderComplete = (mode: ProviderMode) => {
    storeProviderMode(mode)
    setProviderMode(mode)
    setAssistantMode("authoring")
    setShowProviderModal(false)
    setChatStatus(`Ready (${mode}).`)
  }

  const onExplore = () => {
    setAssistantMode("guided")
    setProviderMode("demo")
    setShowProviderModal(false)
    setGuidedWelcome()
    setChatStatus("Guided mode — explore the editor.")
  }

  const onChromeInstallFromModal = () => {
    setAssistantMode("guided")
    setProviderMode("demo")
    setGuidedWelcome()
    setChatStatus("Installing Chrome AI...")
    void beginChromeInstall("dialog")
  }

  const runChat = async (userRequest: string, cap: string) => {
    if (!ecp) return
    const invoked = await ecp
      .invoke(BROWSER_NANO_HARNESS_CAPABILITY)
      .uses(cap)
      .with({
        task: HARNESS_TASKS.CHAT,
        message: userRequest,
        ...(manifest ? { manifest } : {}),
        ...(conversationSummary ? { conversationSummary } : {}),
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
      const service = new BrowserAuthoringService(ecp as BrowserOperationalEcp)
      const panels = await service.encodePanels(nextWorkflow, harnessResult.raw)
      const hadWorkflow = manifest !== null
      setManifest(nextWorkflow)
      setFluent(panels.fluent)
      setJson(panels.json)
      setToon(panels.toon)
      setMermaid(panels.mermaid || EMPTY_MERMAID)
      setPatch(panels.patch)
      setValidation(
        (harnessResult.validation as typeof validation) ??
          (await ecp.validate(nextWorkflow))
      )
      if (!hadWorkflow) layout.onFirstWorkflow()
      else layout.openWorkspace()
      const val = harnessResult.validation as { valid?: boolean } | undefined
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

  const onSubmit = async () => {
    if (!ecp || !prompt.trim()) return
    const userRequest = prompt.trim()
    appendUser(userRequest)
    void logUserPrompt(userRequest, {
      assistantMode,
      providerMode,
    })
    setPrompt("")
    setChatBusy(true)

    try {
      const cap = providerCapabilityId(providerMode)
      await runChat(userRequest, cap)
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

  const onFluentChange = (value: string | undefined) => {
    const source = value ?? ""
    setFluent(source)
    if (compileTimer.current) clearTimeout(compileTimer.current)
    compileTimer.current = setTimeout(() => {
      void (async () => {
        const compiled = await compileWorkflowSource({
          source,
          filename: "workflow.ts",
          resolveImports: "browser-global",
        })
        if (!compiled.ok || !compiled.manifest || !ecp) {
          setCompileError(compiled.compileErrors?.map((e) => e.message).join("; ") ?? "Compile failed")
          return
        }
        setCompileError(null)
        await applyPanels(compiled.manifest)
        layout.openWorkspace()
      })()
    }, 400)
  }

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
            onSubmit={() => void onSubmit()}
            disabled={!ecp || chatBlocked}
            busy={chatBusy}
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
          onExplore={onExplore}
          onComplete={onProviderComplete}
          onChromeInstall={onChromeInstallFromModal}
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
