"use client"

import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { useTheme } from "../context/theme"
import { Key, Sun, Moon } from "lucide-react"
import { API_CONFIG } from "./config/api"
import { useNavigate, useLocation } from "react-router"
import { useAuth } from "../context/auth"

export default function LicensePage() {
  const { t } = useTranslation()
  const { mode, setMode, colors } = useTheme()
  const isDarkMode = mode === 'dark'
  const navigate = useNavigate()
  const location = useLocation()
  const { sessionId } = useAuth()
  const [licenseKey, setLicenseKey] = useState("")
  const [isActivating, setIsActivating] = useState(false)
  const [error, setError] = useState("")
  const [isPasting, setIsPasting] = useState(false)

  const toggleTheme = () => setMode(isDarkMode ? 'light' : 'dark')
  
  // Get tenant info from navigation state (for multi-tenancy setup flow)
  const tenantId = location.state?.tenantId || localStorage.getItem('current_tenant_id')
  const instanceName = location.state?.instanceName || localStorage.getItem('current_tenant_name')

  const formatLicenseKey = (value: string): string => {
    // Remove all dashes and non-alphanumeric characters
    const cleaned = value.replace(/[^A-Za-z0-9]/g, "")
    // Limit to 20 characters
    const limited = cleaned.slice(0, 20)
    // Add dashes every 5 characters
    return limited.replace(/(.{5})/g, "$1-").replace(/-$/, "")
  }

  const handleLicenseKeyChange = (value: string) => {
    const formatted = formatLicenseKey(value)
    setLicenseKey(formatted)
    setError("")
  }

  useEffect(() => {
    // Check if license already exists and is valid
    checkLicense()
  }, [])

  const checkLicense = async () => {
    try {
      const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/license/check`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })
      
      // Check if backend connection failed
      if (!res.ok && (res.status === 0 || res.status >= 500)) {
        // Backend connection failed, redirect to error500
        navigate("/error500", { replace: true })
        return
      }
      
      const data = await res.json()
      
      if (res.ok && data?.success) {
        if (data?.valid) {
          // License is valid, redirect to overview
          navigate("/overview", { replace: true })
        }
        // If valid is false (license table empty), stay on license page
      } else {
        // If check fails but connection works, stay on license page
        console.error("License check failed:", data)
      }
    } catch (err) {
      // Network error or connection failure - redirect to error500
      console.error("License check error:", err)
      navigate("/error500", { replace: true })
    }
  }

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText()
      handleLicenseKeyChange(text.trim())
      setIsPasting(true)
      setTimeout(() => setIsPasting(false), 200)
    } catch (err) {
      console.error("Failed to paste:", err)
    }
  }

  const handleActivate = async () => {
    if (!licenseKey.trim()) {
      setError(t("Please enter a license key"))
      return
    }

    setIsActivating(true)
    setError("")

    try {
      // Remove dashes before sending to backend
      const cleanedKey = licenseKey.replace(/-/g, "")
      
      // If we have a tenantId, use the tenant license endpoint
      // Otherwise use the legacy license endpoint
      let res
      if (tenantId) {
        // Calculate license dates (1 year from now by default)
        const startDate = new Date().toISOString().split('T')[0]
        const endDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        
        res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/tenants/license`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            tenantId: parseInt(tenantId),
            licenseKey: cleanedKey,
            startDate,
            endDate,
          }),
        })
      } else {
        res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/license/activate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            licenseKey: cleanedKey,
          }),
        })
      }

      const data = await res.json()

      if (res.ok && data?.success) {
        // Clear license cache to force fresh check on next page load
        localStorage.removeItem('licenseLastCheck')
        localStorage.removeItem('licenseValid')
        // License activated successfully, redirect to signin
        // Use window.location to force a full page reload and trigger license check
        window.location.href = "/signin"
      } else {
        setError(data?.message || t("Failed to activate license"))
      }
    } catch (err: any) {
      setError(err?.message || t("An error occurred while activating the license"))
    } finally {
      setIsActivating(false)
    }
  }


  return (
    <div
      style={{
        minHeight: "100vh",
        background: `linear-gradient(135deg, ${colors.background || "#f8fafc"} 0%, ${colors.mutedBg || "#e2e8f0"} 100%)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        position: "relative",
      }}
    >
      {/* Theme Toggle - Top Right */}
      <div style={{ 
        position: "absolute", 
        top: "1rem", 
        right: "1rem", 
        display: "flex", 
        alignItems: "center", 
        gap: "0.5rem",
        zIndex: 10
      }}>
        <Sun style={{ 
          width: "16px", 
          height: "16px", 
          color: isDarkMode ? "#71717a" : "#f59e0b" 
        }} />
        <button
          onClick={toggleTheme}
          style={{
            position: "relative",
            display: "inline-flex",
            height: "24px",
            width: "44px",
            borderRadius: "9999px",
            transition: "all 0.3s",
            boxShadow: "inset 0 2px 4px rgba(0,0,0,0.1)",
            backgroundColor: isDarkMode ? "#3f3f46" : "#e2e8f0",
            border: "none",
            cursor: "pointer",
          }}
          aria-label="Toggle theme"
        >
          <span
            style={{
              position: "absolute",
              top: "2px",
              height: "20px",
              width: "20px",
              borderRadius: "50%",
              transition: "all 0.3s",
              boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
              backgroundColor: isDarkMode 
                ? "linear-gradient(135deg, #3b82f6, #06b6d4)" 
                : "#ffffff",
              background: isDarkMode 
                ? "linear-gradient(135deg, #3b82f6, #06b6d4)" 
                : "#ffffff",
              left: isDarkMode ? "22px" : "2px",
            }}
          />
        </button>
        <Moon style={{ 
          width: "16px", 
          height: "16px", 
          color: isDarkMode ? "#60a5fa" : "#a1a1aa" 
        }} />
      </div>

      <div
        style={{
          background: colors.card || "#ffffff",
          borderRadius: "1rem",
          boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
          padding: "2rem",
          width: "100%",
          maxWidth: "500px",
          border: `1px solid ${colors.border || "#e2e8f0"}`,
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem", marginBottom: "1.5rem" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              background: colors.mutedBg || "#f1f5f9",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Key size={24} style={{ color: colors.textSecondary || "#64748b" }} />
          </div>
          <div style={{ flex: 1 }}>
            <h2
              style={{
                fontSize: "1.5rem",
                fontWeight: 700,
                color: colors.textPrimary || "#0f172a",
                marginBottom: "0.25rem",
              }}
            >
              {t("Enter Your License Key")}
            </h2>
            <p
              style={{
                fontSize: "0.875rem",
                color: colors.textSecondary || "#64748b",
                margin: 0,
              }}
            >
              {t("Please enter the license key for this application to activate it.")}
            </p>
          </div>
        </div>

        {/* License Key Input */}
        <div style={{ marginBottom: "1.5rem" }}>
          <div
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              border: `1px solid ${error ? "#ef4444" : colors.border || "#e2e8f0"}`,
              borderRadius: "0.5rem",
              background: colors.card || "#ffffff",
              padding: "0.75rem 1rem",
              transition: "all 0.2s",
            }}
          >
            <input
              type="text"
              value={licenseKey}
              onChange={(e) => {
                handleLicenseKeyChange(e.target.value)
              }}
              placeholder="XXXXX-XXXXX-XXXXX-XXXXX"
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                background: "transparent",
                fontSize: "0.9375rem",
                color: colors.textPrimary || "#0f172a",
                fontFamily: "monospace",
                letterSpacing: "0.05em",
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleActivate()
                }
              }}
            />
            <button
              onClick={handlePaste}
              style={{
                background: "transparent",
                border: "none",
                color: colors.textSecondary || "#64748b",
                fontSize: "0.875rem",
                fontWeight: 500,
                cursor: "pointer",
                padding: "0.25rem 0.5rem",
                borderRadius: "0.25rem",
                transition: "all 0.2s",
                opacity: isPasting ? 0.5 : 1,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = colors.mutedBg || "#f1f5f9"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent"
              }}
            >
              {t("Paste Key")}
            </button>
          </div>
          {error && (
            <p
              style={{
                marginTop: "0.5rem",
                fontSize: "0.875rem",
                color: "#ef4444",
              }}
            >
              {error}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1rem",
          }}
        >
          
          <button
            onClick={handleActivate}
            disabled={isActivating || !licenseKey.trim()}
            style={{
              background: isActivating || !licenseKey.trim()
                ? colors.mutedBg || "#f1f5f9"
                : "#4facfe",
              color: isActivating || !licenseKey.trim()
                ? colors.textSecondary || "#64748b"
                : "#ffffff",
              border: "none",
              padding: "0.75rem 1.5rem",
              borderRadius: "0.5rem",
              fontSize: "0.875rem",
              fontWeight: 600,
              cursor: isActivating || !licenseKey.trim() ? "not-allowed" : "pointer",
              transition: "all 0.2s",
              opacity: isActivating ? 0.7 : 1,
            }}
          >
            {isActivating ? t("Activating...") : t("Activate License")}
          </button>
        </div>
      </div>
    </div>
  )
}

