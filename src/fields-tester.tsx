"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Search, Copy, Check, Database, Layers, Code, Box, Filter } from "lucide-react"
import { useTheme } from "../context/theme"
import { useAuth } from "../context/auth"
import { API_CONFIG } from "./config/api"

// Types
interface OdooModel {
  name: string
  model: string
  modules: string
}

interface ModuleGroup {
  name: string
  count: number
}

export default function FieldsTesterPage() {
  const { colors, mode } = useTheme()
  const { sessionId } = useAuth()
  const isDark = mode === "dark"

  // State
  const [allModels, setAllModels] = useState<OdooModel[]>([])
  const [modules, setModules] = useState<ModuleGroup[]>([])
  const [selectedModule, setSelectedModule] = useState<string | null>(null)
  const [selectedModel, setSelectedModel] = useState<string | null>(null)
  const [fields, setFields] = useState<string[]>([])
  const [meta, setMeta] = useState<Record<string, any> | null>(null)
  const [selectedField, setSelectedField] = useState<string | null>(null)

  // Loading & Error
  const [loadingModels, setLoadingModels] = useState(false)
  const [loadingFields, setLoadingFields] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [moduleFilter, setModuleFilter] = useState("")
  const [modelFilter, setModelFilter] = useState("")
  const [fieldFilter, setFieldFilter] = useState("")

  // UI State
  const [copyAllSuccess, setCopyAllSuccess] = useState(false)
  const [copyFieldSuccess, setCopyFieldSuccess] = useState(false)

  // Fetch Models on Mount
  useEffect(() => {
    fetchModels()
  }, [sessionId])

  const getOdooHeaders = (): Record<string, string> => {
    const rawBase = ""
    const db = ""
    const headers: Record<string, string> = {}
    if (rawBase) headers['x-odoo-base'] = rawBase
    if (db) headers['x-odoo-db'] = db

    const tenantId = localStorage.getItem('current_tenant_id')
    if (tenantId) headers['X-Tenant-ID'] = tenantId

    return headers
  }

  const fetchModels = async () => {
    if (!sessionId) return
    setLoadingModels(true)
    setError(null)
    try {
      const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/models/getModels`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getOdooHeaders() },
        body: JSON.stringify({ sessionId }),
      })
      
      if (!res.ok) {
        const errorText = await res.text()
        console.error(`Failed to fetch models: ${res.status} ${res.statusText}`, errorText)
        setError(`Failed to load models: ${res.status} ${res.statusText}`)
        return
      }

      const data = await res.json()

      if (data.success && Array.isArray(data.products)) {
        const models: OdooModel[] = data.products
        // Sort models by name
        models.sort((a, b) => a.name.localeCompare(b.name))
        setAllModels(models)

        // Extract distinct modules
        const moduleCounts: Record<string, number> = {}
        models.forEach(m => {
          // modules is a string like "base, web"
          const mods = m.modules ? m.modules.split(',').map(s => s.trim()) : ['Uncategorized']
          mods.forEach(mod => {
            if (mod) moduleCounts[mod] = (moduleCounts[mod] || 0) + 1
          })
        })

        const sortedModules = Object.entries(moduleCounts)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)

        setModules(sortedModules)
      } else {
        setError("Invalid response format from server")
      }
    } catch (e) {
      console.error("Failed to fetch models", e)
      setError(e instanceof Error ? e.message : "Failed to load models")
    } finally {
      setLoadingModels(false)
    }
  }

  const fetchFields = async (model: string) => {
    if (!sessionId) return
    setSelectedModel(model)
    setLoadingFields(true)
    setError(null)
    setFields([])
    setMeta(null)
    setSelectedField(null)
    setFieldFilter("")

    try {
      const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/fields`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getOdooHeaders() },
        body: JSON.stringify({ sessionId, model }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.success) {
        throw new Error(data?.message || `Failed to fetch fields for ${model}`)
      }
      const fieldList = Array.isArray(data.fields) ? data.fields : Object.keys(data.meta || {})
      setFields(fieldList.sort())
      setMeta(data.meta || {})
    } catch (e: any) {
      setError(e?.message || "Unknown error")
    } finally {
      setLoadingFields(false)
    }
  }

  const copyToClipboard = async (text: string, setSuccess: (value: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(text)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 2000)
    } catch (e) {
      console.error("Failed to copy:", e)
    }
  }

  // Filter Logic
  const filteredModules = modules.filter(m =>
    m.name.toLowerCase().includes(moduleFilter.toLowerCase())
  )

  const filteredModels = allModels.filter(m => {
    const matchesSearch = m.model.toLowerCase().includes(modelFilter.toLowerCase()) ||
      m.name.toLowerCase().includes(modelFilter.toLowerCase())

    if (!selectedModule) return matchesSearch

    // Check if model belongs to selected module
    const modelModules = m.modules ? m.modules.split(',').map(s => s.trim()) : ['Uncategorized']
    return matchesSearch && modelModules.includes(selectedModule)
  })

  const filteredFields = fields.filter(f =>
    f.toLowerCase().includes(fieldFilter.toLowerCase())
  )

  // Styles
  const glassStyle = {
    backgroundColor: isDark ? 'rgba(20, 20, 23, 0.7)' : 'rgba(255, 255, 255, 0.8)',
    backdropFilter: 'blur(12px)',
    border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'}`,
    boxShadow: isDark ? '0 8px 32px rgba(0, 0, 0, 0.2)' : '0 8px 32px rgba(0, 0, 0, 0.05)'
  }

  const activeItemStyle = {
    backgroundColor: colors.action,
    color: '#ffffff',
    boxShadow: `0 4px 12px ${colors.action}40`
  }

  return (
    <div className="min-h-screen p-6 font-sans overflow-hidden" style={{ backgroundColor: colors.background, color: colors.textPrimary }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Outfit:wght@300;400;500;600&display=swap');
        .font-display { font-family: 'Space Grotesk', sans-serif; }
        .font-body { font-family: 'Outfit', sans-serif; }
        
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { 
          background: ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}; 
          border-radius: 10px; 
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { 
          background: ${isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'}; 
        }
      `}</style>

      <div className="max-w-[1800px] mx-auto h-[calc(100vh-48px)] flex flex-col gap-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/20">
              <Database className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-3xl font-display font-bold tracking-tight">Schema Explorer</h1>
              <p className="text-sm font-body opacity-60">Inspect models, modules, and field definitions</p>
            </div>
          </div>

          <div className="flex items-center gap-3 px-4 py-2 rounded-full" style={glassStyle}>
            <div className={`w-2 h-2 rounded-full ${sessionId ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
            <span className="text-xs font-medium font-display uppercase tracking-wider">
              {sessionId ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-[280px_350px_1fr] gap-6 flex-1 min-h-0">

          {/* Column 1: Modules */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="rounded-3xl flex flex-col overflow-hidden"
            style={glassStyle}
          >
            <div className="p-5 border-b" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
              <div className="flex items-center gap-2 mb-4">
                <Box size={18} className="text-blue-500" />
                <h2 className="font-display font-bold text-lg">Modules</h2>
                <span className="ml-auto text-xs font-mono opacity-50 bg-white/5 px-2 py-1 rounded-md">
                  {modules.length}
                </span>
              </div>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
                <input
                  type="text"
                  placeholder="Filter modules..."
                  value={moduleFilter}
                  onChange={(e) => setModuleFilter(e.target.value)}
                  className="w-full bg-transparent border-none outline-none pl-9 pr-4 py-2 text-sm font-body rounded-xl transition-all focus:ring-2 focus:ring-blue-500/50"
                  style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1">
              {loadingModels ? (
                <div className="flex justify-center p-8"><div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" /></div>
              ) : (
                <>
                  <button
                    onClick={() => setSelectedModule(null)}
                    className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium font-body transition-all flex items-center justify-between group"
                    style={!selectedModule ? activeItemStyle : { color: colors.textSecondary }}
                  >
                    <span>All</span>
                    <span className={`text-xs opacity-60 ${!selectedModule ? 'text-white' : ''}`}>{allModels.length}</span>
                  </button>

                  {filteredModules.map((mod) => (
                    <button
                      key={mod.name}
                      onClick={() => setSelectedModule(mod.name)}
                      className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium font-body transition-all flex items-center justify-between group hover:bg-white/5"
                      style={selectedModule === mod.name ? activeItemStyle : { color: colors.textSecondary }}
                    >
                      <span className="truncate mr-2">{mod.name}</span>
                      <span className={`text-xs opacity-60 bg-white/10 px-1.5 py-0.5 rounded ${selectedModule === mod.name ? 'text-white bg-white/20' : ''}`}>
                        {mod.count}
                      </span>
                    </button>
                  ))}
                </>
              )}
            </div>
          </motion.div>

          {/* Column 2: Models */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="rounded-3xl flex flex-col overflow-hidden"
            style={glassStyle}
          >
            <div className="p-5 border-b" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
              <div className="flex items-center gap-2 mb-4">
                <Layers size={18} className="text-purple-500" />
                <h2 className="font-display font-bold text-lg">Models</h2>
                <span className="ml-auto text-xs font-mono opacity-50 bg-white/5 px-2 py-1 rounded-md">
                  {filteredModels.length}
                </span>
              </div>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
                <input
                  type="text"
                  placeholder="Search models..."
                  value={modelFilter}
                  onChange={(e) => setModelFilter(e.target.value)}
                  className="w-full bg-transparent border-none outline-none pl-9 pr-4 py-2 text-sm font-body rounded-xl transition-all focus:ring-2 focus:ring-purple-500/50"
                  style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1">
              {filteredModels.map((model) => (
                <button
                  key={model.model}
                  onClick={() => fetchFields(model.model)}
                  className="w-full text-left px-4 py-3 rounded-xl transition-all group hover:bg-white/5 border border-transparent"
                  style={selectedModel === model.model ? {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                    borderColor: colors.action,
                    boxShadow: `0 0 0 1px ${colors.action}`
                  } : {}}
                >
                  <div className="font-display font-semibold text-sm mb-0.5" style={{ color: selectedModel === model.model ? colors.action : colors.textPrimary }}>
                    {model.name}
                  </div>
                  <div className="font-mono text-xs opacity-50 truncate">
                    {model.model}
                  </div>
                </button>
              ))}
              {filteredModels.length === 0 && (
                <div className="p-8 text-center opacity-40 text-sm">No models found</div>
              )}
            </div>
          </motion.div>

          {/* Column 3: Fields & Details */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="rounded-3xl flex flex-col overflow-hidden relative"
            style={glassStyle}
          >
            {/* Fields Header */}
            <div className="p-5 border-b flex-none" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Code size={18} className="text-green-500" />
                  <h2 className="font-display font-bold text-lg">
                    {selectedModel ? selectedModel : 'Select a Model'}
                  </h2>
                </div>
                {selectedModel && (
                  <button
                    onClick={() => {
                      if (meta) {
                        copyToClipboard(JSON.stringify(meta, null, 2), setCopyAllSuccess)
                      }
                    }}
                    className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                    title="Copy all fields metadata JSON"
                  >
                    {copyAllSuccess ? <Check size={16} className="text-green-500" /> : <Copy size={16} className="opacity-50" />}
                  </button>
                )}
              </div>

              {selectedModel && (
                <div className="relative">
                  <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
                  <input
                    type="text"
                    placeholder="Filter fields..."
                    value={fieldFilter}
                    onChange={(e) => setFieldFilter(e.target.value)}
                    className="w-full bg-transparent border-none outline-none pl-9 pr-4 py-2 text-sm font-body rounded-xl transition-all focus:ring-2 focus:ring-green-500/50"
                    style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
                  />
                </div>
              )}
            </div>

            {/* Content Area */}
            <div className="flex-1 min-h-0 flex">
              {loadingFields ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full" />
                    <span className="text-sm opacity-50 font-display">Fetching fields...</span>
                  </div>
                </div>
              ) : !selectedModel ? (
                <div className="flex-1 flex items-center justify-center opacity-30">
                  <div className="text-center">
                    <Database size={48} className="mx-auto mb-4" />
                    <p className="font-display text-lg">Select a model to view fields</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Fields List */}
                  <div className="w-1/3 border-r overflow-y-auto custom-scrollbar p-2" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                    {filteredFields.map(field => (
                      <button
                        key={field}
                        onClick={() => setSelectedField(field)}
                        className="w-full text-left px-3 py-2 rounded-lg text-xs font-mono transition-all hover:bg-white/5 mb-0.5 truncate"
                        style={selectedField === field ? {
                          backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                          color: colors.action,
                          fontWeight: 600
                        } : { color: colors.textSecondary }}
                      >
                        {field}
                      </button>
                    ))}
                  </div>

                  {/* Field Details */}
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-black/5">
                    <AnimatePresence mode="wait">
                      {selectedField ? (
                        <motion.div
                          key={selectedField}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.2 }}
                        >
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="font-mono text-lg font-bold text-green-500">{selectedField}</h3>
                            <button
                              onClick={() => {
                                if (selectedField && meta?.[selectedField]) {
                                  copyToClipboard(JSON.stringify(meta[selectedField], null, 2), setCopyFieldSuccess)
                                }
                              }}
                              className="text-xs flex items-center gap-1 opacity-50 hover:opacity-100 transition-opacity"
                            >
                              {copyFieldSuccess ? <Check size={12} /> : <Copy size={12} />}
                              {copyFieldSuccess ? 'Copied' : 'Copy JSON'}
                            </button>
                          </div>

                          <div className="rounded-xl overflow-hidden border" style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}>
                            <pre className="p-4 text-xs font-mono overflow-x-auto" style={{ backgroundColor: isDark ? '#0d0d0d' : '#f5f5f5' }}>
                              {JSON.stringify(meta?.[selectedField], null, 2)}
                            </pre>
                          </div>

                          {/* Quick Info Cards */}
                          <div className="grid grid-cols-2 gap-3 mt-4">
                            <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                              <div className="text-[10px] uppercase tracking-wider opacity-50 mb-1">Type</div>
                              <div className="font-display font-medium">{meta?.[selectedField]?.type || 'N/A'}</div>
                            </div>
                            <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                              <div className="text-[10px] uppercase tracking-wider opacity-50 mb-1">Label</div>
                              <div className="font-display font-medium">{meta?.[selectedField]?.string || 'N/A'}</div>
                            </div>
                            <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                              <div className="text-[10px] uppercase tracking-wider opacity-50 mb-1">Required</div>
                              <div className="font-display font-medium">{meta?.[selectedField]?.required ? 'Yes' : 'No'}</div>
                            </div>
                            <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                              <div className="text-[10px] uppercase tracking-wider opacity-50 mb-1">Readonly</div>
                              <div className="font-display font-medium">{meta?.[selectedField]?.readonly ? 'Yes' : 'No'}</div>
                            </div>
                          </div>
                        </motion.div>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center opacity-30">
                          <Code size={32} className="mb-2" />
                          <p className="font-display text-sm">Select a field to view details</p>
                        </div>
                      )}
                    </AnimatePresence>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

