"use client"

import { useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { useTheme } from "../../context/theme"
import { X } from "lucide-react"

interface TransferSidebarProps {
    isOpen: boolean
    onClose: () => void
    backRoute: string
    children: React.ReactNode
    width?: string
}

export function TransferSidebar({
    isOpen,
    onClose,
    backRoute,
    children,
    width = "42%"
}: TransferSidebarProps) {
    const { colors, mode } = useTheme()
    const navigate = useNavigate()
    const isDark = mode === 'dark'

    // Handle escape key
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Escape' && isOpen) {
            onClose()
        }
    }, [isOpen, onClose])

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [handleKeyDown])

    // Prevent body scroll when open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
        return () => {
            document.body.style.overflow = ''
        }
    }, [isOpen])

    const handleBackdropClick = () => {
        onClose()
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={handleBackdropClick}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            background: isDark ? 'rgba(0, 0, 0, 0.6)' : 'rgba(0, 0, 0, 0.3)',
                            backdropFilter: 'blur(2px)',
                            zIndex: 1000,
                        }}
                    />

                    {/* Sidebar */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                        style={{
                            position: 'fixed',
                            top: 0,
                            right: 0,
                            bottom: 0,
                            width: width,
                            minWidth: '400px',
                            maxWidth: '700px',
                            background: colors.background,
                            boxShadow: isDark
                                ? '-8px 0 40px rgba(0, 0, 0, 0.5)'
                                : '-8px 0 40px rgba(0, 0, 0, 0.15)',
                            zIndex: 1001,
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                        }}
                    >
                        {/* Sidebar Header with Close Button */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            padding: '8px 12px',
                            background: colors.card,
                            borderBottom: `1px solid ${colors.border}`,
                            flexShrink: 0,
                        }}>
                            <button
                                onClick={onClose}
                                style={{
                                    width: '32px',
                                    height: '32px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: colors.background,
                                    border: `1px solid ${colors.border}`,
                                    borderRadius: '8px',
                                    color: colors.textSecondary,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = colors.card
                                    e.currentTarget.style.color = colors.textPrimary
                                    e.currentTarget.style.borderColor = colors.textSecondary
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = colors.background
                                    e.currentTarget.style.color = colors.textSecondary
                                    e.currentTarget.style.borderColor = colors.border
                                }}
                                title="Close (Esc)"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Content */}
                        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                            {children}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}

export default TransferSidebar
