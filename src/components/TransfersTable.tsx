"use client"

import * as React from "react"
import { Checkbox } from "../../@/components/ui/checkbox"
import { useTheme } from "../../context/theme"
import { useTranslation } from "react-i18next"
import { ActionDropdown } from "./ActionDropdown"
import { ColumnsSelector } from "./ColumnsSelector"
import { LucideIcon, ArrowUpDown, Ellipsis, Download, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react"

// Helper to extract the primary color from gradient string
function extractPrimaryColor(gradient: string): string {
  const matches = gradient.match(/#[a-fA-F0-9]{6}/g)
  if (matches && matches.length >= 1) {
    return matches[0]
  }
  return "#6366f1"
}

export interface ColumnDef<T> {
  id?: string
  accessorKey?: keyof T | string
  header: string | ((props: any) => React.ReactNode)
  cell: (props: { row: { original: T; getIsSelected: () => boolean; toggleSelected: (value: boolean) => void } }) => React.ReactNode
  enableSorting?: boolean
  enableHiding?: boolean
  width?: string
}

export interface ActionItem {
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

interface TransfersTableProps<T> {
  data: T[]
  columns: ColumnDef<T>[]
  actions?: (row: T) => ActionItem[]
  actionsLabel?: string
  isRTL?: boolean
  visibleColumns?: string[]
  onVisibleColumnsChange?: (columns: string[]) => void
  getRowIcon?: (row: T) => RowIcon | null
  isLoading?: boolean
  skeletonRows?: number
  skeletonColumns?: number
  showPagination?: boolean
  defaultItemsPerPage?: number
  paginationOptions?: number[]
  onExport?: () => void
  rowSelection?: Record<string, boolean>
  onRowSelectionChange?: (selection: Record<string, boolean>) => void
  onSelectAllChange?: (isSelectAll: boolean | "indeterminate") => void
}

export function TransfersTable<T extends { id: string | number }>({
  data,
  columns,
  actions,
  actionsLabel,
  isRTL = false,
  visibleColumns,
  onVisibleColumnsChange,
  getRowIcon,
  isLoading = false,
  skeletonRows = 10,
  skeletonColumns = 6,
  showPagination = false,
  defaultItemsPerPage = 10,
  paginationOptions = [10, 25, 50, 100],
  onExport,
  rowSelection: controlledRowSelection,
  onRowSelectionChange,
  onSelectAllChange,
}: TransfersTableProps<T>) {
  const { colors, mode } = useTheme()
  const { t, i18n } = useTranslation()
  const isDark = mode === "dark"
  const [internalRowSelection, setInternalRowSelection] = React.useState<Record<string, boolean>>({})
  const [isMobile, setIsMobile] = React.useState(false)

  const rowSelection = controlledRowSelection || internalRowSelection

  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const setRowSelection = (selection: Record<string, boolean>) => {
    if (onRowSelectionChange) {
      onRowSelectionChange(selection)
    } else {
      setInternalRowSelection(selection)
    }
  }

  const [internalSelectAll, setInternalSelectAll] = React.useState<boolean | "indeterminate">(false)
  const selectAll = internalSelectAll
  const setSelectAll = (value: boolean | "indeterminate") => {
    setInternalSelectAll(value)
    if (onSelectAllChange) onSelectAllChange(value)
  }

  const [sortColumn, setSortColumn] = React.useState<string | null>(null)
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc" | null>(null)
  const [isPaginationDropdownOpen, setIsPaginationDropdownOpen] = React.useState(false)
  const paginationDropdownRef = React.useRef<HTMLDivElement>(null)
  const [currentPage, setCurrentPage] = React.useState(1)
  const [itemsPerPage, setItemsPerPage] = React.useState(defaultItemsPerPage)

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (paginationDropdownRef.current && !paginationDropdownRef.current.contains(event.target as Node)) {
        setIsPaginationDropdownOpen(false)
      }
    }
    if (isPaginationDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isPaginationDropdownOpen])

  const availableColumnIds = React.useMemo(() => {
    return columns.map((col) => col.id || String(col.accessorKey || "")).filter(Boolean)
  }, [columns])

  const defaultVisibleColumns = React.useMemo(() => availableColumnIds, [availableColumnIds])
  const currentVisibleColumns = visibleColumns || defaultVisibleColumns

  // Selection column
  const selectionColumn: ColumnDef<T> = {
    id: "select",
    header: () => (
      <Checkbox
        checked={selectAll}
        onCheckedChange={(checked) => {
          const newSelection: Record<string, boolean> = {}
          if (checked) {
            paginatedData.forEach((row) => {
              newSelection[String(row.id)] = true
            })
          }
          setRowSelection(newSelection)
          setSelectAll(checked)
        }}
        aria-label={t("Select all")}
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={rowSelection[String(row.original.id)] || false}
        onCheckedChange={(checked) => {
          const newSelection = { ...rowSelection }
          if (checked) {
            newSelection[String(row.original.id)] = true
          } else {
            delete newSelection[String(row.original.id)]
          }
          setRowSelection(newSelection)
          const selectedCount = Object.keys(newSelection).length
          const currentPageCount = paginatedData.length
          if (selectedCount === 0) {
            setSelectAll(false)
          } else if (selectedCount === currentPageCount && paginatedData.every(r => newSelection[String(r.id)])) {
            setSelectAll(true)
          } else {
            setSelectAll("indeterminate")
          }
        }}
        aria-label={t("Select row")}
      />
    ),
    enableSorting: false,
    enableHiding: false,
  }

  // Icon column
  const iconColumn: ColumnDef<T> | null = getRowIcon ? {
    id: "icon",
    header: () => <span></span>,
    cell: ({ row }) => {
      const rowIcon = getRowIcon(row.original)
      const IconComponent = rowIcon?.icon
      if (!rowIcon || !IconComponent) {
        return <div style={{ width: "36px", height: "36px" }} />
      }
      const iconColor = extractPrimaryColor(rowIcon.gradient)
      return (
        <div
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "10px",
            background: `${iconColor}15`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <IconComponent size={18} strokeWidth={2.5} style={{ color: iconColor }} />
        </div>
      )
    },
    enableSorting: false,
    enableHiding: false,
  } : null

  // Actions column
  const actionsColumn: ColumnDef<T> | null = actions
    ? {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const actionItems = actions(row.original)
          return (
            <div onClick={(e) => e.stopPropagation()}>
              <ActionDropdown
                actions={actionItems}
                icon={Ellipsis}
                iconOnly={true}
                align={isRTL ? "left" : "right"}
                placement="bottom"
              />
            </div>
          )
        },
        enableHiding: false,
      }
    : null

  // Filter columns based on visibility
  const visibleDataColumns = React.useMemo(() => {
    if (!visibleColumns) return columns
    return columns.filter((col) => {
      const colId = col.id || String(col.accessorKey || "")
      return currentVisibleColumns.includes(colId)
    })
  }, [columns, currentVisibleColumns, visibleColumns])

  const allColumns = [
    selectionColumn,
    ...(iconColumn ? [iconColumn] : []),
    ...visibleDataColumns,
    ...(actionsColumn ? [actionsColumn] : [])
  ]

  React.useEffect(() => {
    const selectedCount = Object.keys(rowSelection).length
    if (selectedCount === 0) {
      setSelectAll(false)
    } else if (selectedCount === data.length) {
      setSelectAll(true)
    } else {
      setSelectAll("indeterminate")
    }
  }, [rowSelection, data.length])

  const handleSort = (columnId: string | number | symbol) => {
    const columnIdStr = String(columnId)
    if (sortColumn === columnIdStr) {
      if (sortDirection === "asc") {
        setSortDirection("desc")
      } else if (sortDirection === "desc") {
        setSortColumn(null)
        setSortDirection(null)
      }
    } else {
      setSortColumn(columnIdStr)
      setSortDirection("asc")
    }
  }

  const sortedData = React.useMemo(() => {
    if (!sortColumn || !sortDirection) return data

    const column = allColumns.find((col) => {
      const colId = col.id ? String(col.id) : null
      const colAccessor = col.accessorKey ? String(col.accessorKey) : null
      return colId === sortColumn || colAccessor === sortColumn
    })
    if (!column || column.enableSorting === false) return data

    const accessorKey = column.accessorKey ? String(column.accessorKey) : (column.id ? String(column.id) : null)
    if (!accessorKey) return data

    return [...data].sort((a, b) => {
      const aValue = (a as any)[accessorKey]
      const bValue = (b as any)[accessorKey]
      if (aValue == null && bValue == null) return 0
      if (aValue == null) return 1
      if (bValue == null) return -1
      let comparison = 0
      if (typeof aValue === "string" && typeof bValue === "string") {
        comparison = aValue.localeCompare(bValue)
      } else if (typeof aValue === "number" && typeof bValue === "number") {
        comparison = aValue - bValue
      } else {
        comparison = String(aValue).localeCompare(String(bValue))
      }
      return sortDirection === "asc" ? comparison : -comparison
    })
  }, [data, sortColumn, sortDirection, allColumns])

  const totalPages = React.useMemo(() => {
    if (!showPagination) return 1
    return Math.ceil(sortedData.length / itemsPerPage)
  }, [sortedData.length, itemsPerPage, showPagination])

  React.useEffect(() => {
    setCurrentPage(1)
  }, [data.length, itemsPerPage])

  const paginatedData = React.useMemo(() => {
    if (!showPagination) return sortedData
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return sortedData.slice(startIndex, endIndex)
  }, [sortedData, showPagination, currentPage, itemsPerPage])

  const columnOptions = React.useMemo(() => {
    return columns.map((col) => {
      const colId = col.id || String(col.accessorKey || "")
      let headerText = colId
      if (typeof col.header === "string") {
        headerText = col.header
      } else if (typeof col.header === "function") {
        try {
          const result = col.header({})
          if (typeof result === "string") {
            headerText = result
          } else if (React.isValidElement(result)) {
            const text = (result as any)?.props?.children
            if (typeof text === "string") headerText = text
          }
        } catch (e) {
          headerText = t(colId) !== colId ? t(colId) : colId
        }
      }
      const translatedLabel = t(headerText) !== headerText ? t(headerText) : headerText
      return { id: colId, label: translatedLabel }
    }).filter((opt) => opt.id)
  }, [columns, t, i18n.language])

  // Inject CSS for skeleton animation
  React.useEffect(() => {
    if (document.getElementById('transfers-table-pulse')) return
    const style = document.createElement('style')
    style.id = 'transfers-table-pulse'
    style.textContent = `
      @keyframes transfers-pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.4; }
      }
    `
    document.head.appendChild(style)
  }, [])

  // Skeleton loader
  const renderSkeleton = () => {
    const dataColsToShow = Math.min(visibleDataColumns.length || skeletonColumns, skeletonColumns)
    return (
      <div style={{
        background: colors.card,
        borderRadius: "16px",
        border: `1px solid ${colors.border}`,
        overflow: "hidden",
      }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
              <th style={{ width: "48px", padding: "16px 12px" }}>
                <div style={{ width: "18px", height: "18px", background: colors.mutedBg, borderRadius: "4px", animation: "transfers-pulse 1.5s ease-in-out infinite" }} />
              </th>
              {getRowIcon && (
                <th style={{ width: "52px", padding: "16px 8px" }}></th>
              )}
              {Array.from({ length: dataColsToShow }).map((_, idx) => (
                <th key={idx} style={{ padding: "16px 12px", textAlign: isRTL ? "right" : "left" }}>
                  <div style={{ width: "70px", height: "12px", background: colors.mutedBg, borderRadius: "4px", animation: "transfers-pulse 1.5s ease-in-out infinite" }} />
                </th>
              ))}
              {actions && <th style={{ width: "60px" }}></th>}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: skeletonRows }).map((_, rowIdx) => (
              <tr key={rowIdx} style={{ borderBottom: rowIdx < skeletonRows - 1 ? `1px solid ${colors.border}` : "none" }}>
                <td style={{ padding: "16px 12px" }}>
                  <div style={{ width: "18px", height: "18px", background: colors.mutedBg, borderRadius: "4px", animation: "transfers-pulse 1.5s ease-in-out infinite" }} />
                </td>
                {getRowIcon && (
                  <td style={{ padding: "16px 8px" }}>
                    <div style={{ width: "36px", height: "36px", background: colors.mutedBg, borderRadius: "10px", animation: "transfers-pulse 1.5s ease-in-out infinite" }} />
                  </td>
                )}
                {Array.from({ length: dataColsToShow }).map((_, colIdx) => (
                  <td key={colIdx} style={{ padding: "16px 12px" }}>
                    <div style={{ width: `${60 + (colIdx % 3) * 30}px`, height: "16px", background: colors.mutedBg, borderRadius: "4px", animation: "transfers-pulse 1.5s ease-in-out infinite" }} />
                  </td>
                ))}
                {actions && (
                  <td style={{ padding: "16px 12px" }}>
                    <div style={{ width: "28px", height: "28px", background: colors.mutedBg, borderRadius: "6px", marginLeft: "auto", animation: "transfers-pulse 1.5s ease-in-out infinite" }} />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  if (isLoading) return renderSkeleton()
  if (!isLoading && sortedData.length === 0) return null

  const selectedCount = Object.keys(rowSelection).length

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Toolbar */}
      {(onVisibleColumnsChange || onExport) && (
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
        }}>
          <div style={{ fontSize: "13px", color: colors.textSecondary }}>
            {selectedCount > 0 && (
              <span style={{ fontWeight: 500 }}>
                {selectedCount} {t("selected")}
              </span>
            )}
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            {onVisibleColumnsChange && (
              <ColumnsSelector
                columns={columnOptions}
                selectedColumns={currentVisibleColumns}
                onSelectionChange={onVisibleColumnsChange}
                label={t("Columns")}
                align={isRTL ? "left" : "right"}
                placement="bottom"
              />
            )}
            {onExport && (
              <button
                onClick={() => selectedCount > 0 && onExport()}
                disabled={selectedCount === 0}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 14px",
                  background: selectedCount > 0 ? colors.action : colors.mutedBg,
                  color: selectedCount > 0 ? "#fff" : colors.textSecondary,
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: selectedCount > 0 ? "pointer" : "not-allowed",
                  transition: "all 0.2s ease",
                  opacity: selectedCount > 0 ? 1 : 0.6,
                }}
              >
                <Download size={15} />
                {t("Export")}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Table Container */}
      <div style={{
        background: colors.card,
        borderRadius: "16px",
        border: `1px solid ${colors.border}`,
        overflow: "hidden",
        boxShadow: isDark ? "0 4px 24px rgba(0,0,0,0.3)" : "0 4px 24px rgba(0,0,0,0.06)",
      }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "700px" }}>
            <thead>
              <tr style={{
                background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
                borderBottom: `1px solid ${colors.border}`,
              }}>
                {allColumns.map((column, idx) => {
                  const columnId = column.id || column.accessorKey || String(idx)
                  const columnIdStr = String(columnId)
                  const isSortable = column.enableSorting !== false && column.id !== "select" && column.id !== "actions" && column.id !== "icon"
                  const isSorted = sortColumn === columnIdStr
                  const isDesc = isSorted && sortDirection === "desc"
                  const isSelectColumn = column.id === "select"
                  const isIconColumn = column.id === "icon"
                  const isActionsColumn = column.id === "actions"

                  return (
                    <th
                      key={column.id || idx}
                      style={{
                        padding: isSelectColumn ? "14px 12px" : isIconColumn ? "14px 8px" : isActionsColumn ? "14px 16px" : "14px 12px",
                        textAlign: isSelectColumn ? "center" : isIconColumn ? "center" : isActionsColumn ? "center" : (isRTL ? "right" : "left"),
                        width: isSelectColumn ? "48px" : isIconColumn ? "52px" : isActionsColumn ? "60px" : undefined,
                        color: colors.textSecondary,
                        fontSize: "11px",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        cursor: isSortable ? "pointer" : "default",
                        userSelect: "none",
                        whiteSpace: "nowrap",
                        transition: "color 0.15s ease",
                      }}
                      onClick={() => isSortable && handleSort(columnId)}
                      onMouseEnter={(e) => {
                        if (isSortable) (e.currentTarget as HTMLElement).style.color = colors.textPrimary
                      }}
                      onMouseLeave={(e) => {
                        if (isSortable) (e.currentTarget as HTMLElement).style.color = colors.textSecondary
                      }}
                    >
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        justifyContent: isSelectColumn || isIconColumn || isActionsColumn ? "center" : (isRTL ? "flex-end" : "flex-start"),
                      }}>
                        {typeof column.header === "function"
                          ? column.header({})
                          : (t(column.header) !== column.header ? t(column.header) : column.header)
                        }
                        {isSortable && (
                          <ArrowUpDown
                            size={12}
                            style={{
                              opacity: isSorted ? 1 : 0.3,
                              color: isSorted ? colors.action : colors.textSecondary,
                              transform: isDesc ? "rotate(180deg)" : "none",
                              transition: "all 0.15s ease",
                            }}
                          />
                        )}
                      </div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((row, rowIdx) => {
                const isSelected = rowSelection[String(row.id)]
                const rowIcon = getRowIcon ? getRowIcon(row) : null
                const hoverColor = rowIcon ? extractPrimaryColor(rowIcon.gradient) : colors.action

                return (
                  <tr
                    key={String(row.id)}
                    style={{
                      borderBottom: rowIdx < paginatedData.length - 1 ? `1px solid ${colors.border}` : "none",
                      background: isSelected ? `${hoverColor}08` : "transparent",
                      transition: "background 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) (e.currentTarget as HTMLElement).style.background = isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)"
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = isSelected ? `${hoverColor}08` : "transparent"
                    }}
                  >
                    {allColumns.map((column, colIdx) => {
                      const isSelectColumn = column.id === "select"
                      const isIconColumn = column.id === "icon"
                      const isActionsColumn = column.id === "actions"

                      return (
                        <td
                          key={column.id || colIdx}
                          style={{
                            padding: isSelectColumn ? "14px 12px" : isIconColumn ? "14px 8px" : isActionsColumn ? "14px 16px" : "14px 12px",
                            textAlign: isSelectColumn ? "center" : isIconColumn ? "center" : isActionsColumn ? "center" : (isRTL ? "right" : "left"),
                            verticalAlign: "middle",
                            fontSize: "14px",
                            color: colors.textPrimary,
                          }}
                        >
                          {column.cell({
                            row: {
                              original: row,
                              getIsSelected: () => rowSelection[String(row.id)] || false,
                              toggleSelected: (value: boolean) => {
                                const newSelection = { ...rowSelection }
                                if (value) {
                                  newSelection[String(row.id)] = true
                                } else {
                                  delete newSelection[String(row.id)]
                                }
                                setRowSelection(newSelection)
                              },
                            },
                          })}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {showPagination && totalPages > 0 && (
        <div style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "16px",
          padding: "12px 0",
        }}>
          {/* Rows per page */}
          <div ref={paginationDropdownRef} style={{ position: "relative", display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "13px", color: colors.textSecondary }}>
              {t("Rows per page:")}
            </span>
            <button
              onClick={() => setIsPaginationDropdownOpen(!isPaginationDropdownOpen)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 12px",
                background: colors.card,
                border: `1px solid ${colors.border}`,
                borderRadius: "8px",
                color: colors.textPrimary,
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {itemsPerPage}
              <ChevronDown
                size={14}
                style={{
                  transform: isPaginationDropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.15s ease",
                  color: colors.textSecondary,
                }}
              />
            </button>
            {isPaginationDropdownOpen && (
              <div style={{
                position: "absolute",
                bottom: "100%",
                left: 0,
                marginBottom: "6px",
                background: colors.card,
                border: `1px solid ${colors.border}`,
                borderRadius: "10px",
                boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
                zIndex: 100,
                minWidth: "80px",
                overflow: "hidden",
              }}>
                {paginationOptions.map((rows, idx) => (
                  <div
                    key={rows}
                    onClick={() => {
                      setItemsPerPage(rows)
                      setCurrentPage(1)
                      setIsPaginationDropdownOpen(false)
                    }}
                    style={{
                      padding: "10px 14px",
                      fontSize: "13px",
                      cursor: "pointer",
                      transition: "all 0.1s ease",
                      borderBottom: idx < paginationOptions.length - 1 ? `1px solid ${colors.border}` : "none",
                      background: itemsPerPage === rows ? colors.action : "transparent",
                      color: itemsPerPage === rows ? "#fff" : colors.textPrimary,
                      fontWeight: itemsPerPage === rows ? 600 : 500,
                    }}
                    onMouseEnter={(e) => {
                      if (itemsPerPage !== rows) (e.currentTarget as HTMLElement).style.background = colors.mutedBg
                    }}
                    onMouseLeave={(e) => {
                      if (itemsPerPage !== rows) (e.currentTarget as HTMLElement).style.background = "transparent"
                    }}
                  >
                    {rows}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Page navigation */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              onClick={() => currentPage > 1 && setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "36px",
                height: "36px",
                background: colors.card,
                border: `1px solid ${colors.border}`,
                borderRadius: "8px",
                color: currentPage === 1 ? colors.textSecondary : colors.textPrimary,
                cursor: currentPage === 1 ? "not-allowed" : "pointer",
                opacity: currentPage === 1 ? 0.5 : 1,
                transition: "all 0.15s ease",
              }}
            >
              <ChevronLeft size={18} />
            </button>

            <div style={{
              padding: "8px 16px",
              background: colors.mutedBg,
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: 600,
              color: colors.textPrimary,
            }}>
              {currentPage} / {totalPages}
            </div>

            <button
              onClick={() => currentPage < totalPages && setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "36px",
                height: "36px",
                background: colors.card,
                border: `1px solid ${colors.border}`,
                borderRadius: "8px",
                color: currentPage === totalPages ? colors.textSecondary : colors.textPrimary,
                cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                opacity: currentPage === totalPages ? 0.5 : 1,
                transition: "all 0.15s ease",
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
