"use client"

import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { useTheme } from "../context/theme"
import { useAuth } from "../context/auth"
import {
  FileText,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Eye,
  Copy,
  Trash2,
  Star,
  StarOff,
  Download,
  Clock,
  BarChart3,
  Calendar,
  LayoutGrid,
  List,
  X,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Database,
  Grid3x3,
  TrendingUp,
  Layers,
  ChevronRight,
} from "lucide-react"
import { Card, CardContent } from "../@/components/ui/card"
import { Button } from "../@/components/ui/button"
import { Input } from "../@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../@/components/ui/select"
import { StatCard } from "./components/StatCard"
import { Skeleton } from "@mui/material"
import { API_CONFIG } from "./config/api"
import Toast from "./components/Toast"
import { Badge } from "../@/components/ui/badge"

interface Template {
  id: number
  name: string
  description: string
  category_name: string
  category_icon: string
  layout_type: string
  status: string
  usage_count: number
  is_favorite: boolean
  thumbnail?: string
  created_at: string
  updated_at: string
}

interface Category {
  id: number
  name: string
  icon: string
  color?: string
}

interface DashboardStats {
  templates: number
  reports: number
  scheduled_reports: number
  recent_reports: Array<{
    id: number
    report_name: string
    status: string
    created_at: string
  }>
}

const CATEGORY_ICONS: Record<string, React.FC<{ className?: string }>> = {
  "shopping-cart": ShoppingCart,
  "box": Box,
  "warehouse": Warehouse,
  "broadcast": Broadcast,
  "calculator": Calculator,
  "file": FileText,
}

function ShoppingCart({ className }: { className?: string }) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
}

function Box({ className }: { className?: string }) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22v-9.95"/></svg>
}

function Warehouse({ className }: { className?: string }) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M20 9v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9"/><path d="M9 22V12h6v10M2 10.6L12 2l10 8.6"/></svg>
}

function Broadcast({ className }: { className?: string }) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/><circle cx="12" cy="12" r="2"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/><path d="M19.1 4.9C23 8.8 23 15.1 19.1 19"/></svg>
}

function Calculator({ className }: { className?: string }) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="16" height="20" x="4" y="2" rx="2"/><line x1="8" x2="16" y1="6" y2="6"/><line x1="16" x2="16" y1="14" y2="18"/><path d="M16 10h.01"/><path d="M12 10h.01"/><path d="M8 10h.01"/><path d="M12 14h.01"/><path d="M8 14h.01"/><path d="M12 18h.01"/><path d="M8 18h.01"/></svg>
}

const CATEGORY_COLORS: Record<string, { primary: string; secondary: string; pattern: string }> = {
  "Sales": { primary: "#3b82f6", secondary: "#1e40af", pattern: "sales" },
  "Inventory": { primary: "#f59e0b", secondary: "#d97706", pattern: "inventory" },
  "Warehouse": { primary: "#10b981", secondary: "#059669", pattern: "warehouse" },
  "RFID": { primary: "#8b5cf6", secondary: "#7c3aed", pattern: "rfid" },
  "Purchasing": { primary: "#ef4444", secondary: "#dc2626", pattern: "purchasing" },
  "Accounting": { primary: "#06b6d4", secondary: "#0891b2", pattern: "accounting" },
  "Manufacturing": { primary: "#ec4899", secondary: "#db2777", pattern: "manufacturing" },
  "Human Resources": { primary: "#84cc16", secondary: "#65a30d", pattern: "hr" },
  "Custom": { primary: "#6b7280", secondary: "#4b5563", pattern: "custom" },
}

