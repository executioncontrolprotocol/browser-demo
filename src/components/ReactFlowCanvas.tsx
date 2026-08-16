import { useEffect, useMemo } from "react"
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
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
import { PanelHeader } from "./PanelHeader.js"
import { RunOutputPanel } from "./RunOutputPanel.js"
import { useReactFlowRunProgress } from "../hooks/useReactFlowRunProgress.js"
import { edgeStatusClass, stepNodeStatusClass } from "../lib/reactflow-run-status.js"

const nodeTypes = {
  "ecp-step": EcpStepNode,
}

function toRfNodes(nodes: ReactFlowNode[]): Node[] {
  return nodes
    .filter((n) => n.type === "ecp-step")
    .map((n) => ({
      id: n.id,
      type: n.type,
      position: n.position,
      data: { ...n.data } as Record<string, unknown>,
      style: n.style?.width !== undefined ? { width: n.style.width } : undefined,
    }))
}

function toRfEdges(edges: ReactFlowEdge[]): Edge[] {
  return edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle,
    targetHandle: e.targetHandle,
    data: e.data,
    animated: e.data.kind === "data",
    style:
      e.data.kind === "control"
        ? { stroke: "var(--color-outline-variant)", strokeWidth: 1, opacity: 0.45 }
        : { stroke: "var(--color-primary)", strokeWidth: 2, opacity: 0.7 },
  }))
}

function parseDocument(source: string): ReactFlowDocument | null {
  if (!source.trim()) return null
  try {
    const parsed = JSON.parse(source) as ReactFlowDocument
    if (!parsed || !Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) return null
    return parsed
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
  onRun: () => void
  hasWorkflow: boolean
}

function ReactFlowCanvasInner({
  reactflowJson,
  runOutput,
  runBusy,
  runOverlayOpen,
  onCloseRunOverlay,
  onRun,
  hasWorkflow,
}: ReactFlowCanvasProps) {
  const doc = useMemo(() => parseDocument(reactflowJson), [reactflowJson])
  const stepIds = useMemo(
    () => (doc?.nodes.filter((n) => n.type === "ecp-step").map((n) => n.id) ?? []),
    [doc]
  )
  const { statuses, runActive } = useReactFlowRunProgress(stepIds)

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])

  useEffect(() => {
    if (!doc) {
      setNodes([])
      setEdges([])
      return
    }
    setNodes(toRfNodes(doc.nodes))
    setEdges(toRfEdges(doc.edges))
  }, [doc, setNodes, setEdges])

  const decoratedNodes = useMemo(
    () =>
      nodes.map((node) => {
        if (node.type !== "ecp-step") return node
        const status = statuses[node.id]
        const statusClass = stepNodeStatusClass(status, runActive || runBusy)
        return {
          ...node,
          data: { ...(node.data as object), statusClass },
          className: statusClass,
        }
      }),
    [nodes, statuses, runActive, runBusy]
  )

  const decoratedEdges = useMemo(
    () =>
      edges.map((edge) => {
        const cls = edgeStatusClass(statuses[edge.source], statuses[edge.target], runActive || runBusy)
        return {
          ...edge,
          className: cls,
          animated: cls === "ecp-rf-edge--incomplete" || Boolean(edge.animated),
          style: {
            ...edge.style,
            ...(cls === "ecp-rf-edge--completed"
              ? { stroke: "var(--color-status-valid)", opacity: 0.85 }
              : {}),
            ...(cls === "ecp-rf-edge--incomplete"
              ? { stroke: "var(--color-tertiary-fixed-dim)", opacity: 0.95 }
              : {}),
          },
        }
      }),
    [edges, statuses, runActive, runBusy]
  )

  return (
    <section
      className="node-canvas relative flex min-h-0 flex-1 flex-col overflow-hidden bg-background"
      id="flow-drawer"
    >
      <PanelHeader icon="hub" label="React Flow" />

      <div
        className={`relative flex min-h-0 flex-1 flex-col ${runOverlayOpen ? "opacity-50" : ""}`}
      >
        {hasWorkflow && doc ? (
          <ReactFlow
            nodes={decoratedNodes}
            edges={decoratedEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            fitView
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={24} color="var(--color-surface-container-highest)" />
            <Controls className="ecp-rf-controls" showInteractive={false} />
            <MiniMap
              className="ecp-rf-minimap"
              bgColor="var(--color-surface-container-low)"
              nodeStrokeColor="var(--color-outline)"
              nodeColor="var(--color-surface-container-high)"
              maskColor="color-mix(in srgb, var(--color-background) 72%, transparent)"
            />
          </ReactFlow>
        ) : (
          <div className="flex h-full items-center justify-center p-canvas-padding">
            <p className="max-w-md text-center font-body text-body text-on-surface-variant">
              Generate a workflow via chat to see the React Flow graph here.
            </p>
          </div>
        )}
      </div>

      {runOverlayOpen ? (
        <div className="absolute inset-0 z-20 flex items-start justify-center overflow-auto bg-background/50 p-6 backdrop-blur-[2px]">
          <div className="flex w-full max-w-2xl flex-col rounded-xl border border-outline-variant bg-surface-container p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-headline text-on-surface">Run output</h2>
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
