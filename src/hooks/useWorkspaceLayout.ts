import { useCallback, useState } from "react"
import type { ChatPanelState } from "../types/workspace.js"

/** Manage workspace layout and chat dock state. */
export function useWorkspaceLayout() {
  const [chat, setChat] = useState<ChatPanelState>("expanded")
  const [workspaceOpen, setWorkspaceOpen] = useState(false)
  const [codeSidebarCollapsed, setCodeSidebarCollapsed] = useState(false)

  const snapChatForWorkspace = useCallback(() => {
    setChat((current) => (current === "expanded" ? "compact" : current))
  }, [])

  const openWorkspace = useCallback(() => {
    setWorkspaceOpen(true)
    snapChatForWorkspace()
  }, [snapChatForWorkspace])

  const onFirstWorkflow = useCallback(() => {
    setWorkspaceOpen(true)
    setChat("compact")
  }, [])

  const toggleCodeSidebar = useCallback(() => {
    setCodeSidebarCollapsed((v) => !v)
  }, [])

  return {
    chat,
    setChat,
    workspaceOpen,
    codeSidebarCollapsed,
    openWorkspace,
    onFirstWorkflow,
    toggleCodeSidebar,
  }
}
