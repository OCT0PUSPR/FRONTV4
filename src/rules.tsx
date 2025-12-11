"use client"

import { useMemo, useState, useEffect, useRef } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import {
  X,
  Plus,
  Package,
  MapPin,
  Clock,
  Route,
  Truck,
  Settings,
  CheckCircle2,
  XCircle,
  RefreshCcw,
  ArrowRight,
  Edit,
  Trash2,
  Eye,
} from "lucide-react"
import { useTheme } from "../context/theme"
import { useData } from "../context/data"
import { useAuth } from "../context/auth"
import { useCasl } from "../context/casl"
import { API_CONFIG } from "./config/api"
import { StatCard } from "./components/StatCard"
import { RuleCard } from "./components/RuleCard"
import { TransferFiltersBar } from "./components/TransferFiltersBar"
import { Button } from "../@/components/ui/button"
import { Card } from "../@/components/ui/card"
import { Skeleton } from "@mui/material"
import { DataTable, ColumnDef } from "./components/DataTable"
import ExportModal, { ExportOptions } from "./components/ExportModal"
import { useExport } from "./hooks/useExport"
import Alert from "./components/Alert"
import Toast from "./components/Toast"

export default function RulesPage() {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ;
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { colors } = useTheme()
  const [selectedRule, setSelectedRule] = useState<any>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isNewRule, setIsNewRule] = useState(false)

  const { stockRules, stockRoutes, stockPickingTypes, locations, fetchData, loading } = useData() as any
  const { uid } = useAuth()
  const { canCreatePage, canEditPage, canExportPage } = useCasl()
  const [refreshing, setRefreshing] = useState(false)
  const [rulesOverride, setRulesOverride] = useState<any[] | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [actionFilter, setActionFilter] = useState<string[]>([]) // Action filter (pull, push, etc.) - filters by rule.action
  const [fromFilter, setFromFilter] = useState<string[]>([]) // Source location filter
  const [toFilter, setToFilter] = useState<string[]>([]) // Destination location filter
  const [dateRange, setDateRange] = useState<[string | null, string | null] | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(9)
  const [isRowModalOpen, setIsRowModalOpen] = useState(false)
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({})
  const [isSelectAll, setIsSelectAll] = useState<boolean | "indeterminate">(false)
  const [isMobile, setIsMobile] = useState(false)
  const [viewMode, setViewMode] = useState<"cards" | "table">("table")
  const { i18n } = useTranslation()
  const isRTL = i18n.dir() === "rtl"
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false)
  const [ruleToDelete, setRuleToDelete] = useState<number | null>(null)
  const [toast, setToast] = useState<{ text: string; state: "success" | "error" } | null>(null)
  
  // Column visibility state - default: 6 most important columns
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    "id",
    "name",
    "action",
    "sourceLocation",
    "destinationLocation",
    "supplyMethod",
  ])

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Fetch data only once on mount if missing
  const hasFetchedRef = useRef(false)
  useEffect(() => {
    if (hasFetchedRef.current) return
    const sessionId = localStorage.getItem('sessionId') || sessionStorage.getItem('sessionId')
    if (!sessionId) return
    
    hasFetchedRef.current = true
    if (!Array.isArray(stockRules) || !stockRules.length) fetchData("stockRules")
    if (!Array.isArray(stockRoutes) || !stockRoutes.length) fetchData("stockRoutes")
    if (!Array.isArray(stockPickingTypes) || !stockPickingTypes.length) fetchData("stockPickingTypes")
    if (!Array.isArray(locations) || !locations.length) fetchData("locations")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Unified rule edit/create modal state (same style/mappings as routes page)
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false)
  const [isCreateRule, setIsCreateRule] = useState(false)
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null)
  const [ruleForm, setRuleForm] = useState<any>({
    name: "",
    action: "pull",
    picking_type_id: "",
    location_src_id: "",
    location_dest_id: "",
    procure_method: "make_to_stock",
    auto: "manual",
    route_id: "",
    group_propagation_option: "none",
    propagate_carrier: false,
    delay: "",
  })
  const getSessionId = () => localStorage.getItem("sessionId") || sessionStorage.getItem("sessionId")

  // Get Odoo headers for API requests
  const getOdooHeaders = (): Record<string, string> => {
    const rawBase = "https://egy.thetalenter.net"
    const db = "odoodb1"
    const headers: Record<string, string> = {}
    if (rawBase) headers['x-odoo-base'] = rawBase
    if (db) headers['x-odoo-db'] = db
    return headers
  }

  const rules = useMemo(() => {
    // Map Odoo stock.rule -> UI rule shape safely
    const mapAction = (a?: string) => {
      if (!a) return ""
      const m: Record<string, string> = {
        pull: "Pull From",
        push: "Push To",
        buy: "Buy",
        manufacture: "Manufacture",
      }
      return m[a] || a
    }
    const formatMany2One = (v: any): string => {
      if (Array.isArray(v)) return v[1] ?? ""
      if (v && typeof v === "object") return String((v as any).name || (v as any).display_name || "")
      if (v == null) return ""
      return String(v)
    }
    const mapProcure = (pm: any): string => {
      if (Array.isArray(pm)) return pm[1] ?? ""
      const code = String(pm || "")
      const map: Record<string, string> = {
        make_to_stock: "Take From Stock",
        make_to_order: "Trigger Another Rule",
        mts_else_mto: "Take From Stock, if unavailable, Trigger Another Rule",
      }
      return map[code] || code
    }
    const source = rulesOverride ?? stockRules ?? []
    return (source as any[]).map((r: any, idx: number) => ({
      id: r.id ?? idx,
      name: r.name ?? "",
      action: mapAction(r.action),
      operationType: formatMany2One(r.picking_type_id),
      sourceLocation: formatMany2One(r.location_src_id),
      destinationLocation: formatMany2One(r.location_dest_id),
      supplyMethod: mapProcure(r.procure_method),
      route: formatMany2One(r.route_id),
      propagateGroup: r.propagate ?? undefined,
      cancelNextMove: !!r.propagate_cancel,
      propagateCarrier: !!r.propagate_carrier,
      warehouseToPropagate: formatMany2One(r.warehouse_id),
      partnerAddress: formatMany2One(r.partner_address_id),
      leadTime: typeof r.delay === "number" ? r.delay : 0,
      raw: r,
    }))
  }, [stockRules, rulesOverride])

  const filteredRules = useMemo(() => {
    return rules.filter((rule) => {
      const matchesSearch = 
        rule.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rule.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rule.sourceLocation.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rule.destinationLocation.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesAction = actionFilter.length === 0 || actionFilter.includes(rule.action)
      const matchesFrom = fromFilter.length === 0 || fromFilter.includes(rule.sourceLocation)
      const matchesTo = toFilter.length === 0 || toFilter.includes(rule.destinationLocation)
      return matchesSearch && matchesAction && matchesFrom && matchesTo
    })
  }, [rules, searchQuery, actionFilter, fromFilter, toFilter])

  // Pagination - only for cards view
  const totalPages = Math.ceil(filteredRules.length / itemsPerPage) || 1
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedRules = viewMode === "cards" ? filteredRules.slice(startIndex, endIndex) : filteredRules

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, actionFilter, fromFilter, toFilter])

  // Get unique values for filters
  const uniqueActions = Array.from(new Set(rules.map((r) => r.action).filter(Boolean)))
  const uniqueFrom = Array.from(new Set(rules.map((r) => r.sourceLocation).filter(Boolean)))
  const uniqueTo = Array.from(new Set(rules.map((r) => r.destinationLocation).filter(Boolean)))

  const { exportData } = useExport()

  const handleExport = (options: ExportOptions) => {
    // Check export permission before exporting
    if (!canExportPage("rules")) {
      return
    }
    // Determine data to export
    let dataToExport = filteredRules
    if (options.scope === "selected") {
      dataToExport = filteredRules.filter((r) => rowSelection[String(r.id)])
    } else if (options.scope === "page") {
      dataToExport = paginatedRules
    }

    // Define all possible columns
    const allColumns = {
      id: {
        header: t('ID'),
        accessor: (row: any) => `#${row.id}`,
        isMonospace: true,
        isBold: true,
        align: "left" as const
      },
      name: {
        header: t('Rule Name'),
        accessor: (row: any) => row.name || '-',
        isBold: true
      },
      action: {
        header: t('Action'),
        accessor: (row: any) => row.action || '-',
        isStatus: true
      },
      sourceLocation: {
        header: t('Source Location'),
        accessor: (row: any) => row.sourceLocation || '-'
      },
      destinationLocation: {
        header: t('Destination Location'),
        accessor: (row: any) => row.destinationLocation || '-'
      },
      supplyMethod: {
        header: t('Supply Method'),
        accessor: (row: any) => row.supplyMethod || '-'
      },
      pickingType: {
        header: t('Picking Type'),
        accessor: (row: any) => row.pickingType || '-'
      },
      route: {
        header: t('Route'),
        accessor: (row: any) => row.route || '-'
      },
      auto: {
        header: t('Auto'),
        accessor: (row: any) => row.auto || '-'
      },
    }

    // Filter columns based on visible columns
    const exportColumns = visibleColumns
      .map(colId => allColumns[colId as keyof typeof allColumns])
      .filter(Boolean)

    const config = {
      title: t("Rules Export"),
      columns: exportColumns,
      getSummary: (data: any[]) => [
        { label: t('Total Records'), value: data.length },
        { label: t('Pull Rules'), value: data.filter((r: any) => r.action?.toLowerCase().includes('pull')).length },
        { label: t('Push Rules'), value: data.filter((r: any) => r.action?.toLowerCase().includes('push')).length },
        { label: t('Buy Rules'), value: data.filter((r: any) => r.action?.toLowerCase().includes('buy')).length }
      ]
    }

    exportData(options, dataToExport, config, dateRange)
    setIsExportModalOpen(false)
  }

  const handleRuleClick = (rule: any) => {
    // Check edit permission before navigating
    if (!canEditPage("rules")) {
      return
    }
    const ruleId = rule.id || rule.raw?.id
    if (ruleId) {
      navigate(`/rules/edit/${ruleId}`)
    }
  }

  const handleAddRule = () => {
    navigate('/rules/create')
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedRule(null)
    setIsNewRule(false)
  }

  const handleSave = () => {
    // Handle save logic here
    console.log("[v0] Saving rule:", selectedRule)
    handleCloseModal()
  }

  // New: open/create/edit rule modal handlers
  const openCreateRule = () => {
    setIsCreateRule(true)
    setEditingRuleId(null)
    setRuleForm({
      name: "",
      action: "pull",
      picking_type_id: "",
      location_src_id: "",
      location_dest_id: "",
      procure_method: "make_to_stock",
      auto: "manual",
      route_id: "",
      group_propagation_option: "none",
      propagate_carrier: false,
      delay: "",
    })
    setIsRuleModalOpen(true)
  }

  const openEditRule = (raw: any) => {
    const normalizeId = (v: any) => (Array.isArray(v) ? String(v[0]) : v != null ? String(v) : "")
    setIsCreateRule(false)
    setEditingRuleId(String(raw?.id || ""))
    setRuleForm({
      name: String(raw?.name || ""),
      action: String(raw?.action || "pull"),
      picking_type_id: normalizeId(raw?.picking_type_id),
      location_src_id: normalizeId(raw?.location_src_id),
      location_dest_id: normalizeId(raw?.location_dest_id),
      procure_method: String(raw?.procure_method || "make_to_stock"),
      auto: String(raw?.auto || "manual"),
      route_id: normalizeId(raw?.route_id),
      group_propagation_option: String(raw?.group_propagation_option || "none"),
      propagate_carrier: !!raw?.propagate_carrier,
      delay: raw?.delay != null ? String(raw.delay) : "",
    })
    setIsRuleModalOpen(true)
  }

  const handleDeleteClick = (ruleId: number) => {
    setRuleToDelete(ruleId)
    setDeleteAlertOpen(true)
  }

  const deleteRuleAction = async () => {
    if (!ruleToDelete) return
    const sessionId = getSessionId()
    if (!sessionId) {
      setToast({ text: t("No session ID found"), state: "error" })
      setDeleteAlertOpen(false)
      setRuleToDelete(null)
      return
    }
    try {
      const userId = uid ? Number(uid) : undefined
      const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/stock-rules/${ruleToDelete}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", ...getOdooHeaders() },
        body: JSON.stringify({ sessionId, userId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.success) throw new Error(data?.message || t("Delete failed"))
      setToast({ text: t("Rule deleted successfully"), state: "success" })
      setDeleteAlertOpen(false)
      setRuleToDelete(null)
      // Refresh rules
      try {
        const sid = getSessionId()
        if (sid) {
          const res2 = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/stock-rules`, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...getOdooHeaders() },
            body: JSON.stringify({ sessionId: sid }),
          })
          const d2 = await res2.json().catch(() => ({}))
          if (res2.ok && d2?.success) setRulesOverride(d2.stockRules || [])
        }
      } catch {}
      if (isRuleModalOpen && editingRuleId === String(ruleToDelete)) {
        setIsRuleModalOpen(false)
      }
    } catch (error: any) {
      console.error("Delete failed:", error)
      setToast({ text: error?.message || t("Failed to delete rule"), state: "error" })
      setDeleteAlertOpen(false)
      setRuleToDelete(null)
    }
  }

  const handleSaveRule = async () => {
    try {
      const sessionId = getSessionId()
      if (!sessionId) throw new Error("No session ID found")
      const values: any = {
        name: ruleForm.name,
        action: ruleForm.action,
        procure_method: ruleForm.procure_method,
        auto: ruleForm.auto,
        group_propagation_option: ruleForm.group_propagation_option,
        propagate_carrier: !!ruleForm.propagate_carrier,
      }
      if (ruleForm.picking_type_id) values.picking_type_id = Number(ruleForm.picking_type_id)
      if (ruleForm.location_src_id) values.location_src_id = Number(ruleForm.location_src_id)
      if (ruleForm.location_dest_id) values.location_dest_id = Number(ruleForm.location_dest_id)
      if (ruleForm.route_id) values.route_id = Number(ruleForm.route_id)
      if (ruleForm.delay !== "") values.delay = Number(ruleForm.delay)

      const userId = uid ? Number(uid) : undefined
      let res: Response
      if (isCreateRule) {
        res = await fetch(`${API_BASE_URL}/stock-rules/create`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...getOdooHeaders() },
          body: JSON.stringify({ sessionId, values, userId }),
        })
      } else {
        if (!editingRuleId) throw new Error("Missing rule id")
        res = await fetch(`${API_BASE_URL}/stock-rules/${editingRuleId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", ...getOdooHeaders() },
          body: JSON.stringify({ sessionId, values, userId }),
        })
      }
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json().catch(() => ({}))
      if (!data.success && !data.id) throw new Error(data.message || "Operation failed")
      setIsRuleModalOpen(false)
      try {
        const sid = localStorage.getItem("sessionId") || sessionStorage.getItem("sessionId")
        if (sid) {
          const res2 = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/stock-rules`, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...getOdooHeaders() },
            body: JSON.stringify({ sessionId: sid }),
          })
          const d2 = await res2.json().catch(() => ({}))
          if (res2.ok && d2?.success) setRulesOverride(d2.stockRules || [])
        }
      } catch {}
    } catch (e: any) {
      console.error(e?.message || "Failed to save rule")
    }
  }

  const totalRules = rules.length
  const activeRules = rules.filter((r) => r.action === "Pull From" || r.action === "Push To").length
  const totalRoutes = Array.from(new Set(rules.map((r) => r.route).filter(Boolean))).length
  const inactiveRules = totalRules - activeRules

  return (
    <div style={{ minHeight: "100vh", background: colors.background }}>
      <style>
        {`
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .animate-fade-in-up {
            animation: fadeInUp 0.6s ease-out forwards;
          }
        `}
      </style>

      <div
        style={{
          background: colors.background,
          padding: isMobile ? "1rem" : "2rem",
          color: colors.textPrimary,
        }}
      >
        <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
          <div style={{ 
            display: "flex", 
            flexDirection: isMobile ? "column" : "row",
            justifyContent: "space-between", 
            alignItems: isMobile ? "flex-start" : "center", 
            gap: isMobile ? "1rem" : "0",
            marginBottom: "2rem" 
          }}>
            <div>
              <h1 style={{ 
                fontSize: isMobile ? "1.5rem" : "2rem", 
                fontWeight: "700",
                marginBottom: "0.5rem",
                color: colors.textPrimary 
              }}>
                {t("Rules")}
              </h1>
              <p style={{ fontSize: isMobile ? "0.875rem" : "1rem", opacity: 0.9, color: colors.textSecondary }}>
                {t("Manage your warehouse operations and routing rules")}
              </p>
            </div>
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", width: isMobile ? "100%" : "auto" }}>
              <Button
                type="button"
                variant="outline"
                onClick={() => fetchData("stockRules")}
                disabled={!!(loading?.stockRules || refreshing)}
                className="gap-2 font-semibold border"
                style={{
                  background: colors.card,
                  color: colors.textPrimary,
                  borderColor: colors.border,
                  borderRadius: "8px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
                  width: isMobile ? "100%" : "auto",
                }}
              >
                <RefreshCcw className={`w-4 h-4 ${(loading?.stockRules || refreshing) ? "animate-spin" : ""}`} />
                {(loading?.stockRules || refreshing) ? t("Loading...") : t("Refresh")}
              </Button>
              {canCreatePage("rules") && (
                <Button
                  style={{
                    background: colors.action,
                    color: "#FFFFFF",
                    padding: isMobile ? "0.625rem 1rem" : "0.75rem 1.5rem",
                    borderRadius: "8px",
                    border: "none",
                    fontWeight: "600",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
                    width: isMobile ? "100%" : "auto",
                    justifyContent: "center",
                  }}
                  onClick={handleAddRule}
                >
                  <Plus size={isMobile ? 18 : 20} />
                  {t("Add Rule")}
                </Button>
              )}
            </div>
          </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "1.25rem",
            marginBottom: "2.5rem",
          }}
        >
          <StatCard
            label={t("Total Rules")}
            value={totalRules}
            icon={Package}
            gradient="linear-gradient(135deg, #fa709a 0%, #fee140 100%)"
            delay={0}
          />
          <StatCard
            label={t("Active Rules")}
            value={activeRules}
            icon={CheckCircle2}
            gradient="linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
            delay={1}
          />
          <StatCard
            label={t("Total Routes")}
            value={totalRoutes}
            icon={Route}
            gradient="linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
            delay={2}
          />
          <StatCard
            label={t("Inactive Rules")}
            value={inactiveRules}
            icon={XCircle}
            gradient="linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)"
            delay={3}
          />
        </div>

          <TransferFiltersBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder={t("Search rules...")}
            statusFilter={actionFilter}
            onStatusChange={setActionFilter}
            statusOptions={uniqueActions}
            statusPlaceholder={t("Action")}
            toFilter={toFilter}
            onToChange={setToFilter}
            toOptions={uniqueTo}
            toPlaceholder={t("Destination")}
            fromFilter={fromFilter}
            onFromChange={setFromFilter}
            fromOptions={uniqueFrom}
            fromPlaceholder={t("Source")}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            isMobile={isMobile}
            showDateRange={false}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            showViewToggle={true}
          />

          {viewMode === "cards" ? (
            loading?.stockRules ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 380px), 1fr))",
                  gap: "1.25rem",
                }}
              >
                {Array.from({ length: itemsPerPage }).map((_, idx) => (
                  <RuleCardSkeleton key={idx} colors={colors} />
                ))}
              </div>
            ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 380px), 1fr))",
                    gap: "1.25rem",
                  }}
                >
                  {paginatedRules.map((rule, index) => (
                    <RuleCard key={rule.id} rule={rule} onClick={() => handleRuleClick(rule)} index={index} />
                  ))}
                </div>
              )
          ) : (
            <DataTable
                  data={paginatedRules}
                  rowSelection={rowSelection}
                  onRowSelectionChange={setRowSelection}
                  onSelectAllChange={setIsSelectAll}
                  onExport={canExportPage("rules") ? () => setIsExportModalOpen(true) : undefined}
                  columns={[
                    {
                      id: "id",
                      header: t("ID"),
                      cell: ({ row }) => (
                        <span style={{ color: colors.textSecondary, fontSize: "0.875rem", fontFamily: "monospace" }}>
                          #{row.original.id}
                        </span>
                      ),
                    },
                    {
                      id: "name",
                      header: t("Rule Name"),
                      cell: ({ row }) => {
                        const rule = row.original as any
                        return (
                          <span style={{ color: colors.textPrimary, fontSize: "0.9375rem", fontWeight: 600 }}>
                            {rule.name || "—"}
                          </span>
                        )
                      },
                    },
                    {
                      id: "action",
                      header: t("Action"),
                      cell: ({ row }) => {
                        const rule = row.original as any
                        const action = rule.action || ""
                        const getActionColor = (act: string) => {
                          const normalized = act.toLowerCase()
                          if (normalized.includes("pull")) return { bg: "rgba(67, 233, 123, 0.1)", color: "#43e97b" }
                          if (normalized.includes("push")) return { bg: "rgba(240, 147, 251, 0.1)", color: "#f093fb" }
                          if (normalized.includes("buy")) return { bg: "rgba(250, 112, 154, 0.1)", color: "#fa709a" }
                          if (normalized.includes("manufacture")) return { bg: "rgba(102, 126, 234, 0.1)", color: "#667eea" }
                          return { bg: colors.mutedBg, color: colors.textSecondary }
                        }
                        const actionStyle = getActionColor(action)
                        return (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.5rem",
                              padding: "0.25rem 0.75rem",
                              borderRadius: "999px",
                              background: actionStyle.bg,
                              color: actionStyle.color,
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              textTransform: "uppercase",
                              letterSpacing: "0.05em",
                            }}
                          >
                            {action || "—"}
                          </span>
                        )
                      },
                    },
                    {
                      id: "sourceLocation",
                      header: t("Source Location"),
                      cell: ({ row }) => {
                        const rule = row.original as any
                        return (
                          <span style={{ color: colors.textPrimary, fontSize: "0.875rem" }}>
                            {rule.sourceLocation || "—"}
                          </span>
                        )
                      },
                    },
                    {
                      id: "destinationLocation",
                      header: t("Destination Location"),
                      cell: ({ row }) => {
                        const rule = row.original as any
                        return (
                          <span style={{ color: colors.textPrimary, fontSize: "0.875rem" }}>
                            {rule.destinationLocation || "—"}
                          </span>
                        )
                      },
                    },
                    {
                      id: "supplyMethod",
                      header: t("Supply Method"),
                      cell: ({ row }) => {
                        const rule = row.original as any
                        return (
                          <span style={{ color: colors.textPrimary, fontSize: "0.875rem" }}>
                            {rule.supplyMethod || "—"}
                          </span>
                        )
                      },
                    },
                    {
                      id: "operationType",
                      header: t("Operation Type"),
                      cell: ({ row }) => {
                        const rule = row.original as any
                        return (
                          <span style={{ color: colors.textPrimary, fontSize: "0.875rem" }}>
                            {rule.operationType || "—"}
                          </span>
                        )
                      },
                    },
                    {
                      id: "route",
                      header: t("Route"),
                      cell: ({ row }) => {
                        const rule = row.original as any
                        return (
                          <span style={{ color: colors.textPrimary, fontSize: "0.875rem" }}>
                            {rule.route || "—"}
                          </span>
                        )
                      },
                    },
                    {
                      id: "leadTime",
                      header: t("Lead Time"),
                      cell: ({ row }) => {
                        const rule = row.original as any
                        return (
                          <span style={{ color: colors.textPrimary, fontSize: "0.875rem", fontWeight: 500 }}>
                            {rule.leadTime !== undefined && rule.leadTime > 0 ? `${rule.leadTime} ${t("days")}` : "—"}
                          </span>
                        )
                      },
                    },
                  ]}
                  visibleColumns={visibleColumns}
                  onVisibleColumnsChange={setVisibleColumns}
                  actions={(rule) => {
                    const ruleId = (rule as any).id
                    return [
                      {
                        key: "view",
                        label: t("View"),
                        icon: Eye,
                        onClick: () => navigate(`/rules/view/${ruleId}`),
                      },
                      ...(canEditPage("rules") ? [{
                        key: "edit",
                        label: t("Edit"),
                        icon: Edit,
                        onClick: () => navigate(`/rules/edit/${ruleId}`),
                      }] : []),
                      ...(canEditPage("rules") ? [{
                        key: "delete",
                        label: t("Delete"),
                        icon: Trash2,
                      onClick: () => handleDeleteClick(Number(rule.id)),
                      danger: true,
                      }] : []),
                    ]
                  }}
                  isRTL={isRTL}
                  getRowIcon={(rule: any) => {
                    const action = (rule.action || "").toLowerCase()
                    if (action.includes("pull")) {
                      return { icon: ArrowRight, gradient: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)" }
                    } else if (action.includes("push")) {
                      return { icon: ArrowRight, gradient: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)" }
                    } else if (action.includes("buy")) {
                      return { icon: Package, gradient: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)" }
                    } else if (action.includes("manufacture")) {
                      return { icon: Settings, gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }
                    }
                    return { icon: Settings, gradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)" }
                  }}
                  isLoading={loading?.stockRules}
                  showPagination={true}
                  defaultItemsPerPage={10}
                />
              )}

              {filteredRules.length === 0 && !loading?.stockRules && (
                <div
                  style={{
                    background: `linear-gradient(135deg, ${colors.card} 0%, ${colors.mutedBg} 100%)`,
                    border: `1px solid ${colors.border}`,
                    borderRadius: "1rem",
                    padding: "4rem 2rem",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      width: "4rem",
                      height: "4rem",
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto 1.5rem",
                    }}
                  >
                    <Settings size={28} color="#FFFFFF" />
                  </div>
                  <h3
                    style={{
                      fontSize: "1.25rem",
                      fontWeight: "600",
                      color: colors.textPrimary,
                      marginBottom: "0.5rem",
                    }}
                  >
                    {t("No rules found")}
                  </h3>
                  <p style={{ fontSize: "0.9rem", color: colors.textSecondary }}>{t("Try adjusting your search criteria")}</p>
                </div>
              )}

              {filteredRules.length > 0 && viewMode === "cards" && (
                <div className="flex flex-col sm:flex-row justify-between items-center gap-3 px-2 py-3 mt-4">
                  <div className="relative flex items-center gap-2">
                    <span className="text-xs font-medium" style={{ color: colors.textSecondary }}>
                      {t("Rows per page:")}
                    </span>
                    <button
                      onClick={() => setIsRowModalOpen(!isRowModalOpen)}
                      className="flex items-center gap-2 px-2.5 py-1.5 border rounded-md text-sm transition-all min-w-[60px] justify-between font-medium"
                      style={{ borderColor: colors.border, background: colors.card, color: colors.textPrimary }}
                    >
                      {itemsPerPage}
                    </button>

                    {isRowModalOpen && (
                      <div
                        className="absolute bottom-full left-24 mb-2 border rounded-lg shadow-lg z-50 min-w-[70px]"
                        style={{ background: colors.card, borderColor: colors.border }}
                      >
                        {[9, 18, 36].map((rows) => (
                          <div
                            key={rows}
                            onClick={() => {
                              setItemsPerPage(rows)
                              setCurrentPage(1)
                              setIsRowModalOpen(false)
                            }}
                            className={`px-3 py-2 text-sm cursor-pointer transition-colors last:border-b-0 ${
                              itemsPerPage === rows ? "font-semibold" : ""
                            }`}
                            style={{
                              borderColor: colors.border,
                              background: itemsPerPage === rows ? colors.action : colors.card,
                              color: itemsPerPage === rows ? "#FFFFFF" : colors.textPrimary,
                            }}
                          >
                            {rows}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => currentPage > 1 && setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className={`px-3 py-1.5 text-sm font-medium border rounded-md transition-all ${
                        currentPage === 1 ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-100"
                      }`}
                      style={{
                        borderColor: colors.border,
                        background: currentPage === 1 ? colors.mutedBg : colors.card,
                        color: colors.textPrimary,
                      }}
                    >
                      {t("Previous")}
                    </button>
                    <span className="text-sm font-medium px-3" style={{ color: colors.textSecondary }}>
                      {t("Page")} {currentPage} {t("of")} {totalPages}
                    </span>
                    <button
                      onClick={() => currentPage < totalPages && setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className={`px-3 py-1.5 text-sm font-medium border rounded-md transition-all ${
                        currentPage === totalPages ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-100"
                      }`}
                      style={{
                        borderColor: colors.border,
                        background: currentPage === totalPages ? colors.mutedBg : colors.card,
                        color: colors.textPrimary,
                      }}
                    >
                      {t("Next")}
                    </button>
                  </div>
                </div>
              )}
        </div>
      </div>

      {isRuleModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            zIndex: 1100,
          }}
          onClick={() => setIsRuleModalOpen(false)}
        >
          <Card
            style={{
              width: "min(100%, 800px)",
              maxHeight: "95vh",
              display: "flex",
              flexDirection: "column",
              background: colors.card,
              borderRadius: 16,
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
              overflow: "hidden",
              border: `1px solid ${colors.border}`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: "1rem 1.5rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: colors.textPrimary }}>
                  {t(isCreateRule ? "Create Rule" : "Edit Rule")}
                </h2>
                <p style={{ fontSize: 13, color: colors.textSecondary }}>
                  {t("Configure route rule settings")}
                </p>
              </div>
              <button
                onClick={() => setIsRuleModalOpen(false)}
                style={{
                  border: `1px solid ${colors.border}`,
                  background: colors.card,
                  color: colors.textSecondary,
                  borderRadius: 8,
                  padding: "0.5rem",
                  cursor: "pointer",
                  fontSize: 20,
                  lineHeight: 1,
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = colors.cancel
                  e.currentTarget.style.color = "#FFFFFF"
                  e.currentTarget.style.borderColor = colors.cancel
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = colors.card
                  e.currentTarget.style.color = colors.textSecondary
                  e.currentTarget.style.borderColor = colors.border
                }}
              >
                ✕
              </button>
            </div>
            <div
              style={{
                flex: 1,
                overflow: "auto",
                padding: "1.25rem",
                display: "grid",
                gap: "1rem",
              }}
            >
              <style>{`
                input:focus, textarea:focus, select:focus, button[role="combobox"]:focus {
                  outline: none !important;
                  border-color: #667eea !important;
                  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1) !important;
                }
              `}</style>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    color: colors.textPrimary,
                    marginBottom: 6,
                  }}
                >
                  {t("Name")}
                </label>
                <input
                  type="text"
                  value={ruleForm.name}
                  onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    borderRadius: 8,
                    border: `1px solid ${colors.border}`,
                    background: colors.background,
                    color: colors.textPrimary,
                    fontSize: "0.9375rem",
                    transition: "all 0.2s ease",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = colors.action
                    e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.action}15`
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = colors.border
                    e.currentTarget.style.boxShadow = "none"
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    color: colors.textPrimary,
                    marginBottom: 6,
                  }}
                >
                  {t("Action")}
                </label>
                <select
                  value={ruleForm.action}
                  onChange={(e) => setRuleForm({ ...ruleForm, action: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    borderRadius: 8,
                    border: `1px solid ${colors.border}`,
                    background: colors.background,
                    color: colors.textPrimary,
                    fontSize: "0.9375rem",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = colors.action
                    e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.action}15`
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = colors.border
                    e.currentTarget.style.boxShadow = "none"
                  }}
                >
                  <option value="pull">{t("Pull From")}</option>
                  <option value="push">{t("Push To")}</option>
                  <option value="pull_push">{t("Pull & Push")}</option>
                  <option value="manufacture">{t("Manufacture")}</option>
                  <option value="buy">{t("Buy")}</option>
                </select>
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    color: colors.textPrimary,
                    marginBottom: 6,
                  }}
                >
                  {t("Operation type")}
                </label>
                <select
                  value={ruleForm.picking_type_id}
                  onChange={(e) => setRuleForm({ ...ruleForm, picking_type_id: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    borderRadius: 8,
                    border: `1px solid ${colors.border}`,
                    background: colors.background,
                    color: colors.textPrimary,
                    fontSize: "0.9375rem",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = colors.action
                    e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.action}15`
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = colors.border
                    e.currentTarget.style.boxShadow = "none"
                  }}
                >
                  <option value="">{t("Select operation type")}</option>
                  {(Array.isArray(stockPickingTypes) ? stockPickingTypes : []).map((pt: any) => (
                    <option key={pt.id} value={String(pt.id)}>
                      {pt.name || pt.display_name || `#${pt.id}`}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.875rem",
                      fontWeight: 600,
                      color: colors.textPrimary,
                      marginBottom: 6,
                    }}
                  >
                    {t("Source Location")}
                  </label>
                  <select
                    value={ruleForm.location_src_id}
                    onChange={(e) => setRuleForm({ ...ruleForm, location_src_id: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      borderRadius: 8,
                      border: `1px solid ${colors.border}`,
                      background: colors.background,
                      color: colors.textPrimary,
                      fontSize: "0.9375rem",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = colors.action
                      e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.action}15`
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = colors.border
                      e.currentTarget.style.boxShadow = "none"
                    }}
                  >
                    <option value="">{t("Select location")}</option>
                    {(Array.isArray(locations) ? locations : []).map((loc: any) => (
                      <option key={loc.id} value={String(loc.id)}>
                        {loc.complete_name ||
                          (Array.isArray(loc.display_name)
                            ? loc.display_name[1]
                            : loc.display_name || loc.name || `#${loc.id}`)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.875rem",
                      fontWeight: 600,
                      color: colors.textPrimary,
                      marginBottom: 6,
                    }}
                  >
                    {t("Destination Location")}
                  </label>
                  <select
                    value={ruleForm.location_dest_id}
                    onChange={(e) => setRuleForm({ ...ruleForm, location_dest_id: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      borderRadius: 8,
                      border: `1px solid ${colors.border}`,
                      background: colors.background,
                      color: colors.textPrimary,
                      fontSize: "0.9375rem",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = colors.action
                      e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.action}15`
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = colors.border
                      e.currentTarget.style.boxShadow = "none"
                    }}
                  >
                    <option value="">{t("Select location")}</option>
                    {(Array.isArray(locations) ? locations : []).map((loc: any) => (
                      <option key={loc.id} value={String(loc.id)}>
                        {loc.complete_name ||
                          (Array.isArray(loc.display_name)
                            ? loc.display_name[1]
                            : loc.display_name || loc.name || `#${loc.id}`)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    color: colors.textPrimary,
                    marginBottom: 6,
                  }}
                >
                  {t("Supply method")}
                </label>
                <select
                  value={ruleForm.procure_method}
                  onChange={(e) => setRuleForm({ ...ruleForm, procure_method: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    borderRadius: 8,
                    border: `1px solid ${colors.border}`,
                    background: colors.background,
                    color: colors.textPrimary,
                    fontSize: "0.9375rem",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = colors.action
                    e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.action}15`
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = colors.border
                    e.currentTarget.style.boxShadow = "none"
                  }}
                >
                  <option value="make_to_stock">{t("Take From Stock")}</option>
                  <option value="make_to_order">{t("Trigger Another Rule")}</option>
                  <option value="mts_else_mto">{t("Take From Stock, if unavailable, Trigger Another Rule")}</option>
                </select>
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    color: colors.textPrimary,
                    marginBottom: 6,
                  }}
                >
                  {t("Automatic Move")}
                </label>
                <select
                  value={ruleForm.auto}
                  onChange={(e) => setRuleForm({ ...ruleForm, auto: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    borderRadius: 8,
                    border: `1px solid ${colors.border}`,
                    background: colors.background,
                    color: colors.textPrimary,
                    fontSize: "0.9375rem",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = colors.action
                    e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.action}15`
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = colors.border
                    e.currentTarget.style.boxShadow = "none"
                  }}
                >
                  <option value="manual">{t("Manual Operation")}</option>
                  <option value="transparent">{t("Automatic No Step Added")}</option>
                </select>
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    color: colors.textPrimary,
                    marginBottom: 6,
                  }}
                >
                  {t("Route")}
                </label>
                <select
                  value={ruleForm.route_id}
                  onChange={(e) => setRuleForm({ ...ruleForm, route_id: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    borderRadius: 8,
                    border: `1px solid ${colors.border}`,
                    background: colors.background,
                    color: colors.textPrimary,
                    fontSize: "0.9375rem",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = colors.action
                    e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.action}15`
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = colors.border
                    e.currentTarget.style.boxShadow = "none"
                  }}
                >
                  <option value="">{t("Select route")}</option>
                  {(Array.isArray(stockRoutes) ? stockRoutes : []).map((rt: any) => (
                    <option key={rt.id} value={String(rt.id)}>
                      {rt.name || rt.display_name || `#${rt.id}`}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    color: colors.textPrimary,
                    marginBottom: 6,
                  }}
                >
                  {t("Propagation of Procurement Group")}
                </label>
                <select
                  value={ruleForm.group_propagation_option}
                  onChange={(e) => setRuleForm({ ...ruleForm, group_propagation_option: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    borderRadius: 8,
                    border: `1px solid ${colors.border}`,
                    background: colors.background,
                    color: colors.textPrimary,
                    fontSize: "0.9375rem",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = colors.action
                    e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.action}15`
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = colors.border
                    e.currentTarget.style.boxShadow = "none"
                  }}
                >
                  <option value="none">{t("Leave Empty")}</option>
                  <option value="propagate">{t("Propagate")}</option>
                  <option value="fixed">{t("Fixed")}</option>
                </select>
              </div>
              <label
                style={{
                  display: "flex",
                  gap: "0.75rem",
                  alignItems: "center",
                  cursor: "pointer",
                  padding: "0.75rem",
                  borderRadius: 8,
                  border: `1px solid ${colors.border}`,
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = colors.mutedBg
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent"
                }}
              >
                <input
                  type="checkbox"
                  checked={!!ruleForm.propagate_carrier}
                  onChange={(e) => setRuleForm({ ...ruleForm, propagate_carrier: e.target.checked })}
                  style={{ width: 18, height: 18, cursor: "pointer" }}
                />
                <span style={{ fontSize: "0.9375rem", fontWeight: 500, color: colors.textPrimary }}>
                  {t("Propagation of carrier")}
                </span>
              </label>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    color: colors.textPrimary,
                    marginBottom: 6,
                  }}
                >
                  {t("Lead Time")}
                </label>
                <input
                  type="number"
                  value={ruleForm.delay}
                  onChange={(e) => setRuleForm({ ...ruleForm, delay: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    borderRadius: 8,
                    border: `1px solid ${colors.border}`,
                    background: colors.background,
                    color: colors.textPrimary,
                    fontSize: "0.9375rem",
                    transition: "all 0.2s ease",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = colors.action
                    e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.action}15`
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = colors.border
                    e.currentTarget.style.boxShadow = "none"
                  }}
                />
              </div>
            </div>
            <div
              style={{
                padding: "1rem 1.25rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderTop: `1px solid ${colors.border}`,
              }}
            >
              <div style={{ display: "flex", gap: "0.5rem" }}>
                {!isCreateRule && canEditPage("rules") && (
                  <button
                    onClick={() => handleDeleteClick(editingRuleId ? Number(editingRuleId) : 0)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      padding: "0.375rem 0.5rem",
                      border: `1px solid ${colors.border}`,
                      borderRadius: "6px",
                      background: colors.card,
                      color: "#FF0000",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      fontSize: "12px",
                      fontWeight: 600,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#FF0000"
                      e.currentTarget.style.color = "#FFFFFF"
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = colors.card
                      e.currentTarget.style.color = "#FF0000"
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  onClick={() => setIsRuleModalOpen(false)}
                  style={{
                    padding: "0.75rem 1.5rem",
                    borderRadius: 8,
                    border: `1px solid ${colors.border}`,
                    background: colors.card,
                    color: colors.textPrimary,
                    fontSize: "0.9375rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = colors.mutedBg
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = colors.card
                  }}
                >
                  {t("Cancel")}
                </button>
                <button
                  onClick={handleSaveRule}
                  style={{
                    padding: "0.75rem 1.5rem",
                    borderRadius: 8,
                    border: "none",
                    background: colors.action,
                    color: "#FFFFFF",
                    fontSize: "0.9375rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    boxShadow: "0 2px 8px rgba(82, 104, 237, 0.25)",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-1px)"
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(82, 104, 237, 0.35)"
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)"
                    e.currentTarget.style.boxShadow = "0 2px 8px rgba(82, 104, 237, 0.25)"
                  }}
                >
                  {t(isCreateRule ? "Create" : "Save")}
                </button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {isModalOpen && selectedRule && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.5)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "2rem",
            animation: "fadeIn 0.2s ease",
          }}
          onClick={handleCloseModal}
        >
          <div
            style={{
              background: colors.card,
              borderRadius: "1.25rem",
              maxWidth: "900px",
              width: "100%",
              maxHeight: "90vh",
              overflow: "hidden",
              boxShadow: "0 25px 50px rgba(0, 0, 0, 0.25)",
              display: "flex",
              flexDirection: "column",
              animation: "slideUp 0.3s ease",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: "2rem",
                borderBottom: `1px solid ${colors.border}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: colors.mutedBg,
              }}
            >
              <div>
                <h2
                  style={{
                    fontSize: "1.75rem",
                    fontWeight: "700",
                    color: colors.textPrimary,
                    margin: 0,
                    marginBottom: "0.25rem",
                    letterSpacing: "-0.01em",
                  }}
                >
                  {isNewRule ? t("New Rule") : t("Edit Rule")}
                </h2>
                <p style={{ fontSize: "0.875rem", color: colors.textSecondary, margin: 0 }}>
                  {isNewRule ? t("Configure a new warehouse rule") : t("Update rule configuration")}
                </p>
              </div>
              <button
                onClick={handleCloseModal}
                style={{
                  background: colors.border,
                  border: "none",
                  borderRadius: "0.625rem",
                  padding: "0.625rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.2s ease",
                  color: colors.textSecondary,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = colors.cancel
                  e.currentTarget.style.color = "#FFFFFF"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = colors.border
                  e.currentTarget.style.color = colors.textSecondary
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: "2rem", overflowY: "auto", flex: 1 }}>
              {/* Basic Information Section */}
              <div style={{ marginBottom: "2rem" }}>
                <h3
                  style={{
                    fontSize: "0.875rem",
                    fontWeight: "700",
                    color: colors.textPrimary,
                    marginBottom: "1.25rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <Settings size={16} />
                  {t("Basic Information")}
                </h3>

                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1.25rem" }}>
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "0.875rem",
                        fontWeight: "600",
                        color: colors.textPrimary,
                        marginBottom: "0.5rem",
                      }}
                    >
                      {t("Name")}
                    </label>
                    <input
                      type="text"
                      value={selectedRule.name}
                      onChange={(e) => setSelectedRule({ ...selectedRule, name: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "0.625rem 0.875rem",
                        fontSize: "0.9375rem",
                        border: `1px solid ${colors.border}`,
                        borderRadius: "0.625rem",
                        outline: "none",
                        background: colors.background,
                        color: colors.textPrimary,
                        transition: "all 0.2s ease",
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = colors.action
                        e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.action}15`
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = colors.border
                        e.currentTarget.style.boxShadow = "none"
                      }}
                    />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                    <div>
                      <label
                        style={{
                          display: "block",
                          fontSize: "0.875rem",
                          fontWeight: "600",
                          color: colors.textPrimary,
                          marginBottom: "0.5rem",
                        }}
                      >
                        {t("Action")}
                      </label>
                      <select
                        value={selectedRule.action}
                        onChange={(e) => setSelectedRule({ ...selectedRule, action: e.target.value })}
                        style={{
                          width: "100%",
                          padding: "0.625rem 0.875rem",
                          fontSize: "0.9375rem",
                          border: `1px solid ${colors.border}`,
                          borderRadius: "0.625rem",
                          outline: "none",
                          background: colors.background,
                          color: colors.textPrimary,
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = colors.action
                          e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.action}15`
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = colors.border
                          e.currentTarget.style.boxShadow = "none"
                        }}
                      >
                        <option value="Pull From">Pull From</option>
                        <option value="Push To">Push To</option>
                        <option value="Buy">Buy</option>
                        <option value="Manufacture">Manufacture</option>
                      </select>
                    </div>

                    <div>
                      <label
                        style={{
                          display: "block",
                          fontSize: "0.875rem",
                          fontWeight: "600",
                          color: colors.textPrimary,
                          marginBottom: "0.5rem",
                        }}
                      >
                        {t("Operation Type")}
                      </label>
                      <input
                        type="text"
                        value={selectedRule.operationType}
                        onChange={(e) =>
                          setSelectedRule({
                            ...selectedRule,
                            operationType: e.target.value,
                          })
                        }
                        style={{
                          width: "100%",
                          padding: "0.625rem 0.875rem",
                          fontSize: "0.9375rem",
                          border: `1px solid ${colors.border}`,
                          borderRadius: "0.625rem",
                          outline: "none",
                          background: colors.background,
                          color: colors.textPrimary,
                          transition: "all 0.2s ease",
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = colors.action
                          e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.action}15`
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = colors.border
                          e.currentTarget.style.boxShadow = "none"
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Locations Section */}
              <div style={{ marginBottom: "2rem" }}>
                <h3
                  style={{
                    fontSize: "0.875rem",
                    fontWeight: "700",
                    color: colors.textPrimary,
                    marginBottom: "1.25rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <MapPin size={16} />
                  {t("Locations")}
                </h3>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "1rem",
                    padding: "1.5rem",
                    background: colors.mutedBg,
                    borderRadius: "0.75rem",
                    border: `1px solid ${colors.border}`,
                  }}
                >
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "0.875rem",
                        fontWeight: "600",
                        color: colors.textPrimary,
                        marginBottom: "0.5rem",
                      }}
                    >
                      {t("Source Location")}
                    </label>
                    <input
                      type="text"
                      value={selectedRule.sourceLocation}
                      onChange={(e) =>
                        setSelectedRule({
                          ...selectedRule,
                          sourceLocation: e.target.value,
                        })
                      }
                      style={{
                        width: "100%",
                        padding: "0.625rem 0.875rem",
                        fontSize: "0.9375rem",
                        border: `1px solid ${colors.border}`,
                        borderRadius: "0.625rem",
                        outline: "none",
                        background: colors.card,
                        color: colors.textPrimary,
                        transition: "all 0.2s ease",
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = colors.action
                        e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.action}15`
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = colors.border
                        e.currentTarget.style.boxShadow = "none"
                      }}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "0.875rem",
                        fontWeight: "600",
                        color: colors.textPrimary,
                        marginBottom: "0.5rem",
                      }}
                    >
                      {t("Destination Location")}
                    </label>
                    <input
                      type="text"
                      value={selectedRule.destinationLocation}
                      onChange={(e) =>
                        setSelectedRule({
                          ...selectedRule,
                          destinationLocation: e.target.value,
                        })
                      }
                      style={{
                        width: "100%",
                        padding: "0.625rem 0.875rem",
                        fontSize: "0.9375rem",
                        border: `1px solid ${colors.border}`,
                        borderRadius: "0.625rem",
                        outline: "none",
                        background: colors.card,
                        color: colors.textPrimary,
                        transition: "all 0.2s ease",
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = colors.action
                        e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.action}15`
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = colors.border
                        e.currentTarget.style.boxShadow = "none"
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Supply & Route Section */}
              <div style={{ marginBottom: "2rem" }}>
                <h3
                  style={{
                    fontSize: "0.875rem",
                    fontWeight: "700",
                    color: colors.textPrimary,
                    marginBottom: "1.25rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <Route size={16} />
                  {t("Supply & Route")}
                </h3>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "0.875rem",
                        fontWeight: "600",
                        color: colors.textPrimary,
                        marginBottom: "0.5rem",
                      }}
                    >
                      {t("Supply Method")}
                    </label>
                    <input
                      type="text"
                      value={selectedRule.supplyMethod}
                      onChange={(e) =>
                        setSelectedRule({
                          ...selectedRule,
                          supplyMethod: e.target.value,
                        })
                      }
                      style={{
                        width: "100%",
                        padding: "0.625rem 0.875rem",
                        fontSize: "0.9375rem",
                        border: `1px solid ${colors.border}`,
                        borderRadius: "0.625rem",
                        outline: "none",
                        background: colors.background,
                        color: colors.textPrimary,
                        transition: "all 0.2s ease",
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = colors.action
                        e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.action}15`
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = colors.border
                        e.currentTarget.style.boxShadow = "none"
                      }}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "0.875rem",
                        fontWeight: "600",
                        color: colors.textPrimary,
                        marginBottom: "0.5rem",
                      }}
                    >
                      {t("Route")}
                    </label>
                    <input
                      type="text"
                      value={selectedRule.route}
                      onChange={(e) => setSelectedRule({ ...selectedRule, route: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "0.625rem 0.875rem",
                        fontSize: "0.9375rem",
                        border: `1px solid ${colors.border}`,
                        borderRadius: "0.625rem",
                        outline: "none",
                        background: colors.background,
                        color: colors.textPrimary,
                        transition: "all 0.2s ease",
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = colors.action
                        e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.action}15`
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = colors.border
                        e.currentTarget.style.boxShadow = "none"
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Propagation Section */}
              <div style={{ marginBottom: "2rem" }}>
                <h3
                  style={{
                    fontSize: "0.875rem",
                    fontWeight: "700",
                    color: colors.textPrimary,
                    marginBottom: "1.25rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <Truck size={16} />
                  {t("Propagation")}
                </h3>

                <div
                  style={{
                    padding: "1.5rem",
                    background: colors.mutedBg,
                    borderRadius: "0.75rem",
                    border: `1px solid ${colors.border}`,
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                        cursor: "pointer",
                        padding: "0.75rem",
                        borderRadius: "0.5rem",
                        transition: "background 0.2s ease",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = colors.background)}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <div
                        style={{
                          width: "1.25rem",
                          height: "1.25rem",
                          borderRadius: "0.375rem",
                          border: `2px solid ${selectedRule.cancelNextMove ? colors.action : colors.border}`,
                          background: selectedRule.cancelNextMove ? colors.action : "transparent",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transition: "all 0.2s ease",
                        }}
                      >
                        {selectedRule.cancelNextMove && <CheckCircle2 size={14} style={{ color: "#FFFFFF" }} />}
                      </div>
                      <input
                        type="checkbox"
                        checked={selectedRule.cancelNextMove}
                        onChange={(e) =>
                          setSelectedRule({
                            ...selectedRule,
                            cancelNextMove: e.target.checked,
                          })
                        }
                        style={{ display: "none" }}
                      />
                      <span style={{ fontSize: "0.9375rem", color: colors.textPrimary, fontWeight: "500" }}>
                        {t("Cancel Next Move")}
                      </span>
                    </label>
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                        cursor: "pointer",
                        padding: "0.75rem",
                        borderRadius: "0.5rem",
                        transition: "background 0.2s ease",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = colors.background)}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <div
                        style={{
                          width: "1.25rem",
                          height: "1.25rem",
                          borderRadius: "0.375rem",
                          border: `2px solid ${selectedRule.propagateCarrier ? colors.action : colors.border}`,
                          background: selectedRule.propagateCarrier ? colors.action : "transparent",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transition: "all 0.2s ease",
                        }}
                      >
                        {selectedRule.propagateCarrier && <CheckCircle2 size={14} style={{ color: "#FFFFFF" }} />}
                      </div>
                      <input
                        type="checkbox"
                        checked={selectedRule.propagateCarrier}
                        onChange={(e) =>
                          setSelectedRule({
                            ...selectedRule,
                            propagateCarrier: e.target.checked,
                          })
                        }
                        style={{ display: "none" }}
                      />
                      <span style={{ fontSize: "0.9375rem", color: colors.textPrimary, fontWeight: "500" }}>
                        {t("Propagation of carrier")}
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Options Section */}
              <div>
                <h3
                  style={{
                    fontSize: "0.875rem",
                    fontWeight: "700",
                    color: colors.textPrimary,
                    marginBottom: "1.25rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <Clock size={16} />
                  {t("Options")}
                </h3>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "0.875rem",
                        fontWeight: "600",
                        color: colors.textPrimary,
                        marginBottom: "0.5rem",
                      }}
                    >
                      {t("Partner Address")}
                    </label>
                    <input
                      type="text"
                      value={selectedRule.partnerAddress}
                      onChange={(e) =>
                        setSelectedRule({
                          ...selectedRule,
                          partnerAddress: e.target.value,
                        })
                      }
                      style={{
                        width: "100%",
                        padding: "0.625rem 0.875rem",
                        fontSize: "0.9375rem",
                        border: `1px solid ${colors.border}`,
                        borderRadius: "0.625rem",
                        outline: "none",
                        background: colors.background,
                        color: colors.textPrimary,
                        transition: "all 0.2s ease",
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = colors.action
                        e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.action}15`
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = colors.border
                        e.currentTarget.style.boxShadow = "none"
                      }}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "0.875rem",
                        fontWeight: "600",
                        color: colors.textPrimary,
                        marginBottom: "0.5rem",
                      }}
                    >
                      {t("Lead Time (days)")}
                    </label>
                    <input
                      type="number"
                      value={selectedRule.leadTime}
                      onChange={(e) =>
                        setSelectedRule({
                          ...selectedRule,
                          leadTime: Number.parseInt(e.target.value) || 0,
                        })
                      }
                      style={{
                        width: "100%",
                        padding: "0.625rem 0.875rem",
                        fontSize: "0.9375rem",
                        border: `1px solid ${colors.border}`,
                        borderRadius: "0.625rem",
                        outline: "none",
                        background: colors.background,
                        color: colors.textPrimary,
                        transition: "all 0.2s ease",
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = colors.action
                        e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.action}15`
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = colors.border
                        e.currentTarget.style.boxShadow = "none"
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div
              style={{
                padding: "1.5rem 2rem",
                borderTop: `1px solid ${colors.border}`,
                display: "flex",
                justifyContent: "flex-end",
                gap: "0.75rem",
                background: colors.mutedBg,
              }}
            >
              <button
                onClick={handleCloseModal}
                style={{
                  padding: "0.625rem 1.5rem",
                  fontSize: "0.9375rem",
                  fontWeight: "600",
                  border: `1px solid ${colors.border}`,
                  borderRadius: "0.625rem",
                  background: colors.card,
                  color: colors.textPrimary,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = colors.cancel
                  e.currentTarget.style.background = colors.cancel + "10"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = colors.border
                  e.currentTarget.style.background = colors.card
                }}
              >
                <XCircle size={16} />
                {t("Cancel")}
              </button>
              <button
                onClick={handleSave}
                style={{
                  padding: "0.625rem 1.5rem",
                  fontSize: "0.9375rem",
                  fontWeight: "600",
                  border: "none",
                  borderRadius: "0.625rem",
                  background: colors.action,
                  color: "#FFFFFF",
                  cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(82, 104, 237, 0.25)",
                  transition: "all 0.2s ease",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-1px)"
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(82, 104, 237, 0.35)"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)"
                  e.currentTarget.style.boxShadow = "0 2px 8px rgba(82, 104, 237, 0.25)"
                }}
              >
                <CheckCircle2 size={16} />
                {t("Save Rule")}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          @keyframes fadeIn {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }
          
          @keyframes slideUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}
      </style>

      {canExportPage("rules") && (
        <ExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          onExport={handleExport}
          totalRecords={filteredRules.length}
          selectedCount={Object.keys(rowSelection).length}
          isSelectAll={isSelectAll === true}
        />
      )}

      {toast && (
        <Toast
          text={toast.text}
          state={toast.state}
          onClose={() => setToast(null)}
        />
      )}

      <Alert
        isOpen={deleteAlertOpen}
        type="delete"
        title={t("Delete this rule?")}
        message={t("This rule will be permanently deleted and cannot be recovered.")}
        onClose={() => {
          setDeleteAlertOpen(false)
          setRuleToDelete(null)
        }}
        onConfirm={deleteRuleAction}
        confirmLabel={t("Delete")}
        cancelLabel={t("Cancel")}
      />
    </div>
  )
}

