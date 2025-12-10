import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { Card } from "../../@/components/ui/card"
import { Button } from "../../@/components/ui/button"
import { useTheme } from "../../context/theme"
import { X, Check } from "lucide-react"
import { CustomDropdown } from "./NewCustomDropdown"
import pdfIcon from "../assets/pdf.png"
import xlsIcon from "../assets/xls.png"

interface ExportModalProps {
    isOpen: boolean
    onClose: () => void
    onExport: (options: ExportOptions) => void
    totalRecords: number
    selectedCount: number
    isSelectAll: boolean
}

export interface ExportOptions {
    format: "excel" | "pdf"
    scope: "all" | "page" | "selected"
    language: "en" | "ar"
    pdfTheme?: "light" | "dark"
}

export default function ExportModal({
    isOpen,
    onClose,
    onExport,
    totalRecords,
    selectedCount,
    isSelectAll,
}: ExportModalProps) {
    const { t } = useTranslation()
    const { colors } = useTheme()

    const [format, setFormat] = useState<"excel" | "pdf">("excel")
    const [scope, setScope] = useState<"all" | "page" | "selected">("selected")
    const [language, setLanguage] = useState<"en" | "ar">("en")
    const [pdfTheme, setPdfTheme] = useState<"light" | "dark">("light")

    useEffect(() => {
        if (isOpen) {
            // Reset state when opening
            setFormat("excel")
            setLanguage("en")
            setPdfTheme("light")
            // Default scope logic
            if (isSelectAll) {
                setScope("all")
            } else {
                setScope("selected")
            }
        }
    }, [isOpen, isSelectAll])

    if (!isOpen) return null

    return (
        <div
            style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.5)",
                backdropFilter: "blur(4px)",
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
                    width: "min(100%, 550px)",
                    background: colors.card,
                    borderRadius: 20,
                    boxShadow: "0 25px 70px rgba(0,0,0,0.35)",
                    overflow: "hidden",
                    border: `1px solid ${colors.border}`,
                    display: "flex",
                    flexDirection: "column",
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div
                    style={{
                        padding: "1.25rem 1.5rem",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        borderBottom: `1px solid ${colors.border}`,
                    }}
                >
                    <h2 style={{ fontSize: 18, fontWeight: 700, color: colors.textPrimary }}>
                        {t("Export Records")}
                    </h2>
                    <button
                        onClick={onClose}
                        style={{
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            color: colors.textSecondary,
                            padding: "4px",
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>

                    {/* Format Selection */}
                    <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: colors.textSecondary, marginBottom: "0.5rem", display: "block", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                            {t("Export Format")}
                        </label>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                            {/* Excel Option */}
                            <div
                                onClick={() => setFormat("excel")}
                                style={{
                                    border: `2px solid ${format === "excel" ? colors.action : colors.border}`,
                                    borderRadius: "10px",
                                    padding: "0.875rem",
                                    cursor: "pointer",
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    gap: "0.5rem",
                                    background: format === "excel" ? `${colors.action}10` : colors.card,
                                    transition: "all 0.2s ease",
                                    position: "relative",
                                }}
                            >
                                {format === "excel" && (
                                    <div style={{ position: "absolute", top: "6px", right: "6px", color: colors.action }}>
                                        <Check size={14} strokeWidth={3} />
                                    </div>
                                )}
                                <div style={{ width: "44px", height: "44px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <img src={xlsIcon} alt="Excel" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                                </div>
                                <span style={{ fontSize: 13, fontWeight: 600, color: colors.textPrimary }}>Excel</span>
                            </div>

                            {/* PDF Option */}
                            <div
                                onClick={() => setFormat("pdf")}
                                style={{
                                    border: `2px solid ${format === "pdf" ? colors.action : colors.border}`,
                                    borderRadius: "10px",
                                    padding: "0.875rem",
                                    cursor: "pointer",
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    gap: "0.5rem",
                                    background: format === "pdf" ? `${colors.action}10` : colors.card,
                                    transition: "all 0.2s ease",
                                    position: "relative",
                                }}
                            >
                                {format === "pdf" && (
                                    <div style={{ position: "absolute", top: "6px", right: "6px", color: colors.action }}>
                                        <Check size={14} strokeWidth={3} />
                                    </div>
                                )}
                                <div style={{ width: "44px", height: "44px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <img src={pdfIcon} alt="PDF" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                                </div>
                                <span style={{ fontSize: 13, fontWeight: 600, color: colors.textPrimary }}>PDF</span>
                            </div>
                        </div>
                    </div>

                    {/* Scope and Language - Horizontal Layout */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                        {/* Scope Selection Dropdown */}
                        <div>
                            <CustomDropdown
                                label={t("Export Scope")}
                                values={isSelectAll
                                    ? [`${t("All records")} (${totalRecords})`, t("Records in this page")]
                                    : [`${t("Selected records")} (${selectedCount})`]
                                }
                                type="single"
                                defaultValue={scope === "all" ? `${t("All records")} (${totalRecords})` : scope === "page" ? t("Records in this page") : `${t("Selected records")} (${selectedCount})`}
                                onChange={(val) => {
                                    if (val.includes(t("All records"))) setScope("all")
                                    else if (val === t("Records in this page")) setScope("page")
                                    else setScope("selected")
                                }}
                            />
                        </div>

                        {/* Language Selection */}
                        <div>
                            <CustomDropdown
                                label={t("Language")}
                                values={["English", "Arabic"]}
                                type="single"
                                defaultValue={language === "en" ? "English" : "Arabic"}
                                onChange={(val) => setLanguage(val === "English" ? "en" : "ar")}
                            />
                        </div>
                    </div>

                    {/* PDF Theme Selection - Only show when PDF is selected */}
                    {format === "pdf" && (
                        <div>
                            <label style={{ fontSize: 12, fontWeight: 600, color: colors.textSecondary, marginBottom: "0.5rem", display: "block", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                {t("PDF Theme")}
                            </label>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                                <div
                                    onClick={() => setPdfTheme("light")}
                                    style={{
                                        border: `2px solid ${pdfTheme === "light" ? colors.action : colors.border}`,
                                        borderRadius: "10px",
                                        padding: "0.75rem",
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        gap: "0.5rem",
                                        background: pdfTheme === "light" ? `${colors.action}10` : colors.card,
                                        transition: "all 0.2s ease",
                                        position: "relative",
                                    }}
                                >
                                    {pdfTheme === "light" && (
                                        <div style={{ position: "absolute", top: "6px", right: "6px", color: colors.action }}>
                                            <Check size={12} strokeWidth={3} />
                                        </div>
                                    )}
                                    <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%)", border: "2px solid #e0e0e0" }} />
                                    <span style={{ fontSize: 12, fontWeight: 600, color: colors.textPrimary }}>{t("Light")}</span>
                                </div>
                                <div
                                    onClick={() => setPdfTheme("dark")}
                                    style={{
                                        border: `2px solid ${pdfTheme === "dark" ? colors.action : colors.border}`,
                                        borderRadius: "10px",
                                        padding: "0.75rem",
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        gap: "0.5rem",
                                        background: pdfTheme === "dark" ? `${colors.action}10` : colors.card,
                                        transition: "all 0.2s ease",
                                        position: "relative",
                                    }}
                                >
                                    {pdfTheme === "dark" && (
                                        <div style={{ position: "absolute", top: "6px", right: "6px", color: colors.action }}>
                                            <Check size={12} strokeWidth={3} />
                                        </div>
                                    )}
                                    <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "linear-gradient(135deg, #2c3e50 0%, #1a1a2e 100%)", border: "2px solid #34495e" }} />
                                    <span style={{ fontSize: 12, fontWeight: 600, color: colors.textPrimary }}>{t("Dark")}</span>
                                </div>
                            </div>
                        </div>
                    )}

                </div>

                {/* Footer */}
                <div
                    style={{
                        padding: "1.25rem 1.5rem",
                        borderTop: `1px solid ${colors.border}`,
                        display: "flex",
                        justifyContent: "flex-end",
                        gap: "0.75rem",
                        background: colors.mutedBg,
                    }}
                >
                    <Button
                        variant="outline"
                        onClick={onClose}
                        style={{
                            borderColor: colors.border,
                            color: colors.textPrimary,
                            background: colors.card,
                        }}
                    >
                        {t("Cancel")}
                    </Button>
                    <Button
                        onClick={() => onExport({ format, scope, language, pdfTheme })}
                        style={{
                            background: colors.action,
                            color: "#FFFFFF",
                            border: "none",
                        }}
                    >
                        {t("Export")}
                    </Button>
                </div>
            </Card>
        </div>
    )
}
