"use client"

import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { useTheme } from "../context/theme"
import { useAuth } from "../context/auth"
import {
  Database,
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  ArrowLeft,
  Filter,
  CheckCircle2,
  AlertCircle,
  Server,
  Code,
  Globe,
  FileJson,
  RefreshCw,
  ChevronDown,
  Zap,
  Play,
  X,
} from "lucide-react"
import { Card, CardContent } from "../@/components/ui/card"
import { Button } from "../@/components/ui/button"
import { Input } from "../@/components/ui/input"
import { Textarea } from "../@/components/ui/textarea"
import { Label } from "../@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../@/components/ui/select"
import { Badge } from "../@/components/ui/badge"
import { API_CONFIG } from "./config/api"
import Toast from "./components/Toast"
import { Skeleton } from "@mui/material"

type DataSourceType = "odoo_model" | "sql_query" | "external_api" | "static_data"

interface DataSource {
  id: number
  name: string
  description: string
  source_type: DataSourceType
  odoo_model?: string
  domain?: string
  fields?: string
  sql_query?: string
  api_url?: string
  api_method?: string
  api_headers?: string
  is_active: boolean
  sample_data?: any
  created_at: string
  updated_at: string
}

interface OdooModel {
  name: string
  description?: string
}

const SOURCE_TYPE_ICONS: Record<DataSourceType, React.FC<{ className?: string }>> = {
  odoo_model: Server,
  sql_query: Code,
  external_api: Globe,
  static_data: FileJson,
}

const SOURCE_TYPE_COLORS: Record<DataSourceType, { primary: string; secondary: string; bg: string }> = {
  odoo_model: { primary: "#3b82f6", secondary: "#1e40af", bg: "#3b82f610" },
  sql_query: { primary: "#8b5cf6", secondary: "#7c3aed", bg: "#8b5cf610" },
  external_api: { primary: "#06b6d4", secondary: "#0891b2", bg: "#06b6d410" },
  static_data: { primary: "#10b981", secondary: "#059669", bg: "#10b98110" },
}

const ODOO_MODELS = [
  "sale.order", "purchase.order", "stock.picking", "stock.quant",
  "account.move", "product.product", "product.template",
  "mrp.production", "hr.employee", "fleet.vehicle",
]