// Skeleton component matching MoveCard structure
function RuleCardSkeleton({ colors }: { colors?: any }) {
  if (!colors) return null
  
  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        background: colors.card,
        border: `1px solid ${colors.border}`,
        borderRadius: "24px",
        width: "100%",
        padding: "2px",
      }}
    >
      <div
        style={{
          position: "relative",
          height: "100%",
          background: colors.card,
          borderRadius: "22px",
          overflow: "hidden",
          border: `1px solid ${colors.border}`,
        }}
      >
        {/* Status Tab (Top Right) */}
        <div style={{ position: "absolute", top: 0, right: 0, padding: "1rem" }}>
          <Skeleton
            variant="rectangular"
            width={80}
            height={24}
            sx={{
              borderRadius: "999px",
              bgcolor: colors.mutedBg,
            }}
          />
        </div>

        <div style={{ padding: "1.5rem" }}>
          {/* Header Section */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem", marginBottom: "1.5rem" }}>
            {/* Gradient Icon Container */}
            <Skeleton
              variant="rectangular"
              width={48}
              height={48}
              sx={{
                borderRadius: "1rem",
                bgcolor: colors.mutedBg,
              }}
            />

            <div style={{ flex: 1, paddingTop: "0.25rem" }}>
              {/* Rule name */}
              <Skeleton
                variant="text"
                width="60%"
                height={24}
                sx={{
                  marginBottom: "0.25rem",
                  bgcolor: colors.mutedBg,
                }}
              />
              {/* Route */}
              <Skeleton
                variant="text"
                width="30%"
                height={14}
                sx={{
                  bgcolor: colors.mutedBg,
                }}
              />
            </div>
          </div>

          {/* Details Visualization */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "0" }}>
            {Array.from({ length: 2 }).map((_, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.75rem",
                }}
              >
                <div
                  style={{
                    flexShrink: 0,
                    display: "flex",
                    justifyContent: "center",
                    paddingTop: "0.25rem",
                  }}
                >
                  <Skeleton variant="circular" width={10} height={10} sx={{ bgcolor: colors.mutedBg }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Skeleton
                    variant="text"
                    width="40%"
                    height={16}
                    sx={{
                      bgcolor: colors.mutedBg,
                      marginBottom: "0.5rem",
                    }}
                  />
                  <Skeleton
                    variant="text"
                    width="80%"
                    height={20}
                    sx={{
                      bgcolor: colors.mutedBg,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
