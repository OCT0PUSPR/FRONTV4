"use client"

import React, { createContext, useContext, useEffect, useMemo, useState } from "react"

export type ThemeMode = "light" | "dark"

export type ThemeColors = {
  background: string
  card: string
  action: string
  cancel: string
  success: string
  inProgress: string
  todo: string
  textPrimary: string
  textSecondary: string
  border: string
  pillSuccessBg: string
  pillSuccessText: string
  pillInfoBg: string
  pillInfoText: string
  mutedBg: string
  pillWarningBg:string
  pillWarningText:string
  tableWaitingBg: string
  tableWaitingText: string
  tableDoneBg: string
  tableDoneText: string
  tableReadyBg: string
  tableReadyText: string
  tableCancelledBg: string
  tableCancelledText: string
  tableDraftBg: string
  tableDraftText: string
}

export type Theme = {
  mode: ThemeMode
  colors: ThemeColors
  setMode: (mode: ThemeMode) => void
}

const lightColors: ThemeColors = {
  background: "#FFF",
  card: "#FFF",
  action: "#3b82f6",
  cancel: "#FA8787",      // Cancelled
  success: "#C9F5C5",     // Done
  inProgress: "#FFE5A8",  // In Progress
  todo: "#DBD2FC",        // To Do
  textPrimary: "#0A0A0A",
  textSecondary: "#4F4F4F",
  border: "#E6E6E6",
  pillSuccessBg: "#E8F5E9",
  pillWarningBg:"#ffbf71ff",
  pillWarningText:"#FFFFFF",
  pillSuccessText: "#2E7D32",
  pillInfoBg: "#E3F2FD",
  pillInfoText: "#1565C0",
  mutedBg: "#F6FAFD",
  tableWaitingBg: "#FFF9E7",
  tableWaitingText: "#FFCB03",
  tableDoneBg: "#EBF9ED",
  tableDoneText: "#32C75A",
  tableReadyBg: "#E5F2FF",
  tableReadyText: "#007AFD",
  tableCancelledBg: "#FFEBEB",
  tableCancelledText: "#FF3831",
  tableDraftBg: "#F6F6F6",
  tableDraftText: "#7D7D7D",
}

// Dark mode colors matching EnhancedSidebar (black background with zinc accents)
const darkColors: ThemeColors = {
  background: "#09090b",      // zinc-950 - almost black background
  card: "#18181b",            // zinc-900 - slightly lighter for cards
  action: "#3b82f6",          // blue-500 - matching sidebar active state
  cancel: "#FA8787",          // Cancelled
  success: "#C9F5C5",         // Done
  inProgress: "#FFE5A8",      // In Progress
  todo: "#DBD2FC",            // To Do
  textPrimary: "#f4f4f5",     // zinc-100 - light text for primary content
  textSecondary: "#a1a1aa",   // zinc-400 - lighter gray for secondary text
  border: "#27272a",          // zinc-800 - dark border
  pillWarningBg: "#ffbf71ff",
  pillWarningText: "#FFFFFF",
  pillSuccessBg: "#E8F5E9",
  pillSuccessText: "#2E7D32",
  pillInfoBg: "#E3F2FD",
  pillInfoText: "#1565C0",
  mutedBg: "#27272a",         // zinc-800 - for muted backgrounds
  tableWaitingBg: "rgba(255, 203, 3, 0.15)",
  tableWaitingText: "#FFCB03",
  tableDoneBg: "rgba(50, 199, 90, 0.15)",
  tableDoneText: "#32C75A",
  tableReadyBg: "rgba(0, 122, 253, 0.15)",
  tableReadyText: "#007AFD",
  tableCancelledBg: "rgba(255, 56, 49, 0.15)",
  tableCancelledText: "#FF3831",
  tableDraftBg: "rgba(125, 125, 125, 0.15)",
  tableDraftText: "#9CA3AF",
}

const ThemeContext = createContext<Theme>({
  mode: "light",
  colors: lightColors,
  setMode: () => {},
})

export const ThemeProvider: React.FC<{ initialMode?: ThemeMode; children: React.ReactNode }> = ({
  initialMode,
  children,
}) => {
  // Load theme from localStorage on mount, default to 'light'
  const [mode, setMode] = useState<ThemeMode>(() => {
    if (initialMode) return initialMode
    const saved = localStorage.getItem('theme_mode')
    return (saved === 'dark' || saved === 'light') ? saved : 'light'
  })

  const colors = useMemo(() => (mode === "light" ? lightColors : darkColors), [mode])

  // Save theme to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('theme_mode', mode)
  }, [mode])

  const setModeWithPersistence = (newMode: ThemeMode) => {
    setMode(newMode)
    localStorage.setItem('theme_mode', newMode)
  }

  const value = useMemo(() => ({ mode, colors, setMode: setModeWithPersistence }), [mode, colors])

  useEffect(() => {
    const root = document.documentElement
    if (mode === "dark") {
      root.classList.add("dark")
    } else {
      root.classList.remove("dark")
    }
  }, [mode])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export const useTheme = () => useContext(ThemeContext)
