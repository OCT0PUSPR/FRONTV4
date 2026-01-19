"use client"

import { useState, useEffect, useRef } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate, useParams } from "react-router-dom"
import { useTheme } from "../context/theme"
import { useAuth } from "../context/auth"
import * as LucideIcons from "lucide-react"
import {
  Save,
  Eye,
  Plus,
  Trash2,
  ArrowLeft,
  X,
  ChevronUp,
  ChevronDown,
  GripVertical,
  Building2,
  FileText,
  Type,
  Table,
  Package,
  Signature,
  Hash,
  Check,
  Minus,
  Square,
  Settings,
  Database,
} from "lucide-react"
import { Button } from "../@/components/ui/button"
import { Input } from "../@/components/ui/input"
import { Label } from "../@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../@/components/ui/select"
import { API_CONFIG, getCurrentTenantId } from "./config/api"
import Toast from "./components/Toast"
import {
  ReportTemplate,
  ReportSection,
  SectionType,
  ModelField,
  OdooModel,
  A4_WIDTH,
  A4_HEIGHT,
  SECTION_TYPES,
  LUCIDE_ICONS,
  SectionPreview,
  SectionEditor,
} from "./components/smartReports"

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function SmartReportsBuilderPage() {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const { sessionId } = useAuth()
  const navigate = useNavigate()
  const params = useParams()
  const templateId = params.id

  // Template state
  const [template, setTemplate] = useState<ReportTemplate>({
    name: "",
    description: "",
    odooModel: "stock.picking",
    sections: [
      {
        id: "sec_header",
        type: "header",
        enabled: true,
        documentTitle: "RECEIPT",
        leftFields: [
          { field: "name", label: "Reference", enabled: true },
          { field: "scheduled_date", label: "Date", enabled: true },
          { field: "partner_id.name", label: "Partner", enabled: true },
        ],
        showLogo: false,
        rightFields: [
          { field: "name", label: "Company Name", enabled: true },
          { field: "street", label: "Address", enabled: true },
          { field: "city", label: "City", enabled: true },
          { field: "phone", label: "Phone", enabled: true },
        ],
      },
      {
        id: "sec_products",
        type: "products",
        enabled: true,
        title: "Items Received",
        showImages: false,
        showSKU: true,
        showQuantity: true,
        showPrice: false,
        showRFID: true,
        showTotal: false,
        columns: [],
        showSectionTotal: true,
        showRowNumbers: true,
      },
      {
        id: "sec_signature",
        type: "signature",
        enabled: true,
        signatures: [
          {
            id: "sig_1",
            label: "Warehouse Manager",
            required: true,
            showDate: true,
            showPrintedName: false,
          },
          {
            id: "sig_2",
            label: "Receiver",
            required: true,
            showDate: true,
            showPrintedName: false,
          },
        ],
        layout: "horizontal",
      },
    ],
    primaryColor: "#1a1a1a",
    borderColor: "#e5e5e5",
    headerBgColor: "#fafafa",
    fontFamily: "Arial",
    fontSize: 12,
    pageFormat: "A4",
    marginTop: 20,
    marginBottom: 20,
    marginLeft: 20,
    marginRight: 20,
    status: "draft",
  })

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ text: string; state: "success" | "error" } | null>(null)
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null)
  const [showIconPicker, setShowIconPicker] = useState(false)
  const [expandedSectionIds, setExpandedSectionIds] = useState<Set<string>>(new Set())
  const previewRef = useRef<HTMLDivElement>(null)

  // Odoo data state
  const [odooModels, setOdooModels] = useState<OdooModel[]>([])
  const [modelFields, setModelFields] = useState<ModelField[]>([])
  const [companies, setCompanies] = useState<any[]>([])
  const [previewData, setPreviewData] = useState<Record<string, any>>({})

  // Icon picker state
  const [iconSearch, setIconSearch] = useState("")
  const [selectedIconFor, setSelectedIconFor] = useState<string | null>(null)

  // Load template
  useEffect(() => {
    if (templateId) {
      fetchTemplate()
    }
  }, [templateId])

  // Fetch Odoo models on mount
  useEffect(() => {
    fetchOdooModels()
    fetchCompanies()
  }, [])

  // Fetch model fields when odooModel changes
  useEffect(() => {
    if (template.odooModel) {
      fetchModelFields(template.odooModel)
      // Check if template has products section and fetch preview data
      const hasProductsSection = template.sections.some((s) => s.type === "products")
      if (hasProductsSection) {
        // For products section, we need to find the line field
        // The ProductsEditor will handle fetching the correct preview data
        fetchPreviewData(template.odooModel)
      }
    }
  }, [template.odooModel])

  const fetchOdooModels = async () => {
    try {
      const tenantId = getCurrentTenantId()
      const headers: Record<string, string> = { "Content-Type": "application/json" }
      if (tenantId) headers["X-Tenant-ID"] = tenantId

      console.log("Fetching models from:", `${API_CONFIG.BACKEND_BASE_URL}/smart-reports/odoo/models`)
      const response = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/smart-reports/odoo/models`, {
        headers,
      })
      console.log("Response status:", response.status)
      if (response.ok) {
        const result = await response.json()
        console.log("Models response:", result)
        setOdooModels(result.data?.models || [])
      } else {
        console.error("Failed to fetch models:", response.status, await response.text())
      }
    } catch (error) {
      console.error("Error fetching models:", error)
    }
  }

  const fetchModelFields = async (modelName: string) => {
    try {
      const tenantId = getCurrentTenantId()
      const headers: Record<string, string> = { "Content-Type": "application/json" }
      if (tenantId) headers["X-Tenant-ID"] = tenantId

      console.log("Fetching fields for model:", modelName)
      const response = await fetch(
        `${API_CONFIG.BACKEND_BASE_URL}/smart-reports/odoo/models/${modelName}/fields`,
        { headers }
      )
      console.log("Fields response status:", response.status)
      if (response.ok) {
        const result = await response.json()
        console.log("Fields response:", result)
        // Update the specific model in odooModels with its fields
        const fields = result.data?.fields || []
        setOdooModels((prev) =>
          prev.map((m) => (m.model === modelName ? { ...m, fields } : m))
        )
        setModelFields(fields)
      } else {
        console.error("Failed to fetch fields:", response.status, await response.text())
      }
    } catch (error) {
      console.error("Error fetching model fields:", error)
    }
  }

  const fetchCompanies = async () => {
    try {
      const tenantId = getCurrentTenantId()
      const headers: Record<string, string> = { "Content-Type": "application/json" }
      if (tenantId) headers["X-Tenant-ID"] = tenantId

      console.log("Fetching companies")
      const response = await fetch(
        `${API_CONFIG.BACKEND_BASE_URL}/smart-reports/odoo/companies`,
        { headers }
      )
      if (response.ok) {
        const result = await response.json()
        console.log("Companies response:", result)
        setCompanies(result.data?.data || [])
        // Store first company for preview
        if (result.data?.data?.length > 0) {
          setPreviewData((prev) => ({ ...prev, company: result.data.data[0] }))
        }
      } else {
        console.error("Failed to fetch companies:", response.status)
      }
    } catch (error) {
      console.error("Error fetching companies:", error)
    }
  }

  // Fetch preview data for the selected model
  const fetchPreviewData = async (modelName: string, relationField?: string) => {
    try {
      const tenantId = getCurrentTenantId()
      const headers: Record<string, string> = { "Content-Type": "application/json" }
      if (tenantId) headers["X-Tenant-ID"] = tenantId

      const url = new URL(
        `${API_CONFIG.BACKEND_BASE_URL}/smart-reports/odoo/preview/${modelName}`
      )
      if (relationField) url.searchParams.set("relationField", relationField)
      url.searchParams.set("limit", "20")

      console.log("Fetching preview data for:", modelName, "relation:", relationField)
      const response = await fetch(url.toString(), { headers })
      if (response.ok) {
        const result = await response.json()
        console.log("Preview data response:", result)
        if (result.data?.success) {
          setPreviewData((prev) => ({
            ...prev,
            [modelName]: {
              record: result.data.record,
              relatedData: result.data.relatedData || [],
              relationField: result.data.relationField,
            },
          }))
        }
      } else {
        console.error("Failed to fetch preview data:", response.status)
      }
    } catch (error) {
      console.error("Error fetching preview data:", error)
    }
  }

  const fetchTemplate = async () => {
    setLoading(true)
    try {
      const response = await fetch(
        `${API_CONFIG.BACKEND_BASE_URL}/smart-reports/templates/${templateId}`,
        {
          headers: { "Content-Type": "application/json", "X-Session-ID": sessionId || "" },
        }
      )
      if (response.ok) {
        const result = await response.json()
        setTemplate(result.data)
      }
    } catch (error) {
      console.error("Error fetching template:", error)
    } finally {
      setLoading(false)
    }
  }

  const saveTemplate = async (publish = false) => {
    setSaving(true)
    try {
      const endpoint = templateId
        ? `/smart-reports/templates/${templateId}`
        : "/smart-reports/templates"
      const method = templateId ? "PUT" : "POST"

      const response = await fetch(`${API_CONFIG.BACKEND_BASE_URL}${endpoint}`, {
        method,
        headers: { "Content-Type": "application/json", "X-Session-ID": sessionId || "" },
        body: JSON.stringify({ ...template, status: publish ? "published" : "draft" }),
      })

      if (!response.ok) throw new Error("Failed to save template")

      showToast(publish ? "Template published" : "Template saved", "success")

      if (!templateId) {
        const result = await response.json()
        navigate(`/smart-reports/builder/${result.data.id}`, { replace: true })
      }
    } catch (error) {
      showToast("Failed to save template", "error")
    } finally {
      setSaving(false)
    }
  }

  const showToast = (text: string, state: "success" | "error") => {
    setToast({ text, state })
    setTimeout(() => setToast(null), 3000)
  }

  const addSection = (type: SectionType) => {
    const id = `sec_${Date.now()}`
    let newSection: ReportSection

    switch (type) {
      case "header":
        newSection = {
          id,
          type: "header",
          enabled: true,
          documentTitle: "INVOICE",
          leftFields: [
            { field: "name", label: "Invoice Number", enabled: true },
            { field: "date", label: "Date", enabled: true },
            { field: "partner_id.name", label: "Billed To", enabled: true },
          ],
          showLogo: false,
          rightFields: [
            { field: "name", label: "Company Name", enabled: true },
            { field: "street", label: "Address", enabled: true },
            { field: "phone", label: "Phone", enabled: true },
            { field: "email", label: "Email", enabled: true },
          ],
        }
        break
      case "company":
        newSection = {
          id,
          type: "company",
          enabled: true,
          showLogo: true,
          fields: [
            { field: "name", label: "Company Name", enabled: true },
            { field: "street", label: "Street", enabled: true },
            { field: "city", label: "City", enabled: true },
            { field: "phone", label: "Phone", enabled: true },
          ],
          layout: "left",
        }
        break
      case "title":
        newSection = {
          id,
          type: "title",
          enabled: true,
          title: "DOCUMENT TITLE",
          showReference: true,
          showDate: true,
          showPartner: false,
          partnerField: "partner_id.name",
        }
        break
      case "text":
        newSection = {
          id,
          type: "text",
          enabled: true,
          content: "Your custom text here",
          fontSize: 14,
          fontWeight: "normal",
          align: "left",
        }
        break
      case "table":
        newSection = {
          id,
          type: "table",
          enabled: true,
          title: "Data Table",
          odooModel: template.odooModel || "stock.picking",
          theme: "simple",
          columns: [],
          showRowNumbers: true,
          alternateColors: true,
          showHeader: true,
        }
        break
      case "products":
        newSection = {
          id,
          type: "products",
          enabled: true,
          title: "Products",
          showImages: false,
          showSKU: true,
          showQuantity: true,
          showPrice: false,
          showRFID: true,
          showTotal: false,
          columns: [],
          showSectionTotal: true,
          showRowNumbers: true,
        }
        break
      case "logo":
        newSection = {
          id,
          type: "logo",
          enabled: true,
          logoType: "icon",
          iconName: "Building2",
          iconSize: 48,
          align: "center",
        }
        break
      case "signature":
        newSection = {
          id,
          type: "signature",
          enabled: true,
          signatures: [
            {
              id: "sig_1",
              label: "Authorized By",
              required: true,
              showDate: true,
              showPrintedName: false,
            },
          ],
          layout: "horizontal",
        }
        break
      case "footer":
        newSection = {
          id,
          type: "footer",
          enabled: true,
          showPageNumbers: true,
          showTimestamp: true,
          showPrintedBy: false,
        }
        break
      case "spacer":
        newSection = { id, type: "spacer", enabled: true, height: 20 }
        break
      case "line":
        newSection = { id, type: "line", enabled: true, style: "solid", thickness: 1 }
        break
      default:
        return
    }

    setTemplate({ ...template, sections: [...template.sections, newSection] })
    setSelectedSectionId(id)
    setExpandedSectionIds((prev) => new Set([...Array.from(prev), id]))
  }

  const updateSection = (sectionId: string, updates: Partial<ReportSection>) => {
    const newSections = template.sections.map((s) =>
      s.id === sectionId ? { ...s, ...updates } : s
    ) as ReportSection[]
    setTemplate({ ...template, sections: newSections })
  }

  const removeSection = (sectionId: string) => {
    setTemplate({ ...template, sections: template.sections.filter((s) => s.id !== sectionId) })
    if (selectedSectionId === sectionId) {
      setSelectedSectionId(null)
    }
  }

  const moveSection = (index: number, direction: "up" | "down") => {
    const newSections = [...template.sections]
    if (direction === "up" && index > 0) {
      [newSections[index - 1], newSections[index]] = [
        newSections[index],
        newSections[index - 1],
      ]
    } else if (direction === "down" && index < newSections.length - 1) {
      [newSections[index], newSections[index + 1]] = [
        newSections[index + 1],
        newSections[index],
      ]
    }
    setTemplate({ ...template, sections: newSections })
  }

  const toggleSectionEnabled = (sectionId: string) => {
    const section = template.sections.find((s) => s.id === sectionId)
    if (section) {
      updateSection(sectionId, { enabled: !section.enabled })
    }
  }

  const toggleSectionExpanded = (sectionId: string) => {
    setExpandedSectionIds((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId)
      } else {
        newSet.add(sectionId)
      }
      return newSet
    })
  }

  const getModelFields = (modelName: string): ModelField[] => {
    const model = odooModels.find((m) => m.model === modelName)
    return model?.fields || []
  }

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <div className="spinner" />
      </div>
    )
  }

  return (
    <div
      style={{
        height: "calc(100vh - 64px)",
        background: colors.background,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Toast */}
      {toast && <Toast text={toast.text} state={toast.state} onClose={() => setToast(null)} />}

      {/* Icon Picker Modal */}
      {showIconPicker && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => {
            setShowIconPicker(false)
            setSelectedIconFor(null)
          }}
        >
          <div
            style={{
              background: colors.card,
              borderRadius: "0.75rem",
              padding: "1.5rem",
              width: "90%",
              maxWidth: "600px",
              maxHeight: "80vh",
              overflowY: "auto",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1rem",
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: "1.125rem",
                  fontWeight: 600,
                  color: colors.textPrimary,
                }}
              >
                Choose Icon
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowIconPicker(false)
                  setSelectedIconFor(null)
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <Input
              placeholder="Search icons..."
              value={iconSearch}
              onChange={(e) => setIconSearch(e.target.value)}
              style={{ marginBottom: "1rem" }}
            />
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(60px, 1fr))",
                gap: "0.5rem",
              }}
            >
              {LUCIDE_ICONS.filter((icon) =>
                icon.toLowerCase().includes(iconSearch.toLowerCase())
              ).map((iconName) => {
                const IconComponent = (LucideIcons as Record<string, any>)[iconName]
                return (
                  <button
                    key={iconName}
                    onClick={() => {
                      if (selectedIconFor) {
                        updateSection(selectedIconFor, { iconName })
                      }
                      setShowIconPicker(false)
                      setSelectedIconFor(null)
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "0.75rem",
                      borderRadius: "0.5rem",
                      background: colors.mutedBg,
                      border: `1px solid ${colors.border}`,
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = colors.border)
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = colors.mutedBg)
                    }
                  >
                    {IconComponent && (
                      <IconComponent
                        className="w-6 h-6"
                        style={{ color: colors.textPrimary }}
                      />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div
        style={{
          background: colors.card,
          borderBottom: `1px solid ${colors.border}`,
          padding: "0.75rem 1rem",
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          flexShrink: 0,
        }}
      >
        <Button variant="ghost" size="sm" onClick={() => navigate("/smart-reports")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>

        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "1rem" }}>
          <Input
            value={template.name}
            onChange={(e) => setTemplate({ ...template, name: e.target.value })}
            placeholder="Template Name"
            style={{
              fontSize: "0.95rem",
              fontWeight: 600,
              border: "none",
              background: "transparent",
              padding: "0.25rem 0.5rem",
              flex: 1,
              maxWidth: 300,
            }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Database className="w-4 h-4" style={{ color: colors.textSecondary }} />
            <Select
              value={template.odooModel || ""}
              onValueChange={(value) => setTemplate({ ...template, odooModel: value })}
            >
              <SelectTrigger style={{ width: 200, fontSize: "0.85rem" }}>
                <SelectValue placeholder="Select Model..." />
              </SelectTrigger>
              <SelectContent>
                {odooModels.map((model) => (
                  <SelectItem key={model.model} value={model.model}>
                    {model.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={() => saveTemplate(false)} disabled={saving}>
          {saving ? "Saving..." : (
            <>
              <Save className="w-4 h-4" style={{ marginRight: "0.5rem" }} />
              Save
            </>
          )}
        </Button>
        <Button
          size="sm"
          onClick={() => saveTemplate(true)}
          disabled={saving}
          style={{ background: "#10b981", border: "none", color: "white" }}
        >
          <Check className="w-4 h-4" style={{ marginRight: "0.5rem" }} />
          Publish
        </Button>
      </div>

      {/* Main Content - 2 Panel Layout */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* LEFT PANEL - 360px */}
        <div
          style={{
            width: 360,
            background: colors.card,
            borderRight: `1px solid ${colors.border}`,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* TOP: Add Section Buttons Grid */}
          <div style={{ padding: "1rem", borderBottom: `1px solid ${colors.border}` }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "0.75rem",
              }}
            >
              <span
                style={{
                  fontWeight: 600,
                  fontSize: "0.875rem",
                  color: colors.textPrimary,
                }}
              >
                Add Section
              </span>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "0.5rem",
              }}
            >
              {Object.entries(SECTION_TYPES).map(([type, config]) => (
                <button
                  key={type}
                  onClick={() => addSection(type as SectionType)}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "0.25rem",
                    padding: "0.5rem",
                    borderRadius: "0.375rem",
                    background: colors.mutedBg,
                    border: `1px solid ${colors.border}`,
                    color: colors.textPrimary,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = template.primaryColor
                    e.currentTarget.style.borderColor = template.primaryColor
                    e.currentTarget.style.color = "white"
                    e.currentTarget.style.transform = "translateY(-1px)"
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = colors.mutedBg
                    e.currentTarget.style.borderColor = colors.border
                    e.currentTarget.style.color = colors.textPrimary
                    e.currentTarget.style.transform = "translateY(0)"
                  }}
                  title={config.description}
                >
                  <config.icon className="w-4 h-4" />
                  <span style={{ fontSize: "0.65rem", fontWeight: 500 }}>
                    {config.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* MIDDLE: Expandable Section Items */}
          <div style={{ flex: 1, overflowY: "auto", padding: "0.75rem" }}>
            {template.sections.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "2rem 1rem",
                  color: colors.textSecondary,
                }}
              >
                <FileText
                  className="w-8 h-8"
                  style={{ margin: "0 auto 0.5rem", opacity: 0.3 }}
                />
                <p style={{ fontSize: "0.8rem" }}>
                  No sections yet. Click a button above to add one.
                </p>
              </div>
            ) : (
              template.sections.map((section, index) => {
                const Icon = SECTION_TYPES[section.type].icon
                const isExpanded = expandedSectionIds.has(section.id)
                const isSelected = selectedSectionId === section.id

                return (
                  <div
                    key={section.id}
                    style={{
                      marginBottom: "0.5rem",
                      borderRadius: "0.5rem",
                      border: `1px solid ${
                        isSelected ? template.primaryColor : colors.border
                      }`,
                      background: isSelected
                        ? template.primaryColor + "08"
                        : colors.card,
                      overflow: "hidden",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {/* Section Header Bar */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.375rem",
                        padding: "0.5rem 0.625rem",
                        background: isSelected
                          ? template.primaryColor + "12"
                          : "transparent",
                        cursor: "pointer",
                      }}
                      onClick={() => setSelectedSectionId(section.id)}
                    >
                      <GripVertical
                        className="w-3.5 h-3.5"
                        style={{
                          color: colors.textSecondary,
                          cursor: "grab",
                          opacity: 0.4,
                          flexShrink: 0,
                        }}
                      />
                      <div
                        style={{
                          width: "24px",
                          height: "24px",
                          borderRadius: "4px",
                          background: template.primaryColor + "15",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <Icon
                          className="w-3.5 h-3.5"
                          style={{ color: template.primaryColor }}
                        />
                      </div>
                      <span
                        style={{
                          flex: 1,
                          fontSize: "0.8rem",
                          fontWeight: 500,
                          color: colors.textPrimary,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {SECTION_TYPES[section.type].label}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          moveSection(index, "up")
                        }}
                        disabled={index === 0}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: index === 0 ? "not-allowed" : "pointer",
                          opacity: index === 0 ? 0.2 : 0.4,
                          padding: "0.125rem",
                          display: "flex",
                          alignItems: "center",
                          flexShrink: 0,
                        }}
                        onMouseEnter={(e) => {
                          if (index > 0) e.currentTarget.style.opacity = "0.7"
                        }}
                        onMouseLeave={(e) => {
                          if (index > 0) e.currentTarget.style.opacity = "0.4"
                        }}
                      >
                        <ChevronUp className="w-3 h-3" style={{ color: colors.textSecondary }} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          moveSection(index, "down")
                        }}
                        disabled={index === template.sections.length - 1}
                        style={{
                          background: "none",
                          border: "none",
                          cursor:
                            index === template.sections.length - 1
                              ? "not-allowed"
                              : "pointer",
                          opacity:
                            index === template.sections.length - 1 ? 0.2 : 0.4,
                          padding: "0.125rem",
                          display: "flex",
                          alignItems: "center",
                          flexShrink: 0,
                        }}
                        onMouseEnter={(e) => {
                          if (index < template.sections.length - 1)
                            e.currentTarget.style.opacity = "0.7"
                        }}
                        onMouseLeave={(e) => {
                          if (index < template.sections.length - 1)
                            e.currentTarget.style.opacity = "0.4"
                        }}
                      >
                        <ChevronDown className="w-3 h-3" style={{ color: colors.textSecondary }} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleSectionEnabled(section.id)
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          opacity: section.enabled ? 1 : 0.4,
                          padding: "0.125rem",
                          display: "flex",
                          alignItems: "center",
                          flexShrink: 0,
                        }}
                        title={section.enabled ? "Hide section" : "Show section"}
                      >
                        <Eye
                          className="w-3 h-3"
                          style={{
                            color: section.enabled
                              ? template.primaryColor
                              : colors.textSecondary,
                          }}
                        />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          removeSection(section.id)
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          opacity: 0.4,
                          padding: "0.125rem",
                          display: "flex",
                          alignItems: "center",
                          flexShrink: 0,
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.opacity = "0.7"}
                        onMouseLeave={(e) => e.currentTarget.style.opacity = "0.4"}
                        title="Remove section"
                      >
                        <Trash2 className="w-3 h-3" style={{ color: "#ef4444" }} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleSectionExpanded(section.id)
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          padding: "0.125rem",
                          display: "flex",
                          alignItems: "center",
                          flexShrink: 0,
                        }}
                      >
                        {isExpanded ? (
                          <ChevronUp
                            className="w-3.5 h-3.5"
                            style={{ color: colors.textSecondary }}
                          />
                        ) : (
                          <ChevronDown
                            className="w-3.5 h-3.5"
                            style={{ color: colors.textSecondary }}
                          />
                        )}
                      </button>
                    </div>

                    {/* Inline Section Editor (when expanded) */}
                    {isExpanded && (
                      <div
                        style={{
                          padding: "0.75rem",
                          borderTop: `1px solid ${colors.border}`,
                          background: colors.mutedBg + "30",
                        }}
                      >
                        <SectionEditor
                          section={section}
                          template={template}
                          colors={colors}
                          t={t}
                          getModelFields={getModelFields}
                          onUpdate={(updates) => updateSection(section.id, updates)}
                          onOpenIconPicker={() => {}}
                          selectedIconFor={selectedIconFor}
                          setSelectedIconFor={setSelectedIconFor}
                          setShowIconPicker={setShowIconPicker}
                          companies={companies}
                          modelFields={modelFields}
                          odooModels={odooModels}
                          fetchModelFields={fetchModelFields}
                          fetchPreviewData={fetchPreviewData}
                        />
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>

          {/* BOTTOM: Color Picker */}
          <div
            style={{
              padding: "1rem",
              borderTop: `1px solid ${colors.border}`,
              background: colors.mutedBg + "30",
            }}
          >
            <Label
              style={{
                fontSize: "0.75rem",
                marginBottom: "0.5rem",
                display: "block",
                color: colors.textSecondary,
              }}
            >
              Primary Color
            </Label>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {[
                "#1a1a1a",
                "#3b82f6",
                "#10b981",
                "#f59e0b",
                "#ef4444",
                "#8b5cf6",
                "#06b6d4",
                "#64748b",
              ].map((color) => (
                <button
                  key={color}
                  onClick={() => setTemplate({ ...template, primaryColor: color })}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: color,
                    border:
                      template.primaryColor === color
                        ? `2px solid ${color}`
                        : `2px solid ${colors.border}`,
                    outline:
                      template.primaryColor === color
                        ? `2px solid white`
                        : "none",
                    outlineOffset: "1px",
                    cursor: "pointer",
                    transition: "transform 0.15s ease",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.transform = "scale(1.1)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.transform = "scale(1)")
                  }
                />
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL - A4 Preview */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            background: "#f5f5f5",
          }}
        >
          <div
            style={{
              padding: "0.75rem 1rem",
              borderBottom: `1px solid ${colors.border}`,
              background: "white",
              textAlign: "center",
            }}
          >
            <span
              style={{
                fontSize: "0.8rem",
                fontWeight: 500,
                color: colors.textSecondary,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              A4 Preview
            </span>
          </div>

          <div
            style={{
              flex: 1,
              overflow: "auto",
              padding: "2rem",
              display: "flex",
              justifyContent: "center",
            }}
          >
            <div
              ref={previewRef}
              style={{
                width: A4_WIDTH + "px",
                minHeight: A4_HEIGHT + "px",
                background: "white",
                boxShadow: "0 4px 24px rgba(0,0,0,0.1)",
                marginTop: "1rem",
                marginBottom: "2rem",
              }}
            >
              {/* A4 Page Content */}
              <div
                style={{
                  padding: `${template.marginTop}px ${template.marginLeft}px ${template.marginBottom}px ${template.marginRight}px`,
                  fontFamily: template.fontFamily,
                  fontSize: template.fontSize + "px",
                  color: "#1a1a1a",
                }}
              >
                {template.sections
                  .filter((s) => s.enabled)
                  .map((section) => (
                    <SectionPreview
                      key={section.id}
                      section={section}
                      template={template}
                      isSelected={selectedSectionId === section.id}
                      onClick={() => setSelectedSectionId(section.id)}
                      previewData={previewData}
                    />
                  ))}

                {/* Empty state */}
                {template.sections.filter((s) => s.enabled).length === 0 && (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "4rem 2rem",
                      color: "#94a3b8",
                    }}
                  >
                    <FileText style={{ width: 48, height: 48, margin: "0 auto 1rem" }} />
                    <p style={{ fontSize: "0.9rem" }}>
                      No sections added yet. Add sections from the left panel to get
                      started.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