export default function SmartReportsPage() {
  const { t, i18n } = useTranslation()
  const { colors, mode } = useTheme()
  const { sessionId } = useAuth()
  const navigate = useNavigate()
  const isRTL = i18n.dir() === "rtl"

  const [templates, setTemplates] = useState<Template[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [toast, setToast] = useState<{ text: string; state: "success" | "error" } | null>(null)
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; template: Template | null }>({ open: false, template: null })

  useEffect(() => {
    if (sessionId) {
      fetchTemplates()
      fetchCategories()
      fetchStats()
    }
  }, [sessionId])

  const fetchTemplates = async () => {
    try {
      const params = new URLSearchParams()
      if (searchQuery) params.append("search", searchQuery)
      if (categoryFilter !== "all") params.append("category_id", categoryFilter)
      if (statusFilter !== "all") params.append("status", statusFilter)
      params.append("limit", "50")

      const response = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/smart-reports/templates?${params}`, {
        headers: {
          "Content-Type": "application/json",
          "X-Session-ID": sessionId || "",
        },
      })

      if (!response.ok) throw new Error("Failed to fetch templates")

      const result = await response.json()
      if (result.success) {
        setTemplates(result.data.templates || result.data || [])
      }
    } catch (error) {
      console.error("Error fetching templates:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/smart-reports/categories`, {
        headers: {
          "Content-Type": "application/json",
          "X-Session-ID": sessionId || "",
        },
      })

      if (!response.ok) return

      const result = await response.json()
      if (result.success) {
        setCategories(result.data || [])
      }
    } catch (error) {
      console.error("Error fetching categories:", error)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/smart-reports/stats`, {
        headers: {
          "Content-Type": "application/json",
          "X-Session-ID": sessionId || "",
        },
      })

      if (!response.ok) return

      const result = await response.json()
      if (result.success) {
        setStats(result.data)
      }
    } catch (error) {
      console.error("Error fetching stats:", error)
    }
  }

  const toggleFavorite = async (template: Template) => {
    try {
      const endpoint = template.is_favorite ? "remove" : "add"
      const response = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/smart-reports/favorites`, {
        method: endpoint === "add" ? "POST" : "DELETE",
        headers: {
          "Content-Type": "application/json",
          "X-Session-ID": sessionId || "",
        },
        body: JSON.stringify({ template_id: template.id }),
      })

      if (!response.ok) throw new Error("Failed to update favorite")

      setTemplates(templates.map(t =>
        t.id === template.id ? { ...t, is_favorite: !t.is_favorite } : t
      ))
      showToast(template.is_favorite ? t("Removed from favorites") : t("Added to favorites"), "success")
    } catch (error) {
      showToast(t("Action failed"), "error")
    }
  }

  const deleteTemplate = async () => {
    if (!deleteDialog.template) return

    try {
      const response = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/smart-reports/templates/${deleteDialog.template.id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "X-Session-ID": sessionId || "",
        },
      })

      if (!response.ok) throw new Error("Failed to delete template")

      setTemplates(templates.filter(t => t.id !== deleteDialog.template!.id))
      showToast(t("Template deleted"), "success")
      setDeleteDialog({ open: false, template: null })
      fetchStats()
    } catch (error) {
      showToast(t("Failed to delete template"), "error")
    }
  }

  const cloneTemplate = async (template: Template) => {
    try {
      const response = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/smart-reports/templates/${template.id}/clone`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Session-ID": sessionId || "",
        },
        body: JSON.stringify({ name: `${template.name} (${t("Copy")})` }),
      })

      if (!response.ok) throw new Error("Failed to clone template")

      showToast(t("Template cloned"), "success")
      fetchTemplates()
      fetchStats()
    } catch (error) {
      showToast(t("Failed to clone template"), "error")
    }
  }

  const showToast = (text: string, state: "success" | "error") => {
    setToast({ text, state })
    setTimeout(() => setToast(null), 3000)
  }

  const getCategoryColor = (categoryName: string) => {
    return CATEGORY_COLORS[categoryName] || CATEGORY_COLORS["Custom"]
  }

  const getCategoryIcon = (iconName: string, className = "w-4 h-4") => {
    const IconComponent = CATEGORY_ICONS[iconName] || CATEGORY_ICONS["file"]
    return <IconComponent className={className} />
  }

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
              background: "linear-gradient(90deg, #f59e0b 0%, #ef4444 50%, #f59e0b 100%)",
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
                  background: `linear-gradient(135deg, #f59e0b 0%, #d97706 100%)`,
                  opacity: 0.2,
                }} />
                <FileText style={{ position: "relative", color: "#f59e0b", width: "1.5rem", height: "1.5rem" }} />
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
                  {t("Smart Reports")}
                </h1>
                <p style={{ fontSize: "0.8rem", color: colors.textSecondary, margin: 0 }}>
                  {t("Create and manage custom reports with visual builder")}
                </p>
              </div>
            </div>

            <div style={{ display: "flex", gap: "0.75rem" }}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/smart-reports/data-sources")}
                style={{
                  borderColor: colors.border,
                  color: colors.textPrimary,
                  background: colors.background,
                }}
              >
                <Database className="w-4 h-4" style={{ marginRight: isRTL ? 0 : "0.5rem", marginLeft: isRTL ? "0.5rem" : 0 }} />
                {t("Data Sources")}
              </Button>
              <Button
                size="sm"
                onClick={() => navigate("/smart-reports/builder")}
                style={{
                  background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                  border: "none",
                  color: "#0f172a",
                  fontWeight: "600",
                  boxShadow: "0 4px 12px rgba(245, 158, 11, 0.3)",
                }}
              >
                <Plus className="w-4 h-4" style={{ marginRight: isRTL ? 0 : "0.5rem", marginLeft: isRTL ? "0.5rem" : 0 }} />
                {t("New Template")}
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards - Industrial Design */}
        {stats && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
            {[
              { label: t("Total Templates"), value: stats.templates || 0, icon: FileText, color: "#3b82f6" },
              { label: t("Reports Generated"), value: stats.reports || 0, icon: BarChart3, color: "#10b981" },
              { label: t("Scheduled Reports"), value: stats.scheduled_reports || 0, icon: Calendar, color: "#8b5cf6" },
              { label: t("Favorites"), value: templates.filter(t => t.is_favorite).length, icon: Star, color: "#f59e0b" },
            ].map((stat, index) => (
              <div
                key={stat.label}
                style={{
                  background: colors.card,
                  border: `1px solid ${colors.border}`,
                  borderRadius: "0.875rem",
                  padding: "1.25rem",
                  position: "relative",
                  overflow: "hidden",
                  animation: `slideIn 0.4s ease ${index * 0.08}s both`,
                }}
              >
                <div style={{
                  position: "absolute",
                  top: 0,
                  right: 0,
                  width: "80px",
                  height: "80px",
                  background: stat.color + "10",
                  borderRadius: "50%",
                  transform: "translate(30%, -30%)",
                }} />
                <div style={{ position: "relative", display: "flex", alignItems: "center", gap: "1rem" }}>
                  <div style={{
                    width: "2.5rem",
                    height: "2.5rem",
                    borderRadius: "0.5rem",
                    background: stat.color + "20",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}>
                    <stat.icon style={{ color: stat.color, width: "1.25rem", height: "1.25rem" }} />
                  </div>
                  <div>
                    <p style={{ fontSize: "0.75rem", color: colors.textSecondary, margin: 0, fontWeight: "500" }}>{stat.label}</p>
                    <p style={{ fontSize: "1.5rem", fontWeight: "700", color: colors.textPrimary, margin: "0.25rem 0 0 0" }}>{stat.value}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Filters Bar */}
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
                placeholder={t("Search templates...")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && fetchTemplates()}
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
                  onClick={() => { setSearchQuery(""); fetchTemplates() }}
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

            {/* Category Filter */}
            <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); fetchTemplates(); }}>
              <SelectTrigger style={{
                width: "170px",
                background: colors.background,
                borderColor: colors.border,
                color: colors.textPrimary,
                borderRadius: "0.625rem",
              }}>
                <SelectValue placeholder={t("Category")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("All")}</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id.toString()}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      {getCategoryIcon(cat.icon)}
                      {cat.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); fetchTemplates(); }}>
              <SelectTrigger style={{
                width: "140px",
                background: colors.background,
                borderColor: colors.border,
                color: colors.textPrimary,
                borderRadius: "0.625rem",
              }}>
                <SelectValue placeholder={t("Status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("All")}</SelectItem>
                <SelectItem value="published">{t("Published")}</SelectItem>
                <SelectItem value="draft">{t("Draft")}</SelectItem>
              </SelectContent>
            </Select>

            {/* View Toggle */}
            <div style={{
              display: "flex",
              background: colors.background,
              borderRadius: "0.625rem",
              padding: "0.25rem",
              border: `1px solid ${colors.border}`,
            }}>
              <button
                onClick={() => setViewMode("grid")}
                style={{
                  padding: "0.5rem",
                  borderRadius: "0.5rem",
                  background: viewMode === "grid" ? "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)" : "transparent",
                  color: viewMode === "grid" ? "#0f172a" : colors.textSecondary,
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                style={{
                  padding: "0.5rem",
                  borderRadius: "0.5rem",
                  background: viewMode === "list" ? "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)" : "transparent",
                  color: viewMode === "list" ? "#0f172a" : colors.textSecondary,
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Templates Grid/List */}
        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} variant="rectangular" width="100%" height={180} style={{ borderRadius: "0.875rem" }} />
            ))}
          </div>
        ) : templates.length === 0 ? (
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
              background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
              marginBottom: "1rem",
            }}>
              <FileText style={{ color: "#0f172a", width: "2rem", height: "2rem" }} />
            </div>
            <h3 style={{ fontSize: "1rem", fontWeight: "600", color: colors.textPrimary, marginBottom: "0.5rem" }}>
              {t("No templates found")}
            </h3>
            <p style={{ fontSize: "0.875rem", color: colors.textSecondary, marginBottom: "1.5rem" }}>
              {t("Create your first report template or adjust your filters")}
            </p>
            <Button
              onClick={() => navigate("/smart-reports/builder")}
              style={{
                background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                border: "none",
                color: "#0f172a",
                fontWeight: "600",
              }}
            >
              <Plus className="w-4 h-4" style={{ marginRight: isRTL ? 0 : "0.5rem", marginLeft: isRTL ? "0.5rem" : 0 }} />
              {t("Create Template")}
            </Button>
          </div>
        ) : viewMode === "grid" ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1rem" }}>
            {templates.map((template, index) => {
              const catColor = getCategoryColor(template.category_name)
              return (
                <Card
                  key={template.id}
                  className="template-card"
                  style={{
                    position: "relative",
                    overflow: "hidden",
                    cursor: "pointer",
                    animation: `slideIn 0.4s ease ${index * 0.06}s both`,
                    background: colors.card,
                    border: `1px solid ${colors.border}`,
                    borderRadius: "0.875rem",
                  }}
                  onClick={() => navigate(`/smart-reports/builder/${template.id}`)}
                >
                  {/* Technical pattern accent */}
                  <div style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: "4px",
                    background: `linear-gradient(90deg, ${catColor.primary} 0%, ${catColor.secondary} 100%)`,
                  }} />

                  <CardContent style={{ padding: "1.25rem" }}>
                    {/* Header */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
                        <div style={{
                          width: "2.75rem",
                          height: "2.75rem",
                          borderRadius: "0.625rem",
                          background: `linear-gradient(135deg, ${catColor.primary} 0%, ${catColor.secondary} 100%)`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "white",
                          position: "relative",
                        }}>
                          <div style={{
                            position: "absolute",
                            inset: "3px",
                            borderRadius: "0.5rem",
                            background: "white",
                            opacity: 0.2,
                          }} />
                          {getCategoryIcon(template.category_icon, "w-5 h-5")}
                          <div style={{
                            position: "absolute",
                            bottom: "-2px",
                            right: "-2px",
                            width: "8px",
                            height: "8px",
                            background: template.status === "published" ? "#10b981" : "#6b7280",
                            borderRadius: "50%",
                            border: `2px solid ${colors.card}`,
                          }} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <h3 style={{
                            fontSize: "0.95rem",
                            fontWeight: "600",
                            color: colors.textPrimary,
                            margin: 0,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}>
                            {template.name}
                          </h3>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.25rem" }}>
                            <span style={{ fontSize: "0.7rem", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                              {template.category_name}
                            </span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleFavorite(template); }}
                        style={{ background: "none", border: "none", cursor: "pointer", padding: "0.25rem", transition: "transform 0.2s" }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.2)"}
                        onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
                      >
                        {template.is_favorite ? (
                          <Star className="w-4 h-4" style={{ fill: "#f59e0b", color: "#f59e0b" }} />
                        ) : (
                          <StarOff className="w-4 h-4" style={{ color: colors.textSecondary }} />
                        )}
                      </button>
                    </div>

                    {/* Description */}
                    {template.description && (
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
                        {template.description}
                      </p>
                    )}

                    {/* Footer */}
                    <div style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      paddingTop: "0.75rem",
                      borderTop: `1px solid ${colors.border}40`,
                    }}>
                      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                        <Badge variant={template.status === "published" ? "default" : "secondary"} style={{
                          fontSize: "0.65rem",
                          padding: "0.125rem 0.5rem",
                          background: template.status === "published" ? "#10b98120" : colors.mutedBg,
                          color: template.status === "published" ? "#10b981" : colors.textSecondary,
                        }}>
                          {template.status === "published" ? t("Published") : t("Draft")}
                        </Badge>
                        <span style={{ fontSize: "0.7rem", color: colors.textSecondary }}>
                          {t("Usage")}: {template.usage_count}
                        </span>
                      </div>
                      <div style={{
                        width: "1.75rem",
                        height: "1.75rem",
                        borderRadius: "0.375rem",
                        background: colors.background,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}>
                        <ChevronRight className="w-4 h-4" style={{ color: colors.textSecondary }} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        ) : (
          <Card style={{ border: `1px solid ${colors.border}`, overflow: "hidden", borderRadius: "0.875rem" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${colors.border}`, background: colors.mutedBg }}>
                  <th style={{ padding: "1rem", textAlign: isRTL ? "right" : "left", fontSize: "0.75rem", fontWeight: "600", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {t("Template Name")}
                  </th>
                  <th style={{ padding: "1rem", textAlign: isRTL ? "right" : "left", fontSize: "0.75rem", fontWeight: "600", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {t("Category")}
                  </th>
                  <th style={{ padding: "1rem", textAlign: isRTL ? "right" : "left", fontSize: "0.75rem", fontWeight: "600", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {t("Status")}
                  </th>
                  <th style={{ padding: "1rem", textAlign: isRTL ? "right" : "left", fontSize: "0.75rem", fontWeight: "600", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {t("Usage")}
                  </th>
                  <th style={{ padding: "1rem", textAlign: "center", fontSize: "0.75rem", fontWeight: "600", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {t("Actions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {templates.map((template) => {
                  const catColor = getCategoryColor(template.category_name)
                  return (
                    <tr
                      key={template.id}
                      style={{
                        borderBottom: `1px solid ${colors.border}40`,
                        transition: "background 0.2s",
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = colors.mutedBg}
                      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                    >
                      <td style={{ padding: "1rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                          <div style={{
                            width: "2rem",
                            height: "2rem",
                            borderRadius: "0.375rem",
                            background: `linear-gradient(135deg, ${catColor.primary} 0%, ${catColor.secondary} 100%)`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "white",
                          }}>
                            {getCategoryIcon(template.category_icon)}
                          </div>
                          <span style={{ color: colors.textPrimary, fontWeight: "500" }}>{template.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: "1rem", color: colors.textSecondary }}>{template.category_name}</td>
                      <td style={{ padding: "1rem" }}>
                        <Badge variant={template.status === "published" ? "default" : "secondary"} style={{
                          background: template.status === "published" ? "#10b98120" : colors.mutedBg,
                          color: template.status === "published" ? "#10b981" : colors.textSecondary,
                        }}>
                          {template.status === "published" ? t("Published") : t("Draft")}
                        </Badge>
                      </td>
                      <td style={{ padding: "1rem", color: colors.textSecondary }}>{template.usage_count}</td>
                      <td style={{ padding: "1rem" }}>
                        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center" }}>
                          <Button variant="ghost" size="sm" onClick={() => navigate(`/smart-reports/builder/${template.id}`)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => cloneTemplate(template)}>
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => toggleFavorite(template)}>
                            {template.is_favorite ? (
                              <Star className="w-4 h-4" style={{ fill: "#f59e0b", color: "#f59e0b" }} />
                            ) : (
                              <StarOff className="w-4 h-4" />
                            )}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setDeleteDialog({ open: true, template })}>
                            <Trash2 className="w-4 h-4" style={{ color: "#ef4444" }} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </Card>
        )}

        {/* Toast */}
        {toast && (
          <Toast
            text={toast.text}
            state={toast.state}
            onClose={() => setToast(null)}
          />
        )}

        {/* Delete Dialog */}
        {deleteDialog.open && (
          <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)" }}>
            <div style={{
              background: colors.card,
              borderRadius: "1rem",
              padding: "1.5rem",
              maxWidth: "400px",
              width: "90%",
              border: `1px solid ${colors.border}`,
            }}>
              <h3 style={{ fontSize: "1.1rem", fontWeight: "600", color: colors.textPrimary, marginBottom: "0.5rem" }}>
                {t("Delete Template")}
              </h3>
              <p style={{ fontSize: "0.875rem", color: colors.textSecondary, marginBottom: "1.5rem" }}>
                {t("Are you sure you want to delete this template? This action cannot be undone.")}
              </p>
              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
                <Button variant="outline" onClick={() => setDeleteDialog({ open: false, template: null })}>
                  {t("Cancel")}
                </Button>
                <Button
                  variant="destructive"
                  onClick={deleteTemplate}
                  style={{ background: "#ef4444", border: "none" }}
                >
                  {t("Delete")}
                </Button>
              </div>
            </div>
          </div>
        )}
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
        .template-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px ${colors.border}40;
        }
      `}</style>
    </div>
  )
}
