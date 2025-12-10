"use client"

import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { Card } from "../../@/components/ui/card"
import { CustomInput } from "./CusotmInput"
import { CustomDropdown as NewCustomDropdown } from "./NewCustomDropdown"
import { NewCustomButton } from "./NewCustomButton"
import { useTheme } from "../../context/theme"
import { useData } from "../../context/data"
import { useAuth } from "../../context/auth"
import { API_CONFIG } from "../config/api"
import { Plus, RefreshCcw, X } from "lucide-react"
import Toast from "./Toast"

type TabType = "general" | "pricing" | "availability" | "description"

interface DeliveryMethodEditModalProps {
  isOpen: boolean
  selectedMethod: any | null
  onClose: () => void
  onSuccess?: () => void
}

export default function DeliveryMethodEditModal({
  isOpen,
  selectedMethod,
  onClose,
  onSuccess,
}: DeliveryMethodEditModalProps) {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const { products, stockRoutes, fetchData } = useData() as any
  const { sessionId, uid } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>("general")
  const isTab = (tab: TabType) => activeTab === tab
  const [rules, setRules] = useState<any[]>([])
  const [rulesRefreshing, setRulesRefreshing] = useState(false)
  const [newRuleDrafts, setNewRuleDrafts] = useState<any[]>([])
  const [currencySymbol, setCurrencySymbol] = useState<string>("$")
  const [countries, setCountries] = useState<any[]>([])
  const [statesList, setStatesList] = useState<any[]>([])
  const [zipPrefixes, setZipPrefixes] = useState<any[]>([])
  const [productTags, setProductTags] = useState<any[]>([])
  const [dirty, setDirty] = useState(false)
  const [toast, setToast] = useState<{ text: string; state: "success" | "error" } | null>(null)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState<any>({
    name: "",
    delivery_type: "fixed",
    route_ids: [] as string[],
    margin: "",
    fixed_margin: "",
    product_id: "",
    tracking_url: "",
    country_ids: [] as string[],
    state_ids: [] as string[],
    zip_prefix_ids: [] as string[],
    max_weight: "",
    max_volume: "",
    must_have_tag_ids: [] as string[],
    excluded_tag_ids: [] as string[],
    website_description: "",
    carrier_description: "",
  })

  // Get Odoo headers for API requests
  const getOdooHeaders = (): Record<string, string> => {
    const rawBase = localStorage.getItem("odooBase") || localStorage.getItem("odoo_base_url") || "https://egy.thetalenter.net"
    const db = localStorage.getItem("odooDb") || localStorage.getItem("odoo_db") || "odoodb1"
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }
    if (rawBase) headers['x-odoo-base'] = rawBase
    if (db) headers['x-odoo-db'] = db
    return headers
  }

  useEffect(() => {
    if (!isOpen) return
    if (!sessionId) return

    // Reset form when modal opens
    if (selectedMethod) {
      setFormData({
        name: selectedMethod.name || "",
        delivery_type: selectedMethod.delivery_type || "fixed",
        route_ids: Array.isArray(selectedMethod.route_ids) 
          ? selectedMethod.route_ids.map((r: any) => String(Array.isArray(r) ? r[0] : r))
          : [],
        margin: selectedMethod.margin || "",
        fixed_margin: selectedMethod.fixed_margin || "",
        product_id: selectedMethod.product_id ? String(Array.isArray(selectedMethod.product_id) ? selectedMethod.product_id[0] : selectedMethod.product_id) : "",
        tracking_url: selectedMethod.tracking_url || "",
        country_ids: Array.isArray(selectedMethod.country_ids)
          ? selectedMethod.country_ids.map((c: any) => String(Array.isArray(c) ? c[0] : c))
          : [],
        state_ids: Array.isArray(selectedMethod.state_ids)
          ? selectedMethod.state_ids.map((s: any) => String(Array.isArray(s) ? s[0] : s))
          : [],
        zip_prefix_ids: Array.isArray(selectedMethod.zip_prefix_ids)
          ? selectedMethod.zip_prefix_ids.map((z: any) => String(Array.isArray(z) ? z[0] : z))
          : [],
        max_weight: selectedMethod.max_weight || "",
        max_volume: selectedMethod.max_volume || "",
        must_have_tag_ids: Array.isArray(selectedMethod.must_have_tag_ids)
          ? selectedMethod.must_have_tag_ids.map((t: any) => String(Array.isArray(t) ? t[0] : t))
          : [],
        excluded_tag_ids: Array.isArray(selectedMethod.excluded_tag_ids)
          ? selectedMethod.excluded_tag_ids.map((t: any) => String(Array.isArray(t) ? t[0] : t))
          : [],
        website_description: selectedMethod.website_description || "",
        carrier_description: selectedMethod.carrier_description || "",
      })
      // Load rules
      if (selectedMethod.id) {
        loadRules(selectedMethod.id)
      }
    } else {
      setFormData({
        name: "",
        delivery_type: "fixed",
        route_ids: [],
        margin: "",
        fixed_margin: "",
        product_id: "",
        tracking_url: "",
        country_ids: [],
        state_ids: [],
        zip_prefix_ids: [],
        max_weight: "",
        max_volume: "",
        must_have_tag_ids: [],
        excluded_tag_ids: [],
        website_description: "",
        carrier_description: "",
      })
      setRules([])
    }

    setDirty(false)
    setActiveTab("general")
    setNewRuleDrafts([])

    // Load additional data
    if (!Array.isArray(products) || !products.length) fetchData("products")
    if (!Array.isArray(stockRoutes) || !stockRoutes.length) fetchData("stockRoutes")
    
    ;(async () => {
      try {
        const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/currencies`, {
          method: "POST",
          headers: getOdooHeaders(),
          body: JSON.stringify({ sessionId }),
        })
        const data = await res.json().catch(() => ({}))
        const cur = Array.isArray(data?.currencies) ? data.currencies[0] : null
        if (cur?.symbol) setCurrencySymbol(cur.symbol)
      } catch {}
    })()
    
    ;(async () => {
      try {
        if (!sessionId) return
        const [cc, ss, zz, tt] = await Promise.all([
          fetch(`${API_CONFIG.BACKEND_BASE_URL}/countries`, {
            method: "POST",
            headers: getOdooHeaders(),
            body: JSON.stringify({ sessionId }),
          }),
          fetch(`${API_CONFIG.BACKEND_BASE_URL}/states`, {
            method: "POST",
            headers: getOdooHeaders(),
            body: JSON.stringify({ sessionId }),
          }),
          fetch(`${API_CONFIG.BACKEND_BASE_URL}/zip-prefixes`, {
            method: "POST",
            headers: getOdooHeaders(),
            body: JSON.stringify({ sessionId }),
          }),
          fetch(`${API_CONFIG.BACKEND_BASE_URL}/product-tags`, {
            method: "POST",
            headers: getOdooHeaders(),
            body: JSON.stringify({ sessionId }),
          }),
        ])
        const [cjson, sjson, zjson, tjson] = await Promise.all([
          cc.json().catch(() => ({})),
          ss.json().catch(() => ({})),
          zz.json().catch(() => ({})),
          tt.json().catch(() => ({})),
        ])
        if (cjson?.countries) setCountries(cjson.countries)
        if (sjson?.states) setStatesList(sjson.states)
        if (zjson?.zipPrefixes) setZipPrefixes(zjson.zipPrefixes)
        if (tjson?.productTags) setProductTags(tjson.productTags)
      } catch {}
    })()
  }, [isOpen, selectedMethod, sessionId])

  const loadRules = async (carrierId: number) => {
    if (!sessionId) return
    try {
      setRulesRefreshing(true)
      const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/delivery-price-rules`, {
        method: "POST",
        headers: getOdooHeaders(),
        body: JSON.stringify({ sessionId, carrier_id: carrierId }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data?.success) setRules(data.deliveryPriceRules || [])
    } finally {
      setRulesRefreshing(false)
    }
  }

  const onChange = (patch: Partial<typeof formData>) => {
    setFormData((f) => ({ ...f, ...patch }))
    setDirty(true)
  }

  const handleSave = async () => {
    if (!sessionId) return
    try {
      setSaving(true)
      const values: any = {
        name: formData.name,
        delivery_type: formData.delivery_type,
        route_ids: Array.isArray(formData.route_ids)
          ? [[6, 0, formData.route_ids.map((x: string) => Number(x))]]
          : undefined,
        margin: formData.margin === "" ? 0 : Number(formData.margin),
        fixed_margin: formData.fixed_margin === "" ? 0 : Number(formData.fixed_margin),
        product_id: formData.product_id ? Number(formData.product_id) : false,
        tracking_url: formData.tracking_url || "",
        country_ids: Array.isArray(formData.country_ids)
          ? [[6, 0, formData.country_ids.map((x: string) => Number(x))]]
          : undefined,
        state_ids: Array.isArray(formData.state_ids)
          ? [[6, 0, formData.state_ids.map((x: string) => Number(x))]]
          : undefined,
        zip_prefix_ids: Array.isArray(formData.zip_prefix_ids)
          ? [[6, 0, formData.zip_prefix_ids.map((x: string) => Number(x))]]
          : undefined,
        max_weight: formData.max_weight === "" ? 0 : Number(formData.max_weight),
        max_volume: formData.max_volume === "" ? 0 : Number(formData.max_volume),
        must_have_tag_ids: Array.isArray(formData.must_have_tag_ids)
          ? [[6, 0, formData.must_have_tag_ids.map((x: string) => Number(x))]]
          : undefined,
        excluded_tag_ids: Array.isArray(formData.excluded_tag_ids)
          ? [[6, 0, formData.excluded_tag_ids.map((x: string) => Number(x))]]
          : undefined,
        website_description: formData.website_description || "",
        carrier_description: formData.carrier_description || "",
      }
      const base = API_CONFIG.BACKEND_BASE_URL
      const userId = uid ? Number(uid) : undefined

      if (selectedMethod?.id) {
        // Update
        const res = await fetch(`${base}/delivery-carriers/${selectedMethod.id}`, {
          method: "PUT",
          headers: getOdooHeaders(),
          body: JSON.stringify({ sessionId, values, userId }),
        })
        const data = await res.json().catch(() => ({}))
        if (res.ok && data?.success) {
          setToast({ text: t("Delivery method updated successfully"), state: "success" })
          setDirty(false)
          setTimeout(() => {
            setToast(null)
            onSuccess?.()
            onClose()
          }, 1500)
        } else {
          setToast({ text: data?.message || t("Failed to update delivery method"), state: "error" })
          setTimeout(() => setToast(null), 3000)
        }
      } else {
        // Create
        const res = await fetch(`${base}/delivery-carriers/create`, {
          method: "POST",
          headers: getOdooHeaders(),
          body: JSON.stringify({ sessionId, values, userId }),
        })
        const data = await res.json().catch(() => ({}))
        if (res.ok && data?.success) {
          setToast({ text: t("Delivery method created successfully"), state: "success" })
          setDirty(false)
          setTimeout(() => {
            setToast(null)
            onSuccess?.()
            onClose()
          }, 1500)
        } else {
          setToast({ text: data?.message || t("Failed to create delivery method"), state: "error" })
          setTimeout(() => setToast(null), 3000)
        }
      }
    } catch (error) {
      setToast({ text: t("An error occurred"), state: "error" })
      setTimeout(() => setToast(null), 3000)
    } finally {
      setSaving(false)
    }
  }

  const closeModal = () => {
    if (dirty && !window.confirm(t("Discard unsaved changes?"))) return
    onClose()
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
        onClick={closeModal}
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
                {selectedMethod ? t("Edit Delivery Method") : t("New Delivery Method")}
              </h2>
              <p style={{ fontSize: 13, color: "#000" }}>
                {t("Configure shipping method and pricing rules")}
              </p>
            </div>
            <button
              onClick={closeModal}
              style={{
                border: "none",
                background: "transparent",
                cursor: "pointer",
                padding: "0.5rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "0.5rem",
                color: colors.textSecondary,
              }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Tabs with gradient border */}
          <div style={{ marginBottom: "1.25rem", padding: "0 1.5rem", paddingTop: "1rem" }}>
            <style>{`
              .tab-container {
                position: relative;
                padding: 2px;
                border-radius: 10px;
                background: transparent;
                transition: all 0.3s ease;
                cursor: pointer;
              }
              .tab-container:hover {
                background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
                opacity: 0.8;
              }
              .tab-container.active {
                background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
                opacity: 1;
              }
              .tab-container:hover .tab-button,
              .tab-container.active .tab-button {
                border-color: transparent;
              }
              .tab-container::after {
                content: '';
                position: absolute;
                bottom: -0.5rem;
                left: 0;
                right: 0;
                height: 3px;
                background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
                border-radius: 2px 2px 0 0;
                opacity: 0;
                transition: opacity 0.3s ease;
              }
              .tab-container.active::after {
                opacity: 1;
              }
            `}</style>
            <nav style={{ display: "flex", gap: "0.5rem", borderBottom: `1px solid ${colors.border}`, paddingBottom: "0.5rem", position: "relative" }}>
              {(["general", "pricing", "availability", "description"] as const).map((tab) => {
                const isActive = activeTab === tab
                return (
                  <div
                    key={tab}
                    className={`tab-container ${isActive ? "active" : ""}`}
                    onClick={() => setActiveTab(tab)}
                  >
                    <button
                      className="tab-button"
                      style={{
                        padding: "0.75rem 1rem",
                        fontSize: 13,
                        fontWeight: isActive ? 600 : 500,
                        color: isActive ? colors.textPrimary : colors.textSecondary,
                        background: colors.card,
                        border: `2px solid ${colors.border}`,
                        borderRadius: "8px",
                        cursor: "pointer",
                        transition: "all 0.2s",
                        width: "100%",
                        position: "relative",
                      }}
                    >
                      {t(tab.charAt(0).toUpperCase() + tab.slice(1))}
                    </button>
                  </div>
                )
              })}
            </nav>
          </div>

          <div style={{ flex: 1, overflow: "auto", padding: "1.25rem" }}>
            <style>{`
              input:focus, textarea:focus, select:focus, button[role="combobox"]:focus {
                outline: none !important;
                border-color: #667eea !important;
                box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1) !important;
              }
            `}</style>

            {isTab("general") && (
              <div>
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
                  <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1rem" }}>
                    <div>
                      <CustomInput
                        label={t("Delivery Method Name")}
                        type="text"
                        value={formData.name || ""}
                        onChange={(v) => onChange({ name: v })}
                        placeholder={t("e.g. UPS Express")}
                      />
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                      <div>
                        <NewCustomDropdown
                          label={t("Provider")}
                          values={[t("Based on Rules"), t("Fixed Price")]}
                          type="single"
                          placeholder={t("Select provider")}
                          defaultValue={
                            formData.delivery_type === "base_on_rule" ? t("Based on Rules") : t("Fixed Price")
                          }
                          onChange={(v) =>
                            onChange({
                              delivery_type: v === t("Based on Rules") ? "base_on_rule" : "fixed",
                            })
                          }
                        />
                      </div>
                      <div>
                        <NewCustomDropdown
                          label={t("Delivery Product")}
                          values={(Array.isArray(products) ? products : []).map(
                            (p: any) => p.display_name || p.name || `#${p.id}`,
                          )}
                          type="single"
                          placeholder={t("Select product")}
                          defaultValue={
                            formData.product_id
                              ? (Array.isArray(products) ? products : []).find(
                                  (p: any) => String(p.id) === String(formData.product_id),
                                )?.display_name ||
                                (Array.isArray(products) ? products : []).find(
                                  (p: any) => String(p.id) === String(formData.product_id),
                                )?.name ||
                                `#${formData.product_id}`
                              : undefined
                          }
                          onChange={(v) => {
                            const selectedProduct = (Array.isArray(products) ? products : []).find(
                              (p: any) => (p.display_name || p.name || `#${p.id}`) === v,
                            )
                            onChange({ product_id: selectedProduct ? String(selectedProduct.id) : "" })
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: "1rem" }}>
                    <NewCustomDropdown
                      label={t("Routes")}
                      values={(Array.isArray(stockRoutes) ? stockRoutes : []).map(
                        (r: any) => r.display_name || r.name || `#${r.id}`,
                      )}
                      type="multi"
                      placeholder={t("Select routes")}
                      defaultValue={(Array.isArray(stockRoutes) ? stockRoutes : [])
                        .filter((r: any) => (formData.route_ids || []).includes(String(r.id)))
                        .map((r: any) => r.display_name || r.name || `#${r.id}`)}
                      onChange={(selected) => {
                        if (Array.isArray(selected)) {
                          const routeIds = selected
                            .map((name) => {
                              const r = (Array.isArray(stockRoutes) ? stockRoutes : []).find(
                                (x: any) => (x.display_name || x.name || `#${x.id}`) === name,
                              )
                              return r?.id ? String(r.id) : null
                            })
                            .filter((id): id is string => id !== null)
                          onChange({ route_ids: routeIds })
                        }
                      }}
                    />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginTop: "1rem" }}>
                    <div>
                      <CustomInput
                        label={t("Margin on rate")}
                        type="number"
                        value={formData.margin || ""}
                        onChange={(v) => onChange({ margin: v.replace(/[^0-9.]/g, "") })}
                        placeholder="0"
                        suffix="%"
                      />
                    </div>
                    <div>
                      <CustomInput
                        label={t("Additional Margin")}
                        type="number"
                        value={formData.fixed_margin || ""}
                        onChange={(v) => onChange({ fixed_margin: v.replace(/[^0-9.]/g, "") })}
                        placeholder="0"
                        suffix={currencySymbol}
                      />
                    </div>
                  </div>

                  <div style={{ marginTop: "1rem" }}>
                    <CustomInput
                      label={t("Tracking link")}
                      type="text"
                      value={formData.tracking_url || ""}
                      onChange={(v) => onChange({ tracking_url: v })}
                      placeholder={t("e.g. https://example.com/track/[shipment]")}
                    />
                  </div>
                </div>
              </div>
            )}

            {isTab("pricing") && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: colors.textPrimary }}>{t("Pricing Rules")}</div>
                  <button
                    onClick={() =>
                      setNewRuleDrafts((prev) => [
                        ...prev,
                        {
                          id: `new-${Date.now()}`,
                          variable: "weight",
                          operator: "==",
                          max_value: "",
                          list_base_price: "",
                          list_price: "",
                          variable_factor: "weight",
                        },
                      ])
                    }
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 12px",
                      border: `1px solid ${colors.border}`,
                      borderRadius: 8,
                      background: colors.card,
                      cursor: "pointer",
                      color: colors.textPrimary,
                    }}
                  >
                    <Plus size={16} /> {t("Add line")}
                  </button>
                </div>

                <div style={{ border: `1px solid ${colors.border}`, borderRadius: 8, overflow: "hidden" }}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.2fr 0.6fr 0.6fr 1.8fr",
                      gap: 8,
                      padding: "10px 12px",
                      background: colors.mutedBg,
                      borderBottom: `1px solid ${colors.border}`,
                      fontSize: 13,
                      fontWeight: 600,
                      color: colors.textPrimary,
                    }}
                  >
                    <div>{t("Condition")}</div>
                    <div style={{ textAlign: "right" }}>{t("Value")}</div>
                    <div>{t("Cost")}</div>
                    <div>{t("Formula")}</div>
                  </div>
                  {(rulesRefreshing ? [] : rules).map((r: any) => (
                    <div
                      key={r.id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1.2fr 0.6fr 0.6fr 1.8fr",
                        gap: 8,
                        padding: "10px 12px",
                        borderBottom: `1px solid ${colors.border}`,
                        fontSize: 13,
                        color: colors.textPrimary,
                      }}
                    >
                      <div>
                        {r.variable} {r.operator} {r.max_value}
                      </div>
                      <div style={{ textAlign: "right" }}>{r.max_value}</div>
                      <div>
                        {currencySymbol}
                        {Number(r.list_base_price || 0).toFixed(2)}
                      </div>
                      <div>
                        {currencySymbol}
                        {Number(r.list_base_price || 0).toFixed(2)} + {Number(r.list_price || 0).toFixed(2)} *{" "}
                        {r.variable_factor}
                      </div>
                    </div>
                  ))}

                  {newRuleDrafts.map((d: any) => (
                    <div
                      key={d.id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1.2fr 0.6fr 0.6fr 1.8fr",
                        gap: 8,
                        padding: "10px 12px",
                        borderBottom: `1px solid ${colors.border}`,
                        alignItems: "center",
                      }}
                    >
                      <div style={{ display: "flex", gap: 8 }}>
                        <select
                          value={d.variable}
                          onChange={(e) =>
                            setNewRuleDrafts((prev) =>
                              prev.map((x) => (x.id === d.id ? { ...x, variable: e.target.value } : x)),
                            )
                          }
                          style={{
                            padding: "8px",
                            border: `1px solid ${colors.border}`,
                            borderRadius: 6,
                            background: colors.card,
                            color: colors.textPrimary,
                          }}
                        >
                          <option value="weight">{t("Weight")}</option>
                          <option value="volume">{t("Volume")}</option>
                          <option value="wv">{t("Weight * Volume")}</option>
                          <option value="price">{t("Price")}</option>
                          <option value="quantity">{t("Quantity")}</option>
                        </select>
                        <select
                          value={d.operator}
                          onChange={(e) =>
                            setNewRuleDrafts((prev) =>
                              prev.map((x) => (x.id === d.id ? { ...x, operator: e.target.value } : x)),
                            )
                          }
                          style={{
                            padding: "8px",
                            border: `1px solid ${colors.border}`,
                            borderRadius: 6,
                            background: colors.card,
                            color: colors.textPrimary,
                          }}
                        >
                          <option value="==">=</option>
                          <option value="<=">{`<=`}</option>
                          <option value="<">{`<`}</option>
                          <option value=">=">{`>=`}</option>
                          <option value=">">{`>`}</option>
                        </select>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <CustomInput
                          label=""
                          type="number"
                          value={d.max_value}
                          onChange={(v) =>
                            setNewRuleDrafts((prev) =>
                              prev.map((x) => (x.id === d.id ? { ...x, max_value: v.replace(/[^0-9.]/g, "") } : x)),
                            )
                          }
                          placeholder=""
                        />
                      </div>
                      <div>
                        <CustomInput
                          label=""
                          type="number"
                          value={d.list_base_price}
                          onChange={(v) =>
                            setNewRuleDrafts((prev) =>
                              prev.map((x) => (x.id === d.id ? { ...x, list_base_price: v.replace(/[^0-9.]/g, "") } : x)),
                            )
                          }
                          placeholder={t("Base")}
                        />
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <CustomInput
                          label=""
                          type="number"
                          value={d.list_price}
                          onChange={(v) =>
                            setNewRuleDrafts((prev) =>
                              prev.map((x) => (x.id === d.id ? { ...x, list_price: v.replace(/[^0-9.]/g, "") } : x)),
                            )
                          }
                          placeholder={t("Coeff.")}
                        />
                        <span style={{ color: colors.textPrimary }}>*</span>
                        <select
                          value={d.variable_factor}
                          onChange={(e) =>
                            setNewRuleDrafts((prev) =>
                              prev.map((x) => (x.id === d.id ? { ...x, variable_factor: e.target.value } : x)),
                            )
                          }
                          style={{
                            padding: "8px",
                            border: `1px solid ${colors.border}`,
                            borderRadius: 6,
                            background: colors.card,
                            color: colors.textPrimary,
                          }}
                        >
                          <option value="weight">{t("Weight")}</option>
                          <option value="volume">{t("Volume")}</option>
                          <option value="wv">{t("Weight * Volume")}</option>
                          <option value="price">{t("Price")}</option>
                          <option value="quantity">{t("Quantity")}</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                  <button
                    onClick={async () => {
                      if (!sessionId || !selectedMethod?.id) return
                      try {
                        setRulesRefreshing(true)
                        const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/delivery-price-rules`, {
                          method: "POST",
                          headers: getOdooHeaders(),
                          body: JSON.stringify({ sessionId, carrier_id: selectedMethod.id }),
                        })
                        const data = await res.json().catch(() => ({}))
                        if (res.ok && data?.success) setRules(data.deliveryPriceRules || [])
                      } finally {
                        setRulesRefreshing(false)
                      }
                    }}
                    style={{
                      padding: "10px 14px",
                      border: `1px solid ${colors.border}`,
                      borderRadius: 8,
                      background: colors.card,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      color: colors.textPrimary,
                    }}
                  >
                    <RefreshCcw
                      size={16}
                      style={{ animation: rulesRefreshing ? "spin 0.9s linear infinite" : "none" }}
                    />{" "}
                    {t("Refresh")}
                  </button>
                  {newRuleDrafts.length > 0 && (
                    <button
                      onClick={async () => {
                        if (!sessionId || !selectedMethod?.id) return
                        const base = API_CONFIG.BACKEND_BASE_URL
                        for (const d of newRuleDrafts) {
                          const values: any = {
                            carrier_id: Number(selectedMethod.id),
                            variable: d.variable,
                            operator: d.operator,
                            max_value: d.max_value === "" ? 0 : Number(d.max_value),
                            list_base_price: d.list_base_price === "" ? 0 : Number(d.list_base_price),
                            list_price: d.list_price === "" ? 0 : Number(d.list_price),
                            variable_factor: d.variable_factor,
                          }
                          const userId = uid ? Number(uid) : undefined
                          await fetch(`${base}/delivery-price-rules/create`, {
                            method: "POST",
                            headers: getOdooHeaders(),
                            body: JSON.stringify({ sessionId, values, userId }),
                          })
                        }
                        try {
                          setRulesRefreshing(true)
                          const res = await fetch(`${base}/delivery-price-rules`, {
                            method: "POST",
                            headers: getOdooHeaders(),
                            body: JSON.stringify({ sessionId, carrier_id: selectedMethod.id }),
                          })
                          const data = await res.json().catch(() => ({}))
                          if (res.ok && data?.success) {
                            setRules(data.deliveryPriceRules || [])
                            setNewRuleDrafts([])
                          }
                        } finally {
                          setRulesRefreshing(false)
                        }
                      }}
                      style={{
                        padding: "10px 14px",
                        border: "none",
                        borderRadius: 8,
                        background: colors.action,
                        color: "#fff",
                        fontWeight: 600,
                      }}
                    >
                      {t("Confirm")}
                    </button>
                  )}
                </div>
              </div>
            )}

            {isTab("availability") && (
              <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
                <div>
                  <h3
                    style={{ fontSize: "16px", fontWeight: "700", color: colors.textPrimary, marginBottom: "16px" }}
                  >
                    {t("Destination")}
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    <div>
                      <NewCustomDropdown
                        label={t("Countries")}
                        values={(countries || []).map((c: any) => c.name || `#${c.id}`)}
                        type="multi"
                        placeholder={t("Select countries")}
                        defaultValue={(countries || [])
                          .filter((c: any) => (formData.country_ids || []).includes(String(c.id)))
                          .map((c: any) => c.name || `#${c.id}`)}
                        onChange={(selected) => {
                          if (Array.isArray(selected)) {
                            const countryIds = selected
                              .map((name) => {
                                const c = (countries || []).find((x: any) => (x.name || `#${x.id}`) === name)
                                return c?.id ? String(c.id) : null
                              })
                              .filter((id): id is string => id !== null)
                            onChange({ country_ids: countryIds })
                          }
                        }}
                      />
                    </div>

                    <div>
                      <NewCustomDropdown
                        label={t("States")}
                        values={(statesList || []).map((s: any) => (s.name || `#${s.id}`) + (s.code ? ` (${s.code})` : ""))}
                        type="multi"
                        placeholder={t("Select states")}
                        defaultValue={(statesList || [])
                          .filter((s: any) => (formData.state_ids || []).includes(String(s.id)))
                          .map((s: any) => (s.name || `#${s.id}`) + (s.code ? ` (${s.code})` : ""))}
                        onChange={(selected) => {
                          if (Array.isArray(selected)) {
                            const stateIds = selected
                              .map((name) => {
                                const s = (statesList || []).find(
                                  (x: any) => (x.name || `#${x.id}`) + (x.code ? ` (${x.code})` : "") === name,
                                )
                                return s?.id ? String(s.id) : null
                              })
                              .filter((id): id is string => id !== null)
                            onChange({ state_ids: stateIds })
                          }
                        }}
                      />
                    </div>

                    <div>
                      <NewCustomDropdown
                        label={t("Zip prefixes")}
                        values={(zipPrefixes || []).map((z: any) => z.name || z.prefix || `#${z.id}`)}
                        type="multi"
                        placeholder={t("Select zip prefixes")}
                        defaultValue={(zipPrefixes || [])
                          .filter((z: any) => (formData.zip_prefix_ids || []).includes(String(z.id)))
                          .map((z: any) => z.name || z.prefix || `#${z.id}`)}
                        onChange={(selected) => {
                          if (Array.isArray(selected)) {
                            const zipIds = selected
                              .map((name) => {
                                const z = (zipPrefixes || []).find(
                                  (x: any) => (x.name || x.prefix || `#${x.id}`) === name,
                                )
                                return z?.id ? String(z.id) : null
                              })
                              .filter((id): id is string => id !== null)
                            onChange({ zip_prefix_ids: zipIds })
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h3
                    style={{ fontSize: "16px", fontWeight: "700", color: colors.textPrimary, marginBottom: "16px" }}
                  >
                    {t("Capacity")}
                  </h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                    <div>
                      <CustomInput
                        label={t("Max weight (kg)")}
                        type="number"
                        value={formData.max_weight || ""}
                        onChange={(v) => onChange({ max_weight: v.replace(/[^0-9.]/g, "") })}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <CustomInput
                        label={t("Max volume (m³)")}
                        type="number"
                        value={formData.max_volume || ""}
                        onChange={(v) => onChange({ max_volume: v.replace(/[^0-9.]/g, "") })}
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    background: colors.mutedBg,
                    padding: "16px",
                    borderRadius: "10px",
                    border: `1px solid ${colors.border}`,
                  }}
                >
                  <p style={{ fontSize: "14px", color: colors.textSecondary, lineHeight: "1.6" }}>
                    {t(
                      "Configure availability rules to make this shipping method available according to the order content or destination.",
                    )}
                  </p>
                </div>
              </div>
            )}

            {isTab("description") && (
              <div>
                <CustomInput
                  label={t("Description")}
                  type="textarea"
                  value={formData.website_description || ""}
                  onChange={(v) => onChange({ website_description: v })}
                  placeholder={t("Add a description for this delivery method...")}
                />
              </div>
            )}
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
              {dirty && (
                <NewCustomButton
                  label={saving ? t("Saving...") : (selectedMethod ? t("Save Changes") : t("Create Method"))}
                  backgroundColor="#25D0FE"
                  onClick={handleSave}
                  disabled={saving}
                />
              )}
              <NewCustomButton
                label={t("Close")}
                backgroundColor="#FFFFFF"
                onClick={closeModal}
                disabled={saving}
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
    </>
  )
}


