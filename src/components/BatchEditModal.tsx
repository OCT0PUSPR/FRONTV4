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
import { ActionDropdown } from "./ActionDropdown"
import { CheckCircle2, Printer, RotateCcw, XCircle, MoreVertical, Plus, X, Trash2 } from "lucide-react"
import { NewCustomButton } from "./NewCustomButton"
import Toast from "./Toast"
import { IOSCheckbox } from "./IOSCheckbox"

interface BatchEditModalProps {
  isOpen: boolean
  batchId: number | null
  onClose: () => void
}

export default function BatchEditModal({ isOpen, batchId, onClose }: BatchEditModalProps) {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const { sessionId } = useAuth()
  const { pickingTransfers, locations, partners, pickings, uom, fetchData } = useData()

  const [readOnly, setReadOnly] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [transferLines, setTransferLines] = useState<any[]>([])
  const [operationLines, setOperationLines] = useState<any[]>([])
  const [showSuccess, setShowSuccess] = useState(false)
  const [addingTransferLine, setAddingTransferLine] = useState(false)
  const [toast, setToast] = useState<{ text: string; state: "success" | "error" } | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Dropdown data
  const [users, setUsers] = useState<any[]>([])
  const [companies, setCompanies] = useState<any[]>([])
  const [dockLocations, setDockLocations] = useState<any[]>([])
  const [vehicles, setVehicles] = useState<any[]>([])
  const [vehicleCategories, setVehicleCategories] = useState<any[]>([])
  const [availablePickings, setAvailablePickings] = useState<any[]>([])

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
    userId: null as number | null,
    companyId: null as number | null,
    scheduledDate: "",
    dockId: null as number | null,
    vehicleId: null as number | null,
    vehicleCategoryId: null as number | null,
    description: "",
    warehouseId: null as number | null,
  })

  const [newTransferLine, setNewTransferLine] = useState<{
    pickingId: number | null
  }>({ pickingId: null })

  // Fetch data from Odoo using generic endpoint
  const fetchOdooData = async (model: string, domain: any[] = [], fields: string[] = []) => {
    if (!sessionId) return []
    try {
      const headers = {
        "Content-Type": "application/json",
        ...getOdooHeaders(),
      }
      const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/odoo/search-read`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          sessionId,
          model,
          args: [domain],
          kwargs: { fields },
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data?.success) {
        return Array.isArray(data.result) ? data.result : []
      }
      return []
    } catch (error) {
      console.error(`Error fetching ${model}:`, error)
      return []
    }
  }

  // Fetch batch data
  const fetchBatchData = async () => {
    if (!batchId || !sessionId) return
    try {
      const batch = (pickingTransfers || []).find((b: any) => b.id === batchId)
      if (!batch || !batch._raw) return

      const raw = batch._raw
      const companyId = Array.isArray(raw.company_id) ? raw.company_id[0] : raw.company_id || null
      const warehouseId = Array.isArray(raw.warehouse_id) ? raw.warehouse_id[0] : raw.warehouse_id || null
      
      setForm({
        userId: Array.isArray(raw.user_id) ? raw.user_id[0] : raw.user_id || null,
        companyId,
        scheduledDate: raw.scheduled_date ? String(raw.scheduled_date).slice(0, 10) : "",
        dockId: Array.isArray(raw.dock_id) ? raw.dock_id[0] : raw.dock_id || null,
        vehicleId: Array.isArray(raw.vehicle_id) ? raw.vehicle_id[0] : raw.vehicle_id || null,
        vehicleCategoryId: Array.isArray(raw.vehicle_category_id) ? raw.vehicle_category_id[0] : raw.vehicle_category_id || null,
        description: raw.description || "",
        warehouseId,
      })
      
      // Load users and dock locations after setting company and warehouse
      if (companyId) {
        loadUsers(companyId)
      }
      if (warehouseId) {
        loadDockLocations(warehouseId)
      }
      setReadOnly(raw.state === "done" || raw.state === "cancel")

      // Fetch transfers (pickings with batch_id = current batch id)
      await fetchTransfers()
      // Fetch operations (stock.move where picking_id in batch pickings)
      await fetchOperations()
    } catch (error) {
      console.error("Error fetching batch data:", error)
    }
  }

  // Fetch transfers (stock.picking with batch_id = current batch id)
  const fetchTransfers = async () => {
    if (!batchId) return
    try {
      const pickingsData = await fetchOdooData('stock.picking', [['batch_id', '=', batchId]], [
        'id', 'name', 'location_id', 'location_dest_id', 'partner_id', 'origin', 'company_id', 'state'
      ])
      
      // Fetch partner zip for each picking
      const transfersWithZip = await Promise.all(pickingsData.map(async (picking: any) => {
        let zip = null
        if (picking.partner_id && Array.isArray(picking.partner_id) && picking.partner_id[0]) {
          const partnerData = await fetchOdooData('res.partner', [['id', '=', picking.partner_id[0]]], ['zip'])
          if (partnerData.length > 0 && partnerData[0].zip) {
            zip = partnerData[0].zip
          }
        }
        return { ...picking, zip }
      }))
      
      setTransferLines(transfersWithZip)
    } catch (error) {
      console.error("Error fetching transfers:", error)
      setTransferLines([])
    }
  }

  // Fetch operations (stock.move where picking_id in batch pickings)
  const fetchOperations = async () => {
    if (!batchId) return
    try {
      // First get all picking IDs for this batch
      const pickingsData = await fetchOdooData('stock.picking', [['batch_id', '=', batchId]], ['id'])
      const pickingIds = pickingsData.map((p: any) => p.id)
      
      if (pickingIds.length === 0) {
        setOperationLines([])
        return
      }

      // Fetch stock.move records where picking_id in pickingIds
      const moves = await fetchOdooData('stock.move', [['picking_id', 'in', pickingIds]], [
        'id', 'product_id', 'picking_id', 'product_uom_qty', 'quantity', 'picked', 'product_uom'
      ])
      
      setOperationLines(moves)
    } catch (error) {
      console.error("Error fetching operations:", error)
      setOperationLines([])
    }
  }

  // Load users with company domain
  const loadUsers = async (companyId: number | null) => {
    if (!sessionId) return
    let userDomain: any[] = []
    if (companyId) {
      userDomain = ['|', ['company_id', '=', companyId], ['company_ids', 'in', [companyId]]]
    }
    const usersData = await fetchOdooData('res.users', userDomain, ['id', 'name', 'display_name'])
    setUsers(usersData)
  }

  // Load dock locations
  const loadDockLocations = async (warehouseId: number | null) => {
    if (!sessionId || !warehouseId) {
      setDockLocations([])
      return
    }
    const dockLocationsData = await fetchOdooData('stock.location', [
      ['warehouse_id', '=', warehouseId],
      ['is_a_dock', '=', true]
    ], ['id', 'name', 'complete_name'])
    setDockLocations(dockLocationsData)
  }

  // Load dropdown data
  useEffect(() => {
    if (!isOpen || !sessionId) return

    const loadDropdownData = async () => {
      // Fetch companies
      const companiesData = await fetchOdooData('res.company', [], ['id', 'name'])
      setCompanies(companiesData)

      // Fetch vehicles
      const vehiclesData = await fetchOdooData('fleet.vehicle', [], ['id', 'name', 'display_name'])
      setVehicles(vehiclesData)

      // Fetch vehicle categories
      const categoriesData = await fetchOdooData('fleet.vehicle.model.category', [], ['id', 'name'])
      setVehicleCategories(categoriesData)

      // Fetch available pickings (for adding new transfer lines) - exclude pickings that already have a batch_id
      const availablePickingsData = await fetchOdooData('stock.picking', [
        '|', ['batch_id', '=', false], ['batch_id', '=', null]
      ], ['id', 'name', 'location_id', 'location_dest_id', 'partner_id', 'origin', 'company_id', 'state'])
      setAvailablePickings(availablePickingsData)
    }

    loadDropdownData()
  }, [isOpen, sessionId])

  // Load batch data when modal opens
  useEffect(() => {
    if (!isOpen) return
    fetchBatchData()
    setDirty(false)
    setAddingTransferLine(false)
    setNewTransferLine({ pickingId: null })
  }, [isOpen, batchId])

  // Update users when company changes
  useEffect(() => {
    loadUsers(form.companyId)
  }, [form.companyId, sessionId])

  // Update dock locations when warehouse changes
  useEffect(() => {
    loadDockLocations(form.warehouseId)
  }, [form.warehouseId, sessionId])

  const onChange = (patch: Partial<typeof form>) => {
    if (readOnly) return
    setForm((f) => ({ ...f, ...patch }))
    setDirty(true)
  }

  const handleSave = async () => {
    if (!batchId || !sessionId) return

    try {
      const headers = {
        "Content-Type": "application/json",
        ...getOdooHeaders(),
      }

      // Update batch
      const updateRes = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/picking-transfers/${batchId}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          sessionId,
          values: {
            user_id: form.userId,
            company_id: form.companyId,
            scheduled_date: form.scheduledDate || false,
            dock_id: form.dockId || false,
            vehicle_id: form.vehicleId || false,
            vehicle_category_id: form.vehicleCategoryId || false,
            description: form.description || false,
          },
        }),
      })

      const updateData = await updateRes.json().catch(() => ({}))
      if (!updateRes.ok || !updateData.success) {
        throw new Error(updateData.message || "Failed to update batch")
      }

      setDirty(false)
      setToast({ text: t("Batch updated successfully"), state: "success" })
      setShowSuccess(true)
      setTimeout(() => {
        setShowSuccess(false)
        onClose()
        fetchData("pickingTransfers")
      }, 1500)
    } catch (error: any) {
      console.error("Error saving batch:", error)
      setToast({ text: error.message || t("Failed to save batch"), state: "error" })
    }
  }

  const handleAddTransferLine = async () => {
    if (!newTransferLine.pickingId || !batchId || !sessionId) return

    try {
      const headers = {
        "Content-Type": "application/json",
        ...getOdooHeaders(),
      }

      // Update the picking's batch_id
      const updateRes = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/odoo/write`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          sessionId,
          model: 'stock.picking',
          ids: [newTransferLine.pickingId],
          values: { batch_id: batchId },
        }),
      })

      const updateData = await updateRes.json().catch(() => ({}))
      if (!updateRes.ok || !updateData.success) {
        throw new Error(updateData.message || "Failed to add transfer")
      }

      // Refresh transfers and operations
      await fetchTransfers()
      await fetchOperations()
      
      setNewTransferLine({ pickingId: null })
      setAddingTransferLine(false)
      setToast({ text: t("Transfer added successfully"), state: "success" })
      fetchData("pickings")
    } catch (error: any) {
      console.error("Error adding transfer:", error)
      setToast({ text: error.message || t("Failed to add transfer"), state: "error" })
    }
  }

  const handleRemoveTransferLine = async (pickingId: number) => {
    if (!sessionId) return

    try {
      const headers = {
        "Content-Type": "application/json",
        ...getOdooHeaders(),
      }

      // Remove batch_id from the picking
      const updateRes = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/odoo/write`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          sessionId,
          model: 'stock.picking',
          ids: [pickingId],
          values: { batch_id: false },
        }),
      })

      const updateData = await updateRes.json().catch(() => ({}))
      if (!updateRes.ok || !updateData.success) {
        throw new Error(updateData.message || "Failed to remove transfer")
      }

      // Refresh transfers and operations
      await fetchTransfers()
      await fetchOperations()
      
      setToast({ text: t("Transfer removed successfully"), state: "success" })
      fetchData("pickings")
    } catch (error: any) {
      console.error("Error removing transfer:", error)
      setToast({ text: error.message || t("Failed to remove transfer"), state: "error" })
    }
  }

  const handleUpdatePicked = async (moveId: number, picked: boolean) => {
    if (!sessionId) return

    try {
      const headers = {
        "Content-Type": "application/json",
        ...getOdooHeaders(),
      }

      const updateRes = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/odoo/write`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          sessionId,
          model: 'stock.move',
          ids: [moveId],
          values: { picked },
        }),
      })

      const updateData = await updateRes.json().catch(() => ({}))
      if (!updateRes.ok || !updateData.success) {
        throw new Error(updateData.message || "Failed to update picked status")
      }

      // Refresh operations
      await fetchOperations()
    } catch (error: any) {
      console.error("Error updating picked status:", error)
      setToast({ text: error.message || t("Failed to update picked status"), state: "error" })
    }
  }

  if (!isOpen) return null

  return (
    <>
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
        onClick={onClose}
      >
        <Card
          style={{
            width: "min(100%, 1200px)",
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
              borderBottom: `1px solid ${colors.border}`,
            }}
          >
            <h2 style={{ fontSize: 20, fontWeight: 700, color: colors.textPrimary }}>
              {t("Edit Batch")}
            </h2>
            <Button
              style={{
                background: "transparent",
                border: "none",
                borderRadius: "8px",
                padding: "0.5rem",
                cursor: "pointer",
              }}
              onClick={onClose}
            >
              <X size={20} color={colors.textPrimary} />
            </Button>
          </div>

          {/* Content */}
          <div style={{ flex: 1, overflow: "auto", padding: "1.25rem" }}>
            {/* Batch Information Section */}
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
                  {t("Batch Information")}
                </h3>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <NewCustomDropdown
                    label={t("Responsible")}
                    values={users.map((u: any) => u.display_name || u.name || String(u.id))}
                    type="single"
                    placeholder={t("Select responsible")}
                    defaultValue={
                      form.userId
                        ? users.find((u: any) => u.id === form.userId)?.display_name ||
                          users.find((u: any) => u.id === form.userId)?.name ||
                          String(form.userId)
                        : undefined
                    }
                    onChange={(v) => {
                      const selectedUser = users.find(
                        (u: any) => (u.display_name || u.name || String(u.id)) === v
                      )
                      onChange({ userId: selectedUser ? selectedUser.id : null })
                    }}
                    disabled={readOnly}
                  />
                </div>

                <div>
                  <NewCustomDropdown
                    label={t("Company")}
                    values={companies.map((c: any) => c.name || String(c.id))}
                    type="single"
                    placeholder={t("Select company")}
                    defaultValue={
                      form.companyId
                        ? companies.find((c: any) => c.id === form.companyId)?.name ||
                          String(form.companyId)
                        : undefined
                    }
                    onChange={(v) => {
                      const selectedCompany = companies.find(
                        (c: any) => (c.name || String(c.id)) === v
                      )
                      const newCompanyId = selectedCompany ? selectedCompany.id : null
                      onChange({ companyId: newCompanyId })
                      // Reload users when company changes
                      if (newCompanyId) {
                        loadUsers(newCompanyId)
                      }
                    }}
                    disabled={readOnly}
                  />
                </div>

                <div>
                  <CustomDatePicker
                    value={form.scheduledDate}
                    onChange={(date) => onChange({ scheduledDate: date })}
                    label={t("Scheduled Date")}
                    placeholder={t("Select date")}
                    colors={colors}
                    disabled={readOnly}
                  />
                </div>

                <div>
                  <NewCustomDropdown
                    label={t("Dock Location")}
                    values={dockLocations.map((loc: any) => loc.complete_name || loc.name || String(loc.id))}
                    type="single"
                    placeholder={t("Select dock location")}
                    defaultValue={
                      form.dockId
                        ? dockLocations.find((loc: any) => loc.id === form.dockId)?.complete_name ||
                          dockLocations.find((loc: any) => loc.id === form.dockId)?.name ||
                          String(form.dockId)
                        : undefined
                    }
                    onChange={(v) => {
                      const selectedLocation = dockLocations.find(
                        (loc: any) => (loc.complete_name || loc.name || String(loc.id)) === v
                      )
                      onChange({ dockId: selectedLocation ? selectedLocation.id : null })
                    }}
                    disabled={readOnly}
                  />
                </div>

                <div>
                  <NewCustomDropdown
                    label={t("Vehicle")}
                    values={vehicles.map((v: any) => v.display_name || v.name || String(v.id))}
                    type="single"
                    placeholder={t("Select vehicle")}
                    defaultValue={
                      form.vehicleId
                        ? vehicles.find((v: any) => v.id === form.vehicleId)?.display_name ||
                          vehicles.find((v: any) => v.id === form.vehicleId)?.name ||
                          String(form.vehicleId)
                        : undefined
                    }
                    onChange={(v) => {
                      const selectedVehicle = vehicles.find(
                        (veh: any) => (veh.display_name || veh.name || String(veh.id)) === v
                      )
                      onChange({ vehicleId: selectedVehicle ? selectedVehicle.id : null })
                    }}
                    disabled={readOnly}
                  />
                </div>

                <div>
                  <NewCustomDropdown
                    label={t("Vehicle Category")}
                    values={vehicleCategories.map((cat: any) => cat.name || String(cat.id))}
                    type="single"
                    placeholder={t("Select vehicle category")}
                    defaultValue={
                      form.vehicleCategoryId
                        ? vehicleCategories.find((cat: any) => cat.id === form.vehicleCategoryId)?.name ||
                          String(form.vehicleCategoryId)
                        : undefined
                    }
                    onChange={(v) => {
                      const selectedCategory = vehicleCategories.find(
                        (cat: any) => (cat.name || String(cat.id)) === v
                      )
                      onChange({ vehicleCategoryId: selectedCategory ? selectedCategory.id : null })
                    }}
                    disabled={readOnly}
                  />
                </div>

                <div style={{ gridColumn: "1 / -1" }}>
                  <CustomInput
                    label={t("Description")}
                    type="textarea"
                    value={form.description}
                    onChange={(v) => onChange({ description: v })}
                    placeholder={t("Enter description")}
                    disabled={readOnly}
                  />
                </div>
              </div>
            </div>

            {/* Transfers Section */}
            <div style={{ marginBottom: "1.25rem" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "1rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
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
                    {t("Transfers")}
                  </h3>
                </div>
                {!readOnly && (
                  <NewCustomButton
                    label={t("Add Line")}
                    backgroundColor="#FFFFFF"
                    icon={Plus}
                    onClick={() => {
                      setAddingTransferLine(true)
                      setNewTransferLine({ pickingId: null })
                    }}
                    disabled={addingTransferLine}
                  />
                )}
              </div>

              {!readOnly && addingTransferLine && (
                <div
                  style={{
                    background: colors.mutedBg,
                    padding: "1rem",
                    borderRadius: "8px",
                    marginBottom: "1rem",
                    display: "flex",
                    gap: "1rem",
                    alignItems: "flex-end",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <NewCustomDropdown
                      label={t("Reference")}
                      values={availablePickings.map((p: any) => p.name || String(p.id))}
                      type="single"
                      placeholder={t("Select picking")}
                      defaultValue={undefined}
                      onChange={(v) => {
                        const selectedPicking = availablePickings.find(
                          (p: any) => (p.name || String(p.id)) === v
                        )
                        setNewTransferLine({ pickingId: selectedPicking ? selectedPicking.id : null })
                      }}
                    />
                  </div>
                  <Button
                    onClick={handleAddTransferLine}
                    disabled={!newTransferLine.pickingId}
                    style={{
                      background: colors.action,
                      color: "#FFFFFF",
                      padding: "0.5rem 1rem",
                      borderRadius: "8px",
                    }}
                  >
                    {t("Save")}
                  </Button>
                  <Button
                    onClick={() => {
                      setAddingTransferLine(false)
                      setNewTransferLine({ pickingId: null })
                    }}
                    style={{
                      background: "transparent",
                      color: colors.textPrimary,
                      padding: "0.5rem 1rem",
                      borderRadius: "8px",
                    }}
                  >
                    {t("Cancel")}
                  </Button>
                </div>
              )}

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
                        background: colors.background,
                      }}
                    >
                      <th style={{ padding: ".5rem", fontWeight: 600 }}>{t("Reference")}</th>
                      <th style={{ padding: ".5rem", fontWeight: 600 }}>{t("From")}</th>
                      <th style={{ padding: ".5rem", fontWeight: 600 }}>{t("To")}</th>
                      <th style={{ padding: ".5rem", fontWeight: 600 }}>{t("Contact")}</th>
                      <th style={{ padding: ".5rem", fontWeight: 600 }}>{t("Source Document")}</th>
                      <th style={{ padding: ".5rem", fontWeight: 600 }}>{t("Zip")}</th>
                      <th style={{ padding: ".5rem", fontWeight: 600 }}>{t("Company")}</th>
                      <th style={{ padding: ".5rem", fontWeight: 600 }}>{t("Status")}</th>
                      {!readOnly && <th style={{ padding: ".5rem", fontWeight: 600 }}></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {transferLines.map((transfer: any) => (
                      <tr key={transfer.id} style={{ borderTop: `1px solid ${colors.border}` }}>
                        <td style={{ padding: ".5rem", color: colors.textPrimary, fontSize: 13 }}>
                          {transfer.name || String(transfer.id)}
                        </td>
                        <td style={{ padding: ".5rem", color: colors.textPrimary, fontSize: 13 }}>
                          {Array.isArray(transfer.location_id) ? transfer.location_id[1] : transfer.location_id || "—"}
                        </td>
                        <td style={{ padding: ".5rem", color: colors.textPrimary, fontSize: 13 }}>
                          {Array.isArray(transfer.location_dest_id) ? transfer.location_dest_id[1] : transfer.location_dest_id || "—"}
                        </td>
                        <td style={{ padding: ".5rem", color: colors.textPrimary, fontSize: 13 }}>
                          {Array.isArray(transfer.partner_id) ? transfer.partner_id[1] : transfer.partner_id || "—"}
                        </td>
                        <td style={{ padding: ".5rem", color: colors.textPrimary, fontSize: 13 }}>
                          {transfer.origin || "—"}
                        </td>
                        <td style={{ padding: ".5rem", color: colors.textPrimary, fontSize: 13 }}>
                          {transfer.zip || "—"}
                        </td>
                        <td style={{ padding: ".5rem", color: colors.textPrimary, fontSize: 13 }}>
                          {Array.isArray(transfer.company_id) ? transfer.company_id[1] : transfer.company_id || "—"}
                        </td>
                        <td style={{ padding: ".5rem", color: colors.textPrimary, fontSize: 13 }}>
                          {transfer.state || "—"}
                        </td>
                        {!readOnly && (
                          <td style={{ padding: ".5rem" }}>
                            <Button
                              onClick={() => handleRemoveTransferLine(transfer.id)}
                              style={{
                                background: "transparent",
                                border: "none",
                                padding: "0.25rem",
                                cursor: "pointer",
                              }}
                            >
                              <Trash2 size={16} color="#ef4444" />
                            </Button>
                          </td>
                        )}
                      </tr>
                    ))}
                    {transferLines.length === 0 && (
                      <tr>
                        <td
                          colSpan={!readOnly ? 9 : 8}
                          style={{ padding: ".75rem", color: colors.textSecondary, textAlign: "center", fontSize: 13 }}
                        >
                          {t("No transfers found")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Operations Section */}
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
                    background: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
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
                        background: colors.background,
                      }}
                    >
                      <th style={{ padding: ".5rem", fontWeight: 600 }}>{t("Product")}</th>
                      <th style={{ padding: ".5rem", fontWeight: 600 }}>{t("Transfer")}</th>
                      <th style={{ padding: ".5rem", fontWeight: 600 }}>{t("Demand")}</th>
                      <th style={{ padding: ".5rem", fontWeight: 600 }}>{t("Quantity")}</th>
                      <th style={{ padding: ".5rem", fontWeight: 600 }}>{t("Picked")}</th>
                      <th style={{ padding: ".5rem", fontWeight: 600 }}>{t("Unit of Measure")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {operationLines.map((move: any) => (
                      <tr key={move.id} style={{ borderTop: `1px solid ${colors.border}` }}>
                        <td style={{ padding: ".5rem", color: colors.textPrimary, fontSize: 13 }}>
                          {Array.isArray(move.product_id) ? move.product_id[1] : move.product_id || "—"}
                        </td>
                        <td style={{ padding: ".5rem", color: colors.textPrimary, fontSize: 13 }}>
                          {Array.isArray(move.picking_id) ? move.picking_id[1] : move.picking_id || "—"}
                        </td>
                        <td style={{ padding: ".5rem", color: colors.textPrimary, fontSize: 13 }}>
                          {move.product_uom_qty || "—"}
                        </td>
                        <td style={{ padding: ".5rem", color: colors.textPrimary, fontSize: 13 }}>
                          {move.quantity || "—"}
                        </td>
                        <td style={{ padding: ".5rem" }}>
                          <IOSCheckbox
                            checked={move.picked || false}
                            onChange={(checked) => handleUpdatePicked(move.id, checked)}
                            disabled={readOnly}
                          />
                        </td>
                        <td style={{ padding: ".5rem", color: colors.textPrimary, fontSize: 13 }}>
                          {Array.isArray(move.product_uom) ? move.product_uom[1] : move.product_uom || "—"}
                        </td>
                      </tr>
                    ))}
                    {operationLines.length === 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          style={{ padding: ".75rem", color: colors.textSecondary, textAlign: "center", fontSize: 13 }}
                        >
                          {t("No operations found")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Footer */}
          {!readOnly && (
            <div
              style={{
                padding: "1rem 1.5rem",
                display: "flex",
                justifyContent: "flex-end",
                gap: "0.75rem",
                borderTop: `1px solid ${colors.border}`,
              }}
            >
              <Button
                onClick={onClose}
                style={{
                  background: "transparent",
                  color: colors.textPrimary,
                  padding: "0.75rem 1.5rem",
                  borderRadius: "8px",
                }}
              >
                {t("Cancel")}
              </Button>
              <Button
                onClick={handleSave}
                disabled={!dirty}
                style={{
                  background: dirty ? colors.action : colors.mutedBg,
                  color: dirty ? "#FFFFFF" : colors.textSecondary,
                  padding: "0.75rem 1.5rem",
                  borderRadius: "8px",
                }}
              >
                {t("Save")}
              </Button>
            </div>
          )}
        </Card>
      </div>

      {toast && (
        <Toast
          text={toast.text}
          state={toast.state}
          onClose={() => setToast(null)}
        />
      )}
    </>
  )
}

