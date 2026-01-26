"use client"

import { useMemo, useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { Plus, Package, Clock, CheckCircle2, FileText, RefreshCcw, X, AlertCircle, ArrowLeftRight, Wrench, Truck, Plane, Eye } from "lucide-react"
import { StatCard } from "./components/StatCard"
import { OperationCard } from "./components/operationCard"
import { Button } from "../@/components/ui/button"
import { Input } from "../@/components/ui/input"
import { useTranslation } from "react-i18next"
import { useTheme } from "../context/theme"
import { useData } from "../context/data"
import { useAuth } from "../context/auth"
import { API_CONFIG } from "./config/api"
import { TransferFiltersBar } from "./components/TransferFiltersBar"
import { Skeleton } from "@mui/material"
import { Card } from "../@/components/ui/card"
import { CustomInput } from "./components/CusotmInput"
import { CustomDropdown as NewCustomDropdown } from "./components/NewCustomDropdown"
import { NewCustomButton } from "./components/NewCustomButton"
import Toast from "./components/Toast"
import { DataTable, ColumnDef } from "./components/DataTable"
import ExportModal, { ExportOptions } from "./components/ExportModal"
import { useExport } from "./hooks/useExport"

type PickingTypeRecord = any

// Build operations view from context data
function buildPickingTypesView(records: PickingTypeRecord[]): any[] {
  const codeDisplay: Record<string, string> = {
    incoming: "Receipt",
    outgoing: "Delivery",
    internal: "Internal Transfer",
    mrp_operation: "Manufacturing",
    repair_operation: "Repair",
    dropship: "Dropship",
  }
  return (records || []).map((r: any) => ({
    id: r.id,
    name: r.name || `Type ${r.id}`,
    code: r.code || "",
    displayCode: codeDisplay[r.code || ""] || (r.code || ""),
    sequence_code: r.sequence_code || "",
    warehouse_id: r.warehouse_id || null,
    warehouse_name: Array.isArray(r.warehouse_id) ? r.warehouse_id[1] : (r.warehouse_id?.name || ""),
    default_location_src_id: r.default_location_src_id || null,
    source_location_name: Array.isArray(r.default_location_src_id) ? r.default_location_src_id[1] : (r.default_location_src_id?.name || ""),
    default_location_dest_id: r.default_location_dest_id || null,
    destination_location_name: Array.isArray(r.default_location_dest_id) ? r.default_location_dest_id[1] : (r.default_location_dest_id?.name || ""),
    return_picking_type_id: r.return_picking_type_id || null,
    return_picking_type_name: Array.isArray(r.return_picking_type_id) ? r.return_picking_type_id[1] : (r.return_picking_type_id?.name || ""),
    create_backorder: r.create_backorder || "ask",
    auto_batch: !!r.auto_batch,
    auto_show_reception_report: !!r.auto_show_reception_report,
    use_create_lots: !!r.use_create_lots,
    use_existing_lots: !!r.use_existing_lots,
    show_entire_packs: !!r.show_entire_packs,
    is_repairable: !!r.is_repairable,
    active: r.active !== false,
    batch_max_lines: r.batch_max_lines || null,
    batch_max_pickings: r.batch_max_pickings || null,
    batch_max_weight: r.batch_max_weight || null,
    batch_auto_confirm: !!r.batch_auto_confirm,
    // Keep original record for reference
    _original: r,
  }))
}

export default function OperationsPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const isRTL = i18n.dir() === "rtl"
  const { colors } = useTheme()
  const { stockPickingTypes, warehouses, locations, categories, fetchData, loading } = useData() as any
  const { uid, sessionId } = useAuth()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedType, setSelectedType] = useState<any | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [typeFilter, setTypeFilter] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(9)
  const [isRowModalOpen, setIsRowModalOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string>("")
  const [toast, setToast] = useState<{ text: string; state: "success" | "error" } | null>(null)
  const [viewMode, setViewMode] = useState<"cards" | "table">("table")
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({})
  const [isSelectAll, setIsSelectAll] = useState<boolean | "indeterminate">(false)
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    "id",
    "name",
    "displayCode",
    "sequence_code",
    "warehouse_name",
    "source_location_name",
    "destination_location_name",
  ])

  // Get Odoo headers from localStorage
  const getOdooHeaders = (): Record<string, string> => {
    const rawBase = localStorage.getItem("odooBase") || "https://egy.thetalenter.net"
    const db = localStorage.getItem("odooDb") || "odoodb1"
    const headers: Record<string, string> = {
      "Content-Type": "application/json"
    }
    if (rawBase) headers['x-odoo-base'] = rawBase
    if (db) headers['x-odoo-db'] = db
    return headers
  }

  // Form state for modal
  const [form, setForm] = useState<any>({
    name: "",
    code: "",
    return_picking_type_id: "",
    sequence_code: "",
    create_backorder: "ask",
    warehouse_id: "",
    auto_show_reception_report: false,
    use_create_lots: false,
    use_existing_lots: false,
    show_entire_packs: false,
    default_location_src_id: "",
    default_location_dest_id: "",
    is_repairable: false,
    auto_batch: false,
    batch_max_lines: "",
    batch_max_pickings: "",
    batch_max_weight: "",
    batch_auto_confirm: false,
    batch_group_by_carrier: false,
    batch_group_by_destination: false,
    batch_group_by_src_loc: false,
    batch_group_by_dest_loc: false,
    wave_group_by_product: false,
    wave_group_by_category: false,
    wave_group_by_location: false,
    wave_category_ids: [] as number[],
    wave_location_ids: [] as number[],
    auto_print_delivery_slip: false,
    auto_print_return_slip: false,
    auto_print_product_labels: false,
    auto_print_lot_labels: false,
    auto_print_reception_report: false,
    auto_print_reception_report_labels: false,
    auto_print_package_label: false,
  })

  const codeOptions: { value: string, label: string }[] = [
    { value: "incoming", label: t("Receipt") as string },
    { value: "outgoing", label: t("Delivery") as string },
    { value: "internal", label: t("Internal Transfer") as string },
    { value: "mrp_operation", label: t("Manufacturing") as string },
    { value: "repair_operation", label: t("Repair") as string },
    { value: "dropship", label: t("Dropship") as string },
  ]

  const backorderOptions: { value: string, label: string }[] = [
    { value: "ask", label: t("Ask") as string },
    { value: "always", label: t("Always") as string },
    { value: "never", label: t("Never") as string },
  ]

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
    const sessionIdFromStorage = localStorage.getItem('sessionId') || sessionStorage.getItem('sessionId')
    if (!sessionIdFromStorage) return
    
    hasFetchedRef.current = true
    if (!Array.isArray(stockPickingTypes) || !stockPickingTypes.length) fetchData('stockPickingTypes')
    if (!Array.isArray(warehouses) || !warehouses.length) fetchData('warehouses')
    if (!Array.isArray(locations) || !locations.length) fetchData('locations')
    if (!Array.isArray(categories) || !categories.length) fetchData('categories')
    // eslint-disable-line react-hooks/exhaustive-deps
  }, [])

  const ptView = useMemo(() => buildPickingTypesView(stockPickingTypes || []), [stockPickingTypes])

  const filteredTypes = ptView.filter((r) => {
    const q = searchQuery.toLowerCase()
    const matchesSearch = 
      r.name.toLowerCase().includes(q) || 
      r.displayCode.toLowerCase().includes(q) ||
      (r.sequence_code || "").toLowerCase().includes(q) ||
      (r.warehouse_name || "").toLowerCase().includes(q) ||
      (r.source_location_name || "").toLowerCase().includes(q) ||
      (r.destination_location_name || "").toLowerCase().includes(q) ||
      (r.return_picking_type_name || "").toLowerCase().includes(q)
    const matchesType = typeFilter.length === 0 || typeFilter.includes(r.displayCode)
    return matchesSearch && matchesType
  })

  // Pagination
  const totalPages = Math.ceil(filteredTypes.length / itemsPerPage) || 1
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedTypes = filteredTypes.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, typeFilter])

  const { exportData } = useExport()

  const handleExport = (options: ExportOptions) => {
    // Determine data to export
    let dataToExport = filteredTypes
    if (options.scope === "selected") {
      dataToExport = filteredTypes.filter((r) => rowSelection[String(r.id)])
    } else if (options.scope === "page") {
      dataToExport = paginatedTypes
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
        header: t('Name'),
        accessor: (row: any) => row.name || '-',
        isBold: true
      },
      displayCode: {
        header: t('Type'),
        accessor: (row: any) => row.displayCode || '-',
        isStatus: true
      },
      sequence_code: {
        header: t('Sequence Code'),
        accessor: (row: any) => row.sequence_code || '-'
      },
      warehouse_name: {
        header: t('Warehouse'),
        accessor: (row: any) => row.warehouse_name || '-'
      },
      source_location_name: {
        header: t('Source Location'),
        accessor: (row: any) => row.source_location_name || '-'
      },
      destination_location_name: {
        header: t('Destination Location'),
        accessor: (row: any) => row.destination_location_name || '-'
      },
      return_picking_type_name: {
        header: t('Return Type'),
        accessor: (row: any) => row.return_picking_type_name || '-'
      },
      create_backorder: {
        header: t('Create Backorder'),
        accessor: (row: any) => {
          const value = row.create_backorder || "ask"
          return value === "ask" ? t("Ask") : value === "always" ? t("Always") : value === "never" ? t("Never") : value
        }
      },
      auto_batch: {
        header: t('Auto Batch'),
        accessor: (row: any) => row.auto_batch ? t("Yes") : t("No")
      },
      auto_show_reception_report: {
        header: t('Show Reception Report'),
        accessor: (row: any) => row.auto_show_reception_report ? t("Yes") : t("No")
      },
      use_create_lots: {
        header: t('Create Lots'),
        accessor: (row: any) => row.use_create_lots ? t("Yes") : t("No")
      },
      use_existing_lots: {
        header: t('Use Existing Lots'),
        accessor: (row: any) => row.use_existing_lots ? t("Yes") : t("No")
      },
      show_entire_packs: {
        header: t('Show Entire Packs'),
        accessor: (row: any) => row.show_entire_packs ? t("Yes") : t("No")
      },
      is_repairable: {
        header: t('Repairable'),
        accessor: (row: any) => row.is_repairable ? t("Yes") : t("No")
      },
      active: {
        header: t('Active'),
        accessor: (row: any) => row.active ? t("Yes") : t("No")
      },
      batch_max_lines: {
        header: t('Batch Max Lines'),
        accessor: (row: any) => row.batch_max_lines != null ? String(row.batch_max_lines) : '-'
      },
      batch_max_pickings: {
        header: t('Batch Max Pickings'),
        accessor: (row: any) => row.batch_max_pickings != null ? String(row.batch_max_pickings) : '-'
      },
      batch_max_weight: {
        header: t('Batch Max Weight'),
        accessor: (row: any) => row.batch_max_weight != null ? String(row.batch_max_weight) : '-'
      },
      batch_auto_confirm: {
        header: t('Batch Auto Confirm'),
        accessor: (row: any) => row.batch_auto_confirm ? t("Yes") : t("No")
      },
    }

    // Filter columns based on visible columns
    const exportColumns = visibleColumns
      .map(colId => allColumns[colId as keyof typeof allColumns])
      .filter(Boolean)

    const config = {
      title: t("Operations Export"),
      columns: exportColumns,
      getSummary: (data: any[]) => [
        { label: t('Total Records'), value: data.length },
        { label: t('Receipt Operations'), value: data.filter((r: any) => r.displayCode?.toLowerCase().includes('receipt')).length },
        { label: t('Delivery Operations'), value: data.filter((r: any) => r.displayCode?.toLowerCase().includes('delivery')).length },
        { label: t('Internal Operations'), value: data.filter((r: any) => r.displayCode?.toLowerCase().includes('internal')).length }
      ]
    }

    exportData(options, dataToExport, config)
    setIsExportModalOpen(false)
  }

  const totalOperations = ptView.length
  const uniqueTypes = Array.from(new Set(ptView.map((op) => op.displayCode).filter(Boolean)))
  
  // Calculate stats (simplified for operations)
  const draftOperations = 0 // Not applicable for operation types
  const completedOperations = 0
  const scheduledToday = 0

  const openModal = (rec: any | null) => {
    setSelectedType(rec)
    setDirty(false)
    setSaveError("")
    if (rec) {
      setForm({
        name: rec.name || "",
        code: rec.code || "",
        return_picking_type_id: Array.isArray(rec.return_picking_type_id) ? String(rec.return_picking_type_id[0]) : "",
        sequence_code: rec.sequence_code || "",
        create_backorder: rec.create_backorder || "ask",
        warehouse_id: Array.isArray(rec.warehouse_id) ? String(rec.warehouse_id[0]) : "",
        auto_show_reception_report: !!rec.auto_show_reception_report,
        use_create_lots: !!rec.use_create_lots,
        use_existing_lots: !!rec.use_existing_lots,
        show_entire_packs: !!rec.show_entire_packs,
        default_location_src_id: Array.isArray(rec.default_location_src_id) ? String(rec.default_location_src_id[0]) : "",
        default_location_dest_id: Array.isArray(rec.default_location_dest_id) ? String(rec.default_location_dest_id[0]) : "",
        is_repairable: !!rec.is_repairable,
        auto_batch: !!rec.auto_batch,
        batch_max_lines: rec.batch_max_lines != null ? String(rec.batch_max_lines) : "",
        batch_max_pickings: rec.batch_max_pickings != null ? String(rec.batch_max_pickings) : "",
        batch_max_weight: rec.batch_max_weight != null ? String(rec.batch_max_weight) : "",
        batch_auto_confirm: !!rec.batch_auto_confirm,
        batch_group_by_carrier: !!rec.batch_group_by_carrier,
        batch_group_by_destination: !!rec.batch_group_by_destination,
        batch_group_by_src_loc: !!rec.batch_group_by_src_loc,
        batch_group_by_dest_loc: !!rec.batch_group_by_dest_loc,
        wave_group_by_product: !!rec.wave_group_by_product,
        wave_group_by_category: !!rec.wave_group_by_category,
        wave_group_by_location: !!rec.wave_group_by_location,
        wave_category_ids: Array.isArray(rec.wave_category_ids)
          ? rec.wave_category_ids.map((c: any) => (Array.isArray(c) ? c[0] : c)).filter((v: any) => typeof v === 'number')
          : [],
        wave_location_ids: Array.isArray(rec.wave_location_ids)
          ? rec.wave_location_ids.map((l: any) => (Array.isArray(l) ? l[0] : l)).filter((v: any) => typeof v === 'number')
          : [],
        auto_print_delivery_slip: !!rec.auto_print_delivery_slip,
        auto_print_return_slip: !!rec.auto_print_return_slip,
        auto_print_product_labels: !!rec.auto_print_product_labels,
        auto_print_lot_labels: !!rec.auto_print_lot_labels,
        auto_print_reception_report: !!rec.auto_print_reception_report,
        auto_print_reception_report_labels: !!rec.auto_print_reception_report_labels,
        auto_print_package_label: !!rec.auto_print_package_label,
      })
    } else {
      setForm((f:any)=>({ ...f, name: "", code: "", return_picking_type_id: "", sequence_code: "", create_backorder: "ask", warehouse_id: "", default_location_src_id: "", default_location_dest_id: "" }))
    }
    setIsModalOpen(true)
  }

  const closeModal = () => {
    if (!dirty || window.confirm(t("Discard unsaved changes?"))) {
      setIsModalOpen(false)
      setSelectedType(null)
      setDirty(false)
      setSaveError("")
    }
  }

  const saveType = async () => {
    const sessionId = localStorage.getItem('sessionId') || sessionStorage.getItem('sessionId')
    if (!sessionId) return
    try {
      setSaving(true)
      setSaveError("")
      const values:any = {}
      if (form.name !== undefined) values.name = form.name
      if (form.code) values.code = form.code
      if (form.sequence_code !== undefined) values.sequence_code = form.sequence_code
      if (form.create_backorder) values.create_backorder = form.create_backorder
      if (form.return_picking_type_id) values.return_picking_type_id = Number(form.return_picking_type_id)
      if (form.warehouse_id) values.warehouse_id = Number(form.warehouse_id)
      if (form.default_location_src_id) values.default_location_src_id = Number(form.default_location_src_id)
      if (form.default_location_dest_id) values.default_location_dest_id = Number(form.default_location_dest_id)
      // booleans
      const bools = [
        'auto_show_reception_report','use_create_lots','use_existing_lots','show_entire_packs','is_repairable','auto_batch','batch_auto_confirm','batch_group_by_carrier','batch_group_by_destination','batch_group_by_src_loc','batch_group_by_dest_loc','wave_group_by_product','wave_group_by_category','wave_group_by_location','auto_print_delivery_slip','auto_print_return_slip','auto_print_product_labels','auto_print_lot_labels','auto_print_reception_report','auto_print_reception_report_labels','auto_print_package_label'
      ] as const
      for (const k of bools) { if (typeof form[k] === 'boolean') (values as any)[k] = !!form[k] }
      // numbers
      if (form.batch_max_lines !== "") values.batch_max_lines = Number(form.batch_max_lines)
      if (form.batch_max_pickings !== "") values.batch_max_pickings = Number(form.batch_max_pickings)
      if (form.batch_max_weight !== "") values.batch_max_weight = Number(form.batch_max_weight)
      if (Array.isArray(form.wave_category_ids)) values.wave_category_ids = form.wave_category_ids.map((n: any)=> Number(n)).filter((n: any)=> !Number.isNaN(n))
      if (Array.isArray(form.wave_location_ids)) values.wave_location_ids = form.wave_location_ids.map((n: any)=> Number(n)).filter((n: any)=> !Number.isNaN(n))

      const userId = uid ? Number(uid) : undefined
      const headers = getOdooHeaders()
      let res
      if (selectedType?.id) {
        res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/picking-types/${selectedType.id}`, { method: 'PUT', headers, body: JSON.stringify({ sessionId, values, userId }) })
      } else {
        res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/picking-types/create`, { method: 'POST', headers, body: JSON.stringify({ sessionId, values, userId }) })
      }
      const data = await res.json().catch(()=>({}))
      // Check for error in response even if status is OK (some APIs return 200 with error data)
      const hasError = data?.error || data?.data?.name === 'odoo.exceptions.UserError' || 
                       (data?.message && data?.message.toLowerCase().includes('error')) ||
                       (!res.ok && !data?.success && !data?.id)
      
      if (res.ok && !hasError && (data?.success || data?.id)) {
        await fetchData('stockPickingTypes')
        setDirty(false)
          closeModal()
      } else {
        // Extract detailed error message from various possible response structures
        // Priority: actual Odoo error > error.data.message > error.message > data.message
        let errMsg = null
        
        // First, try to get the actual Odoo error message
        if (data?.error?.data?.message) {
          errMsg = data.error.data.message
        } else if (data?.data?.message && data?.data?.name === 'odoo.exceptions.UserError') {
          errMsg = data.data.message
        } else if (data?.error?.message && data?.error?.name === 'odoo.exceptions.UserError') {
          errMsg = data.error.message
        } else if (data?.error?.message && data?.error?.message !== 'Internal server error' && data?.error?.message !== 'Odoo Server Error') {
          errMsg = data.error.message
        } else if (data?.data?.message && data?.data?.message !== 'Internal server error' && data?.data?.message !== 'Odoo Server Error') {
          errMsg = data.data.message
        } else if (data?.message && data?.message !== 'Internal server error' && data?.message !== 'Odoo Server Error') {
          errMsg = data.message
        }
        
        // Keep newlines for parsing, but normalize multiple spaces (but preserve newlines)
        if (errMsg && typeof errMsg === 'string') {
          // Don't remove newlines - we need them for parsing
          errMsg = errMsg.trim()
        }
        
        // Only use fallback if we truly have no error message
        if (!errMsg || errMsg === 'Internal server error' || errMsg === 'Odoo Server Error') {
          errMsg = selectedType?.id ? t("Failed to update operation type") : t("Failed to create operation type")
        }
        
        setSaveError(errMsg)
        // Extract only the header (part before \n) for toast
        const toastMessage = errMsg?.split('\n')[0] || errMsg
        setToast({ text: toastMessage, state: "error" })
        setTimeout(() => setToast(null), 3000)
      }
    } catch (e: any) {
      // Extract error message from exception
      let errorMsg = e?.message || e?.data?.message || e?.error?.message || e?.data?.error?.message
      // Keep newlines for parsing, but normalize multiple spaces
      if (errorMsg && typeof errorMsg === 'string') {
        errorMsg = errorMsg.replace(/[ \t]+/g, ' ').trim()
      }
      if (!errorMsg) {
        errorMsg = t("Unknown error")
      }
      setSaveError(errorMsg)
      // Extract only the header (part before \n) for toast
      const toastMessage = errorMsg?.split('\n')[0] || errorMsg
      setToast({ text: toastMessage, state: "error" })
      setTimeout(() => setToast(null), 3000)
    } finally {
      setSaving(false)
    }
  }

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
                {t("Operation Types")}
              </h1>
              <p style={{ fontSize: isMobile ? "0.875rem" : "1rem", opacity: 0.9, color: colors.textSecondary }}>
                {t("Manage warehouse operations and transfers")}
              </p>
            </div>
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", width: isMobile ? "100%" : "auto" }}>
              <Button
                type="button"
                variant="outline"
                onClick={() => fetchData("stockPickingTypes")}
                disabled={!!loading?.stockPickingTypes}
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
                <RefreshCcw className={`w-4 h-4 ${loading?.stockPickingTypes ? "animate-spin" : ""}`} />
                {loading?.stockPickingTypes ? t("Loading...") : t("Refresh")}
              </Button>
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
                onClick={() => openModal(null)}
              >
                <Plus size={isMobile ? 18 : 20} />
                {t("New Operation")}
              </Button>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "1.25rem",
              marginBottom: "2rem",
            }}
          >
            <StatCard
              label={t("Total Operations")}
              value={totalOperations}
              icon={Package}
              gradient="linear-gradient(135deg, #dc2626 0%, #ea580c 100%)"
              delay={0}
            />
            <StatCard
              label={t("Draft Operations")}
              value={draftOperations}
              icon={FileText}
              gradient="linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
              delay={1}
            />
            <StatCard
              label={t("Scheduled Today")}
              value={scheduledToday}
              icon={Clock}
              gradient="linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
              delay={2}
            />
            <StatCard
              label={t("Completed")}
              value={completedOperations}
              icon={CheckCircle2}
              gradient="linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)"
              delay={3}
            />
          </div>

          <TransferFiltersBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder={t("Search operations...")}
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            statusOptions={[]}
            toFilter={typeFilter}
            onToChange={setTypeFilter}
            toOptions={uniqueTypes}
            fromFilter={[]}
            onFromChange={() => {}}
            fromOptions={[]}
            showDateRange={false}
            isMobile={isMobile}
            toPlaceholder={t("Type")}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            showViewToggle={true}
          />

          {viewMode === "cards" ? (
            loading?.stockPickingTypes ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 380px), 1fr))",
                  gap: "1.25rem",
                }}
              >
                {Array.from({ length: itemsPerPage }).map((_, idx) => (
                  <OperationCardSkeleton key={idx} colors={colors} />
                ))}
              </div>
            ) : (
              <>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 380px), 1fr))",
                    gap: "1.25rem",
                  }}
                >
                  {paginatedTypes.map((r, idx) => (
                    <OperationCard key={r.id} operation={{ id: String(r.id), reference: r.name, product: r.displayCode, quantity: 0, sourceLocation: '', destinationLocation: '', scheduledDate: '', operationType: r.displayCode }} onClick={() => openModal((stockPickingTypes||[]).find((x:any)=> x.id===r.id))} index={idx} />
                  ))}
                </div>

                {filteredTypes.length === 0 && !loading?.stockPickingTypes && (
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
                      <Package size={28} color="#FFFFFF" />
                    </div>
                    <h3
                      style={{
                        fontSize: "1.25rem",
                        fontWeight: "600",
                        color: colors.textPrimary,
                        marginBottom: "0.5rem",
                      }}
                    >
                      {t("No operations found")}
                    </h3>
                    <p style={{ fontSize: "0.9rem", color: colors.textSecondary }}>{t("Try adjusting your search criteria")}</p>
                  </div>
                )}

                {filteredTypes.length > 0 && (
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
                          currentPage === 1 ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:shadow-sm"
                        }`}
                        style={{
                          background: currentPage === 1 ? colors.background : colors.card,
                          color: colors.textPrimary,
                          borderColor: colors.border,
                        }}
                      >
                        {t("Previous")}
                      </button>
                      <div className="px-3 py-1.5 text-xs font-medium" style={{ color: colors.textSecondary }}>
                        {t("Page")} {currentPage} {t("of")} {totalPages}
                      </div>
                      <button
                        onClick={() => currentPage < totalPages && setCurrentPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className={`px-3 py-1.5 text-sm font-medium border rounded-md transition-all ${
                          currentPage === totalPages ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:shadow-sm"
                        }`}
                        style={{
                          background: currentPage === totalPages ? colors.background : colors.card,
                          color: colors.textPrimary,
                          borderColor: colors.border,
                        }}
                      >
                        {t("Next")}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )
          ) : (
            <>
              <DataTable
                data={filteredTypes}
                rowSelection={rowSelection}
                onRowSelectionChange={setRowSelection}
                onSelectAllChange={setIsSelectAll}
                onExport={() => setIsExportModalOpen(true)}
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
                    header: t("Name"),
                    cell: ({ row }) => (
                      <span style={{ color: colors.textPrimary, fontSize: "0.9375rem", fontWeight: 600 }}>
                        {row.original.name || "—"}
                      </span>
                    ),
                  },
                  {
                    id: "displayCode",
                    header: t("Type"),
                    cell: ({ row }) => (
                      <span style={{ color: colors.textPrimary, fontSize: "0.875rem" }}>
                        {row.original.displayCode || "—"}
                      </span>
                    ),
                  },
                  {
                    id: "sequence_code",
                    header: t("Sequence Code"),
                    cell: ({ row }) => (
                      <span style={{ color: colors.textPrimary, fontSize: "0.875rem", fontFamily: "monospace" }}>
                        {row.original.sequence_code || "—"}
                      </span>
                    ),
                  },
                  {
                    id: "warehouse_name",
                    header: t("Warehouse"),
                    cell: ({ row }) => (
                      <span style={{ color: colors.textPrimary, fontSize: "0.875rem" }}>
                        {row.original.warehouse_name || "—"}
                      </span>
                    ),
                  },
                  {
                    id: "source_location_name",
                    header: t("Source Location"),
                    cell: ({ row }) => (
                      <span style={{ color: colors.textPrimary, fontSize: "0.875rem" }}>
                        {row.original.source_location_name || "—"}
                      </span>
                    ),
                  },
                  {
                    id: "destination_location_name",
                    header: t("Destination Location"),
                    cell: ({ row }) => (
                      <span style={{ color: colors.textPrimary, fontSize: "0.875rem" }}>
                        {row.original.destination_location_name || "—"}
                      </span>
                    ),
                  },
                  {
                    id: "return_picking_type_name",
                    header: t("Return Type"),
                    cell: ({ row }) => (
                      <span style={{ color: colors.textPrimary, fontSize: "0.875rem" }}>
                        {row.original.return_picking_type_name || "—"}
                      </span>
                    ),
                  },
                  {
                    id: "create_backorder",
                    header: t("Create Backorder"),
                    cell: ({ row }) => {
                      const value = row.original.create_backorder || "ask"
                      const displayValue = value === "ask" ? t("Ask") : value === "always" ? t("Always") : value === "never" ? t("Never") : value
                      return (
                        <span style={{ color: colors.textPrimary, fontSize: "0.875rem" }}>
                          {displayValue}
                        </span>
                      )
                    },
                  },
                  {
                    id: "auto_batch",
                    header: t("Auto Batch"),
                    cell: ({ row }) => (
                      <span style={{ color: colors.textPrimary, fontSize: "0.875rem" }}>
                        {row.original.auto_batch ? t("Yes") : t("No")}
                      </span>
                    ),
                  },
                  {
                    id: "auto_show_reception_report",
                    header: t("Show Reception Report"),
                    cell: ({ row }) => (
                      <span style={{ color: colors.textPrimary, fontSize: "0.875rem" }}>
                        {row.original.auto_show_reception_report ? t("Yes") : t("No")}
                      </span>
                    ),
                  },
                  {
                    id: "use_create_lots",
                    header: t("Create Lots"),
                    cell: ({ row }) => (
                      <span style={{ color: colors.textPrimary, fontSize: "0.875rem" }}>
                        {row.original.use_create_lots ? t("Yes") : t("No")}
                      </span>
                    ),
                  },
                  {
                    id: "use_existing_lots",
                    header: t("Use Existing Lots"),
                    cell: ({ row }) => (
                      <span style={{ color: colors.textPrimary, fontSize: "0.875rem" }}>
                        {row.original.use_existing_lots ? t("Yes") : t("No")}
                      </span>
                    ),
                  },
                  {
                    id: "show_entire_packs",
                    header: t("Show Entire Packs"),
                    cell: ({ row }) => (
                      <span style={{ color: colors.textPrimary, fontSize: "0.875rem" }}>
                        {row.original.show_entire_packs ? t("Yes") : t("No")}
                      </span>
                    ),
                  },
                  {
                    id: "is_repairable",
                    header: t("Repairable"),
                    cell: ({ row }) => (
                      <span style={{ color: colors.textPrimary, fontSize: "0.875rem" }}>
                        {row.original.is_repairable ? t("Yes") : t("No")}
                      </span>
                    ),
                  },
                  {
                    id: "active",
                    header: t("Active"),
                    cell: ({ row }) => (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            padding: "0.25rem 0.75rem",
                            borderRadius: "999px",
                          background: row.original.active ? colors.tableDoneBg : colors.tableDraftBg,
                          color: row.original.active ? colors.tableDoneText : colors.tableDraftText,
                            fontSize: "0.875rem",
                            fontWeight: 600,
                          }}
                        >
                        {row.original.active ? t("Yes") : t("No")}
                        </span>
                    ),
                  },
                  {
                    id: "batch_max_lines",
                    header: t("Batch Max Lines"),
                    cell: ({ row }) => (
                      <span style={{ color: colors.textPrimary, fontSize: "0.875rem" }}>
                        {row.original.batch_max_lines != null ? String(row.original.batch_max_lines) : "—"}
                      </span>
                    ),
                  },
                  {
                    id: "batch_max_pickings",
                    header: t("Batch Max Pickings"),
                    cell: ({ row }) => (
                      <span style={{ color: colors.textPrimary, fontSize: "0.875rem" }}>
                        {row.original.batch_max_pickings != null ? String(row.original.batch_max_pickings) : "—"}
                      </span>
                    ),
                  },
                  {
                    id: "batch_max_weight",
                    header: t("Batch Max Weight"),
                    cell: ({ row }) => (
                      <span style={{ color: colors.textPrimary, fontSize: "0.875rem" }}>
                        {row.original.batch_max_weight != null ? String(row.original.batch_max_weight) : "—"}
                      </span>
                    ),
                  },
                  {
                    id: "batch_auto_confirm",
                    header: t("Batch Auto Confirm"),
                    cell: ({ row }) => (
                      <span style={{ color: colors.textPrimary, fontSize: "0.875rem" }}>
                        {row.original.batch_auto_confirm ? t("Yes") : t("No")}
                      </span>
                    ),
                  },
                ]}
                actions={(operation) => {
                  const operationId = (operation as any).id
                  return [
                    {
                      key: "view",
                      label: t("View"),
                      icon: Eye,
                      onClick: () => navigate(`/operations/view/${operationId}`),
                    },
                    {
                      key: "edit",
                      label: t("Edit"),
                      icon: FileText,
                      onClick: () => openModal((stockPickingTypes || []).find((x: any) => x.id === operation.id)),
                    },
                  ]
                }}
                actionsLabel={t("Actions")}
                isRTL={isRTL}
                visibleColumns={visibleColumns}
                onVisibleColumnsChange={setVisibleColumns}
                isLoading={loading?.stockPickingTypes}
                getRowIcon={(operation) => {
                  const op = operation as any
                  const code = (op.displayCode || "").toLowerCase()
                  
                  // Map operation types to icons and gradients
                  if (code.includes("receipt")) {
                    return { icon: CheckCircle2, gradient: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)" }
                  }
                  if (code.includes("delivery")) {
                    return { icon: Package, gradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)" }
                  }
                  if (code.includes("internal")) {
                    return { icon: ArrowLeftRight, gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }
                  }
                  if (code.includes("manufacturing")) {
                    return { icon: Wrench, gradient: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)" }
                  }
                  if (code.includes("repair")) {
                    return { icon: Wrench, gradient: "linear-gradient(135deg, #dc2626 0%, #ea580c 100%)" }
                  }
                  if (code.includes("dropship")) {
                    return { icon: Truck, gradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)" }
                  }
                  // Default fallback
                  return { icon: Package, gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }
                }}
                showPagination={true}
                defaultItemsPerPage={10}
              />

              {filteredTypes.length === 0 && !loading?.stockPickingTypes && (
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
                    <Package size={28} color="#FFFFFF" />
                  </div>
                  <h3
                    style={{
                      fontSize: "1.25rem",
                      fontWeight: "600",
                      color: colors.textPrimary,
                      marginBottom: "0.5rem",
                    }}
                  >
                    {t("No operations found")}
                  </h3>
                  <p style={{ fontSize: "0.9rem", color: colors.textSecondary }}>{t("Try adjusting your search criteria")}</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Edit/Create Picking Type Modal */}
      {isModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1100,
            padding: "1rem",
          }}
          onClick={closeModal}
        >
          <Card
            style={{
              width: "min(100%, 900px)",
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
                  {selectedType?.id ? t("Edit Operation Type") : t("New Operation Type")}
                </h2>
                <p style={{ fontSize: 13, color: colors.textSecondary }}>
                  {t("Configure operation type settings")}
                </p>
              </div>
              <button
                onClick={closeModal}
                style={{
                  border: `1px solid ${colors.border}`,
                  background: colors.card,
                  color: colors.textSecondary,
                  borderRadius: 8,
                  padding: "0.5rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 32,
                  height: 32,
                }}
              >
                <X size={18} />
              </button>
            </div>
            <div style={{ flex: 1, overflow: "auto", padding: "1.25rem" }}>
              <style>{`
                input:focus, textarea:focus, select:focus, button[role="combobox"]:focus {
                  outline: none !important;
                  border-color: #667eea !important;
                  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1) !important;
                }
              `}</style>
              <div style={{ marginBottom: "1.25rem" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    marginBottom: "1rem",
                  }}
                >
                  <div
                    style={{
                      width: "4px",
                      height: "20px",
                      background: "linear-gradient(135deg, #13E0FE 0%, #47B3FE 100%)",
                      borderRadius: "2px",
                    }}
                  />
                  <h3
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: colors.textPrimary,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      margin: 0,
                    }}
                  >
                    {t("Basic Information")}
                  </h3>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div>
                    <CustomInput
                      label={t('Operation type')}
                      type="text"
                      value={form.name}
                      onChange={(v) => {
                        setForm((s: any) => ({ ...s, name: v }))
                        setDirty(true)
                        // Clear error when user makes changes
                        if (saveError) setSaveError("")
                      }}
                      placeholder={t('Enter operation type name')}
                    />
                  </div>
                  <div>
                    <NewCustomDropdown
                      label={t('Type of operation')}
                      values={codeOptions.map((o) => o.label)}
                      type="single"
                      placeholder={t('Select')}
                      defaultValue={form.code ? codeOptions.find((o) => o.value === form.code)?.label : undefined}
                      onChange={(v) => {
                        const selected = codeOptions.find((o) => o.label === v)
                        setForm((s: any) => ({ ...s, code: selected ? selected.value : "" }))
                        setDirty(true)
                        // Clear error when user makes changes
                        if (saveError) setSaveError("")
                      }}
                    />
                  </div>
                  <div>
                    <NewCustomDropdown
                      label={t('Returns type')}
                      values={(stockPickingTypes || []).map((pt: any) => pt.name || pt.code || String(pt.id))}
                      type="single"
                      placeholder={t('Select')}
                      defaultValue={
                        form.return_picking_type_id
                          ? (() => {
                              const found = (stockPickingTypes || []).find((pt: any) => String(pt.id) === form.return_picking_type_id)
                              return found ? (found.name || found.code || String(found.id)) : undefined
                            })()
                          : undefined
                      }
                      onChange={(v) => {
                        const selected = (stockPickingTypes || []).find((pt: any) => (pt.name || pt.code || String(pt.id)) === v)
                        setForm((s: any) => ({ ...s, return_picking_type_id: selected ? String(selected.id) : "" }))
                        setDirty(true)
                      }}
                    />
                  </div>
                  <div>
                    <CustomInput
                      label={t('Sequence prefix')}
                      type="text"
                      value={form.sequence_code}
                      onChange={(v) => {
                        setForm((s: any) => ({ ...s, sequence_code: v }))
                        setDirty(true)
                      }}
                      placeholder={t('Enter sequence prefix')}
                    />
                  </div>
                  <div>
                    <NewCustomDropdown
                      label={t('Create Backorder')}
                      values={backorderOptions.map((o) => o.label)}
                      type="single"
                      placeholder={t('Select')}
                      defaultValue={form.create_backorder ? backorderOptions.find((o) => o.value === form.create_backorder)?.label : undefined}
                      onChange={(v) => {
                        const selected = backorderOptions.find((o) => o.label === v)
                        setForm((s: any) => ({ ...s, create_backorder: selected ? selected.value : "ask" }))
                        setDirty(true)
                      }}
                    />
                  </div>
                  <div>
                    <NewCustomDropdown
                      label={t('Warehouse')}
                      values={(warehouses || []).map((w: any) => w.display_name || w.name || String(w.id))}
                      type="single"
                      placeholder={t('Select')}
                      defaultValue={
                        form.warehouse_id
                          ? (() => {
                              const found = (warehouses || []).find((w: any) => String(w.id) === form.warehouse_id)
                              return found ? (found.display_name || found.name || String(found.id)) : undefined
                            })()
                          : undefined
                      }
                      onChange={(v) => {
                        const selected = (warehouses || []).find((w: any) => (w.display_name || w.name || String(w.id)) === v)
                        setForm((s: any) => ({ ...s, warehouse_id: selected ? String(selected.id) : "" }))
                        setDirty(true)
                        // Clear error when user makes changes
                        if (saveError) setSaveError("")
                      }}
                    />
                  </div>

                </div>
              </div>

              <div style={{ marginBottom: "1.25rem" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    marginBottom: "1rem",
                  }}
                >
                  <div
                    style={{
                      width: "4px",
                      height: "20px",
                      background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                      borderRadius: "2px",
                    }}
                  />
                  <h3
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: colors.textPrimary,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      margin: 0,
                    }}
                  >
                    {t("Locations & Settings")}
                  </h3>
                </div>
                <div
                  style={{
                    background: colors.background,
                    padding: "1rem",
                    borderRadius: 10,
                    border: `1px solid ${colors.border}`,
                  }}
                >
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                    <div>
                      <NewCustomDropdown
                        label={t('Source Location')}
                        values={(locations || []).map((loc: any) => loc.complete_name || loc.display_name || loc.name || String(loc.id))}
                        type="single"
                        placeholder={t('Select')}
                        defaultValue={
                          form.default_location_src_id
                            ? (() => {
                                const found = (locations || []).find((loc: any) => String(loc.id) === form.default_location_src_id)
                                return found ? (found.complete_name || found.display_name || found.name || String(found.id)) : undefined
                              })()
                            : undefined
                        }
                        onChange={(v) => {
                          const selected = (locations || []).find((loc: any) => (loc.complete_name || loc.display_name || loc.name || String(loc.id)) === v)
                          setForm((s: any) => ({ ...s, default_location_src_id: selected ? String(selected.id) : "" }))
                          setDirty(true)
                          // Clear error when user changes source location
                          if (saveError) setSaveError("")
                        }}
                      />
                    </div>
                    <div>
                      <NewCustomDropdown
                        label={t('Destination Location')}
                        values={(locations || []).map((loc: any) => loc.complete_name || loc.display_name || loc.name || String(loc.id))}
                        type="single"
                        placeholder={t('Select')}
                        defaultValue={
                          form.default_location_dest_id
                            ? (() => {
                                const found = (locations || []).find((loc: any) => String(loc.id) === form.default_location_dest_id)
                                return found ? (found.complete_name || found.display_name || found.name || String(found.id)) : undefined
                              })()
                            : undefined
                        }
                        onChange={(v) => {
                          const selected = (locations || []).find((loc: any) => (loc.complete_name || loc.display_name || loc.name || String(loc.id)) === v)
                          setForm((s: any) => ({ ...s, default_location_dest_id: selected ? String(selected.id) : "" }))
                          setDirty(true)
                          // Clear error when user changes destination location
                          if (saveError) setSaveError("")
                        }}
                      />
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: colors.textPrimary, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={!!form.auto_show_reception_report}
                        onChange={(e) => {
                          setForm((s: any) => ({ ...s, auto_show_reception_report: e.target.checked }))
                          setDirty(true)
                        }}
                        style={{ width: 18, height: 18, cursor: "pointer" }}
                      />
                      {t('Show Reception Report at Validation')}
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: colors.textPrimary, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={!!form.is_repairable}
                        onChange={(e) => {
                          setForm((s: any) => ({ ...s, is_repairable: e.target.checked }))
                          setDirty(true)
                        }}
                        style={{ width: 18, height: 18, cursor: "pointer" }}
                      />
                      {t('Create Repair Orders from Returns')}
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: colors.textPrimary, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={!!form.use_create_lots}
                        onChange={(e) => {
                          setForm((s: any) => ({ ...s, use_create_lots: e.target.checked }))
                          setDirty(true)
                        }}
                        style={{ width: 18, height: 18, cursor: "pointer" }}
                      />
                      {t('Create new')} {t('(Lots/serial numbers)')}
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: colors.textPrimary, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={!!form.use_existing_lots}
                        onChange={(e) => {
                          setForm((s: any) => ({ ...s, use_existing_lots: e.target.checked }))
                          setDirty(true)
                        }}
                        style={{ width: 18, height: 18, cursor: "pointer" }}
                      />
                      {t('Use existing ones')} {t('(Lots/serial numbers)')}
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: colors.textPrimary, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={!!form.show_entire_packs}
                        onChange={(e) => {
                          setForm((s: any) => ({ ...s, show_entire_packs: e.target.checked }))
                          setDirty(true)
                        }}
                        style={{ width: 18, height: 18, cursor: "pointer" }}
                      />
                      {t('Move entire package')}
                    </label>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: "1.25rem" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    marginBottom: "1rem",
                  }}
                >
                  <div
                    style={{
                      width: "4px",
                      height: "20px",
                      background: "linear-gradient(135deg, #dc2626 0%, #ea580c 100%)",
                      borderRadius: "2px",
                    }}
                  />
                  <h3
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: colors.textPrimary,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      margin: 0,
                    }}
                  >
                    {t("Batch & Wave Transfers")}
                  </h3>
                </div>
                <div
                  style={{
                    background: colors.background,
                    padding: "1rem",
                    borderRadius: 10,
                    border: `1px solid ${colors.border}`,
                  }}
                >
                  <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: form.auto_batch ? "1rem" : 0, fontSize: 13, color: colors.textPrimary, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={!!form.auto_batch}
                      onChange={(e) => {
                        setForm((s: any) => ({ ...s, auto_batch: e.target.checked }))
                        setDirty(true)
                      }}
                      style={{ width: 18, height: 18, cursor: "pointer" }}
                    />
                    {t('Automatic Batches')}
                  </label>
                  {form.auto_batch && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                      <CustomInput
                        label={t('Max lines')}
                        type="number"
                        value={form.batch_max_lines}
                        onChange={(v) => {
                          setForm((s: any) => ({ ...s, batch_max_lines: v.replace(/[^0-9]/g, "") }))
                          setDirty(true)
                        }}
                        placeholder={t('Enter max lines')}
                      />
                      <CustomInput
                        label={t('Maximum transfers')}
                        type="number"
                        value={form.batch_max_pickings}
                        onChange={(v) => {
                          setForm((s: any) => ({ ...s, batch_max_pickings: v.replace(/[^0-9]/g, "") }))
                          setDirty(true)
                        }}
                        placeholder={t('Enter max transfers')}
                      />
                      <CustomInput
                        label={t('Weight')}
                        type="number"
                        value={form.batch_max_weight}
                        onChange={(v) => {
                          setForm((s: any) => ({ ...s, batch_max_weight: v.replace(/[^0-9.]/g, "") }))
                          setDirty(true)
                        }}
                        placeholder={t('Enter weight')}
                      />
                      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: colors.textPrimary, cursor: "pointer", paddingTop: "1.5rem" }}>
                        <input
                          type="checkbox"
                          checked={!!form.batch_auto_confirm}
                          onChange={(e) => {
                            setForm((s: any) => ({ ...s, batch_auto_confirm: e.target.checked }))
                            setDirty(true)
                          }}
                          style={{ width: 18, height: 18, cursor: "pointer" }}
                        />
                        {t('Auto-confirm')}
                      </label>
                      <div style={{ gridColumn: "1 / -1" }}>
                        <h5 style={{ fontSize: 12, fontWeight: 700, color: colors.textSecondary, margin: "0 0 6px" }}>{t('Batch grouping')}</h5>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: colors.textPrimary, cursor: "pointer" }}>
                            <input
                              type="checkbox"
                              checked={!!form.batch_group_by_carrier}
                              onChange={(e) => {
                                setForm((s: any) => ({ ...s, batch_group_by_carrier: e.target.checked }))
                                setDirty(true)
                              }}
                              style={{ width: 18, height: 18, cursor: "pointer" }}
                            />
                            {t('Contact')}
                          </label>
                          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: colors.textPrimary, cursor: "pointer" }}>
                            <input
                              type="checkbox"
                              checked={!!form.batch_group_by_destination}
                              onChange={(e) => {
                                setForm((s: any) => ({ ...s, batch_group_by_destination: e.target.checked }))
                                setDirty(true)
                              }}
                              style={{ width: 18, height: 18, cursor: "pointer" }}
                            />
                            {t('Destination Country')}
                          </label>
                          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: colors.textPrimary, cursor: "pointer" }}>
                            <input
                              type="checkbox"
                              checked={!!form.batch_group_by_src_loc}
                              onChange={(e) => {
                                setForm((s: any) => ({ ...s, batch_group_by_src_loc: e.target.checked }))
                                setDirty(true)
                              }}
                              style={{ width: 18, height: 18, cursor: "pointer" }}
                            />
                            {t('Source Location')}
                          </label>
                          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: colors.textPrimary, cursor: "pointer" }}>
                            <input
                              type="checkbox"
                              checked={!!form.batch_group_by_dest_loc}
                              onChange={(e) => {
                                setForm((s: any) => ({ ...s, batch_group_by_dest_loc: e.target.checked }))
                                setDirty(true)
                              }}
                              style={{ width: 18, height: 18, cursor: "pointer" }}
                            />
                            {t('Desination Location')}
                          </label>
                        </div>
                      </div>
                      <div style={{ gridColumn: "1 / -1" }}>
                        <h5 style={{ fontSize: 12, fontWeight: 700, color: colors.textSecondary, margin: "0 0 6px" }}>{t('Waves grouping')}</h5>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: colors.textPrimary, cursor: "pointer" }}>
                            <input
                              type="checkbox"
                              checked={!!form.wave_group_by_product}
                              onChange={(e) => {
                                setForm((s: any) => ({ ...s, wave_group_by_product: e.target.checked }))
                                setDirty(true)
                              }}
                              style={{ width: 18, height: 18, cursor: "pointer" }}
                            />
                            {t('Product')}
                          </label>
                          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: colors.textPrimary, cursor: "pointer" }}>
                            <input
                              type="checkbox"
                              checked={!!form.wave_group_by_category}
                              onChange={(e) => {
                                setForm((s: any) => ({ ...s, wave_group_by_category: e.target.checked }))
                                setDirty(true)
                              }}
                              style={{ width: 18, height: 18, cursor: "pointer" }}
                            />
                            {t('Product Category')}
                          </label>
                          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: colors.textPrimary, cursor: "pointer" }}>
                            <input
                              type="checkbox"
                              checked={!!form.wave_group_by_location}
                              onChange={(e) => {
                                setForm((s: any) => ({ ...s, wave_group_by_location: e.target.checked }))
                                setDirty(true)
                              }}
                              style={{ width: 18, height: 18, cursor: "pointer" }}
                            />
                            {t('Location')}
                          </label>
                        </div>
                        {form.wave_group_by_category && (
                          <div style={{ marginTop: 8 }}>
                            <div style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 6, fontWeight: 600 }}>{t('Wave Product Categories')}</div>
                            <select
                              multiple
                              value={(form.wave_category_ids || []).map(String)}
                              onChange={(e) => {
                                const selected = Array.from(e.target.selectedOptions).map((o: any) => Number(o.value)).filter((n) => !Number.isNaN(n))
                                setForm((s: any) => ({ ...s, wave_category_ids: selected }))
                                setDirty(true)
                              }}
                              style={{ width: "100%", padding: "0.4rem 0.5rem", border: `1px solid ${colors.border}`, borderRadius: 8, background: colors.background, color: colors.textPrimary, minHeight: 120 }}
                            >
                              {(categories || []).map((c: any) => (
                                <option key={c.id} value={String(c.id)}>{c.display_name || c.name || c.id}</option>
                              ))}
                            </select>
                          </div>
                        )}
                        {form.wave_group_by_location && (
                          <div style={{ marginTop: 8 }}>
                            <div style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 6, fontWeight: 600 }}>{t('Wave Locations')}</div>
                            <select
                              multiple
                              value={(form.wave_location_ids || []).map(String)}
                              onChange={(e) => {
                                const selected = Array.from(e.target.selectedOptions).map((o: any) => Number(o.value)).filter((n) => !Number.isNaN(n))
                                setForm((s: any) => ({ ...s, wave_location_ids: selected }))
                                setDirty(true)
                              }}
                              style={{ width: "100%", padding: "0.4rem 0.5rem", border: `1px solid ${colors.border}`, borderRadius: 8, background: colors.background, color: colors.textPrimary, minHeight: 120 }}
                            >
                              {(locations || []).map((loc: any) => (
                                <option key={loc.id} value={String(loc.id)}>{loc.complete_name || loc.display_name || loc.name || loc.id}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    marginBottom: "1rem",
                  }}
                >
                  <div
                    style={{
                      width: "4px",
                      height: "20px",
                      background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
                      borderRadius: "2px",
                    }}
                  />
                  <h3
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: colors.textPrimary,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      margin: 0,
                    }}
                  >
                    {t("Print on Validation")}
                  </h3>
                </div>
                <div
                  style={{
                    background: colors.background,
                    padding: "1rem",
                    borderRadius: 10,
                    border: `1px solid ${colors.border}`,
                  }}
                >
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: colors.textPrimary, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={!!form.auto_print_delivery_slip}
                        onChange={(e) => {
                          setForm((s: any) => ({ ...s, auto_print_delivery_slip: e.target.checked }))
                          setDirty(true)
                        }}
                        style={{ width: 18, height: 18, cursor: "pointer" }}
                      />
                      {t('Delivery Slip')}
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: colors.textPrimary, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={!!form.auto_print_return_slip}
                        onChange={(e) => {
                          setForm((s: any) => ({ ...s, auto_print_return_slip: e.target.checked }))
                          setDirty(true)
                        }}
                        style={{ width: 18, height: 18, cursor: "pointer" }}
                      />
                      {t('Return Slip')}
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: colors.textPrimary, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={!!form.auto_print_product_labels}
                        onChange={(e) => {
                          setForm((s: any) => ({ ...s, auto_print_product_labels: e.target.checked }))
                          setDirty(true)
                        }}
                        style={{ width: 18, height: 18, cursor: "pointer" }}
                      />
                      {t('Product Labels')}
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: colors.textPrimary, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={!!form.auto_print_lot_labels}
                        onChange={(e) => {
                          setForm((s: any) => ({ ...s, auto_print_lot_labels: e.target.checked }))
                          setDirty(true)
                        }}
                        style={{ width: 18, height: 18, cursor: "pointer" }}
                      />
                      {t('Lot/SN Labels')}
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: colors.textPrimary, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={!!form.auto_print_reception_report}
                        onChange={(e) => {
                          setForm((s: any) => ({ ...s, auto_print_reception_report: e.target.checked }))
                          setDirty(true)
                        }}
                        style={{ width: 18, height: 18, cursor: "pointer" }}
                      />
                      {t('Reception Report')}
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: colors.textPrimary, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={!!form.auto_print_reception_report_labels}
                        onChange={(e) => {
                          setForm((s: any) => ({ ...s, auto_print_reception_report_labels: e.target.checked }))
                          setDirty(true)
                        }}
                        style={{ width: 18, height: 18, cursor: "pointer" }}
                      />
                      {t('Reception Report Labels')}
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: colors.textPrimary, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={!!form.auto_print_package_label}
                        onChange={(e) => {
                          setForm((s: any) => ({ ...s, auto_print_package_label: e.target.checked }))
                          setDirty(true)
                        }}
                        style={{ width: 18, height: 18, cursor: "pointer" }}
                      />
                      {t('Package Content')}
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {saveError && (() => {
              // Check if this is a generic fallback message - if so, don't try to parse it
              const isGenericError = saveError === t("Failed to update operation type") || 
                                     saveError === t("Failed to create operation type") ||
                                     saveError === t("Unknown error")
              
              if (isGenericError) {
                // For generic errors, just show the message without parsing
                return (
                  <div
                    style={{
                      margin: "0 1.25rem 0.75rem",
                      padding: "0.75rem",
                      borderRadius: 8,
                      background: "#FEE2E2",
                      color: "#991B1B",
                      border: "1px solid #FCA5A5",
                      fontSize: 11,
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "0.5rem",
                      boxShadow: "0 2px 8px rgba(220, 38, 38, 0.1)",
                    }}
                  >
                    <AlertCircle size={14} style={{ flexShrink: 0, marginTop: "1px" }} />
                    <div style={{ flex: 1, lineHeight: 1.4 }}>
                      <div style={{ fontSize: "0.6875rem" }}>
                        {saveError}
                      </div>
                    </div>
                    <button
                      onClick={() => setSaveError("")}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "#991B1B",
                        cursor: "pointer",
                        padding: "0.25rem",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: 4,
                        flexShrink: 0,
                      }}
                      aria-label={t("Close error")}
                    >
                      <X size={14} />
                    </button>
                  </div>
                )
              }
              
              // Parse error message: handle both literal \n and actual newlines
              // First replace literal \n with actual newline, then split
              let errorText = saveError.replace(/\\n/g, '\n')
              
              // Split by newline
              const errorParts = errorText.split('\n').map(s => s.trim()).filter(s => s.length > 0)
              
              // Extract title (first part before colon or first line)
              let errorTitle = t("Error")
              let errorMessage = saveError
              
              if (errorParts.length > 0) {
                const firstPart = errorParts[0]
                // If first part contains colon, use part before colon as title
                if (firstPart.includes(':')) {
                  const colonIndex = firstPart.indexOf(':')
                  errorTitle = firstPart.substring(0, colonIndex).trim()
                  // Get message: part after colon in first line + rest of lines
                  const afterColon = firstPart.substring(colonIndex + 1).trim()
                  const restOfLines = errorParts.slice(1).join(' ').trim()
                  errorMessage = [afterColon, restOfLines].filter(s => s.length > 0).join(' ').trim()
                } else if (errorParts.length > 1) {
                  // First line is title, rest is message
                  errorTitle = firstPart
                  errorMessage = errorParts.slice(1).join(' ').trim()
                } else {
                  // Single line, check if it has a colon
                  if (firstPart.includes(':')) {
                    const colonIndex = firstPart.indexOf(':')
                    errorTitle = firstPart.substring(0, colonIndex).trim()
                    errorMessage = firstPart.substring(colonIndex + 1).trim()
                  } else {
                    // No colon, use as message
                    errorMessage = firstPart
                  }
                }
              }
              
              // Clean up the message: remove leading dashes, extra quotes, normalize formatting
              const cleanMessage = errorMessage
                .replace(/^-\s*/, '') // Remove leading dash and space
                .replace(/^["']|["']$/g, '') // Remove surrounding quotes
                .replace(/\s+/g, ' ') // Normalize whitespace
                .trim()
              
              return (
                <div
                  style={{
                    margin: "0 1.25rem 0.75rem",
                    padding: "0.75rem",
                    borderRadius: 8,
                    background: "#FEE2E2",
                    color: "#991B1B",
                    border: "1px solid #FCA5A5",
                    fontSize: 11,
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.5rem",
                    boxShadow: "0 2px 8px rgba(220, 38, 38, 0.1)",
                  }}
                >
                  <AlertCircle size={14} style={{ flexShrink: 0, marginTop: "1px" }} />
                  <div style={{ flex: 1, lineHeight: 1.4 }}>
                    <div style={{ fontWeight: 600, marginBottom: "0.25rem", fontSize: "0.75rem" }}>
                      {errorTitle}
                    </div>
                    {cleanMessage && cleanMessage !== errorTitle && (
                      <div style={{ fontSize: "0.6875rem", opacity: 0.9 }}>
                        {cleanMessage}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => setSaveError("")}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#991B1B",
                      cursor: "pointer",
                      padding: "0.25rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 4,
                      flexShrink: 0,
                    }}
                    aria-label={t("Close error")}
                  >
                    <X size={14} />
                  </button>
                </div>
              )
            })()}

            <div
              style={{
                padding: "1rem 1.25rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                background: colors.card,
                borderTop: `1px solid ${colors.border}`,
              }}
            >
              <div style={{ display: "flex", gap: "0.5rem" }}>
                {dirty && (
                  <NewCustomButton
                    label={selectedType?.id ? t("Save Changes") : t("Create")}
                    backgroundColor="#25D0FE"
                    onClick={saveType}
                    disabled={saving}
                  />
                )}
                <NewCustomButton label={t("Close")} backgroundColor="#FFFFFF" onClick={closeModal} />
              </div>
            </div>
          </Card>
        </div>
      )}
      {toast && (
        <Toast
          text={toast.text}
          state={toast.state}
          onClose={() => setToast(null)}
        />
      )}

      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onExport={handleExport}
        totalRecords={filteredTypes.length}
        selectedCount={Object.keys(rowSelection).length}
        isSelectAll={isSelectAll === true}
      />
    </div>
  )
}

// Skeleton component matching OperationCard structure (MoveCard style)
function OperationCardSkeleton({ colors }: { colors: any }) {
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
              {/* Reference */}
              <Skeleton
                variant="text"
                width="30%"
                height={14}
                sx={{
                  marginBottom: "0.25rem",
                  bgcolor: colors.mutedBg,
                }}
              />
              {/* Product name */}
              <Skeleton
                variant="text"
                width="60%"
                height={24}
                sx={{
                  marginBottom: "0.25rem",
                  bgcolor: colors.mutedBg,
                }}
              />
              {/* Date */}
              <Skeleton
                variant="text"
                width="50%"
                height={14}
                sx={{
                  bgcolor: colors.mutedBg,
                }}
              />
            </div>
          </div>

          {/* Details Visualization */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
            {Array.from({ length: 4 }).map((_, idx) => (
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

          {/* Footer Metadata */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingTop: "1rem",
              borderTop: `1px solid ${colors.border}`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <Skeleton
                variant="rectangular"
                width={60}
                height={16}
                sx={{
                  borderRadius: "0.25rem",
                  bgcolor: colors.mutedBg,
                }}
              />
            </div>

            <Skeleton
              variant="rectangular"
              width={60}
              height={24}
              sx={{
                borderRadius: "0.5rem",
                bgcolor: colors.mutedBg,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
