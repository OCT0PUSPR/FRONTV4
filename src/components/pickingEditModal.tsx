"use client"

import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Card } from "../../@/components/ui/card"
import { CustomInput } from "./CusotmInput"
import { CustomDropdown as NewCustomDropdown } from "./NewCustomDropdown"
import { Button } from "../../@/components/ui/button"
import { CustomDatePicker } from "./ui/CustomDatePicker"
import { useTheme } from "../../context/theme"
import { useData } from "../../context/data"
import { useAuth } from "../../context/auth"
import { useCasl } from "../../context/casl"
import { API_CONFIG } from "../config/api"
import { ActionDropdown } from "./ActionDropdown"
import { CheckCircle2, Printer, RotateCcw, XCircle, MoreVertical, Plus, X, Trash2 } from "lucide-react"
import { NewCustomButton } from "./NewCustomButton"
import Toast from "./Toast"
import Alert from "./Alert"

interface PickingEditModalProps {
  isOpen: boolean
  pickingId: number | null
  variant: "incoming" | "outgoing" | "internal" | "dropship"
  onClose: () => void
  canDelete?: boolean
}

export default function PickingEditModal({ isOpen, pickingId, variant, onClose, canDelete = false }: PickingEditModalProps) {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const { sessionId } = useAuth()
  const { canEditPage } = useCasl()
  const { pickings, stockPickingTypes, partners, locations, products, uom, fetchData } = useData()
  
  // Map variant to page ID for permission checking
  const pageId = variant === "incoming" ? "receipts" : variant === "outgoing" ? "deliveries" : variant === "internal" ? "internal" : "dropship"
  const canEdit = canEditPage(pageId)

  const [readOnly, setReadOnly] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [moveLines, setMoveLines] = useState<any[]>([])
  const [showSuccess, setShowSuccess] = useState(false)
  const [addingLine, setAddingLine] = useState(false)
  const [currentPickingId, setCurrentPickingId] = useState<number | null>(pickingId)
  const [toast, setToast] = useState<{ text: string; state: "success" | "error" } | null>(null)
  const [errors, setErrors] = useState<{ pickingTypeId?: string }>({})
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false)


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
    partnerId: null as number | null,
    scheduledDate: "",
    pickingTypeId: null as number | null,
    locationDestId: null as number | null,
    locationId: null as number | null,
    origin: "",
    trackingRef: "",
    weightKg: "",
    note: "",
  })

  const [newMoveLine, setNewMoveLine] = useState<{
    productId: number | null
    packageId: number | null
    qty: string
    qtyDone: string
    uomId: number | null
  }>({ productId: null, packageId: null, qty: "", qtyDone: "", uomId: null })

  const uniqueStockPickingTypes = useMemo(() => {
    const seen = new Set<string>()
    const out: any[] = []
    for (const pt of stockPickingTypes || []) {
      const comp = Array.isArray(pt?.company_id) ? pt.company_id?.[1] : pt?.company_id
      const code = pt?.code
      const key = `${String(comp || "").trim()}::${String(code || "").trim()}`.toLowerCase()
      if (!seen.has(key)) {
        seen.add(key)
        out.push(pt)
      }
    }
    return out
  }, [stockPickingTypes])

  const currentStatus = useMemo(() => {
    const idToCheck = currentPickingId || pickingId
    if (!idToCheck) return "draft"
    const raw: any = (pickings || []).find((p: any) => p.id === idToCheck) || {}
    return raw.state || "draft"
  }, [pickings, pickingId, currentPickingId])

  const fetchMoveLinesByPicking = async (id: number) => {
    if (!sessionId) return
    try {
      const headers = {
        "Content-Type": "application/json",
        ...getOdooHeaders(),
      }
      const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/move-lines/by-picking`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          sessionId,
          pickingId: id,
          fields: ["id", "product_id", "package_id", "quantity", "product_uom_id", "picking_id", "location_id", "location_dest_id", "move_id"],
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data?.success) {
        setMoveLines(data.moveLines || [])
      } else {
        console.error("Failed to fetch move lines:", data)
        setMoveLines([])
      }
    } catch (error) {
      console.error("Error fetching move lines:", error)
      setMoveLines([])
    }
  }

  useEffect(() => {
    if (!isOpen) return
    
    setCurrentPickingId(pickingId)
    
    if (!partners?.length) fetchData("partners")
    if (!locations?.length) fetchData("locations")
    if (!products?.length) fetchData("products")
    if (!uom?.length) fetchData("uom")

    if (pickingId) {
      // Edit mode
      const raw: any = (pickings || []).find((p: any) => p.id === pickingId) || {}
      setForm({
        partnerId: Array.isArray(raw.partner_id) ? raw.partner_id[0] : null,
        scheduledDate: raw.scheduled_date ? String(raw.scheduled_date).slice(0, 10) : "",
        pickingTypeId: Array.isArray(raw.picking_type_id) ? raw.picking_type_id[0] : null,
        locationDestId: Array.isArray(raw.location_dest_id) ? raw.location_dest_id[0] : null,
        locationId: Array.isArray(raw.location_id) ? raw.location_id[0] : null,
        origin: raw.origin || "",
        trackingRef: raw.carrier_tracking_ref || "",
        weightKg: raw.weight != null ? String(raw.weight) : "",
        note: raw.note || "",
      })
      setReadOnly(raw.state === "done" || raw.state === "cancel")
      fetchMoveLinesByPicking(pickingId)
    } else {
      // Create mode
      setForm({
        partnerId: null,
        scheduledDate: "",
        pickingTypeId: null,
        locationDestId: null,
        locationId: null,
        origin: "",
        trackingRef: "",
        weightKg: "",
        note: "",
      })
      setReadOnly(false)
      setMoveLines([])
    }
    setDirty(false)
    setAddingLine(false)
    setNewMoveLine({ productId: null, packageId: null, qty: "", qtyDone: "", uomId: null })
  }, [isOpen, pickingId])

  const onChange = (patch: Partial<typeof form>) => {
    if (readOnly) return
    setForm((f) => ({ ...f, ...patch }))
    setDirty(true)
  }

  const downloadBase64File = (base64: string, filename: string) => {
    try {
      const byteCharacters = atob(base64)
      const byteNumbers = new Array(byteCharacters.length)
      for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i)
      const byteArray = new Uint8Array(byteNumbers)
      const blob = new Blob([byteArray], { type: "application/pdf" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = filename || "document.pdf"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch {}
  }

  const validatePickingAction = async () => {
    const idToUse = currentPickingId || pickingId
    if (!sessionId || !idToUse) return
    try {
      const headers = {
        "Content-Type": "application/json",
        ...getOdooHeaders(),
      }
      const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/pickings/${idToUse}/validate`, {
        method: "POST",
        headers,
        body: JSON.stringify({ sessionId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.success) throw new Error(data?.message || "Validate failed")
      await fetchMoveLinesByPicking(idToUse)
      fetchData("pickings")
    } catch {}
  }

  const printPickingAction = async () => {
    const idToUse = currentPickingId || pickingId
    if (!sessionId || !idToUse) return
    try {
      const headers = {
        "Content-Type": "application/json",
        ...getOdooHeaders(),
      }
      const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/pickings/${idToUse}/print`, {
        method: "POST",
        headers,
        body: JSON.stringify({ sessionId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.success || !data?.pdfBase64) throw new Error(data?.message || "Print failed")
      downloadBase64File(data.pdfBase64, data.filename || `picking_${idToUse}.pdf`)
    } catch {}
  }

  const returnPickingAction = async () => {
    const idToUse = currentPickingId || pickingId
    if (!sessionId || !idToUse) return
    try {
      const headers = {
        "Content-Type": "application/json",
        ...getOdooHeaders(),
      }
      const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/pickings/${idToUse}/return`, {
        method: "POST",
        headers,
        body: JSON.stringify({ sessionId, kwargs: {} }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.success) throw new Error(data?.message || "Return failed")
      fetchData("pickings")
    } catch {}
  }

  const cancelPickingAction = async () => {
    const idToUse = currentPickingId || pickingId
    if (!sessionId || !idToUse) return
    try {
      const headers = {
        "Content-Type": "application/json",
        ...getOdooHeaders(),
      }
      const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/pickings/${idToUse}/cancel`, {
        method: "POST",
        headers,
        body: JSON.stringify({ sessionId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.success) throw new Error(data?.message || "Cancel failed")
      fetchData("pickings")
    } catch {}
  }

  const handleDeleteClick = () => {
    setDeleteAlertOpen(true)
  }

  const deletePickingAction = async () => {
    const idToUse = currentPickingId || pickingId
    if (!sessionId || !idToUse) return
    try {
      const headers = {
        "Content-Type": "application/json",
        ...getOdooHeaders(),
      }
      const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/pickings/${idToUse}`, {
        method: "DELETE",
        headers,
        body: JSON.stringify({ sessionId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.success) throw new Error(data?.message || "Delete failed")
      setToast({ text: t("Record deleted successfully"), state: "success" })
      setDeleteAlertOpen(false)
      // Refresh data to remove deleted record
      await fetchData("pickings")
      onClose()
    } catch (error) {
      console.error("Delete failed:", error)
      setToast({ text: t("Failed to delete record"), state: "error" })
      setDeleteAlertOpen(false)
    }
  }

  const createMoveLine = async () => {
    if (!sessionId) return
    if (!newMoveLine.productId || !newMoveLine.uomId) {
      alert(t("Please select a product and unit of measure"))
      return
    }
    
    // If picking doesn't exist, we need to create it first
    let pickingIdToUse = currentPickingId || pickingId
    if (!pickingIdToUse) {
      // Save picking first to get an ID
      const saveResult = await savePicking()
      if (!saveResult) {
        alert(t("Please save the picking first before adding move lines"))
        return
      }
      // Wait a bit for the picking to be created and refresh
      await fetchData("pickings")
      // Try to find the newly created picking
      await new Promise(resolve => setTimeout(resolve, 500))
      const headers = {
        "Content-Type": "application/json",
        ...getOdooHeaders(),
      }
      const latestPickings = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/pickings`, {
        method: "POST",
        headers,
        body: JSON.stringify({ sessionId }),
      }).then(r => r.json()).catch(() => ({ pickings: [] }))
      
      // Find the most recent picking that matches our form data
      const newPicking = (latestPickings.pickings || []).find((p: any) => {
        const formPickingTypeId = form.pickingTypeId
        const pPickingTypeId = Array.isArray(p.picking_type_id) ? p.picking_type_id[0] : p.picking_type_id
        return formPickingTypeId && pPickingTypeId === formPickingTypeId
      })
      
      if (!newPicking?.id) {
        alert(t("Failed to create picking. Please try again."))
        return
      }
      pickingIdToUse = newPicking.id
      setCurrentPickingId(pickingIdToUse)
    }

    // Get picking details for location information
    const raw: any = (pickings || []).find((p: any) => p.id === pickingIdToUse) || {}
    const locationId = form.locationId || (Array.isArray(raw.location_id) ? raw.location_id[0] : raw.location_id)
    const locationDestId = form.locationDestId || (Array.isArray(raw.location_dest_id) ? raw.location_dest_id[0] : raw.location_dest_id)

    if (!locationId || !locationDestId) {
      alert(t("Please set source and destination locations for the picking first"))
      return
    }

    const values: any = {
      product_id: newMoveLine.productId,
      product_uom_id: newMoveLine.uomId,
      product_uom_qty: Number(newMoveLine.qty || "0"),
      picking_id: pickingIdToUse,
      location_id: locationId,
      location_dest_id: locationDestId,
    }
    if (newMoveLine.packageId) values.package_id = newMoveLine.packageId
    
    try {
      const headers = {
        "Content-Type": "application/json",
        ...getOdooHeaders(),
      }
      const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/move-lines/create`, {
        method: "POST",
        headers,
        body: JSON.stringify({ sessionId, values }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data?.success) {
        await fetchMoveLinesByPicking(pickingIdToUse)
        setNewMoveLine({ productId: null, packageId: null, qty: "", qtyDone: "", uomId: null })
        setAddingLine(false)
        setShowSuccess(true)
        setTimeout(() => setShowSuccess(false), 1200)
        // Refresh pickings to get updated data
        fetchData("pickings")
      } else {
        console.error("Failed to create move line:", data)
        alert(data?.message || t("Failed to create move line"))
      }
    } catch (error) {
      console.error("Error creating move line:", error)
      alert(t("Error creating move line. Please try again."))
    }
  }

  const isCreating = (currentPickingId || pickingId) === null

  const savePicking = async (): Promise<boolean> => {
    if (!sessionId) return false
    
    // Validate required fields for new records
    if (isCreating) {
      const newErrors: { pickingTypeId?: string } = {}
      if (!form.pickingTypeId) {
        newErrors.pickingTypeId = t("Operation type is required")
      }
      setErrors(newErrors)
      if (Object.keys(newErrors).length > 0) {
        return false
      }
    }
    
    const values: any = {}
    if (form.partnerId != null) values.partner_id = form.partnerId
    if (form.scheduledDate) values.scheduled_date = form.scheduledDate
    if (form.pickingTypeId != null) values.picking_type_id = form.pickingTypeId
    if (variant === "incoming") {
      if (form.locationDestId != null) values.location_dest_id = form.locationDestId
    } else if (variant === "internal" || variant === "dropship") {
      if (form.locationId != null) values.location_id = form.locationId
      if (form.locationDestId != null) values.location_dest_id = form.locationDestId
    } else {
      if (form.locationId != null) values.location_id = form.locationId
    }
    if (form.origin !== undefined) values.origin = form.origin
    if (form.trackingRef !== undefined) values.carrier_tracking_ref = form.trackingRef
    if (form.weightKg !== undefined && form.weightKg !== "") values.weight = Number(form.weightKg)
    if (form.note !== undefined) values.note = form.note

    if (currentPickingId || pickingId) {
      // Update existing picking
      const idToUpdate = currentPickingId || pickingId
      const headers = {
        "Content-Type": "application/json",
        ...getOdooHeaders(),
      }
      const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/pickings/${idToUpdate}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ sessionId, values }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data?.success) {
        setDirty(false)
        setShowSuccess(true)
        setToast({ text: t("Picking updated successfully"), state: "success" })
        setTimeout(() => {
          setShowSuccess(false)
          setToast(null)
        }, 1200)
        fetchData("pickings")
        return true
      } else {
        setToast({ text: data?.message || t("Failed to update picking"), state: "error" })
        setTimeout(() => setToast(null), 3000)
        return false
      }
    } else {
      // Create new picking
      const headers = {
        "Content-Type": "application/json",
        ...getOdooHeaders(),
      }
      const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/pickings/create`, {
        method: "POST",
        headers,
        body: JSON.stringify({ sessionId, values }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data?.success && data?.id) {
        setDirty(false)
        setShowSuccess(true)
        setToast({ text: t("Picking created successfully"), state: "success" })
        // Update currentPickingId state with the new ID
        setCurrentPickingId(data.id)
        fetchData("pickings")
        setTimeout(() => {
          setShowSuccess(false)
          setToast(null)
        }, 1200)
        return true
      } else {
        setToast({ text: data?.message || t("Failed to create picking"), state: "error" })
        setTimeout(() => setToast(null), 3000)
        return false
      }
    }
  }

  if (!isOpen) return null

  const title = variant === "incoming" ? t("Receipt Details") : variant === "internal" ? t("Internal Transfer Details") : variant === "dropship" ? t("Dropship Details") : t("Delivery Details")
  const partnerLabel = variant === "incoming" ? t("Receive from") : variant === "internal" ? t("Contact") : variant === "dropship" ? t("Vendor") : t("Deliver to")
  const locationLabel = variant === "incoming" ? t("Destination Location") : variant === "internal" ? t("Source Location") : t("Source Location")

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
              {isCreating ? (variant === "incoming" ? t("New Receipt") : variant === "internal" ? t("New Internal Transfer") : variant === "dropship" ? t("New Dropship") : t("New Delivery")) : title}
            </h2>
            <p style={{ fontSize: 13, color: "#000" }}>
              {(currentPickingId || pickingId) ? (pickings || []).find((r: any) => r.id === (currentPickingId || pickingId))?.name || "" : ""}
            </p>
          </div>

          {!isCreating && canEdit && (
            <ActionDropdown
              label={t("Actions")}
              icon={MoreVertical}
              actions={[
                ...(currentStatus !== "done"
                  ? [
                      {
                        key: "validate",
                        label: t("Validate"),
                        icon: CheckCircle2,
                        onClick: validatePickingAction,
                      },
                    ]
                  : []),
                {
                  key: "print",
                  label: t("Print"),
                  icon: Printer,
                  onClick: printPickingAction,
                },
                {
                  key: "return",
                  label: t("Return"),
                  icon: RotateCcw,
                  onClick: returnPickingAction,
                },
                ...(currentStatus !== "done"
                  ? [
                      {
                        key: "cancel",
                        label: t("Cancel"),
                        icon: XCircle,
                        onClick: cancelPickingAction,
                        danger: true,
                      },
                    ]
                  : []),
                ...(canDelete ? [{
                  key: "delete",
                  label: t("Delete"),
                  icon: Trash2,
                  onClick: handleDeleteClick,
                  danger: true,
                }] : []),
              ]}
            />
          )}
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
                <NewCustomDropdown
                  label={partnerLabel}
                  values={(partners || []).map((p: any) => p.display_name || p.name || String(p.id))}
                  type="single"
                  placeholder={t("Select partner")}
                  defaultValue={
                    form.partnerId
                      ? (partners || []).find((p: any) => p.id === form.partnerId)?.display_name ||
                        (partners || []).find((p: any) => p.id === form.partnerId)?.name ||
                        String(form.partnerId)
                      : undefined
                  }
                  onChange={(v) => {
                    const selectedPartner = (partners || []).find(
                      (p: any) => (p.display_name || p.name || String(p.id)) === v
                    )
                    onChange({ partnerId: selectedPartner ? selectedPartner.id : null })
                  }}
                />
              </div>

              {variant === "internal" ? (
                <>
                  <div>
                    <NewCustomDropdown
                      label={t("Source Location")}
                      values={(locations || []).map((loc: any) => loc.complete_name || loc.name || String(loc.id))}
                      type="single"
                      placeholder={t("Select location")}
                      defaultValue={
                        form.locationId
                          ? (locations || []).find((loc: any) => loc.id === form.locationId)?.complete_name ||
                            (locations || []).find((loc: any) => loc.id === form.locationId)?.name ||
                            String(form.locationId)
                          : undefined
                      }
                      onChange={(v) => {
                        const selectedLocation = (locations || []).find(
                          (loc: any) => (loc.complete_name || loc.name || String(loc.id)) === v
                        )
                        onChange({ locationId: selectedLocation ? selectedLocation.id : null })
                      }}
                    />
                  </div>
                  <div>
                    <NewCustomDropdown
                      label={t("Destination Location")}
                      values={(locations || []).map((loc: any) => loc.complete_name || loc.name || String(loc.id))}
                      type="single"
                      placeholder={t("Select location")}
                      defaultValue={
                        form.locationDestId
                          ? (locations || []).find((loc: any) => loc.id === form.locationDestId)?.complete_name ||
                            (locations || []).find((loc: any) => loc.id === form.locationDestId)?.name ||
                            String(form.locationDestId)
                          : undefined
                      }
                      onChange={(v) => {
                        const selectedLocation = (locations || []).find(
                          (loc: any) => (loc.complete_name || loc.name || String(loc.id)) === v
                        )
                        onChange({ locationDestId: selectedLocation ? selectedLocation.id : null })
                      }}
                    />
                  </div>
                </>
              ) : (
                <div>
                  <NewCustomDropdown
                    label={locationLabel}
                    values={(locations || []).map((loc: any) => loc.complete_name || loc.name || String(loc.id))}
                    type="single"
                    placeholder={t("Select location")}
                    defaultValue={
                      variant === "incoming"
                        ? form.locationDestId
                          ? (locations || []).find((loc: any) => loc.id === form.locationDestId)?.complete_name ||
                            (locations || []).find((loc: any) => loc.id === form.locationDestId)?.name ||
                            String(form.locationDestId)
                          : undefined
                        : form.locationId
                          ? (locations || []).find((loc: any) => loc.id === form.locationId)?.complete_name ||
                            (locations || []).find((loc: any) => loc.id === form.locationId)?.name ||
                            String(form.locationId)
                          : undefined
                    }
                    onChange={(v) => {
                      const selectedLocation = (locations || []).find(
                        (loc: any) => (loc.complete_name || loc.name || String(loc.id)) === v
                      )
                      if (variant === "incoming") {
                        onChange({ locationDestId: selectedLocation ? selectedLocation.id : null })
                      } else {
                        onChange({ locationId: selectedLocation ? selectedLocation.id : null })
                      }
                    }}
                  />
                </div>
              )}

              <div>
                
                <CustomDatePicker
                  value={form.scheduledDate}
                  onChange={(date) => onChange({ scheduledDate: date })}
                  label={t("Scheduled Date")}
                  placeholder={t("Select date")}
                  colors={colors}
                />
              </div>

              <div>
                <NewCustomDropdown
                  label={t("Operation Type")}
                  values={(uniqueStockPickingTypes || []).map((pt: any) => {
                    const companyName = Array.isArray(pt.company_id) ? pt.company_id[1] : pt.company_id || ""
                    return `${companyName}: ${pt.code}`
                  })}
                  type="single"
                  placeholder={t("Select operation type")}
                  defaultValue={
                    form.pickingTypeId
                      ? (() => {
                          const found = (uniqueStockPickingTypes || []).find((pt: any) => pt.id === form.pickingTypeId)
                          if (!found) return undefined
                          const companyName = Array.isArray(found.company_id) ? found.company_id[1] : found.company_id || ""
                          return `${companyName}: ${found.code}`
                        })()
                      : undefined
                  }
                  onChange={(v) => {
                    const selectedType = (uniqueStockPickingTypes || []).find((pt: any) => {
                      const companyName = Array.isArray(pt.company_id) ? pt.company_id[1] : pt.company_id || ""
                      return `${companyName}: ${pt.code}` === v
                    })
                    onChange({ pickingTypeId: selectedType ? selectedType.id : null })
                    // Clear error when user selects a value
                    if (errors.pickingTypeId) {
                      setErrors({ ...errors, pickingTypeId: undefined })
                    }
                  }}
                />
                {isCreating && errors.pickingTypeId && (
                  <div style={{ 
                    marginTop: "0.25rem", 
                    fontSize: "0.75rem", 
                    color: "#ef4444",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.25rem"
                  }}>
                    <XCircle size={14} />
                    <span>{errors.pickingTypeId}</span>
                  </div>
                )}
              </div>

              <div>
                <CustomInput
                  label={t("Source Document")}
                  type="text"
                  value={form.origin}
                  onChange={(v) => onChange({ origin: v })}
                  placeholder={t("Enter source document")}
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
                {t("Operations")}
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
                    backgroundColor={colors.card}
                    icon={Plus}
                    onClick={() => {
                      setAddingLine(true)
                      setNewMoveLine({ productId: null, packageId: null, qty: "", qtyDone: "", uomId: null })
                    }}
                    disabled={addingLine}
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
                      <th style={{ padding: ".5rem", fontWeight: 600 }}>{t("Packaging")}</th>
                      <th style={{ padding: ".5rem", fontWeight: 600 }}>{t("Demand")}</th>
                      <th style={{ padding: ".5rem", fontWeight: 600 }}>{t("Quantity")}</th>
                      <th style={{ padding: ".5rem", fontWeight: 600 }}>{t("Units")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(moveLines || []).map((ml: any) => (
                      <tr key={ml.id} style={{ borderTop: `1px solid ${colors.border}` }}>
                        <td style={{ padding: ".5rem", color: colors.textPrimary, fontSize: 13 }}>
                          {Array.isArray(ml.product_id) ? ml.product_id[1] : ml.product_id}
                        </td>
                        <td style={{ padding: ".5rem", color: colors.textPrimary, fontSize: 13 }}>
                          {Array.isArray(ml.package_id) ? ml.package_id[1] : ml.package_id || ""}
                        </td>
                        
                        <td style={{ padding: ".5rem", color: colors.textPrimary, fontSize: 13 }}>
                          {ml.quantity ?? ""}
                        </td>
                        <td style={{ padding: ".5rem", color: colors.textPrimary, fontSize: 13 }}>
                          {Array.isArray(ml.product_uom_id) ? ml.product_uom_id[1] : ml.product_uom_id}
                        </td>
                      </tr>
                    ))}
                    {(!moveLines || moveLines.length === 0) && (
                      <tr>
                        <td
                          colSpan={5}
                          style={{ padding: ".75rem", color: colors.textSecondary, textAlign: "center", fontSize: 13 }}
                        >
                          {t("No operation lines")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {!readOnly && addingLine && (
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
                          newMoveLine.productId
                            ? (products || []).find((p: any) => p.id === newMoveLine.productId)?.display_name ||
                              (products || []).find((p: any) => p.id === newMoveLine.productId)?.name ||
                              String(newMoveLine.productId)
                            : undefined
                        }
                        onChange={(v) => {
                          const selectedProduct = (products || []).find(
                            (p: any) => (p.display_name || p.name || String(p.id)) === v
                          )
                          setNewMoveLine((s) => ({ ...s, productId: selectedProduct ? selectedProduct.id : null }))
                        }}
                      />
                    </div>

                    

                    <CustomInput
                      label=""
                      type="number"
                      value={newMoveLine.qty}
                      onChange={(v) => setNewMoveLine((s) => ({ ...s, qty: v.replace(/[^0-9.]/g, "") }))}
                      placeholder={t("Quantity")}
                    />

                    <div style={{ minWidth: 0 }}>
                      <NewCustomDropdown
                        label=""
                        values={(uom || []).map((u: any) => u.name || u.display_name || String(u.id))}
                        type="single"
                        placeholder={t("Units")}
                        defaultValue={
                          newMoveLine.uomId
                            ? (uom || []).find((u: any) => u.id === newMoveLine.uomId)?.name ||
                              (uom || []).find((u: any) => u.id === newMoveLine.uomId)?.display_name ||
                              String(newMoveLine.uomId)
                            : undefined
                        }
                        onChange={(v) => {
                          const selectedUom = (uom || []).find((u: any) => (u.name || u.display_name || String(u.id)) === v)
                          setNewMoveLine((s) => ({ ...s, uomId: selectedUom ? selectedUom.id : null }))
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: ".5rem", marginTop: ".75rem" }}>
                    <Button
                      onClick={createMoveLine}
                      style={{
                        background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
                        color: "#fff",
                        border: "none",
                        padding: "0.5rem 1rem",
                        fontSize: 13,
                      }}
                    >
                      {t("Confirm")}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setAddingLine(false)
                        setNewMoveLine({ productId: null, packageId: null, qty: "", qtyDone: "", uomId: null })
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
                {t("Additional Information")}
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
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <CustomInput
                    label={t("Tracking Reference")}
                    type="text"
                    value={form.trackingRef}
                    onChange={(v) => onChange({ trackingRef: v })}
                    placeholder={t("Enter tracking reference")}
                  />
                </div>
                <div>
                  <CustomInput
                    label={t("Weight (kg)")}
                    type="number"
                    value={form.weightKg}
                    onChange={(v) => onChange({ weightKg: v.replace(/[^0-9.]/g, "") })}
                    placeholder={t("Enter weight")}
                  />
                </div>
                <div style={{ gridColumn: "1/-1" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: 12,
                      color: colors.textSecondary,
                      fontWeight: 600,
                      marginBottom: 6,
                    }}
                  >
                    {t("Note")}
                  </label>
                  <textarea
                    value={form.note}
                    onChange={(e) => onChange({ note: e.target.value })}
                    style={{
                      width: "100%",
                      minHeight: 100,
                      border: `1px solid ${colors.border}`,
                      borderRadius: 8,
                      background: colors.card,
                      color: colors.textPrimary,
                      padding: "0.6rem 0.75rem",
                      fontSize: 13,
                      fontFamily: "inherit",
                      resize: "vertical",
                    }}
                    disabled={readOnly}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

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
                backgroundColor="#25D0FE"
                onClick={savePicking}
              />
            )}
            <NewCustomButton
              label={t("Close")}
              backgroundColor={colors.card}
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

      <Alert
        isOpen={deleteAlertOpen}
        type="delete"
        title={t("Delete this record?")}
        message={t("This record will be permanently deleted and cannot be recovered.")}
        onClose={() => setDeleteAlertOpen(false)}
        onConfirm={deletePickingAction}
        confirmLabel={t("Delete")}
        cancelLabel={t("Cancel")}
      />
    </div>
  )
}
