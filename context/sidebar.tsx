import { createContext, useContext, useState } from 'react'
import type { ReactNode } from "react";

// Sidebar width constants
export const SIDEBAR_WIDTHS = {
  ICON_RAIL: 60,        // When collapsed or showing secondary panel
  FULL: 240,            // Full sidebar (w-60)
  SECONDARY_PANEL: 208, // Secondary panel width (w-52)
} as const

interface SidebarContextType {
  isCollapsed: boolean
  setIsCollapsed: (collapsed: boolean) => void
  toggleSidebar: () => void
  hasSecondaryPanel: boolean
  setHasSecondaryPanel: (has: boolean) => void
  getSidebarWidth: () => number
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined)

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [hasSecondaryPanel, setHasSecondaryPanel] = useState(false)

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed)
  }

  const getSidebarWidth = () => {
    if (hasSecondaryPanel) {
      // When secondary panel is shown: icon rail + secondary panel
      return SIDEBAR_WIDTHS.ICON_RAIL + SIDEBAR_WIDTHS.SECONDARY_PANEL
    }
    if (isCollapsed) {
      return SIDEBAR_WIDTHS.ICON_RAIL
    }
    return SIDEBAR_WIDTHS.FULL
  }

  return (
    <SidebarContext.Provider value={{
      isCollapsed,
      setIsCollapsed,
      toggleSidebar,
      hasSecondaryPanel,
      setHasSecondaryPanel,
      getSidebarWidth,
    }}>
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  const context = useContext(SidebarContext)
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider')
  }
  return context
}
