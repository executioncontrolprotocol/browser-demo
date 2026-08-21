import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from "react"
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import type {
  ReactFlowDocument,
  ReactFlowEdge,
  ReactFlowNode,
} from "@executioncontrolprotocol/format-reactflow"
import { EcpStepNode } from "./EcpStepNode.js"
import { EcpIoNode } from "./EcpIoNode.js"
import { EcpDataEdge } from "./EcpDataEdge.js"
import { ReactFlowConfigureContext } from "./reactflow-configure-context.js"
import {
  ReactFlowEdgeMenuContext,
  type EdgeMenuTarget,
} from "./reactflow-edge-menu-context.js"
import { PanelHeader } from "./PanelHeader.js"
import { RunOutputPanel } from "./RunOutputPanel.js"
import { useReactFlowRunProgress } from "../hooks/useReactFlowRunProgress.js"
import { edgeStatusClass, stepNodeStatusClass } from "../lib/reactflow-run-status.js"
import { edgeMenuPosition } from "../lib/edge-menu.js"
import { portsAreCompatible } from "../lib/step-connect.js"
import { ensureReturnsNode } from "../lib/workflow-io.js"
import { capabilityHostBadge } from "../lib/capability-execution-badge.js"
import type { CapabilityBlobStore } from "@executioncontrolprotocol/core"
import type { CapabilityExecution } from "@executioncontrolprotocol/types"

const EDGE_INTERACTION_WIDTH = 24

const nodeTypes = {
  "ecp-step": EcpStepNode,
  "ecp-io": EcpIoNode,
}

const edgeTypes = {
  "ecp-data": EcpDataEdge,
}

function toRfNodes(nodes: ReactFlowNode[]): Node[] {
  return nodes
    .filter((n) => n.type === "ecp-step" || n.type === "ecp-io")
    .map((n) => ({
      id: n.id,
      type: n.type,
      position: n.position,
      data: { ...n.data } as Record<string, unknown>,
      deletable: false,
      style: n.style?.width !== undefined ? { width: n.style.width } : undefined,
    }))
}

function toRfEdges(edges: ReactFlowEdge[]): Edge[] {
  return edges
    .filter(
      (e) =>
        e.data.kind === "data" &&
        typeof e.sourceHandle === "string" &&
        e.sourceHandle.length > 0 &&
        typeof e.targetHandle === "string" &&
        e.targetHandle.length > 0
    )
    .map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
      type: "ecp-data",
      data: e.data,
      animated: false,
      interactionWidth: EDGE_INTERACTION_WIDTH,
      className: "ecp-rf-edge--idle",
      style: { stroke: "var(--color-tertiary-fixed-dim)", strokeWidth: 2, opacity: 0.9 },
    }))
}

function parseDocument(source: string): ReactFlowDocument | null {
  if (!source.trim()) return null
  try {
    const parsed = JSON.parse(source) as ReactFlowDocument
    if (!parsed || !Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) return null
    return ensureReturnsNode(parsed)
  } catch {
    return null
  }
}

/** Props for {@link ReactFlowCanvas}. */
export interface ReactFlowCanvasProps {
  reactflowJson: string
  runOutput: string
  runBusy: boolean
  runOverlayOpen: boolean
  onCloseRunOverlay: () => void
  /** Open the run/state inspect overlay without starting a run. */
  onOpenRunOverlay: () => void
  onRun: (input?: Record<string, unknown>, blobs?: CapabilityBlobStore) => void
  hasWorkflow: boolean
  /** JSON Schema object for `workflow.accepts` (run form). */
  acceptsSchema?: Record<string, unknown>
  /** Last public `result.output` JSON when `returns` is set. */
  runPublicOutput?: string
  /** File picker for locator fields; off when unpaired. */
  filePickerEnabled?: boolean
  /** Open rich run result modal. */
  onOpenResultModal?: () => void
  /** Capability id → execution from describe(). */
  capabilityExecution?: Record<string, CapabilityExecution>
  /** Whether `withRemoteInvoke` is bound. */
  hostPaired?: boolean
  /** Open configure dialog for a step with literal inputs. */
  onConfigureStep?: (stepId: string) => void
  /** Draw output→input: write `$ref` into the target step (manifest + Fluent sync). */
  onConnectPorts?: (connection: {
    sourceStepId: string
    targetStepId: string
    sourceHandle: string
    targetHandle: string
    valueSchema?: Record<string, unknown>
  }) => void | Promise<void>
  /** Delete a data edge: remove that input binding from the target step. */
  onDisconnectPorts?: (connection: {
    targetStepId: string
    targetHandle: string
  }) => void | Promise<void>
}

