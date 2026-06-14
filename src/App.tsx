import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  BrowserAuthoringService,
  HARNESS_TASKS,
  BROWSER_NANO_HARNESS_CAPABILITY,
  installBrowserWorkflowShim,
  type BrowserOperationalEcp,
} from "@executioncontextprotocol/browser"
import type {
  EcpIntent,
  EnvironmentDescriptor,
  HarnessInvokeResult,
  HarnessReply,
  ValidationResult,
  WorkflowManifest,
} from "@executioncontextprotocol/types"
import type { Ecp } from "@executioncontextprotocol/core"
import { compileWorkflowSource } from "@executioncontextprotocol/core/browser"
import { ChatPanel } from "./components/ChatPanel.js"
import { ChromeInstallDialog } from "./components/ChromeInstallDialog.js"
import { ChromeInstallToast } from "./components/ChromeInstallToast.js"
import { CodeSidebar } from "./components/CodeSidebar.js"
import { FirstRunModal } from "./components/FirstRunModal.js"
import { VaultSetupModal } from "./components/VaultSetupModal.js"
import { VaultUnlockModal } from "./components/VaultUnlockModal.js"
import { MermaidCanvas } from "./components/MermaidCanvas.js"
import { SplitPane } from "./components/SplitPane.js"
import { TopAppBar } from "./components/TopAppBar.js"
import { useChatHistory } from "./hooks/useChatHistory.js"
import { useChromeModelInstall } from "./hooks/useChromeModelInstall.js"
import { useSplitPane } from "./hooks/useSplitPane.js"
import { useWorkspaceLayout } from "./hooks/useWorkspaceLayout.js"
import { intentRoutesToAuthoring } from "./lib/chat-routing.js"
import { formatRegisteredCapabilitiesSummary } from "./lib/capability-summary.js"
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
  providerCapabilityId,
  readStoredProviderMode,
  storeProviderMode,
  type AssistantMode,
  type ChromeInstallUi,
  type ProviderMode,
} from "./lib/provider-mode.js"
import type { AppNavTab, CodeEditorTab, FormatTab } from "./types/workspace.js"

const EMPTY_MERMAID = "flowchart TD\n  empty[No workflow]"

