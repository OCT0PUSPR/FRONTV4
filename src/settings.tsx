"use client"

import { useEffect, useMemo, useState, useRef } from "react"
import { useTranslation } from "react-i18next"
import { motion, AnimatePresence } from "framer-motion"
import { useTheme } from "../context/theme"
import { useAuth } from "../context/auth"
import { useData } from "../context/data"
import { API_CONFIG } from "./config/api"
import Toast from "./components/Toast"
import {
  Laptop, Smartphone, Ban, UserCog, ShieldCheck, MonitorSmartphone,
  Loader2, Check, Save, Bell, Globe, Mail, RefreshCw,
  ChevronLeft, ChevronRight, Search
} from "lucide-react"

// --- TYPES ---

interface UserForm {
  id: number | null
  notification_type: "email" | "inbox" | ""
  odoobot_state: "not_initialized" | "onboarding_emoji" | "onboarding_attachement" | "onboarding_command" | "onboarding_ping" | "onboarding_canned" | "idle" | "disabled" | ""
  login: string
  signature: string
  property_warehouse_id: number | null
  calendar_default_privacy: "public" | "private" | "confidential" | ""
}

// --- COMPONENTS ---

const TabButton = ({ active, icon: Icon, label, onClick }: any) => {
  const { colors, mode } = useTheme()
  const isDark = mode === "dark"

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group relative overflow-hidden`}
      style={{
        color: active ? "#ffffff" : colors.textSecondary,
      }}
    >
      {active && (
        <motion.div
          layoutId="activeTabBg"
          className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600"
          initial={false}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      )}
      <div className="relative z-10 flex items-center gap-3">
        <Icon size={18} className={active ? "text-white" : "opacity-50 group-hover:opacity-100"} />
        <span className={`font-display font-medium tracking-wide ${active ? "text-white" : ""}`}>{label}</span>
      </div>
    </button>
  )
}

const PremiumInput = ({ label, value, onChange, placeholder, type = "text", icon: Icon }: any) => {
  const { colors, mode } = useTheme()
  const isDark = mode === "dark"
  const [focused, setFocused] = useState(false)

  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold uppercase tracking-widest opacity-50 ml-1 font-display">
        {label}
      </label>
      <div
        className="relative group transition-all duration-300"
        style={{ transform: focused ? "translateY(-1px)" : "none" }}
      >
        <div
          className="relative flex items-center px-4 py-3 rounded-xl border transition-all duration-300"
          style={{
            backgroundColor: isDark ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.5)",
            borderColor: focused ? colors.action : (isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"),
            boxShadow: focused ? `0 4px 20px -5px ${colors.action}30` : "none"
          }}
        >
          {Icon && <Icon size={16} className="mr-3 opacity-50" />}
          <input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={placeholder}
            className="w-full bg-transparent border-none outline-none text-sm font-medium font-body placeholder:opacity-30"
            style={{ color: colors.textPrimary }}
          />
        </div>
      </div>
    </div>
  )
}

const PremiumSelect = ({ label, options, value, onChange, placeholder = "Select...", icon: Icon }: any) => {
  const { colors, mode } = useTheme()
  const isDark = mode === "dark"
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const displayValue = options.find((o: any) => o.value === value || o.label === value)?.label || value || placeholder

  return (
    <div className="space-y-1.5 relative" ref={containerRef}>
      <label className="text-[10px] font-bold uppercase tracking-widest opacity-50 ml-1 font-display">
        {label}
      </label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full relative flex items-center justify-between px-4 py-3 rounded-xl border transition-all duration-300 group"
        style={{
          backgroundColor: isDark ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.5)",
          borderColor: isOpen ? colors.action : (isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"),
          color: colors.textPrimary
        }}
      >
        <div className="flex items-center gap-3">
          {Icon && <Icon size={16} className="opacity-50" />}
          <span className="text-sm font-medium font-body truncate">{displayValue}</span>
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 mt-1 rounded-xl border shadow-2xl z-50 overflow-hidden"
            style={{
              backgroundColor: isDark ? "#1a1a1c" : "#ffffff",
              borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"
            }}
          >
            <div className="max-h-60 overflow-y-auto custom-scrollbar p-1">
              {options.map((option: any) => {
                const isSelected = value === option.value || value === option.label
                return (
                  <button
                    key={String(option.value)}
                    onClick={() => {
                      onChange(option.label)
                      setIsOpen(false)
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all duration-200"
                    style={{
                      backgroundColor: isSelected ? (isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)") : "transparent",
                      color: isSelected ? colors.action : colors.textPrimary
                    }}
                  >
                    <span className="font-medium font-body">{option.label}</span>
                    {isSelected && <Check size={14} />}
                  </button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// --- MAIN PAGE ---

export default function SettingsPage() {
  const { t } = useTranslation()
  const { colors, mode } = useTheme()
  const { uid, sessionId } = useAuth()
  const { warehouses } = useData()
  const isDark = mode === "dark"

  const [activeTab, setActiveTab] = useState<"preferences" | "security" | "devices">("preferences")
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string>("")
  const [showToast, setShowToast] = useState<{ text: string; state: "success" | "error" } | null>(null)

  // Devices state
  const [deviceIds, setDeviceIds] = useState<number[]>([])
  const [devices, setDevices] = useState<any[]>([])
  const [devicesLoading, setDevicesLoading] = useState(false)
  const [devicesError, setDevicesError] = useState<string>("")
  const [devicesPage, setDevicesPage] = useState(1)
  const DEVICES_PER_PAGE = 5

  const [form, setForm] = useState<UserForm>({
    id: null,
    notification_type: "",
    odoobot_state: "",
    login: "",
    signature: "",
    property_warehouse_id: null,
    calendar_default_privacy: "",
  })

  const userId = useMemo(() => Number(uid || 0), [uid])

  // --- HELPERS ---

  const getOdooHeaders = (): Record<string, string> => {
    const rawBase = localStorage.getItem('odoo_base_url') || 'https://egy.thetalenter.net'
    const db = localStorage.getItem('odoo_db') || 'odoodb1'
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (rawBase) headers['x-odoo-base'] = rawBase
    if (db) headers['x-odoo-db'] = db
    const tenantId = localStorage.getItem('current_tenant_id')
    if (tenantId) headers['X-Tenant-ID'] = tenantId
    return headers
  }

  const htmlToText = (html: string): string => {
    try {
      if (!html) return ""
      const withNewlines = html.replace(/<br\s*\/?>/gi, "\n")
      const noTags = withNewlines.replace(/<[^>]+>/g, "")
      return noTags.trim()
    } catch { return String(html || "") }
  }

  const textToHtml = (text: string): string => {
    const lines = (text || "").split(/\r?\n/)
    if (lines.length === 0) return ""
    return `<p>${lines.join('<br/>')}</p>`
  }

  // --- DATA FETCHING ---

  const loadUser = async () => {
    if (!sessionId || !userId) return
    setLoading(true)
    setError("")
    try {
      const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/users/by-id`, {
        method: "POST",
        headers: getOdooHeaders(),
        body: JSON.stringify({ sessionId, id: userId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.success) throw new Error(data?.message || "Failed to fetch user")
      const u = data.user || {}
      const getId = (v: any): number | null => (Array.isArray(v) ? Number(v[0]) : (typeof v === 'number' ? v : (v?.id ?? null)))
      setForm({
        id: Number(u.id || userId),
        notification_type: (u.notification_type || "") as any,
        odoobot_state: (u.odoobot_state || "") as any,
        login: String(u.login || u.email || ""),
        signature: htmlToText(String(u.signature || "")),
        property_warehouse_id: getId(u.property_warehouse_id),
        calendar_default_privacy: (u.calendar_default_privacy || "") as any,
      })
      const ids = Array.isArray(u.device_ids) ? u.device_ids.map((n: any) => Number(n)).filter(Boolean) : []
      setDeviceIds(ids)
    } catch (e: any) {
      setError(e?.message || "Failed to load user preferences")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadUser() }, [sessionId, userId])

  const warehouseOptions = useMemo(() => {
    return (warehouses || []).map((w: any) => ({ value: String(w.id), label: String(w.display_name || w.name || `#${w.id}`) }))
  }, [warehouses])

  const save = async () => {
    if (!sessionId || !form.id) return
    setSaving(true)
    setError("")
    try {
      const values: any = {
        notification_type: form.notification_type || false,
        odoobot_state: form.odoobot_state || false,
        login: form.login,
        signature: textToHtml(form.signature || ""),
        calendar_default_privacy: form.calendar_default_privacy || false,
      }
      if (form.property_warehouse_id) values.property_warehouse_id = form.property_warehouse_id
      const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/users/${form.id}`, {
        method: "PUT",
        headers: getOdooHeaders(),
        body: JSON.stringify({ sessionId, values }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.success) throw new Error(data?.message || "Save failed")
      setShowToast({ text: t("Preferences saved successfully"), state: "success" })
    } catch (e: any) {
      setShowToast({ text: e?.message || t("Failed to save preferences"), state: "error" })
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    const fetchDevices = async () => {
      if (activeTab !== "devices") return
      if (!sessionId || !deviceIds.length) {
        setDevices([])
        return
      }
      setDevicesError("")
      setDevicesLoading(true)
      try {
        const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/users/devices/by-ids`, {
          method: "POST",
          headers: getOdooHeaders(),
          body: JSON.stringify({ sessionId, ids: deviceIds }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok || !data?.success) throw new Error(data?.message || "Failed to fetch devices")
        setDevices(Array.isArray(data.devices) ? data.devices : [])
      } catch (e: any) {
        setDevicesError(e?.message || "Failed to fetch devices")
        setDevices([])
      } finally {
        setDevicesLoading(false)
      }
    }
    fetchDevices()
  }, [activeTab, sessionId, deviceIds])

  // Pagination Logic
  const totalPages = Math.ceil(devices.length / DEVICES_PER_PAGE)
  const paginatedDevices = devices.slice((devicesPage - 1) * DEVICES_PER_PAGE, devicesPage * DEVICES_PER_PAGE)

  // --- RENDER ---

  return (
    <div className="h-[calc(100vh-48px)] overflow-hidden font-sans" style={{ backgroundColor: colors.background, color: colors.textPrimary }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Outfit:wght@300;400;500;600&display=swap');
        .font-display { font-family: 'Space Grotesk', sans-serif; }
        .font-body { font-family: 'Outfit', sans-serif; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { 
          background: ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}; 
          border-radius: 10px; 
        }
      `}</style>

      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-blue-500/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[800px] h-[800px] bg-purple-500/5 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 h-full flex max-w-[1800px] mx-auto">

        {/* Sidebar */}
        <div className="w-[280px] flex-shrink-0 p-6 border-r flex flex-col gap-8" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
          <div>
            <h1 className="text-2xl font-display font-bold tracking-tight mb-2">Settings</h1>
            <p className="text-xs opacity-50 font-body">Manage your workspace</p>
          </div>

          <div className="flex flex-col gap-2">
            <TabButton
              active={activeTab === "preferences"}
              icon={UserCog}
              label="Preferences"
              onClick={() => setActiveTab("preferences")}
            />
            <TabButton
              active={activeTab === "security"}
              icon={ShieldCheck}
              label="Security"
              onClick={() => setActiveTab("security")}
            />
            <TabButton
              active={activeTab === "devices"}
              icon={MonitorSmartphone}
              label="Devices"
              onClick={() => setActiveTab("devices")}
            />
          </div>

          <div className="mt-auto p-4 rounded-2xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/10">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                <ShieldCheck size={14} />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider opacity-70">Pro Tip</span>
            </div>
            <p className="text-[10px] opacity-60 leading-relaxed">
              Enable 2FA in the Security tab to keep your account safe from unauthorized access.
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 h-full overflow-y-auto custom-scrollbar p-6 lg:p-10">
          <div className="max-w-4xl mx-auto">
            <AnimatePresence mode="wait">

              {activeTab === "preferences" && (
                <motion.div
                  key="preferences"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.4 }}
                  className="space-y-8"
                >
                  {/* Profile Section */}
                  <section>
                    <div className="flex items-center gap-3 mb-6">
                      <h2 className="text-xl font-display font-bold">Profile Information</h2>
                      <div className="h-px flex-1 bg-gradient-to-r from-current to-transparent opacity-10" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 rounded-3xl border" style={{
                      backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                      borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
                    }}>
                      <PremiumInput
                        label="Login Email"
                        value={form.login}
                        onChange={(v: string) => setForm(p => ({ ...p, login: v }))}
                        icon={Mail}
                      />
                      <PremiumSelect
                        label="Default Warehouse"
                        options={warehouseOptions}
                        value={form.property_warehouse_id ? String(form.property_warehouse_id) : ""}
                        onChange={(label: string) => setForm(p => ({
                          ...p,
                          property_warehouse_id: warehouseOptions.find(o => o.label === label)?.value ? Number(warehouseOptions.find(o => o.label === label)!.value) : null
                        }))}
                        icon={RefreshCw}
                      />
                      <div className="md:col-span-2 space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest opacity-50 ml-1 font-display">Signature</label>
                        <textarea
                          value={form.signature}
                          onChange={(e) => setForm(p => ({ ...p, signature: e.target.value }))}
                          rows={4}
                          className="w-full rounded-xl p-4 text-sm font-medium font-body focus:outline-none transition-all resize-none border"
                          style={{
                            backgroundColor: isDark ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.5)",
                            borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
                            color: colors.textPrimary
                          }}
                        />
                      </div>
                    </div>
                  </section>

                  {/* Notifications Section */}
                  <section>
                    <div className="flex items-center gap-3 mb-6">
                      <h2 className="text-xl font-display font-bold">Notifications & System</h2>
                      <div className="h-px flex-1 bg-gradient-to-r from-current to-transparent opacity-10" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 rounded-3xl border" style={{
                      backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                      borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
                    }}>
                      <PremiumSelect
                        label="Notification Method"
                        options={[
                          { label: "Handle by Emails", value: "email" },
                          { label: "Handle in Odoo", value: "inbox" }
                        ]}
                        value={form.notification_type === "email" ? "Handle by Emails" : form.notification_type === "inbox" ? "Handle in Odoo" : ""}
                        onChange={(v: string) => setForm(p => ({ ...p, notification_type: v === "Handle by Emails" ? "email" : "inbox" }))}
                        icon={Bell}
                      />
                      <PremiumSelect
                        label="OdooBot Status"
                        options={[
                          "Not initialized", "Onboarding emoji", "Onboarding attachment", "Onboarding command",
                          "Onboarding ping", "Onboarding canned", "Idle", "Disabled"
                        ].map(s => ({ label: s, value: s.toLowerCase().replace(/ /g, "_") }))}
                        value={form.odoobot_state.replace(/_/g, " ").replace(/^\w/, c => c.toUpperCase())}
                        onChange={(v: string) => setForm(p => ({ ...p, odoobot_state: v.toLowerCase().replace(/ /g, "_") as any }))}
                        icon={Globe}
                      />
                    </div>
                  </section>

                  <div className="flex justify-end pt-4 pb-10">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={save}
                      disabled={saving}
                      className="px-8 py-3 rounded-xl font-display font-bold text-white shadow-xl shadow-blue-500/20 flex items-center gap-3"
                      style={{ backgroundColor: colors.action }}
                    >
                      {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                      Save Changes
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {activeTab === "security" && (
                <motion.div
                  key="security"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.4 }}
                  className="h-[60vh] flex flex-col items-center justify-center text-center"
                >
                  <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-blue-500/20 to-purple-500/20 flex items-center justify-center mb-8 animate-pulse">
                    <ShieldCheck size={48} className="text-blue-400" />
                  </div>
                  <h2 className="text-3xl font-display font-bold mb-4">Security Center</h2>
                  <p className="max-w-md opacity-60 font-body leading-relaxed mb-8">
                    We are building advanced security features to keep your account safe. Check back soon for 2FA and audit logs.
                  </p>
                </motion.div>
              )}

              {activeTab === "devices" && (
                <motion.div
                  key="devices"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.4 }}
                  className="space-y-6"
                >
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-display font-bold">Active Devices</h2>
                    <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono">
                      {devices.length} Connected
                    </div>
                  </div>

                  {devicesLoading ? (
                    <div className="flex justify-center py-20"><Loader2 className="animate-spin w-8 h-8 opacity-50" /></div>
                  ) : devices.length === 0 ? (
                    <div className="text-center py-20 opacity-50">No devices found</div>
                  ) : (
                    <div className="space-y-4">
                      {paginatedDevices.map((d, i) => (
                        <motion.div
                          key={d.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className="p-5 rounded-2xl border flex items-center justify-between group hover:border-blue-500/30 transition-all"
                          style={{
                            backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                            borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
                          }}
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center">
                              {d.device_type === "computer" ? <Laptop size={20} /> : <Smartphone size={20} />}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-display font-bold text-sm">{d.browser || "Unknown Device"}</h3>
                                {d.is_current && (
                                  <span className="px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 text-[10px] font-bold uppercase tracking-wider">
                                    Current
                                  </span>
                                )}
                              </div>
                              <p className="text-xs font-mono opacity-50 mt-0.5">{d.ip_address} • {d.last_activity}</p>
                            </div>
                          </div>

                          <button
                            onClick={async () => {
                              const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/users/devices/${d.id}`, {
                                method: "PUT",
                                headers: getOdooHeaders(),
                                body: JSON.stringify({ sessionId, values: { revoked: !d.revoked } }),
                              })
                              if (res.ok) {
                                setDevices(prev => prev.map(dev => dev.id === d.id ? { ...dev, revoked: !d.revoked } : dev))
                                setShowToast({ text: d.revoked ? "Device unrevoked" : "Device revoked", state: "success" })
                              }
                            }}
                            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2 ${d.revoked ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400 opacity-0 group-hover:opacity-100"}`}
                          >
                            {d.revoked ? <Check size={12} /> : <Ban size={12} />}
                            {d.revoked ? "Enable" : "Revoke"}
                          </button>
                        </motion.div>
                      ))}
                    </div>
                  )}

                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-6 border-t border-white/5">
                      <span className="text-xs opacity-50">Page {devicesPage} of {totalPages}</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setDevicesPage(p => Math.max(1, p - 1))}
                          disabled={devicesPage === 1}
                          className="p-2 rounded-lg hover:bg-white/5 disabled:opacity-30 transition-colors"
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <button
                          onClick={() => setDevicesPage(p => Math.min(totalPages, p + 1))}
                          disabled={devicesPage === totalPages}
                          className="p-2 rounded-lg hover:bg-white/5 disabled:opacity-30 transition-colors"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {showToast && (
        <Toast text={showToast.text} state={showToast.state} onClose={() => setShowToast(null)} />
      )}
    </div>
  )
}