export default function SmartReportsDataSourcesPage() {
  const { t, i18n } = useTranslation()
  const { colors, mode } = useTheme()
  const { sessionId } = useAuth()
  const navigate = useNavigate()
  const isRTL = i18n.dir() === "rtl"

  const [dataSources, setDataSources] = useState<DataSource[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [toast, setToast] = useState<{ text: string; state: "success" | "error" } | null>(null)

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [editingSource, setEditingSource] = useState<DataSource | null>(null)
  const [previewData, setPreviewData] = useState<any>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  // Form state
  const [formData, setFormData] = useState<Partial<DataSource>>({
    name: "",
    description: "",
    source_type: "odoo_model",
    odoo_model: "",
    sql_query: "",
    api_url: "",
    api_method: "GET",
    is_active: true,
  })

  useEffect(() => {
    if (sessionId) {
      fetchDataSources()
    }
  }, [sessionId])

  const fetchDataSources = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchQuery) params.append("search", searchQuery)
      if (typeFilter !== "all") params.append("source_type", typeFilter)
      params.append("limit", "50")

      const response = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/smart-reports/data-sources?${params}`, {
        headers: { "Content-Type": "application/json", "X-Session-ID": sessionId || "" },
      })

      if (!response.ok) throw new Error("Failed to fetch data sources")

      const result = await response.json()
      setDataSources(result.data.data_sources || result.data || [])
    } catch (error) {
      console.error("Error fetching data sources:", error)
    } finally {
      setLoading(false)
    }
  }

  const saveDataSource = async () => {
    try {
      const endpoint = editingSource ? `/smart-reports/data-sources/${editingSource.id}` : "/smart-reports/data-sources"
      const method = editingSource ? "PUT" : "POST"

      const response = await fetch(`${API_CONFIG.BACKEND_BASE_URL}${endpoint}`, {
        method,
        headers: { "Content-Type": "application/json", "X-Session-ID": sessionId || "" },
        body: JSON.stringify(formData),
      })

      if (!response.ok) throw new Error("Failed to save data source")

      showToast(editingSource ? t("Data source updated") : t("Data source created"), "success")
      setShowCreateModal(false)
      setEditingSource(null)
      resetForm()
      fetchDataSources()
    } catch (error) {
      showToast(t("Failed to save data source"), "error")
    }
  }

  const deleteDataSource = async (id: number) => {
    if (!confirm(t("Are you sure you want to delete this data source?"))) return

    try {
      await fetch(`${API_CONFIG.BACKEND_BASE_URL}/smart-reports/data-sources/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", "X-Session-ID": sessionId || "" },
      })

      showToast(t("Data source deleted"), "success")
      fetchDataSources()
    } catch (error) {
      showToast(t("Failed to delete data source"), "error")
    }
  }

  const previewDataSource = async (source: DataSource) => {
    setPreviewLoading(true)
    setShowPreviewModal(true)

    try {
      const response = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/smart-reports/data-sources/${source.id}/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session-ID": sessionId || "" },
        body: JSON.stringify({ parameters: {} }),
      })

      if (!response.ok) throw new Error("Failed to load preview")

      const result = await response.json()
      setPreviewData(result.data)
    } catch (error) {
      showToast(t("Failed to load preview"), "error")
      setPreviewData(null)
    } finally {
      setPreviewLoading(false)
    }
  }

  const openEditModal = (source: DataSource) => {
    setEditingSource(source)
    setFormData(source)
    setShowCreateModal(true)
  }

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      source_type: "odoo_model",
      odoo_model: "",
      sql_query: "",
      api_url: "",
      api_method: "GET",
      is_active: true,
    })
  }

  const showToast = (text: string, state: "success" | "error") => {
    setToast({ text, state })
    setTimeout(() => setToast(null), 3000)
  }

  const filteredSources = dataSources.filter((source) => {
    const matchesSearch = !searchQuery || source.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = typeFilter === "all" || source.source_type === typeFilter
    return matchesSearch && matchesType
  })

  return (
    <div style={{ minHeight: "100vh", background: colors.background }}>
      {/* Technical Grid Background */}
      <div style={{
        position: "fixed",
        inset: 0,
        backgroundImage: `
          linear-gradient(to right, ${colors.border}20 1px, transparent 1px),
          linear-gradient(to bottom, ${colors.border}20 1px, transparent 1px)
        `,
        backgroundSize: "40px 40px",
        pointerEvents: "none",
        opacity: mode === "dark" ? 0.3 : 0.5,
        zIndex: 0,
      }} />

      <div style={{ position: "relative", zIndex: 1, padding: "1.5rem" }}>
        {/* Header */}
        <div style={{ marginBottom: "2rem" }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "1rem",
            padding: "1.5rem",
            background: colors.card,
            borderRadius: "1rem",
            border: `1px solid ${colors.border}`,
            position: "relative",
            overflow: "hidden",
          }}>
            {/* Decorative accent line */}
            <div style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "3px",
              background: "linear-gradient(90deg, #3b82f6 0%, #8b5cf6 50%, #06b6d4 100%)",
            }} />

            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <div style={{
                width: "3.5rem",
                height: "3.5rem",
                borderRadius: "0.75rem",
                background: "linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
              }}>
                <div style={{
                  position: "absolute",
                  inset: "2px",
                  borderRadius: "0.6rem",
                  background: `linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)`,
                  opacity: 0.3,
                }} />
                <Database style={{ position: "relative", color: "#3b82f6", width: "1.5rem", height: "1.5rem" }} />
              </div>
              <div>
                <h1 style={{
                  fontSize: "1.5rem",
                  fontWeight: "700",
                  color: colors.textPrimary,
                  margin: 0,
                  marginBottom: "0.25rem",
                  letterSpacing: "-0.02em",
                }}>
                  {t("Data Sources")}
                </h1>
                <p style={{ fontSize: "0.8rem", color: colors.textSecondary, margin: 0 }}>
                  {t("Configure data sources for your reports")}
                </p>
              </div>
            </div>

            <div style={{ display: "flex", gap: "0.75rem" }}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/smart-reports")}
                style={{
                  borderColor: colors.border,
                  color: colors.textPrimary,
                  background: colors.background,
                }}
              >
                <ArrowLeft className="w-4 h-4" style={{ marginRight: isRTL ? 0 : "0.5rem", marginLeft: isRTL ? "0.5rem" : 0 }} />
                {t("Back")}
              </Button>
              <Button
                size="sm"
                onClick={() => { resetForm(); setEditingSource(null); setShowCreateModal(true); }}
                style={{
                  background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
                  border: "none",
                  color: "white",
                  fontWeight: "600",
                  boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)",
                }}
              >
                <Plus className="w-4 h-4" style={{ marginRight: isRTL ? 0 : "0.5rem", marginLeft: isRTL ? "0.5rem" : 0 }} />
                {t("New Data Source")}
              </Button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div style={{
          background: colors.card,
          borderRadius: "0.875rem",
          padding: "1rem",
          marginBottom: "1.5rem",
          border: `1px solid ${colors.border}`,
        }}>
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
            {/* Search */}
            <div style={{ position: "relative", flex: "1", minWidth: "240px" }}>
              <Search style={{
                position: "absolute",
                [isRTL ? "right" : "left"]: "0.875rem",
                top: "50%",
                transform: "translateY(-50%)",
                width: "1.125rem",
                height: "1.125rem",
                color: colors.textSecondary,
              }} />
              <Input
                placeholder={t("Search data sources...")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && fetchDataSources()}
                style={{
                  paddingLeft: isRTL ? "1rem" : "2.75rem",
                  paddingRight: isRTL ? "2.75rem" : "1rem",
                  background: colors.background,
                  borderColor: colors.border,
                  color: colors.textPrimary,
                  borderRadius: "0.625rem",
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => { setSearchQuery(""); fetchDataSources() }}
                  style={{
                    position: "absolute",
                    [isRTL ? "left" : "right"]: "0.875rem",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: colors.textSecondary,
                    cursor: "pointer",
                    padding: "0.25rem",
                    borderRadius: "0.25rem",
                  }}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Type Filter */}
            <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); fetchDataSources(); }}>
              <SelectTrigger style={{
                width: "180px",
                background: colors.background,
                borderColor: colors.border,
                color: colors.textPrimary,
                borderRadius: "0.625rem",
              }}>
                <SelectValue placeholder={t("Filter by type")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("All Types")}</SelectItem>
                <SelectItem value="odoo_model">{t("Odoo Model")}</SelectItem>
                <SelectItem value="sql_query">{t("SQL Query")}</SelectItem>
                <SelectItem value="external_api">{t("External API")}</SelectItem>
                <SelectItem value="static_data">{t("Static Data")}</SelectItem>
              </SelectContent>
            </Select>

            {/* Refresh */}
            <Button variant="outline" size="sm" onClick={fetchDataSources}>
              <RefreshCw className="w-4 h-4" style={{ marginRight: isRTL ? 0 : "0.5rem", marginLeft: isRTL ? "0.5rem" : 0 }} />
              {t("Refresh")}
            </Button>
          </div>
        </div>

        {/* Data Sources Grid */}
        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1rem" }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} variant="rectangular" width="100%" height={180} style={{ borderRadius: "0.875rem" }} />
            ))}
          </div>
        ) : filteredSources.length === 0 ? (
          <div style={{
            textAlign: "center",
            padding: "4rem 2rem",
            background: colors.card,
            borderRadius: "1rem",
            border: `2px dashed ${colors.border}`,
          }}>
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "4rem",
              height: "4rem",
              borderRadius: "1rem",
              background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
              marginBottom: "1rem",
            }}>
              <Database style={{ color: "white", width: "2rem", height: "2rem" }} />
            </div>
            <h3 style={{ fontSize: "1rem", fontWeight: "600", color: colors.textPrimary, marginBottom: "0.5rem" }}>
              {t("No data sources found")}
            </h3>
            <p style={{ fontSize: "0.875rem", color: colors.textSecondary, marginBottom: "1.5rem" }}>
              {t("Create your first data source to get started")}
            </p>
            <Button
              onClick={() => { resetForm(); setEditingSource(null); setShowCreateModal(true); }}
              style={{
                background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
                border: "none",
                color: "white",
                fontWeight: "600",
              }}
            >
              <Plus className="w-4 h-4" style={{ marginRight: isRTL ? 0 : "0.5rem", marginLeft: isRTL ? "0.5rem" : 0 }} />
              {t("New Data Source")}
            </Button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "1rem" }}>
            {filteredSources.map((source, index) => {
              const typeColors = SOURCE_TYPE_COLORS[source.source_type]
              const Icon = SOURCE_TYPE_ICONS[source.source_type]
              return (
                <Card
                  key={source.id}
                  className="data-source-card"
                  style={{
                    position: "relative",
                    overflow: "hidden",
                    animation: `slideIn 0.4s ease ${index * 0.06}s both`,
                    background: colors.card,
                    border: `1px solid ${colors.border}`,
                    borderRadius: "0.875rem",
                    transition: "all 0.3s ease",
                  }}
                >
                  {/* Accent */}
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      height: "4px",
                      background: `linear-gradient(90deg, ${typeColors.primary} 0%, ${typeColors.secondary} 100%)`,
                    }}
                  />

                  <CardContent style={{ padding: "1.25rem" }}>
                    {/* Header */}
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem", marginBottom: "1rem" }}>
                      <div
                        style={{
                          width: "3rem",
                          height: "3rem",
                          borderRadius: "0.625rem",
                          background: `linear-gradient(135deg, ${typeColors.primary} 0%, ${typeColors.secondary} 100%)`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "white",
                          flexShrink: 0,
                          position: "relative",
                        }}
                      >
                        <div style={{
                          position: "absolute",
                          inset: "3px",
                          borderRadius: "0.5rem",
                          background: "white",
                          opacity: 0.2,
                        }} />
                        <div style={{ position: "relative" }}>
                          <Icon className="w-5 h-5" />
                        </div>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h3 style={{
                          fontSize: "1rem",
                          fontWeight: "600",
                          color: colors.textPrimary,
                          margin: 0,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}>
                          {source.name}
                        </h3>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.25rem" }}>
                          <Badge style={{
                            fontSize: "0.65rem",
                            padding: "0.125rem 0.5rem",
                            background: typeColors.bg,
                            color: typeColors.primary,
                          }}>
                            {source.source_type.replace("_", " ")}
                          </Badge>
                          {source.odoo_model && (
                            <span style={{ fontSize: "0.7rem", color: colors.textSecondary, fontFamily: "monospace" }}>
                              {source.odoo_model}
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        background: source.is_active ? "#10b981" : "#6b7280",
                        flexShrink: 0,
                      }} />
                    </div>

                    {/* Description */}
                    {source.description && (
                      <p style={{
                        fontSize: "0.8rem",
                        color: colors.textSecondary,
                        marginBottom: "1rem",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                        lineHeight: "1.4",
                      }}>
                        {source.description}
                      </p>
                    )}

                    {/* Connection Info */}
                    {source.api_url && (
                      <div style={{
                        fontSize: "0.7rem",
                        color: colors.textSecondary,
                        marginBottom: "1rem",
                        fontFamily: "monospace",
                        padding: "0.5rem",
                        background: colors.background,
                        borderRadius: "0.375rem",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}>
                        {source.api_url}
                      </div>
                    )}

                    {/* Actions */}
                    <div style={{
                      display: "flex",
                      gap: "0.5rem",
                      justifyContent: "flex-end",
                      paddingTop: "0.75rem",
                      borderTop: `1px solid ${colors.border}40`,
                    }}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => previewDataSource(source)}
                        style={{ color: typeColors.primary }}
                      >
                        <Play className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditModal(source)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteDataSource(source.id)}
                      >
                        <Trash2 className="w-4 h-4" style={{ color: "#ef4444" }} />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* Create/Edit Modal */}
        {showCreateModal && (
          <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)" }}>
            <div style={{
              background: colors.card,
              borderRadius: "1rem",
              padding: "1.5rem",
              maxWidth: "600px",
              width: "90%",
              maxHeight: "80vh",
              overflowY: "auto",
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                <h2 style={{ fontSize: "1.25rem", fontWeight: "600", color: colors.textPrimary, margin: 0 }}>
                  {editingSource ? t("Edit Data Source") : t("New Data Source")}
                </h2>
                <Button variant="ghost" size="sm" onClick={() => { setShowCreateModal(false); setEditingSource(null); }}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                <div>
                  <Label>{t("Name")} *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={t("Data source name")}
                  />
                </div>

                <div>
                  <Label>{t("Description")}</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder={t("Add description...")}
                    rows={2}
                  />
                </div>

                <div>
                  <Label>{t("Source Type")} *</Label>
                  <Select
                    value={formData.source_type}
                    onValueChange={(v: DataSourceType) => setFormData({ ...formData, source_type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="odoo_model">
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <Server className="w-4 h-4" />
                          {t("Odoo Model")}
                        </div>
                      </SelectItem>
                      <SelectItem value="sql_query">
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <Code className="w-4 h-4" />
                          {t("SQL Query")}
                        </div>
                      </SelectItem>
                      <SelectItem value="external_api">
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <Globe className="w-4 h-4" />
                          {t("External API")}
                        </div>
                      </SelectItem>
                      <SelectItem value="static_data">
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <FileJson className="w-4 h-4" />
                          {t("Static Data")}
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.source_type === "odoo_model" && (
                  <>
                    <div>
                      <Label>{t("Model")} *</Label>
                      <Select
                        value={formData.odoo_model}
                        onValueChange={(v) => setFormData({ ...formData, odoo_model: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t("Select a model")} />
                        </SelectTrigger>
                        <SelectContent>
                          {ODOO_MODELS.map((model) => (
                            <SelectItem key={model} value={model}>
                              {model}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>{t("Domain Filter")} (optional)</Label>
                      <Input
                        value={formData.domain}
                        onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                        placeholder="[('state', '=', 'done')]"
                        style={{ fontFamily: "monospace" }}
                      />
                    </div>
                  </>
                )}

                {formData.source_type === "sql_query" && (
                  <div>
                    <Label>{t("SQL Query")} *</Label>
                    <Textarea
                      value={formData.sql_query}
                      onChange={(e) => setFormData({ ...formData, sql_query: e.target.value })}
                      placeholder="SELECT * FROM table WHERE..."
                      rows={4}
                      style={{ fontFamily: "monospace" }}
                    />
                  </div>
                )}

                {formData.source_type === "external_api" && (
                  <>
                    <div>
                      <Label>{t("API URL")} *</Label>
                      <Input
                        value={formData.api_url}
                        onChange={(e) => setFormData({ ...formData, api_url: e.target.value })}
                        placeholder="https://api.example.com/endpoint"
                      />
                    </div>
                    <div>
                      <Label>{t("Method")}</Label>
                      <Select
                        value={formData.api_method}
                        onValueChange={(v) => setFormData({ ...formData, api_method: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="GET">GET</SelectItem>
                          <SelectItem value="POST">POST</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
              </div>

              <div style={{ marginTop: "1.5rem", display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
                <Button variant="outline" onClick={() => { setShowCreateModal(false); setEditingSource(null); }}>
                  {t("Cancel")}
                </Button>
                <Button
                  onClick={saveDataSource}
                  disabled={!formData.name}
                  style={{
                    background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
                    border: "none",
                    color: "white",
                  }}
                >
                  {editingSource ? t("Update") : t("Create")}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Preview Modal */}
        {showPreviewModal && (
          <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)" }}>
            <div style={{
              background: colors.card,
              borderRadius: "1rem",
              padding: "1.5rem",
              maxWidth: "800px",
              width: "90%",
              maxHeight: "80vh",
              overflow: "auto",
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h2 style={{ fontSize: "1.25rem", fontWeight: "600", color: colors.textPrimary, margin: 0 }}>
                  {t("Data Preview")}
                </h2>
                <Button variant="ghost" size="sm" onClick={() => setShowPreviewModal(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {previewLoading ? (
                <div style={{ padding: "2rem", textAlign: "center" }}>
                  <RefreshCw className="w-8 h-8" style={{ margin: "0 auto 1rem", animation: "spin 1s linear infinite" }} />
                  <p style={{ color: colors.textSecondary }}>{t("Loading data...")}</p>
                </div>
              ) : previewData ? (
                <div style={{ overflow: "auto", maxHeight: "500px" }}>
                  <pre style={{
                    background: colors.background,
                    padding: "1rem",
                    borderRadius: "0.5rem",
                    fontSize: "0.8rem",
                    overflow: "auto",
                    color: colors.textPrimary,
                  }}>
                    {JSON.stringify(previewData, null, 2)}
                  </pre>
                </div>
              ) : (
                <div style={{ padding: "2rem", textAlign: "center", color: colors.textSecondary }}>
                  <AlertCircle className="w-8 h-8" style={{ margin: "0 auto 0.5rem" }} />
                  <p>{t("No data available")}</p>
                </div>
              )}

              <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            </div>
          </div>
        )}

        {/* Toast */}
        {toast && <Toast text={toast.text} state={toast.state} onClose={() => setToast(null)} />}
      </div>

      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .data-source-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px ${colors.border}40;
        }
      `}</style>
    </div>
  )
}