function ReactFlowCanvasInner({
  reactflowJson,
  runOutput,
  runBusy,
  runOverlayOpen,
  onCloseRunOverlay,
  onOpenRunOverlay,
  onRun,
  hasWorkflow,
  acceptsSchema,
  runPublicOutput,
  filePickerEnabled = false,
  onOpenResultModal,
  capabilityExecution = {},
  hostPaired = false,
  onConfigureStep,
  onConnectPorts,
  onDisconnectPorts,
}: ReactFlowCanvasProps) {
  const doc = useMemo(() => parseDocument(reactflowJson), [reactflowJson])
  const stepIds = useMemo(
    () => (doc?.nodes.filter((n) => n.type === "ecp-step").map((n) => n.id) ?? []),
    [doc]
  )
  const { statuses, runActive } = useReactFlowRunProgress(stepIds)

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [edgeMenu, setEdgeMenu] = useState<{
    x: number
    y: number
    targetStepId: string
    targetHandle: string
    edgeId: string
  } | null>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const edgeMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!doc) {
      setNodes([])
      setEdges([])
      return
    }
    setNodes(
      toRfNodes(doc.nodes).map((node) => {
        if (node.type !== "ecp-step") return node
        const uses = (node.data as { uses?: string }).uses
        const execution = uses ? capabilityExecution[uses] : undefined
        const hostBadge = capabilityHostBadge(execution, hostPaired)
        return hostBadge ? { ...node, data: { ...node.data, hostBadge } } : node
      })
    )
    setEdges(toRfEdges(doc.edges))
  }, [doc, setNodes, setEdges, capabilityExecution, hostPaired])

  const isValidConnection = useCallback(
    (connection: Connection | Edge) => {
      const source = connection.source
      const target = connection.target
      if (!source || !target || source === target) return false
      const sourceHandle = connection.sourceHandle
      const targetHandle = connection.targetHandle
      if (!sourceHandle || !targetHandle) return false

      const sourceNode = nodes.find((n) => n.id === source)
      const targetNode = nodes.find((n) => n.id === target)
      if (!sourceNode || !targetNode) return false

      const sourceData = sourceNode.data as {
        outputs?: Array<{ id: string; typeLabel?: string; valueSchema?: Record<string, unknown> }>
      }
      const targetData = targetNode.data as {
        inputs?: Array<{ id: string; typeLabel?: string; valueSchema?: Record<string, unknown> }>
      }
      const sourcePort = (sourceData.outputs ?? []).find((p) => p.id === sourceHandle)
      const targetPort = (targetData.inputs ?? []).find((p) => p.id === targetHandle)
      if (!sourcePort || !targetPort) return false
      return portsAreCompatible(sourcePort, targetPort)
    },
    [nodes]
  )

  const handleConnect = useCallback(
    (connection: Connection) => {
      if (!onConnectPorts) return
      if (!isValidConnection(connection)) return
      const sourceHandle = connection.sourceHandle
      const targetHandle = connection.targetHandle
      if (!connection.source || !connection.target || !sourceHandle || !targetHandle) return
      const sourceNode = nodes.find((n) => n.id === connection.source)
      const sourceData = sourceNode?.data as
        | { outputs?: Array<{ id: string; valueSchema?: Record<string, unknown> }> }
        | undefined
      const sourcePort = (sourceData?.outputs ?? []).find((p) => p.id === sourceHandle)
      void onConnectPorts({
        sourceStepId: connection.source,
        targetStepId: connection.target,
        sourceHandle,
        targetHandle,
        valueSchema: sourcePort?.valueSchema,
      })
    },
    [onConnectPorts, isValidConnection, nodes]
  )

  const handleEdgesDelete = useCallback(
    (deleted: Edge[]) => {
      if (!onDisconnectPorts) return
      for (const edge of deleted) {
        if (!edge.target || !edge.targetHandle) continue
        void onDisconnectPorts({
          targetStepId: edge.target,
          targetHandle: edge.targetHandle,
        })
      }
      setEdgeMenu(null)
    },
    [onDisconnectPorts]
  )

  const handleBeforeDelete = useCallback(
    async ({ edges: deleteEdges }: { nodes: Node[]; edges: Edge[] }) => {
      if (deleteEdges.length === 0) return false
      return { nodes: [] as Node[], edges: deleteEdges }
    },
    []
  )

  const closeEdgeMenu = useCallback(() => setEdgeMenu(null), [])

  const handleOpenEdgeMenu = useCallback(
    (event: ReactMouseEvent, edge: EdgeMenuTarget) => {
      event.preventDefault()
      if (edgeMenu?.edgeId === edge.id) {
        setEdgeMenu(null)
        return
      }
      const canvas = canvasRef.current?.getBoundingClientRect()
      const controlEl = event.currentTarget instanceof HTMLElement ? event.currentTarget : undefined
      const fromControl = Boolean(controlEl?.classList.contains("ecp-rf-edge-menu-btn"))
      const control = fromControl && controlEl ? controlEl.getBoundingClientRect() : undefined
      const { x, y } = edgeMenuPosition({
        clientX: event.clientX,
        clientY: event.clientY,
        canvas,
        control,
      })
      setEdges((current) => current.map((item) => ({ ...item, selected: item.id === edge.id })))
      setEdgeMenu({
        x,
        y,
        targetStepId: edge.target,
        targetHandle: edge.targetHandle,
        edgeId: edge.id,
      })
    },
    [edgeMenu, setEdges]
  )

  const handleEdgeContextMenu = useCallback(
    (event: ReactMouseEvent, edge: Edge) => {
      const targetHandle = edge.targetHandle
      if (!edge.target || !targetHandle) return
      handleOpenEdgeMenu(event, { id: edge.id, target: edge.target, targetHandle })
    },
    [handleOpenEdgeMenu]
  )

  const handleDeleteMenuConnection = useCallback(() => {
    if (!edgeMenu || !onDisconnectPorts) {
      setEdgeMenu(null)
      return
    }
    void onDisconnectPorts({
      targetStepId: edgeMenu.targetStepId,
      targetHandle: edgeMenu.targetHandle,
    })
    setEdgeMenu(null)
  }, [edgeMenu, onDisconnectPorts])

  useEffect(() => {
    if (!edgeMenu) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setEdgeMenu(null)
    }
    const onPointer = (event: PointerEvent) => {
      const menu = edgeMenuRef.current
      if (menu && menu.contains(event.target as globalThis.Node)) return
      if ((event.target as Element | null)?.closest?.(".ecp-rf-edge-menu-btn")) return
      setEdgeMenu(null)
    }
    window.addEventListener("keydown", onKey)
    window.addEventListener("pointerdown", onPointer)
    return () => {
      window.removeEventListener("keydown", onKey)
      window.removeEventListener("pointerdown", onPointer)
    }
  }, [edgeMenu])

  const connectedByNode = useMemo(() => {
    const targets = new Map<string, Set<string>>()
    const sources = new Map<string, Set<string>>()
    for (const edge of edges) {
      if (edge.data && (edge.data as { kind?: string }).kind === "control") continue
      if (edge.targetHandle) {
        const set = targets.get(edge.target) ?? new Set<string>()
        set.add(edge.targetHandle)
        targets.set(edge.target, set)
      }
      if (edge.sourceHandle) {
        const set = sources.get(edge.source) ?? new Set<string>()
        set.add(edge.sourceHandle)
        sources.set(edge.source, set)
      }
    }
    return { targets, sources }
  }, [edges])

  const decoratedNodes = useMemo(
    () =>
      nodes.map((node) => {
        if (node.type !== "ecp-step" && node.type !== "ecp-io") return node
        const connected = {
          connectedTargetHandles: [...(connectedByNode.targets.get(node.id) ?? [])],
          connectedSourceHandles: [...(connectedByNode.sources.get(node.id) ?? [])],
        }
        if (node.type === "ecp-io") {
          return {
            ...node,
            data: {
              ...(node.data as object),
              ...connected,
            },
          }
        }
        const status = statuses[node.id]
        const statusClass = stepNodeStatusClass(status, runActive || runBusy)
        return {
          ...node,
          data: {
            ...(node.data as object),
            statusClass,
            ...connected,
          },
          className: statusClass,
        }
      }),
    [nodes, statuses, runActive, runBusy, connectedByNode]
  )

  const decoratedEdges = useMemo(
    () =>
      edges.map((edge) => {
        const cls = edgeStatusClass(statuses[edge.source], statuses[edge.target], runActive || runBusy)
        const incomplete = cls === "ecp-rf-edge--incomplete"
        const completed = cls === "ecp-rf-edge--completed"
        return {
          ...edge,
          className: `${cls}${edge.selected ? " ecp-rf-edge--selected" : ""}`,
          // CSS class drives ants — RF `animated` uses a different dash period and flickers.
          animated: false,
          interactionWidth: EDGE_INTERACTION_WIDTH,
          style: {
            strokeWidth: 2,
            opacity: 0.9,
            ...(incomplete
              ? { stroke: "var(--color-tertiary-fixed-dim)" }
              : completed
                ? { stroke: "var(--color-status-valid)" }
                : { stroke: "var(--color-tertiary-fixed-dim)" }),
          },
        }
      }),
    [edges, statuses, runActive, runBusy]
  )

  return (
    <section
      className="node-canvas relative flex min-h-0 flex-1 flex-col overflow-hidden bg-background"
      id="graph-drawer"
    >
      <PanelHeader icon="account_tree" label="Workflow Canvas" />

      <div
        ref={canvasRef}
        className={`relative flex min-h-0 flex-1 flex-col ${runOverlayOpen ? "opacity-50" : ""}`}
      >
        {hasWorkflow && doc ? (
          <ReactFlowConfigureContext.Provider value={onConfigureStep}>
            <ReactFlowEdgeMenuContext.Provider value={handleOpenEdgeMenu}>
            <ReactFlow
              nodes={decoratedNodes}
              edges={decoratedEdges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={handleConnect}
              onEdgesDelete={handleEdgesDelete}
              onBeforeDelete={handleBeforeDelete}
              onEdgeContextMenu={handleEdgeContextMenu}
              onPaneClick={closeEdgeMenu}
              onNodeClick={closeEdgeMenu}
              isValidConnection={isValidConnection}
              defaultEdgeOptions={{ type: "ecp-data", interactionWidth: EDGE_INTERACTION_WIDTH }}
              deleteKeyCode={["Backspace", "Delete"]}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              fitView
              nodesDraggable={false}
              nodesConnectable
              elementsSelectable
              panOnDrag
              zoomOnDoubleClick={false}
              proOptions={{ hideAttribution: true }}
            >
              <Background gap={24} color="var(--color-surface-container-highest)" />
              <Controls className="ecp-rf-controls" showInteractive={false}>
                <button
                  type="button"
                  className="react-flow__controls-button ecp-rf-controls-inspect"
                  title="Inspect state"
                  aria-label="Inspect state"
                  onClick={onOpenRunOverlay}
                >
                  <span
                    className="material-symbols-outlined ecp-rf-controls-inspect-icon"
                    aria-hidden
                  >
                    data_object
                  </span>
                </button>
              </Controls>
              <MiniMap
                className="ecp-rf-minimap"
                bgColor="var(--color-surface-container-low)"
                nodeStrokeColor="var(--color-outline)"
                nodeColor="var(--color-surface-container-high)"
                maskColor="color-mix(in srgb, var(--color-background) 72%, transparent)"
              />
            </ReactFlow>
            {edgeMenu ? (
              <div
                ref={edgeMenuRef}
                className="absolute z-30 min-w-[10rem] rounded-md border border-outline-variant bg-surface-container-high py-1 shadow-md"
                style={{ left: edgeMenu.x, top: edgeMenu.y }}
                role="menu"
                onPointerDown={(event) => event.stopPropagation()}
              >
                <button
                  type="button"
                  className="w-full cursor-pointer px-3 py-1.5 text-left font-mono text-[11px] text-on-surface hover:bg-surface-container-highest"
                  role="menuitem"
                  onClick={handleDeleteMenuConnection}
                >
                  Delete connection
                </button>
              </div>
            ) : null}
            </ReactFlowEdgeMenuContext.Provider>
          </ReactFlowConfigureContext.Provider>
        ) : (
          <div className="flex h-full items-center justify-center p-canvas-padding">
            <p className="max-w-md text-center font-mono text-body text-on-surface-variant">
              Generate a workflow via chat to see the graph here.
            </p>
          </div>
        )}
      </div>

      {runOverlayOpen ? (
        <div className="absolute inset-0 z-20 flex items-start justify-center overflow-auto bg-background/50 p-6 backdrop-blur-[2px]">
          <div className="flex w-full max-w-2xl flex-col rounded-xl border border-outline-variant bg-surface-container p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-headline text-on-surface">Workflow state</h2>
              <button
                type="button"
                className="material-symbols-outlined cursor-pointer text-on-surface-variant hover:text-on-surface"
                onClick={onCloseRunOverlay}
                aria-label="Close"
              >
                close
              </button>
            </div>
            <RunOutputPanel
              runOutput={runOutput}
              runBusy={runBusy}
              onRun={onRun}
              hasWorkflow={hasWorkflow}
              acceptsSchema={acceptsSchema}
              runPublicOutput={runPublicOutput}
              filePickerEnabled={filePickerEnabled}
              onOpenResultModal={onOpenResultModal}
            />
          </div>
        </div>
      ) : null}
    </section>
  )
}

/** React Flow workspace panel with run-progress styling. */
export function ReactFlowCanvas(props: ReactFlowCanvasProps) {
  return (
    <ReactFlowProvider>
      <ReactFlowCanvasInner {...props} />
    </ReactFlowProvider>
  )
}
