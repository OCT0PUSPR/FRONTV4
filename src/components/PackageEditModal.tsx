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
import { API_CONFIG } from "../config/api"
import { X, Plus, Trash2 } from "lucide-react"
import { NewCustomButton } from "./NewCustomButton"
import Toast from "./Toast"

interface PackageEditModalProps {
  isOpen: boolean
  packageId: number | null
  onClose: () => void
  canDelete?: boolean
}

export default function PackageEditModal({ isOpen, packageId, onClose, canDelete = false }: PackageEditModalProps) {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const { sessionId } = useAuth()
  const { packages, packageTypes, locations, products, uom, lots, quants, fetchData } = useData()

  const [dirty, setDirty] = useState(false)
  const [quantLines, setQuantLines] = useState<any[]>([])
  const [showSuccess, setShowSuccess] = useState(false)
  const [addingLine, setAddingLine] = useState(false)
  const [currentPackageId, setCurrentPackageId] = useState<number | null>(packageId)
  const [toast, setToast] = useState<{ text: string; state: "success" | "error" } | null>(null)

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
    name: "",
    package_type_id: null as number | null,
    shipping_weight: "",
    pack_date: "",
    location_id: null as number | null,
  })

  const [newQuantLine, setNewQuantLine] = useState<{
    product_tmpl_id: number | null
    lot_id: number | null
    quantity: string
    product_uom_id: number | null
  }>({ product_tmpl_id: null, lot_id: null, quantity: "", product_uom_id: null })

  const fetchQuantsByPackage = async (id: number) => {
    if (!sessionId) return
    try {
      const headers = {
        "Content-Type": "application/json",
        ...getOdooHeaders(),
      }
      const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/quants/by-package`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          sessionId,
          packageId: id,
          fields: ["id", "product_id", "product_tmpl_id", "lot_id", "quantity", "product_uom_id", "package_id"],
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data?.success) {
        setQuantLines(data.quants || [])
      } else {
        console.error("Failed to fetch quants:", data)
        setQuantLines([])
      }
    } catch (error) {
      console.error("Error fetching quants:", error)
      setQuantLines([])
    }
  }

  useEffect(() => {
    if (!isOpen) return

    setCurrentPackageId(packageId)

    if (!packageTypes?.length) fetchData("packageTypes")
    if (!locations?.length) fetchData("locations")
    if (!products?.length) fetchData("products")
    if (!uom?.length) fetchData("uom")
    if (!lots?.length) fetchData("lots")

    if (packageId) {
      // Edit mode
      const raw: any = (packages || []).find((p: any) => p.id === packageId) || {}
      setForm({
        name: raw.name || "",
        package_type_id: Array.isArray(raw.package_type_id) ? raw.package_type_id[0] : raw.package_type_id || null,
        shipping_weight: raw.shipping_weight != null ? String(raw.shipping_weight) : "",
        pack_date: raw.pack_date ? String(raw.pack_date).slice(0, 10) : "",
        location_id: Array.isArray(raw.location_id) ? raw.location_id[0] : raw.location_id || null,
      })
      fetchQuantsByPackage(packageId)
    } else {
      // Create mode
      setForm({
        name: "",
        package_type_id: null,
        shipping_weight: "",
        pack_date: "",
        location_id: null,
      })
      setQuantLines([])
    }
    setDirty(false)
    setAddingLine(false)
    setNewQuantLine({ product_tmpl_id: null, lot_id: null, quantity: "", product_uom_id: null })
  }, [isOpen, packageId])

  const onChange = (patch: Partial<typeof form>) => {
    setForm((f) => ({ ...f, ...patch }))
    setDirty(true)
  }

  const isCreating = (currentPackageId || packageId) === null

  const savePackage = async (): Promise<boolean> => {
    if (!sessionId) return false
    const values: any = {}
    if (form.name) values.name = form.name
    if (form.package_type_id != null) values.package_type_id = form.package_type_id
    if (form.shipping_weight !== undefined && form.shipping_weight !== "") values.shipping_weight = Number(form.shipping_weight)
    if (form.pack_date) values.pack_date = form.pack_date
    if (form.location_id != null) values.location_id = form.location_id

    if (currentPackageId || packageId) {
      // Update existing package
      const idToUpdate = currentPackageId || packageId
      const headers = {
        "Content-Type": "application/json",
        ...getOdooHeaders(),
      }
      const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/quant-packages/${idToUpdate}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ sessionId, values }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data?.success) {
        setDirty(false)
        setShowSuccess(true)
        setToast({ text: t("Package updated successfully"), state: "success" })
        fetchData("packages")
        setTimeout(() => {
          setShowSuccess(false)
          setToast(null)
        }, 1200)
        return true
      } else {
        setToast({ text: data?.message || t("Failed to update package"), state: "error" })
        setTimeout(() => setToast(null), 3000)
        return false
      }
    } else {
      // Create new package
      const headers = {
        "Content-Type": "application/json",
        ...getOdooHeaders(),
      }
      const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/quant-packages/create`, {
        method: "POST",
        headers,
        body: JSON.stringify({ sessionId, values }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data?.success && data?.id) {
        setDirty(false)
        setShowSuccess(true)
        setToast({ text: t("Package created successfully"), state: "success" })
        setCurrentPackageId(data.id)
        fetchData("packages")
        setTimeout(() => {
          setShowSuccess(false)
          setToast(null)
        }, 1200)
        return true
      } else {
        setToast({ text: data?.message || t("Failed to create package"), state: "error" })
        setTimeout(() => setToast(null), 3000)
        return false
      }
    }
  }

  const createQuantLine = async () => {
    if (!sessionId) return
    if (!newQuantLine.product_tmpl_id || !newQuantLine.product_uom_id) {
      alert(t("Please select a product and unit of measure"))
      return
    }

    // If package doesn't exist, we need to create it first
    let packageIdToUse = currentPackageId || packageId
    if (!packageIdToUse) {
      // Save package first to get an ID
      const saveResult = await savePackage()
      if (!saveResult || !currentPackageId) {
        alert(t("Please save the package first before adding lines"))
        return
      }
      packageIdToUse = currentPackageId
    }

    if (!packageIdToUse) {
      alert(t("Package ID is required"))
      return
    }

    const locationId = form.location_id
    if (!locationId) {
      alert(t("Please set location for the package first"))
      return
    }

    const product = (products || []).find((p: any) => p.id === newQuantLine.product_tmpl_id)
    if (!product) {
      alert(t("Product not found"))
      return
    }

    const values: any = {
      product_id: newQuantLine.product_tmpl_id,
      product_tmpl_id: newQuantLine.product_tmpl_id,
      product_uom_id: newQuantLine.product_uom_id,
      quantity: Number(newQuantLine.quantity || "0"),
      package_id: packageIdToUse,
      location_id: locationId,
    }
    if (newQuantLine.lot_id) values.lot_id = newQuantLine.lot_id

    try {
      const headers = {
        "Content-Type": "application/json",
        ...getOdooHeaders(),
      }
      const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/quants/create`, {
        method: "POST",
        headers,
        body: JSON.stringify({ sessionId, values }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data?.success) {
        await fetchQuantsByPackage(packageIdToUse)
        setNewQuantLine({ product_tmpl_id: null, lot_id: null, quantity: "", product_uom_id: null })
        setAddingLine(false)
        setShowSuccess(true)
        setToast({ text: t("Quant line added successfully"), state: "success" })
        setTimeout(() => {
          setShowSuccess(false)
          setToast(null)
        }, 1200)
        fetchData("packages")
      } else {
        console.error("Failed to create quant line:", data)
        setToast({ text: data?.message || t("Failed to create quant line"), state: "error" })
        setTimeout(() => setToast(null), 3000)
      }
    } catch (error) {
      console.error("Error creating quant line:", error)
      setToast({ text: t("Error creating quant line. Please try again."), state: "error" })
      setTimeout(() => setToast(null), 3000)
    }
  }

  const saveQuantLines = async () => {
    if (!sessionId || !currentPackageId) return

    const updates: any[] = []
    for (const line of quantLines) {
      const values: any = {}
      if (line.product_tmpl_id !== undefined) values.product_tmpl_id = line.product_tmpl_id
      if (line.lot_id !== undefined) values.lot_id = line.lot_id
      if (line.quantity !== undefined) values.quantity = Number(line.quantity)
      if (line.product_uom_id !== undefined) values.product_uom_id = line.product_uom_id

      if (Object.keys(values).length > 0) {
        updates.push({
          id: line.id,
          values,
        })
      }
    }

    if (updates.length === 0) {
      setToast({ text: t("No changes to save"), state: "error" })
      setTimeout(() => setToast(null), 3000)
      return
    }

    try {
      const headers = {
        "Content-Type": "application/json",
        ...getOdooHeaders(),
      }
      for (const update of updates) {
        const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/quants/${update.id}`, {
          method: "PUT",
          headers,
          body: JSON.stringify({ sessionId, values: update.values }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok || !data?.success) {
          throw new Error(data?.message || "Failed to update quant line")
        }
      }
      await fetchQuantsByPackage(currentPackageId)
      setToast({ text: t("Quant lines saved successfully"), state: "success" })
      setTimeout(() => setToast(null), 3000)
      fetchData("packages")
    } catch (error: any) {
      console.error("Error saving quant lines:", error)
      setToast({ text: error.message || t("Failed to save quant lines"), state: "error" })
      setTimeout(() => setToast(null), 3000)
    }
  }

  const handleDeletePackage = async () => {
    if (!sessionId) return
    const packageIdToDelete = currentPackageId || packageId
    if (!packageIdToDelete) return
    if (!confirm(t("Are you sure you want to delete this package?"))) return

    try {
      const headers = {
        "Content-Type": "application/json",
        ...getOdooHeaders(),
      }
      const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/quant-packages/${packageIdToDelete}`, {
        method: "DELETE",
        headers,
        body: JSON.stringify({ sessionId }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data?.success) {
        setToast({ text: t("Package deleted successfully"), state: "success" })
        setTimeout(() => setToast(null), 3000)
        fetchData("packages")
        onClose()
      } else {
        setToast({ text: data?.message || t("Failed to delete package"), state: "error" })
        setTimeout(() => setToast(null), 3000)
      }
    } catch (error: any) {
      console.error("Delete package failed", error)
      setToast({ text: error?.message || t("An error occurred"), state: "error" })
      setTimeout(() => setToast(null), 3000)
    }
  }

  if (!isOpen) return null

  const title = isCreating ? t("New Package") : t("Package Details")

  // Get product templates for dropdown
  const productTemplates = useMemo(() => {
    return (products || []).filter((p: any) => p.type === "product")
  }, [products])

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
              {title}
            </h2>
            <p style={{ fontSize: 13, color: "#000" }}>
              {(currentPackageId || packageId) ? (packages || []).find((r: any) => r.id === (currentPackageId || packageId))?.name || "" : ""}
            </p>
          </div>
          <Button
            style={{
              background: colors.background,
              border: "none",
              borderRadius: "8px",
              padding: "0.5rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onClick={() => {
              if (!dirty || window.confirm(t("Discard unsaved changes?"))) onClose()
            }}
          >
            <X size={24} color={colors.textPrimary} />
          </Button>
        </div>

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
              <CustomInput
                label={t("Package reference")}
                type="text"
                value={form.name}
                onChange={(v) => onChange({ name: v })}
                placeholder={t("Enter package reference")}
              />
              <div>
                <NewCustomDropdown
                  label={t("Package type")}
                  values={(packageTypes || []).map((pt: any) => pt.name || pt.display_name || String(pt.id))}
                  type="single"
                  placeholder={t("Select package type")}
                  defaultValue={
                    form.package_type_id
                      ? (packageTypes || []).find((pt: any) => pt.id === form.package_type_id)?.name ||
                        (packageTypes || []).find((pt: any) => pt.id === form.package_type_id)?.display_name ||
                        String(form.package_type_id)
                      : undefined
                  }
                  onChange={(v) => {
                    const selectedType = (packageTypes || []).find(
                      (pt: any) => (pt.name || pt.display_name || String(pt.id)) === v
                    )
                    onChange({ package_type_id: selectedType ? selectedType.id : null })
                  }}
                />
              </div>
              <CustomInput
                label={t("Shipping weight/kg")}
                type="number"
                value={form.shipping_weight}
                onChange={(v) => onChange({ shipping_weight: v.replace(/[^0-9.]/g, "") })}
                placeholder={t("Enter weight")}
              />
              <div>
                <CustomDatePicker
                  value={form.pack_date}
                  onChange={(date) => onChange({ pack_date: date })}
                  label={t("Pack date")}
                  placeholder={t("Select date")}
                  colors={colors}
                />
              </div>
              <div>
                <NewCustomDropdown
                  label={t("Location")}
                  values={(locations || []).map((loc: any) => loc.complete_name || loc.name || String(loc.id))}
                  type="single"
                  placeholder={t("Select location")}
                  defaultValue={
                    form.location_id
                      ? (locations || []).find((loc: any) => loc.id === form.location_id)?.complete_name ||
                        (locations || []).find((loc: any) => loc.id === form.location_id)?.name ||
                        String(form.location_id)
                      : undefined
                  }
                  onChange={(v) => {
                    const selectedLocation = (locations || []).find(
                      (loc: any) => (loc.complete_name || loc.name || String(loc.id)) === v
                    )
                    onChange({ location_id: selectedLocation ? selectedLocation.id : null })
                  }}
                />
              </div>
            </div>
          </div>

          {/* Content Section */}
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
                {t("Content")}
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
                <NewCustomButton
                  label={t("Add Line")}
                  backgroundColor="#FFFFFF"
                  icon={Plus}
                  onClick={() => {
                    setAddingLine(true)
                    setNewQuantLine({ product_tmpl_id: null, lot_id: null, quantity: "", product_uom_id: null })
                  }}
                  disabled={addingLine}
                />
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
                      <th style={{ padding: ".5rem", fontWeight: 600 }}>{t("Lot/Serial Number")}</th>
                      <th style={{ padding: ".5rem", fontWeight: 600 }}>{t("Quantity")}</th>
                      <th style={{ padding: ".5rem", fontWeight: 600 }}>{t("Unit of Measure")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(quantLines || []).map((ql: any) => {
                      const product = (products || []).find((p: any) => {
                        const qlProductId = Array.isArray(ql.product_tmpl_id) ? ql.product_tmpl_id[0] : ql.product_tmpl_id
                        return p.id === qlProductId || (Array.isArray(p.id) && p.id[0] === qlProductId)
                      })
                      const lot = (lots || []).find((l: any) => {
                        const qlLotId = Array.isArray(ql.lot_id) ? ql.lot_id[0] : ql.lot_id
                        return l.id === qlLotId || (Array.isArray(l.id) && l.id[0] === qlLotId)
                      })
                      const uomRecord = (uom || []).find((u: any) => {
                        const qlUomId = Array.isArray(ql.product_uom_id) ? ql.product_uom_id[0] : ql.product_uom_id
                        return u.id === qlUomId || (Array.isArray(u.id) && u.id[0] === qlUomId)
                      })

                      return (
                        <tr key={ql.id} style={{ borderTop: `1px solid ${colors.border}` }}>
                          <td style={{ padding: ".5rem", color: colors.textPrimary, fontSize: 13 }}>
                            <NewCustomDropdown
                              label=""
                              values={productTemplates.map((p: any) => p.name || String(p.id))}
                              type="single"
                              placeholder={t("Product")}
                              defaultValue={
                                product ? (product.name || String(product.id)) : undefined
                              }
                              onChange={(v) => {
                                const selectedProduct = productTemplates.find(
                                  (p: any) => (p.name || String(p.id)) === v
                                )
                                if (selectedProduct) {
                                  setQuantLines((lines) =>
                                    lines.map((line) =>
                                      line.id === ql.id
                                        ? { ...line, product_tmpl_id: selectedProduct.id, product_id: selectedProduct.id }
                                        : line
                                    )
                                  )
                                }
                              }}
                            />
                          </td>
                          <td style={{ padding: ".5rem", color: colors.textPrimary, fontSize: 13 }}>
                            <NewCustomDropdown
                              label=""
                              values={(lots || []).map((l: any) => l.name || String(l.id))}
                              type="single"
                              placeholder={t("Lot/Serial")}
                              defaultValue={lot ? (lot.name || String(lot.id)) : undefined}
                              onChange={(v) => {
                                const selectedLot = (lots || []).find((l: any) => (l.name || String(l.id)) === v)
                                setQuantLines((lines) =>
                                  lines.map((line) =>
                                    line.id === ql.id
                                      ? { ...line, lot_id: selectedLot ? selectedLot.id : null }
                                      : line
                                  )
                                )
                              }}
                            />
                          </td>
                          <td style={{ padding: ".5rem", color: colors.textPrimary, fontSize: 13 }}>
                            <CustomInput
                              label=""
                              type="number"
                              value={String(ql.quantity || "")}
                              onChange={(v) => {
                                setQuantLines((lines) =>
                                  lines.map((line) =>
                                    line.id === ql.id
                                      ? { ...line, quantity: v.replace(/[^0-9.]/g, "") }
                                      : line
                                  )
                                )
                              }}
                              placeholder={t("Quantity")}
                            />
                          </td>
                          <td style={{ padding: ".5rem", color: colors.textPrimary, fontSize: 13 }}>
                            {uomRecord ? (uomRecord.name || String(uomRecord.id)) : ""}
                          </td>
                        </tr>
                      )
                    })}
                    {(!quantLines || quantLines.length === 0) && !addingLine && (
                      <tr>
                        <td
                          colSpan={4}
                          style={{ padding: ".75rem", color: colors.textSecondary, textAlign: "center", fontSize: 13 }}
                        >
                          {t("No content lines")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {addingLine && (
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
                        values={productTemplates.map((p: any) => p.name || String(p.id))}
                        type="single"
                        placeholder={t("Product")}
                        defaultValue={
                          newQuantLine.product_tmpl_id
                            ? productTemplates.find((p: any) => p.id === newQuantLine.product_tmpl_id)?.name ||
                              String(newQuantLine.product_tmpl_id)
                            : undefined
                        }
                        onChange={(v) => {
                          const selectedProduct = productTemplates.find((p: any) => (p.name || String(p.id)) === v)
                          if (selectedProduct) {
                            setNewQuantLine((s) => ({ ...s, product_tmpl_id: selectedProduct.id }))
                            // Auto-set UOM from product
                            if (selectedProduct.uom_id) {
                              const productUomId = Array.isArray(selectedProduct.uom_id) ? selectedProduct.uom_id[0] : selectedProduct.uom_id
                              setNewQuantLine((s) => ({ ...s, product_uom_id: productUomId }))
                            }
                          }
                        }}
                      />
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <NewCustomDropdown
                        label=""
                        values={(lots || []).map((l: any) => l.name || String(l.id))}
                        type="single"
                        placeholder={t("Lot/Serial")}
                        defaultValue={
                          newQuantLine.lot_id
                            ? (lots || []).find((l: any) => l.id === newQuantLine.lot_id)?.name ||
                              String(newQuantLine.lot_id)
                            : undefined
                        }
                        onChange={(v) => {
                          const selectedLot = (lots || []).find((l: any) => (l.name || String(l.id)) === v)
                          setNewQuantLine((s) => ({ ...s, lot_id: selectedLot ? selectedLot.id : null }))
                        }}
                      />
                    </div>

                    <CustomInput
                      label=""
                      type="number"
                      value={newQuantLine.quantity}
                      onChange={(v) => setNewQuantLine((s) => ({ ...s, quantity: v.replace(/[^0-9.]/g, "") }))}
                      placeholder={t("Quantity")}
                    />

                    <div style={{ minWidth: 0 }}>
                      <NewCustomDropdown
                        label=""
                        values={(uom || []).map((u: any) => u.name || u.display_name || String(u.id))}
                        type="single"
                        placeholder={t("Unit of Measure")}
                        defaultValue={
                          newQuantLine.product_uom_id
                            ? (uom || []).find((u: any) => u.id === newQuantLine.product_uom_id)?.name ||
                              (uom || []).find((u: any) => u.id === newQuantLine.product_uom_id)?.display_name ||
                              String(newQuantLine.product_uom_id)
                            : undefined
                        }
                        onChange={(v) => {
                          const selectedUom = (uom || []).find((u: any) => (u.name || u.display_name || String(u.id)) === v)
                          setNewQuantLine((s) => ({ ...s, product_uom_id: selectedUom ? selectedUom.id : null }))
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: ".5rem", marginTop: ".75rem" }}>
                    <Button
                      onClick={createQuantLine}
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
                        setNewQuantLine({ product_tmpl_id: null, lot_id: null, quantity: "", product_uom_id: null })
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

              {quantLines.length > 0 && (
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem" }}>
                  <Button
                    onClick={saveQuantLines}
                    style={{
                      background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
                      color: "#fff",
                      border: "none",
                      padding: "0.5rem 1.5rem",
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    {t("Save")}
                  </Button>
                </div>
              )}
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
            borderTop: `1px solid ${colors.border}`,
          }}
        >
          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "space-between", width: "100%" }}>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              {canDelete && !isCreating && (
                <Button
                  onClick={handleDeletePackage}
                  style={{
                    background: "#ef4444",
                    color: "#FFFFFF",
                    border: "none",
                    padding: "0.5rem 1rem",
                    borderRadius: "8px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  <Trash2 size={16} />
                  {t("Delete")}
                </Button>
              )}
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <NewCustomButton
                label={t("Close")}
                backgroundColor="#FFFFFF"
                onClick={() => {
                  if (!dirty || window.confirm(t("Discard unsaved changes?"))) onClose()
                }}
              />
              <NewCustomButton
                label={isCreating ? t("Create") : t("Save Changes")}
                backgroundColor="#25D0FE"
                onClick={async () => {
                  const success = await savePackage()
                  if (success && isCreating && currentPackageId) {
                    // After creating, fetch quants
                    await fetchQuantsByPackage(currentPackageId)
                  }
                }}
              />
            </div>
          </div>
        </div>
      </Card>
      {toast && <Toast text={toast.text} state={toast.state} onClose={() => setToast(null)} />}
    </div>
  )
}