export function App() {
  const layout = useWorkspaceLayout()
  const split = useSplitPane()
  const [assistantMode, setAssistantMode] = useState<AssistantMode>("authoring")
  const chat = useChatHistory(assistantMode)
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
  const [activeNav, setActiveNav] = useState<AppNavTab>("editor")
  const [fluent, setFluent] = useState("// Fluent API will appear here")
  const [json, setJson] = useState("{}")
  const [toon, setToon] = useState("")
  const [patch, setPatch] = useState("")
  const [mermaid, setMermaid] = useState(EMPTY_MERMAID)
  const [prompt, setPrompt] = useState("")
  const [compileError, setCompileError] = useState<string | null>(null)
  const [runOutput, setRunOutput] = useState("")
  const [runBusy, setRunBusy] = useState(false)
  const compileTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const ecpRef = useRef<Ecp | null>(null)

  const environmentSource = useMemo(
    () => environmentSourceFromDescriptor(descriptor),
    [descriptor]
  )

  const capabilitySummary = useMemo(
    () => formatRegisteredCapabilitiesSummary(descriptor),
    [descriptor]
  )

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
    chat.appendAgent("Chrome AI is ready. Authoring now uses the on-device model.")
    chat.setStatus("Ready (chrome-ai).")
  }, [reloadEcp, chat])

  const chromeInstall = useChromeModelInstall(() => {
    void upgradeToChromeAi()
  })

  const beginChromeInstall = useCallback(
    async (surface: "dialog" | "toast") => {
      if (!ecp) return
      setChromeInstallUi(surface)
      setShowProviderModal(false)
      await chromeInstall.startInstall(ecp)
    },
    [ecp, chromeInstall]
  )

  const bootstrapAfterVault = useCallback(async () => {
    const { ecp: operational, descriptor: desc } = await createDemoAppEnvironment()
    ecpRef.current = operational
    setEcp(operational)
    setDescriptor(desc)

    const avail = await operational.invoke("@executioncontextprotocol/chrome-ai.checkAvailability").with({}).process()
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
      chat.setStatus(`Ready (${stored}).`)
      if (stored === "chrome-ai" && supported && !ready) {
        setChromeInstallUi("toast")
        await chromeInstall.startInstall(operational)
      }
    } else {
      setShowProviderModal(true)
    }
  }, [chat, chromeInstall])

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
    chat.setStatus(`Ready (${mode}).`)
  }

  const onExplore = () => {
    setAssistantMode("guided")
    setProviderMode("demo")
    setShowProviderModal(false)
    chat.setGuidedWelcome()
    chat.setStatus("Guided mode — explore the editor.")
  }

  const onChromeInstallFromModal = () => {
    setAssistantMode("guided")
    setProviderMode("demo")
    chat.setGuidedWelcome()
    chat.setStatus("Installing Chrome AI...")
    void beginChromeInstall("dialog")
  }

  const runAuthoring = async (userRequest: string, cap: string) => {
    if (!ecp) return
    const invoked = await ecp
      .invoke(BROWSER_NANO_HARNESS_CAPABILITY)
      .uses(cap)
      .with({
        task: HARNESS_TASKS.WORKFLOW_AUTHORING,
        request: userRequest,
        ...(manifest ? { manifest } : {}),
      })
      .process()

    logHarnessInvoke("workflow-authoring", invoked)

    if (!invoked.success || !invoked.result) {
      throw new Error(harnessInvokeChatError(invoked))
    }

    const harnessResult = invoked.result as HarnessInvokeResult<WorkflowManifest>
    logHarnessSuccess("workflow-authoring", harnessResult)
    const nextManifest = harnessResult.artifact
    const service = new BrowserAuthoringService(ecp as BrowserOperationalEcp)
    const panels = await service.encodePanels(nextManifest, harnessResult.raw)

    const hadWorkflow = manifest !== null
    setManifest(nextManifest)
    setFluent(panels.fluent)
    setJson(panels.json)
    setToon(panels.toon)
    setMermaid(panels.mermaid || EMPTY_MERMAID)
    setPatch(panels.patch)
    setValidation(
      (harnessResult.validation as typeof validation) ??
        (await ecp.validate(nextManifest))
    )

    if (!hadWorkflow) layout.onFirstWorkflow()
    else layout.openWorkspace()

    const val = harnessResult.validation as { valid?: boolean } | undefined
    const msg =
      val?.valid === false
        ? "Workflow updated but has validation issues. See console for raw model output."
        : "Updated workflow."
    chat.setStatus(msg)
    chat.appendAgent(msg)
  }

  const runAssistant = async (userRequest: string, cap: string) => {
    if (!ecp) return
    const invoked = await ecp
      .invoke(BROWSER_NANO_HARNESS_CAPABILITY)
      .uses(cap)
      .with({
        task: HARNESS_TASKS.WORKFLOW_ASSISTANT,
        message: userRequest,
      })
      .process()

    logHarnessInvoke("workflow-assistant", invoked)

    if (!invoked.success || !invoked.result) {
      throw new Error(harnessInvokeChatError(invoked))
    }

    const harnessResult = invoked.result as HarnessInvokeResult<HarnessReply>
    logHarnessSuccess("workflow-assistant", harnessResult)
    chat.appendAgent(harnessResult.artifact.answer)
    chat.setStatus(assistantMode === "guided" ? "Guided mode" : "Ready")
  }

  const classifyIntent = async (message: string, cap: string): Promise<EcpIntent | null> => {
    if (!ecp) return null
    try {
      const invoked = await ecp
        .invoke(BROWSER_NANO_HARNESS_CAPABILITY)
        .uses(cap)
        .with({ task: HARNESS_TASKS.INTENT_CLASSIFICATION, message })
        .process()
      logHarnessInvoke("intent-classification", invoked)
      if (!invoked.success || !invoked.result) {
        console.warn("[ecp harness] intent-classification failed:", harnessInvokeChatError(invoked))
        return null
      }
      const harnessResult = invoked.result as HarnessInvokeResult<EcpIntent>
      logHarnessSuccess("intent-classification", harnessResult)
      return harnessResult.artifact
    } catch (err) {
      console.error("[ecp harness] intent-classification error:", err)
      return null
    }
  }

  const onSubmit = async () => {
    if (!ecp || !prompt.trim()) return
    const userRequest = prompt.trim()
    chat.appendUser(userRequest)
    void logUserPrompt(userRequest, {
      assistantMode,
      providerMode,
    })
    chat.setStatus("Thinking...")
    setPrompt("")

    try {
      const cap = providerCapabilityId(providerMode)

      chat.setStatus("Classifying intent...")
      const classified = await classifyIntent(userRequest, cap)
      const routeToAuthoring = classified ? intentRoutesToAuthoring(classified.intent) : false

      if (!routeToAuthoring) {
        chat.setStatus("Answering...")
        await runAssistant(userRequest, cap)
        return
      }

      chat.setStatus("Generating...")
      await runAuthoring(userRequest, cap)
      if (assistantMode === "guided") {
        setAssistantMode("authoring")
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error("[ecp] chat request failed:", err)
      chat.setStatus("Error")
      chat.appendAgentError(msg)
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
    setActiveNav("run")
    try {
      const result = await ecp.run(manifest)
      setRunOutput(JSON.stringify(result, null, 2))
      layout.openWorkspace()
    } catch (err) {
      setRunOutput(err instanceof Error ? err.message : String(err))
    } finally {
      setRunBusy(false)
    }
  }

  const chatBlocked = (showProviderModal && chromeInstallUi === "dialog") || vaultGate === "locked"
  const chatHero = !layout.workspaceOpen
  const hasWorkflow = manifest !== null
  const showInstallToast =
    chromeInstallUi === "toast" &&
    chromeInstall.installState.phase !== "ready" &&
    chromeInstall.installState.phase !== "idle"

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {layout.workspaceOpen ? (
        <>
          <TopAppBar
            activeNav={activeNav}
            onNavChange={setActiveNav}
            onExecute={() => void onRun()}
            executeDisabled={!ecp || !hasWorkflow}
            executeBusy={runBusy}
            onSettings={() => setShowProviderModal(true)}
            validation={validation}
          />
          <main className="relative min-h-0 flex-1">
            <SplitPane
              leftWidth={split.leftWidth}
              leftCollapsed={layout.codeSidebarCollapsed}
              onDividerPointerDown={split.onPointerDown}
              left={
                <CodeSidebar
                  editorTab={editorTab}
                  onEditorTabChange={setEditorTab}
                  formatTab={formatTab}
                  onFormatTabChange={setFormatTab}
                  fluent={fluent}
                  json={json}
                  toon={toon}
                  patch={patch}
                  environmentSource={environmentSource}
                  compileError={compileError}
                  onFluentChange={onFluentChange}
                  collapsed={layout.codeSidebarCollapsed}
                  onToggleCollapse={layout.toggleCodeSidebar}
                />
              }
              right={
                <MermaidCanvas
                  mermaid={mermaid}
                  activeNav={activeNav}
                  validation={validation}
                  runOutput={runOutput}
                  runBusy={runBusy}
                  onRun={onRun}
                  hasWorkflow={hasWorkflow}
                />
              }
            />
          </main>
        </>
      ) : (
        <main className="node-canvas relative min-h-0 flex-1" />
      )}

      <ChatPanel
        chat={layout.chat}
        onChatChange={layout.setChat}
        messages={chat.messages}
        status={chat.status}
        prompt={prompt}
        onPromptChange={setPrompt}
        onSubmit={() => void onSubmit()}
        disabled={!ecp || chatBlocked}
        hero={chatHero}
        capabilitySummary={capabilitySummary}
      />

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
          state={chromeInstall.installState}
          onContinueInBackground={() => setChromeInstallUi("toast")}
          onCancel={() => {
            setChromeInstallUi("idle")
            chromeInstall.stopPolling()
            setShowProviderModal(true)
          }}
        />
      ) : null}

      <ChromeInstallToast state={chromeInstall.installState} visible={showInstallToast} />
    </div>
  )
}
