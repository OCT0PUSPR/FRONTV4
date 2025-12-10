"use client"

import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Card } from "../../@/components/ui/card"
import { CustomInput } from "./CusotmInput"
import { CustomDropdown as NewCustomDropdown } from "./NewCustomDropdown"
import { Button } from "../../@/components/ui/button"
import CustomDatePicker from "./CustomDatePicker"
import { useTheme } from "../../context/theme"
import { useData } from "../../context/data"
import { useAuth } from "../../context/auth"
import { API_CONFIG } from "../config/api"
import { NewCustomButton } from "./NewCustomButton"
import { Plus, X } from "lucide-react"
import Toast from "./Toast"

interface ManufacturingEditModalProps {
  isOpen: boolean
  productionId: number | null
  onClose: () => void
  canDelete?: boolean
}

export default function ManufacturingEditModal({ isOpen, productionId, onClose, canDelete = false }: ManufacturingEditModalProps) {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const { sessionId } = useAuth()
  const { productions, productTemplates, products, locations, uom, lots, workcenters, fetchData } = useData()

  const [readOnly, setReadOnly] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [componentLines, setComponentLines] = useState<any[]>([])
  const [workorderLines, setWorkorderLines] = useState<any[]>([])
  const [showSuccess, setShowSuccess] = useState(false)
  const [addingComponentLine, setAddingComponentLine] = useState(false)
  const [addingWorkorderLine, setAddingWorkorderLine] = useState(false)
  const [currentProductionId, setCurrentProductionId] = useState<number | null>(productionId)
  const [toast, setToast] = useState<{ text: string; state: "success" | "error" } | null>(null)
  
  // Data fetched from API
  const [boms, setBoms] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [routingWorkcenters, setRoutingWorkcenters] = useState<any[]>([])
  const [loadingData, setLoadingData] = useState(false)

  // Get Odoo headers from localStorage
  const getOdooHeaders = (): Record<string, string> => {
    const rawBase = localStorage.getItem("odooBase") || "https://egy.thetalenter.net"
    const db = localStorage.getItem("odooDb") || "odoodb1"
    const headers: Record<string, string> = {}
    if (rawBase) headers['x-odoo-base'] = rawBase
    if (db) headers['x-odoo-db'] = db
    return headers
  }

  const [form, setForm] = useState({
    productId: null as number | null,
    quantity: "",
    bomId: null as number | null,
    lotProducingId: null as number | null,
    dateStart: "",
    dateFinished: "",
    userId: null as number | null,
  })

  const [newComponentLine, setNewComponentLine] = useState<{
    productId: number | null
    locationId: number | null
    shouldConsumeQty: string
    productUom: number | null
    productUomCategoryId: number | null
  }>({ 
    productId: null, 
    locationId: null, 
    shouldConsumeQty: "", 
    productUom: null,
    productUomCategoryId: null
  })

  const [newWorkorderLine, setNewWorkorderLine] = useState<{
    operationId: number | null
    workcenterId: number | null
    productId: number | null
    qtyRemaining: string
    durationExpected: number | null
    duration: number | null
  }>({
    operationId: null,
    workcenterId: null,
    productId: null,
    qtyRemaining: "",
    durationExpected: null,
    duration: null
  })

  // Fetch BOMs
  const fetchBOMs = async () => {
    if (!sessionId || boms.length > 0) return
    try {
      setLoadingData(true)
      const headers = {
        "Content-Type": "application/json",
        ...getOdooHeaders(),
      }
      const response = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/odoo/search-read`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          sessionId,
          model: "mrp.bom",
          args: [],
          kwargs: { fields: ["id", "display_name", "product_tmpl_id", "product_id"] },
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (response.ok && data?.success && Array.isArray(data.result)) {
        setBoms(data.result)
      }
    } catch (error) {
      console.error("Error fetching BOMs:", error)
    } finally {
      setLoadingData(false)
    }
  }

  // Fetch Users
  const fetchUsers = async () => {
    if (!sessionId || users.length > 0) return
    try {
      setLoadingData(true)
      const headers = {
        "Content-Type": "application/json",
        ...getOdooHeaders(),
      }
      const response = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/odoo/search-read`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          sessionId,
          model: "res.users",
          args: [],
          kwargs: { fields: ["id", "name", "display_name", "login"] },
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (response.ok && data?.success && Array.isArray(data.result)) {
        setUsers(data.result)
      }
    } catch (error) {
      console.error("Error fetching users:", error)
    } finally {
      setLoadingData(false)
    }
  }

  // Fetch Routing Workcenters
  const fetchRoutingWorkcenters = async () => {
    if (!sessionId || routingWorkcenters.length > 0) return
    try {
      setLoadingData(true)
      const headers = {
        "Content-Type": "application/json",
        ...getOdooHeaders(),
      }
      const response = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/odoo/search-read`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          sessionId,
          model: "mrp.routing.workcenter",
          args: [],
          kwargs: { fields: ["id", "name", "display_name", "workcenter_id"] },
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (response.ok && data?.success && Array.isArray(data.result)) {
        setRoutingWorkcenters(data.result)
      }
    } catch (error) {
      console.error("Error fetching routing workcenters:", error)
    } finally {
      setLoadingData(false)
    }
  }

  // Fetch Component Lines (stock.move where raw_material_production_id = production id)
  const fetchComponentLines = async (id: number) => {
    if (!sessionId) return
    try {
      const headers = {
        "Content-Type": "application/json",
        ...getOdooHeaders(),
      }
      const response = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/odoo/search-read`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          sessionId,
          model: "stock.move",
          args: [[["raw_material_production_id", "=", id]]],
          kwargs: {
            fields: [
              "id",
              "product_id",
              "location_id",
              "location_dest_id",
              "product_uom_qty",
              "product_uom",
              "quantity_done",
              "state",
            ],
          },
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (response.ok && data?.success && Array.isArray(data.result)) {
        setComponentLines(data.result)
      } else {
        setComponentLines([])
      }
    } catch (error) {
      console.error("Error fetching component lines:", error)
      setComponentLines([])
    }
  }

  // Fetch Work Order Lines (mrp.workorder where production_id = production id)
  const fetchWorkorderLines = async (id: number) => {
    if (!sessionId) return
    try {
      const headers = {
        "Content-Type": "application/json",
        ...getOdooHeaders(),
      }
      const response = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/odoo/search-read`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          sessionId,
          model: "mrp.workorder",
          args: [[["production_id", "=", id]]],
          kwargs: {
            fields: [
              "id",
              "operation_id",
              "workcenter_id",
              "product_id",
              "qty_remaining",
              "duration_expected",
              "duration",
            ],
          },
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (response.ok && data?.success && Array.isArray(data.result)) {
        setWorkorderLines(data.result)
      } else {
        setWorkorderLines([])
      }
    } catch (error) {
      console.error("Error fetching workorder lines:", error)
      setWorkorderLines([])
    }
  }

  useEffect(() => {
    if (!isOpen) return
    
    setCurrentProductionId(productionId)
    
    // Prefetch data
    if (!productTemplates?.length) fetchData("productTemplates")
    if (!products?.length) fetchData("products")
    if (!locations?.length) fetchData("locations")
    if (!uom?.length) fetchData("uom")
    if (!lots?.length) fetchData("lots")
    if (!workcenters?.length) fetchData("workcenters")
    
    fetchBOMs()
    fetchUsers()
    fetchRoutingWorkcenters()

    if (productionId) {
      // Edit mode
      const raw: any = (productions || []).find((p: any) => p.id === productionId) || {}
      setForm({
        productId: Array.isArray(raw.product_id) ? raw.product_id[0] : raw.product_id || null,
        quantity: raw.product_qty ? String(raw.product_qty) : "",
        bomId: Array.isArray(raw.bom_id) ? raw.bom_id[0] : raw.bom_id || null,
        lotProducingId: Array.isArray(raw.lot_producing_id) ? raw.lot_producing_id[0] : raw.lot_producing_id || null,
        dateStart: raw.date_start ? String(raw.date_start).slice(0, 16) : "",
        dateFinished: raw.date_finished ? String(raw.date_finished).slice(0, 16) : "",
        userId: Array.isArray(raw.user_id) ? raw.user_id[0] : raw.user_id || null,
      })
      const state = raw.state || "draft"
      setReadOnly(state === "done" || state === "cancel")
      fetchComponentLines(productionId)
      fetchWorkorderLines(productionId)
    } else {
      // Create mode
      setForm({
        productId: null,
        quantity: "",
        bomId: null,
        lotProducingId: null,
        dateStart: "",
        dateFinished: "",
        userId: null,
      })
      setReadOnly(false)
      setComponentLines([])
      setWorkorderLines([])
    }
  }, [isOpen, productionId, productions])

  const onChange = (updates: Partial<typeof form>) => {
    setForm((prev) => ({ ...prev, ...updates }))
    setDirty(true)
  }

  const currentStatus = useMemo(() => {
    const idToCheck = currentProductionId || productionId
    if (!idToCheck) return "draft"
    const raw: any = (productions || []).find((p: any) => p.id === idToCheck) || {}
    return raw.state || "draft"
  }, [productions, productionId, currentProductionId])

  const isCreating = (currentProductionId || productionId) === null

  // Save/Update Production
  const saveProduction = async (): Promise<boolean> => {
    if (!sessionId) return false
    const values: any = {}
    if (form.productId != null) values.product_id = form.productId
    if (form.quantity) values.product_qty = Number(form.quantity)
    if (form.bomId != null) values.bom_id = form.bomId
    if (form.lotProducingId != null) values.lot_producing_id = form.lotProducingId
    if (form.dateStart) values.date_start = form.dateStart
    if (form.dateFinished) values.date_finished = form.dateFinished
    if (form.userId != null) values.user_id = form.userId

    try {
      if (currentProductionId || productionId) {
        // Update existing production
        const idToUpdate = currentProductionId || productionId
        const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/productions/${idToUpdate}`, {
          method: "PUT",
          headers: { 
            "Content-Type": "application/json",
            ...getOdooHeaders()
          },
          body: JSON.stringify({ sessionId, values }),
        })
        const data = await res.json().catch(() => ({}))
        if (res.ok && data?.success) {
          setDirty(false)
          setShowSuccess(true)
          setToast({ text: t("Manufacturing order updated successfully"), state: "success" })
          setTimeout(() => {
            setShowSuccess(false)
            setToast(null)
          }, 1200)
          fetchData("productions")
          if (idToUpdate) {
            fetchComponentLines(idToUpdate)
            fetchWorkorderLines(idToUpdate)
          }
          return true
        } else {
          setToast({ text: data?.message || t("Failed to update manufacturing order"), state: "error" })
          setTimeout(() => setToast(null), 3000)
          return false
        }
      } else {
        // Create new production
        const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/productions/create`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            ...getOdooHeaders()
          },
          body: JSON.stringify({ sessionId, values }),
        })
        const data = await res.json().catch(() => ({}))
        if (res.ok && data?.success && data?.id) {
          setDirty(false)
          setShowSuccess(true)
          setToast({ text: t("Manufacturing order created successfully"), state: "success" })
          setCurrentProductionId(data.id)
          fetchData("productions")
          setTimeout(() => {
            setShowSuccess(false)
            setToast(null)
            if (data.id) {
              fetchComponentLines(data.id)
              fetchWorkorderLines(data.id)
            }
          }, 1200)
          return true
        } else {
          setToast({ text: data?.message || t("Failed to create manufacturing order"), state: "error" })
          setTimeout(() => setToast(null), 3000)
          return false
        }
      }
    } catch (error) {
      console.error("Error saving production:", error)
      return false
    }
  }

  // Create Component Line
  const createComponentLine = async () => {
    if (!sessionId) return
    if (!newComponentLine.productId || !newComponentLine.locationId || !newComponentLine.shouldConsumeQty || !newComponentLine.productUom) {
      alert(t("Please fill in all required fields"))
      return
    }

    let productionIdToUse = currentProductionId || productionId
    if (!productionIdToUse) {
      const saveResult = await saveProduction()
      if (!saveResult) {
        alert(t("Please save the production first before adding component lines"))
        return
      }
      await fetchData("productions")
      await new Promise(resolve => setTimeout(resolve, 500))
      productionIdToUse = currentProductionId
      if (!productionIdToUse) {
        alert(t("Failed to create production. Please try again."))
        return
      }
    }

    const values: any = {
      product_id: newComponentLine.productId,
      location_id: newComponentLine.locationId,
      should_consume_qty: Number(newComponentLine.shouldConsumeQty),
      product_uom: newComponentLine.productUom,
      raw_material_production_id: productionIdToUse,
    }

    try {
      const headers = {
        "Content-Type": "application/json",
        ...getOdooHeaders(),
      }
      const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/odoo/create`, {
        method: "POST",
        headers,
        body: JSON.stringify({ 
          sessionId, 
          model: "stock.move",
          values 
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data?.success) {
        await fetchComponentLines(productionIdToUse)
        setNewComponentLine({ 
          productId: null, 
          locationId: null, 
          shouldConsumeQty: "", 
          productUom: null,
          productUomCategoryId: null
        })
        setAddingComponentLine(false)
        setShowSuccess(true)
        setTimeout(() => setShowSuccess(false), 1200)
        fetchData("productions")
      } else {
        console.error("Failed to create component line:", data)
        alert(data?.message || t("Failed to create component line"))
      }
    } catch (error) {
      console.error("Error creating component line:", error)
      alert(t("Error creating component line. Please try again."))
    }
  }

  // Create Work Order Line
  const createWorkorderLine = async () => {
    if (!sessionId) return
    if (!newWorkorderLine.operationId || !newWorkorderLine.workcenterId || !newWorkorderLine.productId) {
      alert(t("Please fill in all required fields"))
      return
    }

    let productionIdToUse = currentProductionId || productionId
    if (!productionIdToUse) {
      const saveResult = await saveProduction()
      if (!saveResult) {
        alert(t("Please save the production first before adding work order lines"))
        return
      }
      await fetchData("productions")
      await new Promise(resolve => setTimeout(resolve, 500))
      productionIdToUse = currentProductionId
      if (!productionIdToUse) {
        alert(t("Failed to create production. Please try again."))
        return
      }
    }

    const values: any = {
      operation_id: newWorkorderLine.operationId,
      workcenter_id: newWorkorderLine.workcenterId,
      product_id: newWorkorderLine.productId,
      production_id: productionIdToUse,
    }
    if (newWorkorderLine.qtyRemaining) values.qty_remaining = Number(newWorkorderLine.qtyRemaining)
    if (newWorkorderLine.durationExpected != null) values.duration_expected = newWorkorderLine.durationExpected
    if (newWorkorderLine.duration != null) values.duration = newWorkorderLine.duration

    try {
      const headers = {
        "Content-Type": "application/json",
        ...getOdooHeaders(),
      }
      const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/odoo/create`, {
        method: "POST",
        headers,
        body: JSON.stringify({ 
          sessionId, 
          model: "mrp.workorder",
          values 
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data?.success) {
        await fetchWorkorderLines(productionIdToUse)
        setNewWorkorderLine({
          operationId: null,
          workcenterId: null,
          productId: null,
          qtyRemaining: "",
          durationExpected: null,
          duration: null
        })
        setAddingWorkorderLine(false)
        setShowSuccess(true)
        setTimeout(() => setShowSuccess(false), 1200)
        fetchData("productions")
      } else {
        console.error("Failed to create work order line:", data)
        alert(data?.message || t("Failed to create work order line"))
      }
    } catch (error) {
      console.error("Error creating work order line:", error)
      alert(t("Error creating work order line. Please try again."))
    }
  }

  // Get UOM options filtered by product category
  const getFilteredUOM = useMemo(() => {
    if (!newComponentLine.productId || !newComponentLine.productUomCategoryId) {
      return uom || []
    }
    return (uom || []).filter((u: any) => {
      const categoryId = Array.isArray(u.category_id) ? u.category_id[0] : u.category_id
      return categoryId === newComponentLine.productUomCategoryId
    })
  }, [uom, newComponentLine.productId, newComponentLine.productUomCategoryId])

  // Update product UOM category when product changes
  useEffect(() => {
    if (newComponentLine.productId) {
      const selectedProduct = (products || []).find((p: any) => p.id === newComponentLine.productId)
      if (selectedProduct) {
        // Get product's uom_id
        const productUomId = Array.isArray(selectedProduct.uom_id) 
          ? selectedProduct.uom_id[0]
          : selectedProduct.uom_id
        if (productUomId) {
          // Find the UOM record
          const uomRecord = (uom || []).find((u: any) => u.id === productUomId)
          if (uomRecord) {
            // Get the UOM's category_id
            const uomCategoryId = Array.isArray(uomRecord.category_id) 
              ? uomRecord.category_id[0] 
              : uomRecord.category_id
            if (uomCategoryId) {
              setNewComponentLine(prev => ({ ...prev, productUomCategoryId: uomCategoryId }))
            }
          }
        }
      } else {
        // Reset category if product not found
        setNewComponentLine(prev => ({ ...prev, productUomCategoryId: null, productUom: null }))
      }
    } else {
      // Reset category if no product selected
      setNewComponentLine(prev => ({ ...prev, productUomCategoryId: null, productUom: null }))
    }
  }, [newComponentLine.productId, products, uom])

  if (!isOpen) return null
  
  return (
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
        if (!dirty || window.confirm(t("Discard unsaved changes?"))) onClose()
      }}
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
        {/* Header */}
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
              {isCreating ? t("New Manufacturing Order") : t("Manufacturing Order Details")}
            </h2>
            <p style={{ fontSize: 13, color: "#000" }}>
              {(currentProductionId || productionId)
                ? (productions || []).find((r: any) => r.id === (currentProductionId || productionId))?.name || ""
                : ""}
            </p>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: "auto", padding: "1.25rem" }}>
          <style>{`
            input:focus, textarea:focus, select:focus, button[role="combobox"]:focus {
              outline: none !important;
              border-color: #667eea !important;
              box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1) !important;
            }
          `}</style>

          {/* Basic Information Section */}
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
                <NewCustomDropdown
                  label={t("Product")}
                  values={(productTemplates || []).map((p: any) => p.display_name || p.name || String(p.id))}
                  type="single"
                  placeholder={t("Select product")}
                  defaultValue={
                    form.productId
                      ? (productTemplates || []).find((p: any) => p.id === form.productId)?.display_name ||
                        (productTemplates || []).find((p: any) => p.id === form.productId)?.name ||
                        String(form.productId)
                      : undefined
                  }
                  onChange={(v) => {
                    const selectedProduct = (productTemplates || []).find(
                      (p: any) => (p.display_name || p.name || String(p.id)) === v
                    )
                    onChange({ productId: selectedProduct ? selectedProduct.id : null })
                  }}
                />
              </div>

              <div>
                <CustomInput
                  label={t("Quantity")}
                  type="number"
                  value={form.quantity}
                  onChange={(v) => onChange({ quantity: v.replace(/[^0-9.]/g, "") })}
                  placeholder={t("Enter quantity")}
                  disabled={readOnly}
                />
              </div>

              <div>
                <NewCustomDropdown
                  label={t("Bill of Material")}
                  values={(boms || []).map((b: any) => b.display_name || b.name || String(b.id))}
                  type="single"
                  placeholder={t("Select BOM")}
                  defaultValue={
                    form.bomId
                      ? (boms || []).find((b: any) => b.id === form.bomId)?.display_name ||
                        (boms || []).find((b: any) => b.id === form.bomId)?.name ||
                        String(form.bomId)
                      : undefined
                  }
                  onChange={(v) => {
                    const selectedBOM = (boms || []).find(
                      (b: any) => (b.display_name || b.name || String(b.id)) === v
                    )
                    onChange({ bomId: selectedBOM ? selectedBOM.id : null })
                  }}
                />
              </div>

              <div>
                <NewCustomDropdown
                  label={t("Lot and Serial Number")}
                  values={(lots || []).map((l: any) => l.display_name || l.name || String(l.id))}
                  type="single"
                  placeholder={t("Select lot")}
                  defaultValue={
                    form.lotProducingId
                      ? (lots || []).find((l: any) => l.id === form.lotProducingId)?.display_name ||
                        (lots || []).find((l: any) => l.id === form.lotProducingId)?.name ||
                        String(form.lotProducingId)
                      : undefined
                  }
                  onChange={(v) => {
                    const selectedLot = (lots || []).find(
                      (l: any) => (l.display_name || l.name || String(l.id)) === v
                    )
                    onChange({ lotProducingId: selectedLot ? selectedLot.id : null })
                  }}
                />
              </div>

              <div>
                <CustomDatePicker
                  label={t("Start Date")}
                  value={form.dateStart}
                  onChange={(date) => onChange({ dateStart: date || "" })}
                  disabled={readOnly}
                  showTime={true}
                />
              </div>

              <div>
                <CustomDatePicker
                  label={t("Scheduled Date")}
                  value={form.dateFinished}
                  onChange={(date) => onChange({ dateFinished: date || "" })}
                  disabled={readOnly}
                  showTime={true}
                />
              </div>

              <div>
                <NewCustomDropdown
                  label={t("Responsible")}
                  values={(users || []).map((u: any) => u.display_name || u.name || String(u.id))}
                  type="single"
                  placeholder={t("Select user")}
                  defaultValue={
                    form.userId
                      ? (users || []).find((u: any) => u.id === form.userId)?.display_name ||
                        (users || []).find((u: any) => u.id === form.userId)?.name ||
                        String(form.userId)
                      : undefined
                  }
                  onChange={(v) => {
                    const selectedUser = (users || []).find(
                      (u: any) => (u.display_name || u.name || String(u.id)) === v
                    )
                    onChange({ userId: selectedUser ? selectedUser.id : null })
                  }}
                />
              </div>
            </div>
          </div>

          {/* Components Section */}
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
                  background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
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
                {t("Components")}
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
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "0.75rem",
                }}
              >
                <div style={{ color: colors.textSecondary, fontWeight: 600, fontSize: 13 }}></div>
                {!readOnly && (
                  <NewCustomButton
                    label={t("Add Line")}
                    backgroundColor="#FFFFFF"
                    icon={Plus}
                    onClick={() => {
                      setAddingComponentLine(true)
                      setNewComponentLine({ 
                        productId: null, 
                        locationId: null, 
                        shouldConsumeQty: "", 
                        productUom: null,
                        productUomCategoryId: null
                      })
                    }}
                    disabled={addingComponentLine || isCreating}
                  />
                )}
              </div>

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr
                      style={{
                        textAlign: "left",
                        color: colors.textSecondary,
                        fontSize: 11,
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                      }}
                    >
                      <th style={{ padding: ".5rem", fontWeight: 600 }}>{t("Product")}</th>
                      <th style={{ padding: ".5rem", fontWeight: 600 }}>{t("From")}</th>
                      <th style={{ padding: ".5rem", fontWeight: 600 }}>{t("To consume")}</th>
                      <th style={{ padding: ".5rem", fontWeight: 600 }}>{t("Quantity")}</th>
                      <th style={{ padding: ".5rem", fontWeight: 600 }}>{t("UoM")}</th>
                      <th style={{ padding: ".5rem", fontWeight: 600 }}>{t("Consumed")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(componentLines || []).map((cl: any) => (
                      <tr key={cl.id} style={{ borderTop: `1px solid ${colors.border}` }}>
                        <td style={{ padding: ".5rem", color: colors.textPrimary, fontSize: 13 }}>
                          {Array.isArray(cl.product_id) ? cl.product_id[1] : cl.product_id}
                        </td>
                        <td style={{ padding: ".5rem", color: colors.textPrimary, fontSize: 13 }}>
                          {Array.isArray(cl.location_id) ? cl.location_id[1] : cl.location_id}
                        </td>
                        <td style={{ padding: ".5rem", color: colors.textPrimary, fontSize: 13 }}>
                          {Array.isArray(cl.location_dest_id) ? cl.location_dest_id[1] : cl.location_dest_id || "-"}
                        </td>
                        <td style={{ padding: ".5rem", color: colors.textPrimary, fontSize: 13 }}>
                          {cl.should_consume_qty ?? cl.product_uom_qty ?? ""}
                        </td>
                        <td style={{ padding: ".5rem", color: colors.textPrimary, fontSize: 13 }}>
                          {Array.isArray(cl.product_uom) ? cl.product_uom[1] : cl.product_uom || ""}
                        </td>
                        <td style={{ padding: ".5rem", color: colors.textPrimary, fontSize: 13 }}>
                          {cl.quantity_done ?? "0"}
                        </td>
                      </tr>
                    ))}
                    {(!componentLines || componentLines.length === 0) && (
                      <tr>
                        <td
                          colSpan={6}
                          style={{ padding: ".75rem", color: colors.textSecondary, textAlign: "center", fontSize: 13 }}
                        >
                          {t("No component lines")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {!readOnly && addingComponentLine && (
                <>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "2fr 2fr 1fr 1.5fr",
                      gap: ".5rem",
                      marginTop: "0.75rem",
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <NewCustomDropdown
                        label=""
                        values={(products || []).map((p: any) => p.display_name || p.name || String(p.id))}
                        type="single"
                        placeholder={t("Product")}
                        defaultValue={
                          newComponentLine.productId
                            ? (products || []).find((p: any) => p.id === newComponentLine.productId)?.display_name ||
                              (products || []).find((p: any) => p.id === newComponentLine.productId)?.name ||
                              String(newComponentLine.productId)
                            : undefined
                        }
                        onChange={(v) => {
                          const selectedProduct = (products || []).find(
                            (p: any) => (p.display_name || p.name || String(p.id)) === v
                          )
                          setNewComponentLine((s) => ({ ...s, productId: selectedProduct ? selectedProduct.id : null }))
                        }}
                      />
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <NewCustomDropdown
                        label=""
                        values={(locations || []).map((loc: any) => loc.complete_name || loc.name || String(loc.id))}
                        type="single"
                        placeholder={t("From")}
                        defaultValue={
                          newComponentLine.locationId
                            ? (locations || []).find((loc: any) => loc.id === newComponentLine.locationId)?.complete_name ||
                              (locations || []).find((loc: any) => loc.id === newComponentLine.locationId)?.name ||
                              String(newComponentLine.locationId)
                            : undefined
                        }
                        onChange={(v) => {
                          const selectedLocation = (locations || []).find(
                            (loc: any) => (loc.complete_name || loc.name || String(loc.id)) === v
                          )
                          setNewComponentLine((s) => ({ ...s, locationId: selectedLocation ? selectedLocation.id : null }))
                        }}
                      />
                    </div>

                    <CustomInput
                      label=""
                      type="number"
                      value={newComponentLine.shouldConsumeQty}
                      onChange={(v) => setNewComponentLine((s) => ({ ...s, shouldConsumeQty: v.replace(/[^0-9.]/g, "") }))}
                      placeholder={t("Quantity")}
                    />

                    <div style={{ minWidth: 0 }}>
                      <NewCustomDropdown
                        label=""
                        values={getFilteredUOM.map((u: any) => u.name || u.display_name || String(u.id))}
                        type="single"
                        placeholder={t("UoM")}
                        defaultValue={
                          newComponentLine.productUom
                            ? getFilteredUOM.find((u: any) => u.id === newComponentLine.productUom)?.name ||
                              getFilteredUOM.find((u: any) => u.id === newComponentLine.productUom)?.display_name ||
                              String(newComponentLine.productUom)
                            : undefined
                        }
                        onChange={(v) => {
                          const selectedUom = getFilteredUOM.find((u: any) => (u.name || u.display_name || String(u.id)) === v)
                          setNewComponentLine((s) => ({ ...s, productUom: selectedUom ? selectedUom.id : null }))
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: ".5rem", marginTop: ".75rem" }}>
                    <Button
                      onClick={createComponentLine}
                      style={{
                        background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
                        color: "#fff",
                        border: "none",
                        padding: "0.5rem 1rem",
                        fontSize: 13,
                        borderRadius: 6,
                        cursor: "pointer",
                      }}
                    >
                      {t("Confirm")}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setAddingComponentLine(false)
                        setNewComponentLine({ 
                          productId: null, 
                          locationId: null, 
                          shouldConsumeQty: "", 
                          productUom: null,
                          productUomCategoryId: null
                        })
                      }}
                      style={{
                        border: `1px solid ${colors.border}`,
                        background: colors.card,
                        color: colors.textPrimary,
                        padding: "0.5rem 1rem",
                        fontSize: 13,
                      }}
                    >
                      {t("Cancel")}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Work Orders Section */}
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
                  background: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
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
                {t("Work Orders")}
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
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "0.75rem",
                }}
              >
                <div style={{ color: colors.textSecondary, fontWeight: 600, fontSize: 13 }}></div>
                {!readOnly && (
                  <NewCustomButton
                    label={t("Add Line")}
                    backgroundColor="#FFFFFF"
                    icon={Plus}
                    onClick={() => {
                      setAddingWorkorderLine(true)
                      setNewWorkorderLine({
                        operationId: null,
                        workcenterId: null,
                        productId: null,
                        qtyRemaining: "",
                        durationExpected: null,
                        duration: null
                      })
                    }}
                    disabled={addingWorkorderLine || isCreating}
                  />
                )}
              </div>

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr
                      style={{
                        textAlign: "left",
                        color: colors.textSecondary,
                        fontSize: 11,
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                      }}
                    >
                      <th style={{ padding: ".5rem", fontWeight: 600 }}>{t("Operation")}</th>
                      <th style={{ padding: ".5rem", fontWeight: 600 }}>{t("Work center")}</th>
                      <th style={{ padding: ".5rem", fontWeight: 600 }}>{t("Product")}</th>
                      <th style={{ padding: ".5rem", fontWeight: 600 }}>{t("Quantity Remaining")}</th>
                      <th style={{ padding: ".5rem", fontWeight: 600 }}>{t("Expected duration")}</th>
                      <th style={{ padding: ".5rem", fontWeight: 600 }}>{t("Real duration")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(workorderLines || []).map((wo: any) => (
                      <tr key={wo.id} style={{ borderTop: `1px solid ${colors.border}` }}>
                        <td style={{ padding: ".5rem", color: colors.textPrimary, fontSize: 13 }}>
                          {Array.isArray(wo.operation_id) ? wo.operation_id[1] : wo.operation_id || "-"}
                        </td>
                        <td style={{ padding: ".5rem", color: colors.textPrimary, fontSize: 13 }}>
                          {Array.isArray(wo.workcenter_id) ? wo.workcenter_id[1] : wo.workcenter_id || "-"}
                        </td>
                        <td style={{ padding: ".5rem", color: colors.textPrimary, fontSize: 13 }}>
                          {Array.isArray(wo.product_id) ? wo.product_id[1] : wo.product_id || "-"}
                        </td>
                        <td style={{ padding: ".5rem", color: colors.textPrimary, fontSize: 13 }}>
                          {wo.qty_remaining ?? ""}
                        </td>
                        <td style={{ padding: ".5rem", color: colors.textPrimary, fontSize: 13 }}>
                          {wo.duration_expected ? `${wo.duration_expected}h` : "-"}
                        </td>
                        <td style={{ padding: ".5rem", color: colors.textPrimary, fontSize: 13 }}>
                          {wo.duration ? `${wo.duration}h` : "-"}
                        </td>
                      </tr>
                    ))}
                    {(!workorderLines || workorderLines.length === 0) && (
                      <tr>
                        <td
                          colSpan={6}
                          style={{ padding: ".75rem", color: colors.textSecondary, textAlign: "center", fontSize: 13 }}
                        >
                          {t("No work order lines")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {!readOnly && addingWorkorderLine && (
                <>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "2fr 2fr 2fr 1fr",
                      gap: ".5rem",
                      marginTop: "0.75rem",
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <NewCustomDropdown
                        label=""
                        values={(routingWorkcenters || []).map((rw: any) => rw.display_name || rw.name || String(rw.id))}
                        type="single"
                        placeholder={t("Operation")}
                        defaultValue={
                          newWorkorderLine.operationId
                            ? (routingWorkcenters || []).find((rw: any) => rw.id === newWorkorderLine.operationId)?.display_name ||
                              (routingWorkcenters || []).find((rw: any) => rw.id === newWorkorderLine.operationId)?.name ||
                              String(newWorkorderLine.operationId)
                            : undefined
                        }
                        onChange={(v) => {
                          const selectedOp = (routingWorkcenters || []).find(
                            (rw: any) => (rw.display_name || rw.name || String(rw.id)) === v
                          )
                          setNewWorkorderLine((s) => ({ ...s, operationId: selectedOp ? selectedOp.id : null }))
                        }}
                      />
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <NewCustomDropdown
                        label=""
                        values={(workcenters || []).map((wc: any) => wc.display_name || wc.name || String(wc.id))}
                        type="single"
                        placeholder={t("Work center")}
                        defaultValue={
                          newWorkorderLine.workcenterId
                            ? (workcenters || []).find((wc: any) => wc.id === newWorkorderLine.workcenterId)?.display_name ||
                              (workcenters || []).find((wc: any) => wc.id === newWorkorderLine.workcenterId)?.name ||
                              String(newWorkorderLine.workcenterId)
                            : undefined
                        }
                        onChange={(v) => {
                          const selectedWC = (workcenters || []).find(
                            (wc: any) => (wc.display_name || wc.name || String(wc.id)) === v
                          )
                          setNewWorkorderLine((s) => ({ ...s, workcenterId: selectedWC ? selectedWC.id : null }))
                        }}
                      />
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <NewCustomDropdown
                        label=""
                        values={(products || []).map((p: any) => p.display_name || p.name || String(p.id))}
                        type="single"
                        placeholder={t("Product")}
                        defaultValue={
                          newWorkorderLine.productId
                            ? (products || []).find((p: any) => p.id === newWorkorderLine.productId)?.display_name ||
                              (products || []).find((p: any) => p.id === newWorkorderLine.productId)?.name ||
                              String(newWorkorderLine.productId)
                            : undefined
                        }
                        onChange={(v) => {
                          const selectedProduct = (products || []).find(
                            (p: any) => (p.display_name || p.name || String(p.id)) === v
                          )
                          setNewWorkorderLine((s) => ({ ...s, productId: selectedProduct ? selectedProduct.id : null }))
                        }}
                      />
                    </div>

                    <CustomInput
                      label=""
                      type="number"
                      value={newWorkorderLine.qtyRemaining}
                      onChange={(v) => setNewWorkorderLine((s) => ({ ...s, qtyRemaining: v.replace(/[^0-9.]/g, "") }))}
                      placeholder={t("Qty Remaining")}
                    />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".5rem", marginTop: "0.5rem" }}>
                    <CustomInput
                      label={t("Expected duration (hours)")}
                      type="number"
                      value={newWorkorderLine.durationExpected ? String(newWorkorderLine.durationExpected) : ""}
                      onChange={(v) => {
                        const num = Number(v.replace(/[^0-9.]/g, ""))
                        setNewWorkorderLine((s) => ({ ...s, durationExpected: isFinite(num) ? num : null }))
                      }}
                      placeholder={t("Enter hours")}
                    />
                    <CustomInput
                      label={t("Real duration (hours)")}
                      type="number"
                      value={newWorkorderLine.duration ? String(newWorkorderLine.duration) : ""}
                      onChange={(v) => {
                        const num = Number(v.replace(/[^0-9.]/g, ""))
                        setNewWorkorderLine((s) => ({ ...s, duration: isFinite(num) ? num : null }))
                      }}
                      placeholder={t("Enter hours")}
                    />
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: ".5rem", marginTop: ".75rem" }}>
                    <Button
                      onClick={createWorkorderLine}
                      style={{
                        background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
                        color: "#fff",
                        border: "none",
                        padding: "0.5rem 1rem",
                        fontSize: 13,
                        borderRadius: 6,
                        cursor: "pointer",
                      }}
                    >
                      {t("Confirm")}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setAddingWorkorderLine(false)
                        setNewWorkorderLine({
                          operationId: null,
                          workcenterId: null,
                          productId: null,
                          qtyRemaining: "",
                          durationExpected: null,
                          duration: null
                        })
                      }}
                      style={{
                        border: `1px solid ${colors.border}`,
                        background: colors.card,
                        color: colors.textPrimary,
                        padding: "0.5rem 1rem",
                        fontSize: 13,
                      }}
                    >
                      {t("Cancel")}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "1rem 1.25rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            background: colors.card,
          }}
        >
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {dirty && !readOnly && (
              <NewCustomButton
                label={isCreating ? t("Create") : t("Save Changes")}
                backgroundColor="#5268ED"
                onClick={saveProduction}
              />
            )}
            <NewCustomButton
              label={t("Close")}
              backgroundColor="#FFFFFF"
              onClick={onClose}
            />
          </div>
        </div>
      </Card>
      {toast && (
        <Toast
          text={toast.text}
          state={toast.state}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}

