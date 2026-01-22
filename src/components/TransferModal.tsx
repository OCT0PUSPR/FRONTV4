"use client"

import { useEffect, useCallback } from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import { useTheme } from "../../context/theme"
import { X } from "lucide-react"

interface TransferModalProps {
    isOpen: boolean
    onClose: () => void
    children: React.ReactNode
    title?: string
}

export function TransferModal({
    isOpen,
    onClose,
    children,
    title
}: TransferModalProps) {
    const { colors, mode } = useTheme()
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

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose()
        }
    }

    const modalContent = (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    onClick={handleBackdropClick}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: isDark ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.4)',
                        backdropFilter: 'blur(4px)',
                        zIndex: 1000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '24px',
                    }}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: colors.background,
                            borderRadius: '16px',
                            boxShadow: isDark
                                ? '0 25px 80px rgba(0, 0, 0, 0.6), 0 10px 30px rgba(0, 0, 0, 0.4)'
                                : '0 25px 80px rgba(0, 0, 0, 0.15), 0 10px 30px rgba(0, 0, 0, 0.1)',
                            width: '100%',
                            maxWidth: '800px',
                            maxHeight: 'calc(100vh - 48px)',
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                            border: `1px solid ${colors.border}`,
                        }}
                    >
                        {/* Modal Header */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '12px 16px',
                            background: colors.card,
                            borderBottom: `1px solid ${colors.border}`,
                            flexShrink: 0,
                        }}>
                            {title && (
                                <h2 style={{
                                    margin: 0,
                                    fontSize: '1rem',
                                    fontWeight: 600,
                                    color: colors.textPrimary,
                                }}>
                                    {title}
                                </h2>
                            )}
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
                                    marginLeft: 'auto',
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

                        {/* Modal Content */}
                        <div style={{
                            flex: 1,
                            overflow: 'auto',
                            display: 'flex',
                            flexDirection: 'column',
                        }}>
                            {children}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )

    if (typeof window === 'undefined') {
        return null
    }

    return createPortal(modalContent, document.body)
}

export default TransferModal
