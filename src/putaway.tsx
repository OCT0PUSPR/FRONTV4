"use client"

import { useEffect, useMemo, useState, useRef } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { useTheme } from "../context/theme"
import { useData } from "../context/data"
import { useAuth } from "../context/auth"
import { useCasl } from "../context/casl"
import { API_CONFIG } from "./config/api"
import Toast from "./components/Toast"
import Alert from "./components/Alert"
import { FileText, MapPin, Package, Building2, Plus, RefreshCcw, Edit, Trash2, X, CheckCircle2 } from "lucide-react"
import { StatCard } from "./components/StatCard"
import { PutawayCard } from "./components/PutawayCard"
import { Card, CardContent } from "../@/components/ui/card"
import { Input } from "../@/components/ui/input"
import { TransferFiltersBar } from "./components/TransferFiltersBar"
import { Button } from "../@/components/ui/button"
import { Skeleton } from "@mui/material"
import { DataTable } from "./components/DataTable"
import ExportModal, { ExportOptions } from "./components/ExportModal"
import { useExport } from "./hooks/useExport"
import { CustomInput } from "./components/CusotmInput"
import { CustomDropdown as NewCustomDropdown } from "./components/NewCustomDropdown"
import { NewCustomButton } from "./components/NewCustomButton"

export default function PutawaysRulesPage() {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.dir() === "rtl"
  const { colors } = useTheme()
  const { putawayRules, products, productTemplates, storageCategories, packageTypes, locations, fetchData, loading } =
    useData() as any
  const { uid } = useAuth()
  const { canCreatePage, canEditPage, canExportPage, canDeletePage } = useCasl()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string[]>([]) // Storage category filter
  const [fromFilter, setFromFilter] = useState<string[]>([]) // From location filter
  const [toFilter, setToFilter] = useState<string[]>([]) // To location filter
  const [dateRange, setDateRange] = useState<[string | null, string | null] | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(9)
  const [isRowModalOpen, setIsRowModalOpen] = useState(false)
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({})
  const [isSelectAll, setIsSelectAll] = useState<boolean | "indeterminate">(false)
  const [isMobile, setIsMobile] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedRule, setSelectedRule] = useState<any>(null)
  const [viewMode, setViewMode] = useState<"cards" | "table">("table")
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    "id",
    "from",
    "to",
    "product",
    "storageCategory",
    "sublocation",
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
    if (!Array.isArray(putawayRules) || !putawayRules.length) fetchData("putawayRules")
    if (!Array.isArray(products) || !products.length) fetchData("products")
    if (!Array.isArray(storageCategories) || !storageCategories.length) fetchData("storageCategories")
    if (!Array.isArray(locations) || !locations.length) fetchData("locations")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const [inLocId, setInLocId] = useState<string>("")
  const [outLocId, setOutLocId] = useState<string>("")
  const [sublocation, setSublocation] = useState<string>("no")
  const [productId, setProductId] = useState<string>("")
  const [pkgTypeIds, setPkgTypeIds] = useState<string[]>([])
  const [storageCatId, setStorageCatId] = useState<string>("")
  const [companyId, setCompanyId] = useState<string>("")
  const [toast, setToast] = useState<{ text: string; state: "success" | "error" } | null>(null)
  const [dirty, setDirty] = useState(false)
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false)
  const [ruleToDelete, setRuleToDelete] = useState<number | null>(null)

  // Helpers to safely display Odoo values
  const m2oName = (v: any): string => {
    if (Array.isArray(v)) return String(v[1] ?? v[0] ?? "")
    if (v && typeof v === "object") return String(v.display_name ?? v.name ?? "")
    return v == null ? "" : String(v)
  }
  const asDataUrl = (img?: string | null): string | null => {
    if (!img || typeof img !== "string") return null
    return img.startsWith("data:") ? img : `data:image/png;base64,${img}`
  }

  const productImageFromCatalog = (productId?: number | null, productName?: string | null): string | null => {
    const list = Array.isArray(products) ? products : []
    let found: any | undefined
    if (productId) found = list.find((p: any) => p?.id === productId)
    if (!found && productName) {
      const name = String(productName).trim().toLowerCase()
      found = list.find(
        (p: any) =>
          String(p?.display_name || p?.name || "")
            .trim()
            .toLowerCase() === name,
      )
    }
    return asDataUrl(found?.image_1920)
  }

  const tryImage = (rule: any): string | null => {
    const possible = [
      rule?.product_image,
      rule?.image_128,
      rule?.product_id?.image_128,
      rule?.product_tmpl_id?.image_128,
    ]
    const img = possible.find((x) => typeof x === "string" && x.length > 50) as string | undefined
    return asDataUrl(img || null)
  }
  const selectionText = (v: any): string => {
    if (typeof v === "string") return v
    if (Array.isArray(v)) return String(v[1] ?? v[0] ?? "")
    return v == null ? "" : String(v)
  }
  const m2mNames = (v: any): string[] => {
    if (Array.isArray(v)) {
      if (v.length && Array.isArray(v[0])) return v.map((x: any) => String(x[1] ?? x[0]))
      return v.map((x) => String(x))
    }
    return []
  }

  // Derive UI records with the requested fields, but keep raw as fallback
  const uiRules = useMemo(() => {
    const list = Array.isArray(putawayRules) ? putawayRules : []
    return list.map((r: any) => {
      const from = m2oName(r.location_in_id ?? r.location_id)
      const to = m2oName(r.location_out_id ?? r.putaway_location_id)
      const productId = Array.isArray(r.product_id) ? Number(r.product_id[0]) : null
      const productName = m2oName(r.product_id ?? r.product_tmpl_id)
      const productImg = productImageFromCatalog(productId, productName) || tryImage(r)
      const pkgNames = m2mNames(r.package_type_ids)
      const subloc = selectionText(r.sublocation)
      const storageCat = m2oName(r.storage_category_id)
      const company = m2oName(r.company_id)
      return {
        id: r.id,
        title: r?.id ? `${t("Putaway Rule")} #${r.id}` : t("Putaway Rule"),
        from,
        to,
        productName,
        productImg,
        pkgNames,
        subloc,
        storageCat,
        company,
        raw: r,
      }
    })
  }, [putawayRules, products, t])

  // no chart data used on this page

  const filteredRules = useMemo(() => {
    return uiRules.filter((rule: any) => {
      try {
        const matchesSearch = JSON.stringify(rule.raw || rule).toLowerCase().includes(searchQuery.toLowerCase())
        const matchesFrom = fromFilter.length === 0 || fromFilter.includes(rule.from)
        const matchesTo = toFilter.length === 0 || toFilter.includes(rule.to)
        const matchesStatus = statusFilter.length === 0 || statusFilter.includes(rule.storageCat)
        return matchesSearch && matchesFrom && matchesTo && matchesStatus
      } catch {
        return false
      }
    })
  }, [uiRules, searchQuery, fromFilter, toFilter, statusFilter])

  // Pagination - only for cards view
  const totalPages = Math.ceil(filteredRules.length / itemsPerPage) || 1
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedRules = viewMode === "cards" ? filteredRules.slice(startIndex, endIndex) : filteredRules

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, fromFilter, toFilter, statusFilter])

  const { exportData } = useExport()

  const handleExport = (options: ExportOptions) => {
    // Check export permission before exporting
    if (!canExportPage("putaway")) {
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
      from: {
        header: t('When product arrives in'),
        accessor: (row: any) => row.from || '-'
      },
      to: {
        header: t('Store To'),
        accessor: (row: any) => row.to || '-'
      },
      product: {
        header: t('Product'),
        accessor: (row: any) => row.productName || '-',
        isBold: true
      },
      storageCategory: {
        header: t('Having Category'),
        accessor: (row: any) => row.storageCat || '-'
      },
      sublocation: {
        header: t('Sublocation'),
        accessor: (row: any) => {
          const subloc = row.subloc
          const sublocMap: Record<string, string> = {
            'no': t("No"),
            'last_used': t("Last Used"),
            'closest_location': t("Closest Location"),
          }
          return sublocMap[subloc] || subloc || '-'
        }
      },
      packageType: {
        header: t('Package Type'),
        accessor: (row: any) => {
          const pkgNames = row.pkgNames || []
          return pkgNames.length > 0 ? pkgNames.join(", ") : '-'
        }
      },
      company: {
        header: t('Company'),
        accessor: (row: any) => row.company || '-'
      },
    }

    // Filter columns based on visible columns
    const exportColumns = visibleColumns
      .map(colId => allColumns[colId as keyof typeof allColumns])
      .filter(Boolean)

    const config = {
      title: t("Putaway Rules Export"),
      columns: exportColumns,
      getSummary: (data: any[]) => [
        { label: t('Total Records'), value: data.length },
        { label: t('With Products'), value: data.filter((r: any) => r.productName).length },
        { label: t('With Storage Category'), value: data.filter((r: any) => r.storageCat).length },
        { label: t('With Package Types'), value: data.filter((r: any) => r.pkgNames?.length > 0).length }
      ]
    }

    exportData(options, dataToExport, config, dateRange)
    setIsExportModalOpen(false)
  }

  // Get unique values for filters
  const uniqueFrom = Array.from(new Set(uiRules.map((r: any) => r.from).filter(Boolean)))
  const uniqueTo = Array.from(new Set(uiRules.map((r: any) => r.to).filter(Boolean)))
  const uniqueStorageCats = Array.from(new Set(uiRules.map((r: any) => r.storageCat).filter(Boolean)))

  const totalRules = uiRules.length
  const activeRules = uiRules.filter((r: any) => r.from && r.to).length
  const uniqueProducts = new Set(uiRules.map((r: any) => r.productName).filter(Boolean)).size
  const uniqueLocations = new Set(uiRules.flatMap((r: any) => [r.from, r.to]).filter(Boolean)).size

  const handleCardClick = (rule: any) => {
    // Check edit permission before opening modal
    if (!canEditPage("putaway")) {
      return
    }
    const ruleId = rule?.id || rule?.raw?.id
    if (ruleId) {
      navigate(`/putaway/edit/${ruleId}`)
    }
  }

  const handleAddNew = () => {
    if (canCreatePage("putaway")) {
      navigate('/putaway/create')
    }
  }

  const handleCloseModal = () => {
    if (!dirty || window.confirm(t("Discard unsaved changes?"))) {
      setIsModalOpen(false)
      setSelectedRule(null)
      setDirty(false)
    }
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
      const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/putaway-rules/${ruleToDelete}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", ...getOdooHeaders() },
        body: JSON.stringify({ sessionId, userId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.success) throw new Error(data?.message || t("Delete failed"))
      setToast({ text: t("Putaway rule deleted successfully"), state: "success" })
      setDeleteAlertOpen(false)
      setRuleToDelete(null)
      // Refresh rules
      await fetchData("putawayRules")
      if (isModalOpen && selectedRule?.id === ruleToDelete) {
        setIsModalOpen(false)
        setSelectedRule(null)
      }
    } catch (error: any) {
      console.error("Delete failed:", error)
      setToast({ text: error?.message || t("Failed to delete putaway rule"), state: "error" })
      setDeleteAlertOpen(false)
      setRuleToDelete(null)
    }
  }

  // Initialize form state when opening modal
  useEffect(() => {
    if (isModalOpen && selectedRule) {
      const inId = Array.isArray(selectedRule.location_in_id) ? String(selectedRule.location_in_id[0]) : ""
      const outId = Array.isArray(selectedRule.location_out_id) ? String(selectedRule.location_out_id[0]) : ""
      setInLocId(inId)
      setOutLocId(outId)
      const sub = typeof selectedRule.sublocation === "string" ? selectedRule.sublocation : "no"
      setSublocation(sub)
      setProductId(Array.isArray(selectedRule.product_id) ? String(selectedRule.product_id[0]) : "")
      setPkgTypeIds(
        Array.isArray(selectedRule.package_type_ids)
          ? selectedRule.package_type_ids.map((x: any) => String(Array.isArray(x) ? x[0] : x)).filter(Boolean)
          : [],
      )
      setStorageCatId(
        Array.isArray(selectedRule.storage_category_id) ? String(selectedRule.storage_category_id[0]) : "",
      )
      setCompanyId(Array.isArray(selectedRule.company_id) ? String(selectedRule.company_id[0]) : "")
    } else {
      setInLocId("")
      setOutLocId("")
      setSublocation("no")
      setProductId("")
      setPkgTypeIds([])
      setStorageCatId("")
      setCompanyId("")
    }
    setDirty(false)
  }, [isModalOpen, selectedRule])

  const getSessionId = () => localStorage.getItem("sessionId") || sessionStorage.getItem("sessionId")

  // Get Odoo headers from localStorage
  const getOdooHeaders = (): Record<string, string> => {
    const rawBase = localStorage.getItem("odooBase") || localStorage.getItem("odoo_base_url") || "https://egy.thetalenter.net"
    const db = localStorage.getItem("odooDb") || localStorage.getItem("odoo_db") || "odoodb1"
    const headers: Record<string, string> = {}
    if (rawBase) headers['x-odoo-base'] = rawBase
    if (db) headers['x-odoo-db'] = db
    return headers
  }

  const handleSaveRule = async () => {
    try {
      const sessionId = getSessionId()
      if (!sessionId) throw new Error("No session ID found")

      const values: any = {}
      if (inLocId) values.location_in_id = Number(inLocId)
      if (outLocId) values.location_out_id = Number(outLocId)
      if (sublocation) values.sublocation = sublocation
      if (productId) values.product_id = Number(productId)
      if (Array.isArray(pkgTypeIds) && pkgTypeIds.length)
        values.package_type_ids = pkgTypeIds.map((x) => Number(x)).filter(Number.isInteger)
      if (storageCatId) values.storage_category_id = Number(storageCatId)
      if (companyId) values.company_id = Number(companyId)
      const userId = uid ? Number(uid) : undefined
      let ok = false
      let message = ""
      if (selectedRule?.id) {
        const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/putaway-rules/${selectedRule.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", ...getOdooHeaders() },
          body: JSON.stringify({ sessionId, values, userId }),
        })
        const data = await res.json().catch(async () => ({ message: await res.text().catch(() => "") }))
        ok = res.ok && !!data.success
        message = data?.message || ""
        if (!ok) throw new Error(message || "Update failed")
      } else {
        const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/putaway-rules/create`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...getOdooHeaders() },
          body: JSON.stringify({ sessionId, values, userId }),
        })
        const data = await res.json().catch(async () => ({ message: await res.text().catch(() => "") }))
        ok = res.ok && (!!data.success || Number.isInteger(data?.id))
        message = data?.message || ""
        if (!ok) throw new Error(message || "Create failed")
      }

      // Refresh list and notify
      await fetchData("putawayRules")
      setDirty(false)
      setToast({
        text: selectedRule?.id ? "Putaway rule updated successfully" : "Putaway rule created successfully",
        state: "success",
      })
      setIsModalOpen(false)
      setSelectedRule(null)
    } catch (e: any) {
      setToast({ text: e?.message || "Failed to update putaway rule", state: "error" })
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
                {t("Putaway Rules")}
              </h1>
              <p style={{ fontSize: isMobile ? "0.875rem" : "1rem", opacity: 0.9, color: colors.textSecondary }}>
                {t("Manage automatic product routing to storage locations")}
              </p>
            </div>
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", width: isMobile ? "100%" : "auto" }}>
              <Button
                type="button"
                variant="outline"
                onClick={() => fetchData("putawayRules")}
                disabled={!!loading?.putawayRules}
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
                <RefreshCcw className={`w-4 h-4 ${loading?.putawayRules ? "animate-spin" : ""}`} />
                {loading?.putawayRules ? t("Loading...") : t("Refresh")}
              </Button>
              {canCreatePage("putaway") && (
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
                  onClick={handleAddNew}
                >
                  <Plus size={isMobile ? 18 : 20} />
                  {t("Add Putaway Rule")}
                </Button>
              )}
            </div>
          </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "1.25rem",
          }}
        >
          <StatCard
            label={t("Total Rules")}
            value={totalRules}
            icon={FileText}
            gradient="linear-gradient(135deg, #fa709a 0%, #fee140 100%)"
            delay={0}
          />
          <StatCard
            label={t("Active Rules")}
            value={activeRules}
            icon={MapPin}
            gradient="linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
            delay={1}
          />
          <StatCard
            label={t("Products")}
            value={uniqueProducts}
            icon={Package}
            gradient="linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
            delay={2}
          />
          <StatCard
            label={t("Locations")}
            value={uniqueLocations}
            icon={Building2}
            gradient="linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)"
            delay={3}
          />
        </div>

          <TransferFiltersBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder={t("Search putaway rules...")}
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            statusOptions={uniqueStorageCats}
            statusPlaceholder={t("Storage Category")}
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

          {loading?.putawayRules ? (
            viewMode === "cards" ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 380px), 1fr))",
                  gap: "1.25rem",
                }}
              >
                {Array.from({ length: itemsPerPage }).map((_, idx) => (
                  <PutawayCardSkeleton key={idx} colors={colors} />
                ))}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {Array.from({ length: itemsPerPage }).map((_, idx) => (
                  <div
                    key={idx}
                    style={{
                      borderRadius: "0.5rem",
                      padding: "2px",
                      background: "transparent",
                      border: `1px solid ${colors.border}`,
                    }}
                  >
                    <div
                      style={{
                        borderRadius: "calc(0.5rem - 2px)",
                        background: colors.card,
                        width: "100%",
                      }}
                    >
                      <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                        <colgroup>
                          <col style={{ width: '48px' }} />
                          <col style={{ width: '48px' }} />
                          <col />
                          <col />
                          <col />
                          <col />
                          <col style={{ width: '120px' }} />
                        </colgroup>
                        <tbody>
                          <tr>
                            <td style={{ padding: isRTL ? "0 0.75rem 0 0.25rem" : "0 0.25rem 0 0.75rem", textAlign: "center", height: "3rem" }}>
                              <div style={{ width: "16px", height: "16px", background: colors.mutedBg, borderRadius: "4px", margin: "0 auto" }} />
                            </td>
                            <td style={{ padding: "0", textAlign: "center", height: "3rem" }}>
                              <div style={{ width: "40px", height: "40px", background: colors.mutedBg, borderRadius: "0.75rem", margin: "0 auto" }} />
                            </td>
                            <td style={{ padding: "0 0.75rem", height: "3rem" }}>
                              <div style={{ width: "60px", height: "20px", background: colors.mutedBg, borderRadius: "4px" }} />
                            </td>
                            <td style={{ padding: "0 0.75rem", height: "3rem" }}>
                              <div style={{ width: "150px", height: "20px", background: colors.mutedBg, borderRadius: "4px" }} />
                            </td>
                            <td style={{ padding: "0 0.75rem", height: "3rem" }}>
                              <div style={{ width: "120px", height: "20px", background: colors.mutedBg, borderRadius: "4px" }} />
                            </td>
                            <td style={{ padding: "0 0.75rem", height: "3rem" }}>
                              <div style={{ width: "100px", height: "20px", background: colors.mutedBg, borderRadius: "4px" }} />
                            </td>
                            <td style={{ padding: "0 0.75rem", textAlign: isRTL ? "left" : "right", height: "3rem" }}>
                              <div style={{ width: "32px", height: "32px", background: colors.mutedBg, borderRadius: "4px", marginLeft: isRTL ? "0" : "auto", marginRight: isRTL ? "auto" : "0" }} />
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            <>
              {viewMode === "cards" ? (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 380px), 1fr))",
                    gap: "1.25rem",
                  }}
                >
                  {paginatedRules.map((rule: any, index: number) => (
                    <PutawayCard
                      key={rule.id ?? index}
                      rule={rule}
                      onClick={canEditPage("putaway") ? () => {
                        const ruleId = rule.raw?.id || rule.id
                        navigate(`/putaway/edit/${ruleId}`)
                      } : undefined}
                      index={index}
                      colors={colors}
                      t={t}
                    />
                  ))}
                </div>
              ) : (
                <DataTable
                  data={filteredRules}
                  rowSelection={rowSelection}
                  onRowSelectionChange={setRowSelection}
                  onSelectAllChange={setIsSelectAll}
                  onExport={canExportPage("putaway") ? () => setIsExportModalOpen(true) : undefined}
                  columns={[
                    {
                      id: "id",
                      header: t("ID"),
                      cell: ({ row }) => (
                        <span style={{ color: colors.textSecondary, fontSize: "0.875rem", fontFamily: "monospace" }}>
                          #{(row.original as any).id}
                        </span>
                      ),
                    },
                    {
                      id: "from",
                      header: t("When product arrives in"),
                      cell: ({ row }) => (
                        <span style={{ color: colors.textPrimary, fontSize: "0.875rem" }}>
                          {(row.original as any).from || "—"}
                        </span>
                      ),
                    },
                    {
                      id: "to",
                      header: t("Store To"),
                      cell: ({ row }) => (
                        <span style={{ color: colors.textPrimary, fontSize: "0.875rem" }}>
                          {(row.original as any).to || "—"}
                        </span>
                      ),
                    },
                    {
                      id: "product",
                      header: t("Product"),
                      cell: ({ row }) => (
                        <span style={{ color: colors.textPrimary, fontSize: "0.875rem", fontWeight: 500 }}>
                          {(row.original as any).productName || "—"}
                        </span>
                      ),
                    },
                    {
                      id: "storageCategory",
                      header: t("Having Category"),
                      cell: ({ row }) => (
                        <span style={{ color: colors.textSecondary, fontSize: "0.875rem" }}>
                          {(row.original as any).storageCat || "—"}
                        </span>
                      ),
                    },
                    {
                      id: "sublocation",
                      header: t("Sublocation"),
                      cell: ({ row }) => {
                        const subloc = (row.original as any).subloc
                        const sublocMap: Record<string, string> = {
                          'no': t("No"),
                          'last_used': t("Last Used"),
                          'closest_location': t("Closest Location"),
                        }
                        return (
                          <span style={{ color: colors.textSecondary, fontSize: "0.875rem" }}>
                            {sublocMap[subloc] || subloc || "—"}
                          </span>
                        )
                      },
                    },
                    {
                      id: "packageType",
                      header: t("Package Type"),
                      cell: ({ row }) => {
                        const pkgNames = (row.original as any).pkgNames || []
                        return (
                          <span style={{ color: colors.textSecondary, fontSize: "0.875rem" }}>
                            {pkgNames.length > 0 ? pkgNames.join(", ") : "—"}
                          </span>
                        )
                      },
                    },
                    {
                      id: "company",
                      header: t("Company"),
                      cell: ({ row }) => (
                        <span style={{ color: colors.textSecondary, fontSize: "0.875rem" }}>
                          {(row.original as any).company || "—"}
                        </span>
                      ),
                    },
                  ]}
                  visibleColumns={visibleColumns}
                  onVisibleColumnsChange={setVisibleColumns}
                  actions={(rule) => {
                    const r = rule as any
                    const raw = r.raw || (putawayRules || []).find((pr: any) => pr.id === r.id)
                    return [
                      ...(canEditPage("putaway") ? [{
                        key: "edit",
                        label: t("Edit"),
                        icon: Edit,
                        onClick: () => {
                        const ruleId = raw?.id || (rule as any).id
                        navigate(`/putaway/edit/${ruleId}`)
                      },
                      }] : []),
                      ...(canDeletePage("putaway") ? [{
                        key: "delete",
                        label: t("Delete"),
                        icon: Trash2,
                        onClick: () => handleDeleteClick(Number(r.id)),
                        danger: true,
                      }] : []),
                    ]
                  }}
                  actionsLabel={t("Actions")}
                  isRTL={isRTL}
                  getRowIcon={(rule: any) => {
                    const hasProduct = rule.productName && rule.productName !== "—"
                    return {
                      icon: hasProduct ? CheckCircle2 : Package,
                      gradient: hasProduct
                        ? "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)"
                        : "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
                    }
                  }}
                />
              )}

              {filteredRules.length === 0 && !loading?.putawayRules && (
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
                    {t("No putaway rules found")}
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
            </>
          )}
        </div>
      </div>

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
          onClick={() => {
            if (!dirty || window.confirm(t("Discard unsaved changes?"))) handleCloseModal()
          }}
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
                <h2 style={{ fontSize: 20, fontWeight: 700, color: "#000" }}>
                  {selectedRule ? t("Edit Putaway Rule") : t("New Putaway Rule")}
                </h2>
                <p style={{ fontSize: 13, color: "#000" }}>
                  {selectedRule?.name || ""}
                </p>
              </div>
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
                    {t("Rule Configuration")}
                  </h3>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div>
                    <NewCustomDropdown
                      label={t("When product arrives in")}
                      values={(Array.isArray(locations) ? locations : []).map((loc: any) =>
                        loc.complete_name ||
                        (Array.isArray(loc.display_name)
                          ? loc.display_name[1]
                          : loc.display_name || loc.name || String(loc.id))
                      )}
                      type="single"
                      placeholder={t("Select location...")}
                      defaultValue={
                        inLocId
                          ? (() => {
                              const found = (Array.isArray(locations) ? locations : []).find(
                                (loc: any) => String(loc.id) === inLocId
                              )
                              return found
                                ? found.complete_name ||
                                    (Array.isArray(found.display_name)
                                      ? found.display_name[1]
                                      : found.display_name || found.name || String(found.id))
                                : undefined
                            })()
                          : undefined
                      }
                      onChange={(v) => {
                        const selectedLocation = (Array.isArray(locations) ? locations : []).find(
                          (loc: any) =>
                            (loc.complete_name ||
                              (Array.isArray(loc.display_name)
                                ? loc.display_name[1]
                                : loc.display_name || loc.name || String(loc.id))) === v
                        )
                        setInLocId(selectedLocation ? String(selectedLocation.id) : "")
                        setDirty(true)
                      }}
                    />
                  </div>

                  <div>
                    <NewCustomDropdown
                      label={t("Product")}
                      values={[t("All Products"), ...(Array.isArray(productTemplates) ? productTemplates : []).map((p: any) => p.display_name || p.name || `#${p.id}`)]}
                      type="single"
                      placeholder={t("Select product...")}
                      defaultValue={
                        productId
                          ? (() => {
                              const found = (Array.isArray(productTemplates) ? productTemplates : []).find(
                                (p: any) => String(p.id) === productId
                              )
                              return found ? found.display_name || found.name || `#${found.id}` : undefined
                            })()
                          : t("All Products")
                      }
                      onChange={(v) => {
                        if (v === t("All Products")) {
                          setProductId("")
                        } else {
                          const selectedProduct = (Array.isArray(productTemplates) ? productTemplates : []).find(
                            (p: any) => (p.display_name || p.name || `#${p.id}`) === v
                          )
                          setProductId(selectedProduct ? String(selectedProduct.id) : "")
                        }
                        setDirty(true)
                      }}
                    />
                  </div>

                  <div>
                    <CustomInput
                      label={t("Product Category")}
                      type="text"
                      value={(() => {
                        const p = (Array.isArray(productTemplates) ? productTemplates : []).find(
                          (x: any) => String(x.id) === productId,
                        )
                        const cat = Array.isArray(p?.categ_id)
                          ? p.categ_id[1]
                          : p?.categ_id?.display_name || p?.categ_id?.name
                        return cat || ""
                      })()}
                      onChange={() => {}}
                      placeholder=""
                      disabled
                    />
                  </div>

                  <div>
                    <NewCustomDropdown
                      label={t("Package Type")}
                      values={(Array.isArray(packageTypes) ? packageTypes : []).map((pt: any) => pt.display_name || pt.name || `#${pt.id}`)}
                      type="multi"
                      placeholder={t("Select package types...")}
                      defaultValue={pkgTypeIds
                        .map((id) => {
                          const found = (Array.isArray(packageTypes) ? packageTypes : []).find(
                            (pt: any) => String(pt.id) === id
                          )
                          return found ? found.display_name || found.name || `#${found.id}` : null
                        })
                        .filter(Boolean) as string[]}
                      onChange={(v: string | string[]) => {
                        const values = Array.isArray(v) ? v : [v]
                        const selectedIds: string[] = []
                        for (const name of values) {
                          const found = (Array.isArray(packageTypes) ? packageTypes : []).find(
                            (pt: any) => (pt.display_name || pt.name || `#${pt.id}`) === name
                          )
                          if (found) {
                            selectedIds.push(String(found.id))
                          }
                        }
                        setPkgTypeIds(selectedIds)
                        setDirty(true)
                      }}
                    />
                  </div>

                  <div>
                    <NewCustomDropdown
                      label={t("Store To")}
                      values={(Array.isArray(locations) ? locations : []).map((loc: any) =>
                        loc.complete_name ||
                        (Array.isArray(loc.display_name)
                          ? loc.display_name[1]
                          : loc.display_name || loc.name || String(loc.id))
                      )}
                      type="single"
                      placeholder={t("Select location...")}
                      defaultValue={
                        outLocId
                          ? (() => {
                              const found = (Array.isArray(locations) ? locations : []).find(
                                (loc: any) => String(loc.id) === outLocId
                              )
                              return found
                                ? found.complete_name ||
                                    (Array.isArray(found.display_name)
                                      ? found.display_name[1]
                                      : found.display_name || found.name || String(found.id))
                                : undefined
                            })()
                          : undefined
                      }
                      onChange={(v) => {
                        const selectedLocation = (Array.isArray(locations) ? locations : []).find(
                          (loc: any) =>
                            (loc.complete_name ||
                              (Array.isArray(loc.display_name)
                                ? loc.display_name[1]
                                : loc.display_name || loc.name || String(loc.id))) === v
                        )
                        setOutLocId(selectedLocation ? String(selectedLocation.id) : "")
                        setDirty(true)
                      }}
                    />
                  </div>

                  <div>
                    <NewCustomDropdown
                      label={t("Sublocation")}
                      values={[t("No"), t("Last Used"), t("Closest Location")]}
                      type="single"
                      placeholder={t("Select sublocation...")}
                      defaultValue={
                        sublocation === "no"
                          ? t("No")
                          : sublocation === "last_used"
                            ? t("Last Used")
                            : sublocation === "closest_location"
                              ? t("Closest Location")
                              : undefined
                      }
                      onChange={(v: string | string[]) => {
                        const value = Array.isArray(v) ? v[0] : v
                        const sublocMap: Record<string, string> = {
                          [t("No")]: "no",
                          [t("Last Used")]: "last_used",
                          [t("Closest Location")]: "closest_location",
                        }
                        setSublocation(sublocMap[value] || "no")
                        setDirty(true)
                      }}
                    />
                  </div>

                  <div>
                    <NewCustomDropdown
                      label={t("Having Category")}
                      values={(Array.isArray(storageCategories) ? storageCategories : []).map((c: any) => c.display_name || c.name || `#${c.id}`)}
                      type="single"
                      placeholder={t("Select storage category...")}
                      defaultValue={
                        storageCatId
                          ? (() => {
                              const found = (Array.isArray(storageCategories) ? storageCategories : []).find(
                                (c: any) => String(c.id) === storageCatId
                              )
                              return found ? found.display_name || found.name || `#${found.id}` : undefined
                            })()
                          : undefined
                      }
                      onChange={(v) => {
                        const selectedCategory = (Array.isArray(storageCategories) ? storageCategories : []).find(
                          (c: any) => (c.display_name || c.name || `#${c.id}`) === v
                        )
                        setStorageCatId(selectedCategory ? String(selectedCategory.id) : "")
                        setDirty(true)
                      }}
                    />
                  </div>

                  <div>
                    <NewCustomDropdown
                      label={t("Company")}
                      values={(() => {
                        const uniq = new Map<string, string>()
                        for (const r of Array.isArray(putawayRules) ? putawayRules : []) {
                          const id = Array.isArray(r.company_id)
                            ? String(r.company_id[0])
                            : Number.isInteger(r.company_id)
                              ? String(r.company_id)
                              : ""
                          const name = Array.isArray(r.company_id)
                            ? String(r.company_id[1])
                            : r.company_id?.display_name || r.company_id?.name
                          if (id && name && !uniq.has(id)) uniq.set(id, name)
                        }
                        return Array.from(uniq.values())
                      })()}
                      type="single"
                      placeholder={t("Select company...")}
                      defaultValue={
                        companyId
                          ? (() => {
                              const uniq = new Map<string, string>()
                              for (const r of Array.isArray(putawayRules) ? putawayRules : []) {
                                const id = Array.isArray(r.company_id)
                                  ? String(r.company_id[0])
                                  : Number.isInteger(r.company_id)
                                    ? String(r.company_id)
                                    : ""
                                const name = Array.isArray(r.company_id)
                                  ? String(r.company_id[1])
                                  : r.company_id?.display_name || r.company_id?.name
                                if (id && name && !uniq.has(id)) uniq.set(id, name)
                              }
                              return uniq.get(companyId) || undefined
                            })()
                          : undefined
                      }
                      onChange={(v) => {
                        const uniq = new Map<string, string>()
                        for (const r of Array.isArray(putawayRules) ? putawayRules : []) {
                          const id = Array.isArray(r.company_id)
                            ? String(r.company_id[0])
                            : Number.isInteger(r.company_id)
                              ? String(r.company_id)
                              : ""
                          const name = Array.isArray(r.company_id)
                            ? String(r.company_id[1])
                            : r.company_id?.display_name || r.company_id?.name
                          if (id && name && !uniq.has(id)) uniq.set(id, name)
                        }
                        const foundId = Array.from(uniq.entries()).find(([_, name]) => name === v)?.[0]
                        setCompanyId(foundId || "")
                        setDirty(true)
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div
              style={{
                padding: "1rem 1.25rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: colors.card,
              }}
            >
              <div style={{ display: "flex", gap: "0.5rem" }}>
                {selectedRule && canDeletePage("putaway") && (
                  <button
                    onClick={() => handleDeleteClick(selectedRule.id)}
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
                {dirty && (
                  <NewCustomButton
                    label={selectedRule ? t("Save Changes") : t("Create Rule")}
                    backgroundColor="#25D0FE"
                    onClick={handleSaveRule}
                  />
                )}
                <NewCustomButton
                  label={t("Close")}
                  backgroundColor="#FFFFFF"
                  onClick={handleCloseModal}
                />
              </div>
            </div>
          </Card>
        </div>
      )}

      {canExportPage("putaway") && (
        <ExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          onExport={handleExport}
          totalRecords={filteredRules.length}
          selectedCount={Object.keys(rowSelection).length}
          isSelectAll={isSelectAll === true}
        />
      )}

      {toast && <Toast text={toast.text} state={toast.state} onClose={() => setToast(null)} />}

      <Alert
        isOpen={deleteAlertOpen}
        type="delete"
        title={t("Delete this putaway rule?")}
        message={t("This putaway rule will be permanently deleted and cannot be recovered.")}
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
function PutawayCardSkeleton(props: { colors?: any }) {
  const { colors } = props
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
              {/* Product */}
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
