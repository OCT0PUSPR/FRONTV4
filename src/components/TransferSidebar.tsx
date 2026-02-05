"use client"

import { useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { useTheme } from "../../context/theme"
import { useTranslation } from "react-i18next"

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
    const { i18n } = useTranslation()
    const navigate = useNavigate()
    const isDark = mode === 'dark'
    const isRTL = i18n.dir() === 'rtl'

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
                        initial={{ x: isRTL ? '-100%' : '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: isRTL ? '-100%' : '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                        style={{
                            position: 'fixed',
                            top: 0,
                            [isRTL ? 'left' : 'right']: 0,
                            bottom: 0,
                            width: width,
                            minWidth: '400px',
                            maxWidth: '700px',
                            background: colors.background,
                            boxShadow: isDark
                                ? `${isRTL ? '8px' : '-8px'} 0 40px rgba(0, 0, 0, 0.5)`
                                : `${isRTL ? '8px' : '-8px'} 0 40px rgba(0, 0, 0, 0.15)`,
                            zIndex: 1001,
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                        }}
                    >
                        {/* Content - header with close button should be provided by children */}
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
