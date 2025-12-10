"use client"
import { useState, useEffect, useRef } from "react"
import { useTranslation } from "react-i18next"
import { useTheme } from "../../context/theme"
import { LucideIcon, Search, ChevronLeft, ChevronRight, MoreVertical } from "lucide-react"
import { ActionDropdown } from "./ActionDropdown"
interface ActionItem {
    key: string
    label: string
    icon?: LucideIcon
    onClick: () => void
    danger?: boolean
    disabled?: boolean
}
interface RowIcon {
    icon: LucideIcon
    gradient: string
}
interface UserDataListProps<T> {
    data: T[]
    renderItem: (item: T) => React.ReactNode
    actions?: (item: T) => ActionItem[]
    getRowIcon?: (item: T) => RowIcon | null
    isLoading?: boolean
    searchPlaceholder?: string
    onSearch?: (query: string) => void
    emptyMessage?: string
    itemsPerPage?: number
}
export function UserDataList<T extends { id: string | number }>({
    data,
    renderItem,
    actions,
    getRowIcon,
    isLoading = false,
    searchPlaceholder = "Search...",
    onSearch,
    emptyMessage = "No items found",
    itemsPerPage = 10,
}: UserDataListProps<T>) {
    const { colors } = useTheme()
    const { t } = useTranslation()
    const [searchQuery, setSearchQuery] = useState("")
    const [currentPage, setCurrentPage] = useState(1)
    const [isVisible, setIsVisible] = useState(false)
    const listRef = useRef<HTMLDivElement>(null)
    useEffect(() => {
        setIsVisible(true)
    }, [])
    const handleSearch = (query: string) => {
        setSearchQuery(query)
        setCurrentPage(1)
        if (onSearch) {
            onSearch(query)
        }
    }
    // Pagination
    const totalPages = Math.ceil(data.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    const paginatedData = data.slice(startIndex, endIndex)
    const goToPage = (page: number) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page)
            listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
        }
    }
    // Skeleton loader
    const renderSkeleton = () => (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {Array.from({ length: 5 }).map((_, idx) => (
                <div
                    key={idx}
                    style={{
                        background: colors.card,
                        borderRadius: "12px",
                        padding: "1.5rem",
                        border: `1px solid ${colors.border}`,
                        animation: "userlist-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                    }}
                >
                    <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                        <div
                            style={{
                                width: "56px",
                                height: "56px",
                                borderRadius: "12px",
                                background: colors.mutedBg,
                            }}
                        />
                        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                            <div
                                style={{
                                    width: "40%",
                                    height: "16px",
                                    background: colors.mutedBg,
                                    borderRadius: "4px",
                                }}
                            />
                            <div
                                style={{
                                    width: "60%",
                                    height: "12px",
                                    background: colors.mutedBg,
                                    borderRadius: "4px",
                                }}
                            />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
    // Add CSS animation
    useEffect(() => {
        if (document.getElementById("userlist-skeleton-pulse")) return
        const style = document.createElement("style")
        style.id = "userlist-skeleton-pulse"
        style.textContent = `
      @keyframes userlist-pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
      @keyframes userlist-fadein {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes userlist-slidein {
        from { opacity: 0; transform: translateX(-20px); }
        to { opacity: 1; transform: translateX(0); }
      }
    `
        document.head.appendChild(style)
    }, [])
    if (isLoading) {
        return renderSkeleton()
    }
    if (data.length === 0) {
        return (
            <div
                style={{
                    textAlign: "center",
                    padding: "3rem 1rem",
                    color: colors.textSecondary,
                    fontSize: "0.875rem",
                }}
            >
                {emptyMessage}
            </div>
        )
    }
    return (
        <div ref={listRef} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {/* Data List */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {paginatedData.map((item, idx) => {
                    const rowIcon = getRowIcon ? getRowIcon(item) : null
                    const IconComponent = rowIcon?.icon
                    const actionItems = actions ? actions(item) : []
                    return (
                        <div
                            key={String(item.id)}
                            style={{
                                background: colors.card,
                                borderRadius: "12px",
                                padding: "1.5rem",
                                border: `1px solid ${colors.border}`,
                                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                                position: "relative",
                                animation: `userlist-fadein 0.5s ease-out ${idx * 0.05}s both`,
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = "translateY(-2px)"
                                e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.12)"
                                if (rowIcon?.gradient) {
                                    e.currentTarget.style.borderColor = rowIcon.gradient.match(/#[0-9A-Fa-f]{6}/)?.[0] || colors.border
                                }
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = "none"
                                e.currentTarget.style.boxShadow = "none"
                                e.currentTarget.style.borderColor = colors.border
                            }}
                        >
                            <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                                {/* Icon */}
                                {rowIcon && IconComponent && (
                                    <div
                                        style={{
                                            width: "56px",
                                            height: "56px",
                                            borderRadius: "12px",
                                            background: rowIcon.gradient,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            color: "#FFFFFF",
                                            flexShrink: 0,
                                        }}
                                    >
                                        <IconComponent size={28} />
                                    </div>
                                )}
                                {/* Content */}
                                <div style={{ flex: 1, minWidth: 0 }}>{renderItem(item)}</div>
                                {/* Actions */}
                                {actionItems.length > 0 && (
                                    <div style={{ flexShrink: 0 }}>
                                        <ActionDropdown
                                            actions={actionItems}
                                            icon={MoreVertical}
                                            iconOnly={true}
                                            align="right"
                                            placement="bottom"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>
            {/* Pagination */}
            {totalPages > 1 && (
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginTop: "1rem",
                        padding: "1rem",
                        background: colors.card,
                        borderRadius: "12px",
                        border: `1px solid ${colors.border}`,
                    }}
                >
                    <div style={{ fontSize: "0.875rem", color: colors.textSecondary }}>
                        {t("Showing")} {startIndex + 1}-{Math.min(endIndex, data.length)} {t("of")} {data.length}
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                        <button
                            onClick={() => goToPage(currentPage - 1)}
                            disabled={currentPage === 1}
                            style={{
                                padding: "0.5rem",
                                background: currentPage === 1 ? colors.mutedBg : colors.card,
                                border: `1px solid ${colors.border}`,
                                borderRadius: "8px",
                                color: currentPage === 1 ? colors.textSecondary : colors.textPrimary,
                                cursor: currentPage === 1 ? "not-allowed" : "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                transition: "all 0.2s ease",
                            }}
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <div style={{ fontSize: "0.875rem", color: colors.textPrimary, fontWeight: 600 }}>
                            {currentPage} / {totalPages}
                        </div>
                        <button
                            onClick={() => goToPage(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            style={{
                                padding: "0.5rem",
                                background: currentPage === totalPages ? colors.mutedBg : colors.card,
                                border: `1px solid ${colors.border}`,
                                borderRadius: "8px",
                                color: currentPage === totalPages ? colors.textSecondary : colors.textPrimary,
                                cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                transition: "all 0.2s ease",
                            }}
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
