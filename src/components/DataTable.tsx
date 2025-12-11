"use client"

import * as React from "react"
import { Checkbox } from "../../@/components/ui/checkbox"
import { useTheme } from "../../context/theme"
import { useTranslation } from "react-i18next"
import { ActionDropdown } from "./ActionDropdown"
import { ColumnsSelector } from "./ColumnsSelector"
import { LucideIcon, ArrowUpDown, Ellipsis, Download, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react"

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

interface DataTableProps<T> {
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
  // Pagination props
  showPagination?: boolean
  defaultItemsPerPage?: number
  paginationOptions?: number[]
  onExport?: () => void
  rowSelection?: Record<string, boolean>
  onRowSelectionChange?: (selection: Record<string, boolean>) => void
  onSelectAllChange?: (isSelectAll: boolean | "indeterminate") => void
}

export function DataTable<T extends { id: string | number }>({
  data,
  columns,
  actions,
  actionsLabel,
  isRTL = false,
  visibleColumns,
  onVisibleColumnsChange,
  getRowIcon,
  isLoading = false,
  skeletonRows = 9,
  skeletonColumns = 6,
  showPagination = false,
  defaultItemsPerPage = 10,
  paginationOptions = [10, 25, 50, 100],
  onExport,
  rowSelection: controlledRowSelection,
  onRowSelectionChange,
  onSelectAllChange,
}: DataTableProps<T>) {
  const { colors } = useTheme()
  const { t, i18n } = useTranslation()
  const [internalRowSelection, setInternalRowSelection] = React.useState<Record<string, boolean>>({})
  const [isMobile, setIsMobile] = React.useState(false)

  const rowSelection = controlledRowSelection || internalRowSelection

  // Detect mobile screen size
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640)
    }
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
    if (onSelectAllChange) {
      onSelectAllChange(value)
    }
  }
  const [sortColumn, setSortColumn] = React.useState<string | null>(null)
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc" | null>(null)
  const [isPaginationDropdownOpen, setIsPaginationDropdownOpen] = React.useState(false)
  const paginationDropdownRef = React.useRef<HTMLDivElement>(null)
  // Internal pagination state
  const [currentPage, setCurrentPage] = React.useState(1)
  const [itemsPerPage, setItemsPerPage] = React.useState(defaultItemsPerPage)

  // Close pagination dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (paginationDropdownRef.current && !paginationDropdownRef.current.contains(event.target as Node)) {
        setIsPaginationDropdownOpen(false)
      }
    }

    if (isPaginationDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isPaginationDropdownOpen])

  // Get all available column IDs (excluding select and actions)
  const availableColumnIds = React.useMemo(() => {
    return columns.map((col) => col.id || String(col.accessorKey || "")).filter(Boolean)
  }, [columns])

  // Default visible columns if not provided
  const defaultVisibleColumns = React.useMemo(() => {
    return availableColumnIds
  }, [availableColumnIds])

  const currentVisibleColumns = visibleColumns || defaultVisibleColumns

  // Add selection column at the beginning
  const selectionColumn: ColumnDef<T> = {
    id: "select",
    header: () => (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Checkbox
          checked={selectAll}
          onCheckedChange={(checked) => {
            const newSelection: Record<string, boolean> = {}
            if (checked) {
              // Only select rows on current page
              paginatedData.forEach((row) => {
                newSelection[String(row.id)] = true
              })
            }
            setRowSelection(newSelection)
            setSelectAll(checked)
          }}
          aria-label={t("Select all")}
        />
      </div>
    ),
    cell: ({ row }) => (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  }

  // Add icon column after select column
  const iconColumn: ColumnDef<T> | null = getRowIcon ? {
    id: "icon",
    header: () => <span></span>,
    cell: ({ row }) => {
      const rowIcon = getRowIcon(row.original)
      const IconComponent = rowIcon?.icon
      if (!rowIcon || !IconComponent) {
        return <div style={{ width: "48px", height: "48px" }} />
      }
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: "48px", height: "48px" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "0.75rem",
              background: rowIcon.gradient,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#FFFFFF",
            }}
          >
            <IconComponent size={20} />
          </div>
        </div>
      )
    },
    enableSorting: false,
    enableHiding: false,
  } : null

  // Add actions column at the end if actions are provided
  const actionsColumn: ColumnDef<T> | null = actions
    ? {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const actionItems = actions(row.original)
        return (
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ display: 'flex', justifyContent: isRTL ? 'flex-start' : 'flex-end', position: 'relative' }}
          >
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

  // Update selectAll state when rowSelection changes
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

  // Handle column sorting
  const handleSort = (columnId: string | number | symbol) => {
    const columnIdStr = String(columnId)
    if (sortColumn === columnIdStr) {
      // Toggle direction: asc -> desc -> null
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

  // Sort data based on current sort state
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

      // Handle null/undefined values
      if (aValue == null && bValue == null) return 0
      if (aValue == null) return 1
      if (bValue == null) return -1

      // Compare values
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

  // Calculate total pages
  const totalPages = React.useMemo(() => {
    if (!showPagination) return 1
    return Math.ceil(sortedData.length / itemsPerPage)
  }, [sortedData.length, itemsPerPage, showPagination])

  // Reset to page 1 when data changes or items per page changes
  React.useEffect(() => {
    setCurrentPage(1)
  }, [data.length, itemsPerPage])

  // Paginate data if pagination is enabled
  const paginatedData = React.useMemo(() => {
    if (!showPagination) {
      return sortedData
    }
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return sortedData.slice(startIndex, endIndex)
  }, [sortedData, showPagination, currentPage, itemsPerPage])

  // Get column display names for the dropdown
  const columnOptions = React.useMemo(() => {
    return columns.map((col) => {
      const colId = col.id || String(col.accessorKey || "")
      let headerText = colId
      if (typeof col.header === "string") {
        headerText = col.header
      } else if (typeof col.header === "function") {
        // Try to extract text from function header by calling it
        try {
          const result = col.header({})
          if (typeof result === "string") {
            headerText = result
          } else if (React.isValidElement(result)) {
            // If it's a React element, try to extract text from it
            const text = (result as any)?.props?.children
            if (typeof text === "string") {
              headerText = text
            }
          }
        } catch (e) {
          // Fallback to column ID - translate it if possible
          headerText = t(colId) !== colId ? t(colId) : colId
        }
      }
      // Ensure header text is translated (in case it wasn't already)
      const translatedLabel = t(headerText) !== headerText ? t(headerText) : headerText
      return { id: colId, label: translatedLabel }
    }).filter((opt) => opt.id) // Filter out empty IDs
  }, [columns, t, i18n.language]) // Add t and i18n.language to dependencies so it updates when language changes

  // Skeleton component that matches the exact table structure
  const renderSkeleton = () => {
    // Calculate the number of data columns to show
    // Use actual visible columns count if available and less than skeletonColumns, otherwise use skeletonColumns
    const dataColsToShow = visibleDataColumns.length > 0
      ? Math.min(visibleDataColumns.length, skeletonColumns)
      : skeletonColumns

    // Build skeleton columns array (same structure as allColumns)
    const skeletonCols = [
      { id: "select", width: "48px" },
      ...(getRowIcon ? [{ id: "icon", width: "48px" }] : []),
      ...Array.from({ length: dataColsToShow }).map((_, idx) => ({ id: `col-${idx}`, width: undefined })),
      ...(actions ? [{ id: "actions", width: "120px" }] : [])
    ]

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {/* Table Header - Same structure as real table */}
        <div style={{ marginBottom: "-0.5rem", position: "relative" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
            <colgroup>
              {skeletonCols.map((col, idx) => {
                if (col.id === 'actions') return null
                return <col key={col.id || idx} style={{ width: col.width || undefined }} />
              })}
              {onVisibleColumnsChange && <col style={{ width: '120px' }} />}
            </colgroup>
            <thead>
              <tr>
                {skeletonCols.map((col, idx) => {
                  if (col.id === 'actions') return null
                  const isSelectColumn = col.id === "select"
                  const isIconColumn = col.id === "icon"
                  return (
                    <th
                      key={col.id || idx}
                      style={{
                        padding: isSelectColumn ? (isRTL ? "0 0.75rem 0 0.25rem" : "0 0.25rem 0 0.75rem") : isIconColumn ? "0" : "0.75rem",
                        textAlign: isSelectColumn || isIconColumn ? "center" : (isRTL ? "right" : "left"),
                        color: colors.textSecondary,
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        opacity: 0.8,
                        wordWrap: "break-word",
                        overflowWrap: "break-word",
                        whiteSpace: "normal"
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: "0.5rem",
                          justifyContent: isSelectColumn || isIconColumn ? "center" : (isRTL ? "flex-start" : "flex-start"),
                          width: "100%",
                          minWidth: 0,
                          wordWrap: "break-word",
                          overflowWrap: "break-word",
                          whiteSpace: "normal"
                        }}
                      >
                        {isSelectColumn ? (
                          <div style={{ width: "16px", height: "16px", background: colors.mutedBg, borderRadius: "4px", animation: "datatable-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" }} />
                        ) : isIconColumn ? (
                          <span></span>
                        ) : (
                          <div style={{ width: "80px", height: "12px", background: colors.mutedBg, borderRadius: "4px", animation: "datatable-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" }} />
                        )}
                      </div>
                    </th>
                  )
                })}
                {onVisibleColumnsChange && (
                  <th
                    style={{
                      padding: "0 0.75rem",
                      textAlign: isRTL ? "right" : "left",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: isRTL ? "flex-start" : "flex-end", width: "100%" }}>
                      <ColumnsSelector
                        columns={columnOptions}
                        selectedColumns={currentVisibleColumns}
                        onSelectionChange={onVisibleColumnsChange}
                        label={t("Columns")}
                        align={isRTL ? "left" : "right"}
                        placement="bottom"
                      />
                    </div>
                  </th>
                )}
              </tr>
            </thead>
          </table>
        </div>

        {/* Skeleton Rows - Same card structure as real rows */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {Array.from({ length: skeletonRows }).map((_, rowIdx) => (
            <div
              key={rowIdx}
              style={{
                borderRadius: "0.5rem",
                padding: "2px",
                background: "transparent",
                border: "none",
                cursor: "default",
                position: "relative",
                overflow: "visible",
                zIndex: 1
              }}
            >
              <div
                style={{
                  borderRadius: "calc(0.5rem - 2px)",
                  background: colors.card,
                  width: "100%",
                  height: "100%",
                }}
              >
                <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                  <colgroup>
                    {skeletonCols.map((col, idx) => {
                      if (col.id === 'actions') return null
                      return <col key={col.id || idx} style={{ width: col.width || undefined }} />
                    })}
                    {actions && <col style={{ width: '120px' }} />}
                  </colgroup>
                  <tbody>
                    <tr>
                      {skeletonCols.map((col, colIdx) => {
                        if (col.id === 'actions') return null
                        const isSelectColumn = col.id === "select"
                        const isIconColumn = col.id === "icon"

                        return (
                          <td
                            key={col.id || colIdx}
                            style={{
                              padding: isSelectColumn ? (isRTL ? "0 0.75rem 0 0.25rem" : "0 0.25rem 0 0.75rem") : isIconColumn ? "0" : "0.75rem",
                              textAlign: isSelectColumn || isIconColumn ? "center" : (isRTL ? "right" : "left"),
                              border: "none",
                              verticalAlign: "middle",
                              minHeight: "3rem",
                              width: col.id === 'select' || col.id === 'icon' ? '48px' : undefined,
                              wordWrap: "break-word",
                              overflowWrap: "break-word",
                              whiteSpace: "normal"
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: isSelectColumn || isIconColumn ? "center" : "flex-start",
                                width: "100%",
                                minWidth: 0,
                                wordWrap: "break-word",
                                overflowWrap: "break-word",
                                whiteSpace: "normal"
                              }}
                            >
                              {isSelectColumn ? (
                                <div style={{ width: "16px", height: "16px", background: colors.mutedBg, borderRadius: "4px", animation: "datatable-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" }} />
                              ) : isIconColumn ? (
                                <div style={{ width: "40px", height: "40px", background: colors.mutedBg, borderRadius: "0.75rem", animation: "datatable-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" }} />
                              ) : (
                                <div style={{ width: `${60 + (colIdx % 3) * 40}px`, height: "20px", background: colors.mutedBg, borderRadius: "4px", animation: "datatable-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" }} />
                              )}
                            </div>
                          </td>
                        )
                      })}
                      {actions && (
                        <td
                          key="actions"
                          style={{
                            padding: "0.75rem",
                            textAlign: isRTL ? "right" : "left",
                            border: "none",
                            verticalAlign: "middle",
                            minHeight: "3rem",
                            width: "120px",
                            wordWrap: "break-word",
                            overflowWrap: "break-word",
                            whiteSpace: "normal"
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: isRTL ? "flex-start" : "flex-end", width: "100%" }}>
                            <div style={{ width: "32px", height: "32px", background: colors.mutedBg, borderRadius: "4px", marginLeft: isRTL ? "0" : "auto", marginRight: isRTL ? "auto" : "0", animation: "datatable-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" }} />
                          </div>
                        </td>
                      )}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Add CSS animation for pulse effect (only once)
  React.useEffect(() => {
    // Check if animation style already exists
    if (document.getElementById('datatable-skeleton-pulse')) return

    const style = document.createElement('style')
    style.id = 'datatable-skeleton-pulse'
    style.textContent = `
      @keyframes datatable-pulse {
        0%, 100% {
          opacity: 1;
        }
        50% {
          opacity: 0.5;
        }
      }
    `
    document.head.appendChild(style)
  }, [])

  // Show skeleton when loading
  if (isLoading) {
    return renderSkeleton()
  }

  // Hide datatable when there are no records after loading
  if (!isLoading && sortedData.length === 0) {
    return null
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Controls Bar - Above Table */}
      {onVisibleColumnsChange && (
        <div style={{ display: "flex", justifyContent: isRTL ? "flex-start" : "flex-end", gap: "0.5rem", marginBottom: "0.5rem" }}>
          <ColumnsSelector
            columns={columnOptions}
            selectedColumns={currentVisibleColumns}
            onSelectionChange={onVisibleColumnsChange}
            label={t("Columns")}
            align={isRTL ? "left" : "right"}
            placement="bottom"
          />
          {onExport && Object.keys(rowSelection).length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onExport()
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.375rem 0.75rem",
                background: colors.card,
                color: colors.textPrimary,
                border: `1px solid ${colors.border}`,
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: 500,
                cursor: "pointer",
                transition: "all 0.2s ease",
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = colors.mutedBg
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = colors.card
              }}
            >
              <Download size={14} />
              {t("Export")}
            </button>
          )}
        </div>
      )}

      {/* Table Header - Clean floating labels */}
      <div style={{ marginBottom: "-0.5rem", position: "relative", overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
          <colgroup>
            {allColumns.map((column, idx) => {
              // Skip actions column in header - it's only in rows
              if (column.id === 'actions') return null
              if (column.id === 'select') return <col key={column.id || idx} style={{ width: '48px' }} />
              if (column.id === 'icon') return <col key={column.id || idx} style={{ width: '48px' }} />
              return <col key={column.id || idx} style={{ width: column.width || undefined }} />
            })}
            {onVisibleColumnsChange && <col style={{ width: '120px' }} />}
          </colgroup>
          <thead>
            <tr>
              {allColumns.map((column, idx) => {
                // Skip actions column in header - it's only in rows
                if (column.id === 'actions') return null
                const columnId = column.id || column.accessorKey || String(idx)
                const columnIdStr = String(columnId)
                const isSortable = column.enableSorting !== false && column.id !== "select" && column.id !== "actions"
                const isSorted = sortColumn === columnIdStr
                const isAsc = isSorted && sortDirection === "asc"
                const isDesc = isSorted && sortDirection === "desc"

                const isSelectColumn = column.id === "select"
                const isIconColumn = column.id === "icon"
                return (
                  <th
                    key={column.id || idx}
                    style={{
                      padding: isSelectColumn ? (isRTL ? "0 0.75rem 0 0.25rem" : "0 0.25rem 0 0.75rem") : isIconColumn ? "0" : "0.75rem",
                      textAlign: isSelectColumn || isIconColumn ? "center" : (isRTL ? "right" : "left"),
                      color: colors.textSecondary,
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      opacity: 0.8,
                      cursor: isSortable ? "pointer" : "default",
                      userSelect: "none",
                      wordWrap: "break-word",
                      overflowWrap: "break-word",
                      whiteSpace: "normal"
                    }}
                    onClick={() => isSortable && handleSort(columnId)}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "0.5rem",
                        justifyContent: isSelectColumn || isIconColumn ? "center" : (isRTL ? "flex-start" : "flex-start"),
                        width: "100%",
                        minWidth: 0,
                        wordWrap: "break-word",
                        overflowWrap: "break-word",
                        whiteSpace: "normal"
                      }}
                    >
                      <span>
                        {typeof column.header === "function" 
                          ? (() => {
                              const headerResult = column.header({})
                              // If header function returns a string, ensure it's translated
                              if (typeof headerResult === "string") {
                                return t(headerResult) !== headerResult ? t(headerResult) : headerResult
                              }
                              // If it returns a React element, return it as-is (it should already be translated)
                              return headerResult
                            })()
                          : (t(column.header) !== column.header ? t(column.header) : column.header)
                        }
                      </span>
                      {isSortable && (
                        <ArrowUpDown
                          style={{
                            width: "14px",
                            height: "14px",
                            opacity: isSorted ? 1 : 0.4,
                            color: isSorted ? colors.action || colors.textPrimary : colors.textSecondary,
                            transform: isDesc ? "rotate(180deg)" : "none",
                            transition: "all 0.2s ease",
                          }}
                        />
                      )}
                    </div>
                  </th>
                )
              })}
            </tr>
          </thead>
        </table>
      </div>

      {/* Table Rows as Cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {paginatedData.length > 0 ? (
          paginatedData.map((row, rowIdx) => {
            const isSelected = rowSelection[String(row.id)]
            // Get row icon to extract gradient color for hover border
            const rowIcon = getRowIcon ? getRowIcon(row) : null
            // Extract first color from gradient string (e.g., "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)" -> "#43e97b")
            const extractColorFromGradient = (gradient: string | null | undefined): string => {
              if (!gradient) return colors.action || colors.border
              const match = gradient.match(/#[0-9A-Fa-f]{6}|rgba?\([^)]+\)/)
              return match ? match[0] : (colors.action || colors.border)
            }
            const hoverBorderColor = rowIcon?.gradient ? extractColorFromGradient(rowIcon.gradient) : (colors.action || colors.border)

            return (
              <div
                key={String(row.id)}
                data-row-id={String(row.id)}
                style={{
                  borderRadius: "0.5rem",
                  padding: "2px",
                  background: "transparent",
                  border: `1px solid ${colors.border}`,
                  cursor: "default",
                  transition: "all 0.2s ease",
                  position: "relative",
                  overflow: "visible",
                  zIndex: 1
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.border = `1px solid ${hoverBorderColor}`
                  e.currentTarget.style.transform = "translateY(-0.25px)"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.border = `1px solid ${colors.border}`
                  e.currentTarget.style.transform = "none"
                  // Reset z-index when mouse leaves (only if dropdown is not open)
                  setTimeout(() => {
                    if (e.currentTarget) {
                      const dropdown = e.currentTarget.querySelector('[style*="z-index: 99999"]')
                      if (!dropdown) {
                        e.currentTarget.style.zIndex = "1"
                      }
                    }
                  }, 150)
                }}
              >
                <div
                  style={{
                    borderRadius: "calc(0.5rem - 2px)",
                    background: colors.card,
                    width: "100%",
                    height: "100%",
                  }}
                >
                  <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                    <colgroup>
                      {allColumns.map((column, idx) => {
                        // Skip actions column here, we'll add it at the end
                        if (column.id === 'actions') return null
                        if (column.id === 'select') return <col key={column.id || idx} style={{ width: '48px' }} />
                        if (column.id === 'icon') return <col key={column.id || idx} style={{ width: '48px' }} />
                        return <col key={column.id || idx} style={{ width: column.width || undefined }} />
                      })}
                      {actionsColumn && <col style={{ width: '120px' }} />}
                    </colgroup>
                    <tbody>
                      <tr>
                        {allColumns.map((column, colIdx) => {
                          // Skip actions column here, we'll add it after columns dropdown
                          if (column.id === 'actions') return null
                          const isSelectColumn = column.id === "select"
                          const isIconColumn = column.id === "icon"

                          return (
                            <td
                              key={column.id || colIdx}
                              style={{
                                padding: isSelectColumn ? (isRTL ? "0 0.75rem 0 0.25rem" : "0 0.25rem 0 0.75rem") : isIconColumn ? "0" : "0.75rem",
                                color: colors.textPrimary,
                                fontSize: "0.875rem",
                                fontWeight: 500,
                                textAlign: isSelectColumn || isIconColumn ? "center" : (isRTL ? "right" : "left"),
                                border: "none",
                                verticalAlign: "middle",
                                minHeight: "3rem",
                                width: column.id === 'select' || column.id === 'icon' ? '48px' : undefined,
                                wordWrap: "break-word",
                                overflowWrap: "break-word",
                                whiteSpace: "normal"
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: isSelectColumn || isIconColumn ? "center" : "flex-start",
                                  width: "100%",
                                  minWidth: 0,
                                  wordWrap: "break-word",
                                  overflowWrap: "break-word",
                                  whiteSpace: "normal"
                                }}
                              >
                                <div style={{
                                  width: "100%",
                                  minWidth: 0,
                                  wordWrap: "break-word",
                                  overflowWrap: "break-word",
                                  whiteSpace: "normal"
                                }}>
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
                                </div>
                              </div>
                            </td>
                          )
                        })}
                        {actionsColumn && (
                          <td
                            key="actions"
                            style={{
                              padding: "0.75rem",
                              color: colors.textPrimary,
                              fontSize: "0.875rem",
                              fontWeight: 500,
                              textAlign: isRTL ? "right" : "left",
                              border: "none",
                              verticalAlign: "middle",
                              minHeight: "3rem",
                              width: "120px",
                              wordWrap: "break-word",
                              overflowWrap: "break-word",
                              whiteSpace: "normal"
                            }}
                            onMouseEnter={(e) => {
                              // Increase z-index of the row when hovering over actions cell
                              const rowElement = e.currentTarget.closest('[data-row-id]') as HTMLElement
                              if (rowElement) {
                                rowElement.style.zIndex = "1000"
                              }
                            }}
                            onMouseLeave={(e) => {
                              // Reset z-index when mouse leaves actions cell (but only if dropdown is not open)
                              setTimeout(() => {
                                const rowElement = e.currentTarget.closest('[data-row-id]') as HTMLElement
                                if (rowElement) {
                                  // Check if dropdown is still open
                                  const dropdown = rowElement.querySelector('[style*="z-index: 99999"]')
                                  if (!dropdown) {
                                    rowElement.style.zIndex = "1"
                                  }
                                }
                              }, 150)
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: isRTL ? "flex-start" : "flex-end", width: "100%" }}>
                              {actionsColumn.cell({
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
                            </div>
                          </td>
                        )}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })
        ) : (
          <div
            style={{
              padding: "4rem 2rem",
              textAlign: "center",
              color: colors.textSecondary,
              fontSize: "0.875rem",
              background: colors.card,
              border: `1px dashed ${colors.border}`,
              borderRadius: "1rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              gap: "0.5rem"
            }}
          >
            <span style={{ fontSize: "1.5rem", opacity: 0.5 }}>∅</span>
            {t("No results found")}
          </div>
        )}
      </div>

      {/* Pagination Section */}
      {showPagination && (
        <div
          style={{
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "1rem",
            padding: "1rem 1.5rem",
            marginTop: "1.5rem",
            background: `linear-gradient(135deg, ${colors.card} 0%, ${colors.mutedBg} 100%)`,
            border: `1px solid ${colors.border}`,
            borderRadius: "0.75rem",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
          }}
        >
          {/* Rows per page selector */}
          <div ref={paginationDropdownRef} style={{ position: "relative", display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span
              style={{
                fontSize: "0.8125rem",
                fontWeight: 500,
                color: colors.textSecondary,
                whiteSpace: "nowrap",
              }}
            >
              {t("Rows per page:")}
            </span>
            <button
              onClick={() => setIsPaginationDropdownOpen(!isPaginationDropdownOpen)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.5rem 0.875rem",
                minWidth: "70px",
                background: colors.card,
                border: `1px solid ${colors.border}`,
                borderRadius: "0.5rem",
                color: colors.textPrimary,
                fontSize: "0.875rem",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s ease",
                boxShadow: isPaginationDropdownOpen ? `0 0 0 2px ${colors.action}20` : "0 1px 2px rgba(0, 0, 0, 0.05)",
              }}
              onMouseEnter={(e) => {
                if (!isPaginationDropdownOpen) {
                  e.currentTarget.style.borderColor = colors.action
                  e.currentTarget.style.boxShadow = `0 2px 4px rgba(0, 0, 0, 0.08)`
                }
              }}
              onMouseLeave={(e) => {
                if (!isPaginationDropdownOpen) {
                  e.currentTarget.style.borderColor = colors.border
                  e.currentTarget.style.boxShadow = "0 1px 2px rgba(0, 0, 0, 0.05)"
                }
              }}
            >
              <span>{itemsPerPage}</span>
              <ChevronDown
                size={16}
                style={{
                  color: colors.textSecondary,
                  transform: isPaginationDropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.2s ease",
                }}
              />
            </button>

            {isPaginationDropdownOpen && (
              <div
                style={{
                  position: "absolute",
                  bottom: "100%",
                  left: 0,
                  marginBottom: "0.5rem",
                  background: colors.card,
                  border: `1px solid ${colors.border}`,
                  borderRadius: "0.5rem",
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                  zIndex: 50,
                  minWidth: "90px",
                  overflow: "hidden",
                }}
              >
                {paginationOptions.map((rows, idx) => (
                  <div
                    key={rows}
                    onClick={() => {
                      setItemsPerPage(rows)
                      setCurrentPage(1)
                      setIsPaginationDropdownOpen(false)
                    }}
                    style={{
                      padding: "0.625rem 0.875rem",
                      fontSize: "0.875rem",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      borderBottom: idx < paginationOptions.length - 1 ? `1px solid ${colors.border}` : "none",
                      background: itemsPerPage === rows ? colors.action : colors.card,
                      color: itemsPerPage === rows ? "#FFFFFF" : colors.textPrimary,
                      fontWeight: itemsPerPage === rows ? 600 : 500,
                    }}
                    onMouseEnter={(e) => {
                      if (itemsPerPage !== rows) {
                        e.currentTarget.style.background = colors.mutedBg
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (itemsPerPage !== rows) {
                        e.currentTarget.style.background = colors.card
                      }
                    }}
                  >
                    {rows}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Page navigation */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <button
              onClick={() => currentPage > 1 && setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0.5rem 0.75rem",
                minWidth: "40px",
                height: "40px",
                background: currentPage === 1 ? colors.mutedBg : colors.card,
                border: `1px solid ${currentPage === 1 ? colors.border : colors.border}`,
                borderRadius: "0.5rem",
                color: currentPage === 1 ? colors.textSecondary : colors.textPrimary,
                fontSize: "0.875rem",
                fontWeight: 500,
                cursor: currentPage === 1 ? "not-allowed" : "pointer",
                transition: "all 0.2s ease",
                opacity: currentPage === 1 ? 0.5 : 1,
                boxShadow: currentPage === 1 ? "none" : "0 1px 2px rgba(0, 0, 0, 0.05)",
              }}
              onMouseEnter={(e) => {
                if (currentPage > 1) {
                  e.currentTarget.style.background = colors.mutedBg
                  e.currentTarget.style.borderColor = colors.action
                  e.currentTarget.style.boxShadow = `0 2px 4px rgba(0, 0, 0, 0.08)`
                  e.currentTarget.style.transform = "translateY(-1px)"
                }
              }}
              onMouseLeave={(e) => {
                if (currentPage > 1) {
                  e.currentTarget.style.background = colors.card
                  e.currentTarget.style.borderColor = colors.border
                  e.currentTarget.style.boxShadow = "0 1px 2px rgba(0, 0, 0, 0.05)"
                  e.currentTarget.style.transform = "translateY(0)"
                }
              }}
            >
              <ChevronLeft size={18} />
            </button>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.5rem 1rem",
                background: colors.mutedBg,
                borderRadius: "0.5rem",
                fontSize: "0.8125rem",
                fontWeight: 600,
                color: colors.textPrimary,
                minWidth: "100px",
                justifyContent: "center",
              }}
            >
              <span style={{ color: colors.textSecondary, fontWeight: 500 }}>{t("Page")}</span>
              <span style={{ color: colors.action, fontWeight: 700 }}>{currentPage}</span>
              <span style={{ color: colors.textSecondary, fontWeight: 500 }}>{t("of")}</span>
              <span style={{ color: colors.textPrimary, fontWeight: 600 }}>{totalPages}</span>
            </div>

            <button
              onClick={() => currentPage < totalPages && setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0.5rem 0.75rem",
                minWidth: "40px",
                height: "40px",
                background: currentPage === totalPages ? colors.mutedBg : colors.card,
                border: `1px solid ${currentPage === totalPages ? colors.border : colors.border}`,
                borderRadius: "0.5rem",
                color: currentPage === totalPages ? colors.textSecondary : colors.textPrimary,
                fontSize: "0.875rem",
                fontWeight: 500,
                cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                transition: "all 0.2s ease",
                opacity: currentPage === totalPages ? 0.5 : 1,
                boxShadow: currentPage === totalPages ? "none" : "0 1px 2px rgba(0, 0, 0, 0.05)",
              }}
              onMouseEnter={(e) => {
                if (currentPage < totalPages) {
                  e.currentTarget.style.background = colors.mutedBg
                  e.currentTarget.style.borderColor = colors.action
                  e.currentTarget.style.boxShadow = `0 2px 4px rgba(0, 0, 0, 0.08)`
                  e.currentTarget.style.transform = "translateY(-1px)"
                }
              }}
              onMouseLeave={(e) => {
                if (currentPage < totalPages) {
                  e.currentTarget.style.background = colors.card
                  e.currentTarget.style.borderColor = colors.border
                  e.currentTarget.style.boxShadow = "0 1px 2px rgba(0, 0, 0, 0.05)"
                  e.currentTarget.style.transform = "translateY(0)"
                }
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