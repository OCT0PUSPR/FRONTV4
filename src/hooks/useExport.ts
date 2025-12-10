import { useTranslation } from "react-i18next"
import { ExportOptions } from "../components/ExportModal"

export interface ExportColumn {
    header: string
    accessor: (row: any) => string | number
    align?: "left" | "right" | "center"
    isStatus?: boolean
    isMonospace?: boolean
    isBold?: boolean
}

export interface ExportSummaryItem {
    label: string
    value: string | number
}

export interface UseExportConfig {
    title: string
    columns: ExportColumn[]
    getSummary?: (data: any[]) => ExportSummaryItem[]
}

export function useExport() {
    const { t } = useTranslation()

    const exportData = (
        options: ExportOptions,
        dataToExport: any[],
        config: UseExportConfig,
        dateRange?: [string | null, string | null] | null
    ) => {
        if (dataToExport.length === 0) {
            alert(t("No records to export"))
            return
        }

        // 1. Handle Excel (CSV)
        if (options.format === "excel") {
            const headers = config.columns.map(c => c.header)
            const csvContent = [
                headers.join(","),
                ...dataToExport.map((row) =>
                    config.columns.map(col => {
                        const val = col.accessor(row)
                        const strVal = String(val === null || val === undefined ? "" : val)
                        return `"${strVal.replace(/"/g, '""')}"`
                    }).join(",")
                ),
            ].join("\n")

            const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
            const link = document.createElement("a")
            if (link.download !== undefined) {
                const url = URL.createObjectURL(blob)
                link.setAttribute("href", url)
                link.setAttribute("download", `${config.title.toLowerCase().replace(/\s+/g, '_')}_export_${new Date().toISOString().slice(0, 10)}.csv`)
                link.style.visibility = "hidden"
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)
            }
        }
        // 2. Handle PDF
        else if (options.format === "pdf") {
            const isDark = options.pdfTheme === "dark"
            const dateStr = dateRange && dateRange[0] && dateRange[1]
                ? `${t("From")} ${dateRange[0]} - ${dateRange[1]}`
                : new Date().toLocaleDateString(options.language === 'ar' ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })

            const dir = options.language === 'ar' ? "rtl" : "ltr"
            const summaryItems = config.getSummary ? config.getSummary(dataToExport) : []

            const rowsHtml = dataToExport.map(row => `
        <tr>
            ${config.columns.map(col => {
                const val = col.accessor(row)
                let content = val

                if (col.isStatus) {
                    const status = String(val).toLowerCase()
                    const isWarning = status === 'ready' || status === 'waiting'
                    const isDanger = status === 'draft' || status === 'cancel' || status === 'cancelled'
                    content = `<span class="status-badge ${isWarning ? 'warning' : isDanger ? 'danger' : ''}">${val}</span>`
                }

                const style = [
                    col.isMonospace ? 'font-family: monospace;' : '',
                    col.isBold ? 'font-weight: 600;' : '',
                    col.align ? `text-align: ${col.align};` : '',
                    col.isMonospace && !isDark ? 'color: #6b7280;' : '',
                    col.isMonospace && isDark ? 'color: #9ca3af;' : ''
                ].join(' ')

                return `<td style="${style}">${content}</td>`
            }).join('')}
        </tr>
      `).join('')

            // Generate StatCard-style summary cards with gradients and icons
            const gradients = [
                'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'
            ]

            const icons = [
                '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3h18v18H3z"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>',
                '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>',
                '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
                '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'
            ]

            const summaryHtml = summaryItems.map((item, idx) => `
        <div class="stat-card">
            <div class="stat-icon" style="background: ${gradients[idx % gradients.length]};">
                ${icons[idx % icons.length]}
            </div>
            <div class="stat-content">
                <div class="stat-label">${item.label}</div>
                <div class="stat-value">${item.value}</div>
            </div>
            <div class="stat-bg" style="background: ${gradients[idx % gradients.length]};"></div>
        </div>
      `).join('')

            const headersHtml = config.columns.map(col =>
                `<th style="${col.align ? `text-align: ${col.align};` : ''}">${col.header}</th>`
            ).join('')

            const htmlContent = `
<!DOCTYPE html>
<html lang="${options.language}" dir="${dir}">
<head>
<meta charset="UTF-8">
<title>${config.title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600&display=swap" rel="stylesheet">
<style>
:root {
${isDark ? `
--primary: #60a5fa;
--text-main: #f9fafb;
--text-muted: #9ca3af;
--bg-main: #111827;
--bg-card: #1f2937;
--border-color: #374151;
--table-header-bg: #1f2937;
` : `
--primary: #4facfe;
--text-main: #111827;
--text-muted: #6b7280;
--bg-main: #f9fafb;
--bg-card: #ffffff;
--border-color: #e5e7eb;
--table-header-bg: #fcfcfc;
`}
}

body {
    font-family: 'Plus Jakarta Sans', sans-serif;
    background-color: var(--bg-main);
    color: var(--text-main);
    margin: 0;
    padding: 40px;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
}

.report-container {
    max-width: 210mm;
    margin: 0 auto;
    background: var(--bg-card);
    padding: 48px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, ${isDark ? '0.3' : '0.05'}), 0 2px 4px -1px rgba(0, 0, 0, ${isDark ? '0.2' : '0.03'});
    border-radius: 12px;
}

h1, h2, h3, h4 {
    font-family: 'Space Grotesk', sans-serif;
    margin: 0;
}

.header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 40px;
    padding-bottom: 24px;
    border-bottom: 3px solid var(--primary);
}

.report-title {
    font-size: 32px;
    font-weight: 700;
    color: var(--text-main);
    letter-spacing: -0.02em;
    text-transform: uppercase;
}

.report-meta {
    text-align: right;
}

.meta-item {
    font-size: 11px;
    color: var(--text-muted);
    margin-bottom: 4px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

.meta-value {
    color: var(--text-main);
    font-weight: 700;
    font-family: 'Space Grotesk', sans-serif;
    font-size: 14px;
}

/* StatCard-style Summary */
.summary-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 16px;
    margin-bottom: 48px;
}

.stat-card {
    background: var(--bg-card);
    border-radius: 16px;
    padding: 20px;
    box-shadow: 0 2px 8px rgba(0,0,0,${isDark ? '0.3' : '0.06'});
    border: 1px solid var(--border-color);
    position: relative;
    overflow: hidden;
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
}

.stat-bg {
    position: absolute;
    top: 0;
    ${options.language === 'ar' ? 'left' : 'right'}: 0;
    width: 120px;
    height: 120px;
    opacity: 0.1;
    border-radius: 50%;
    transform: ${options.language === 'ar' ? 'translate(-30%, -30%)' : 'translate(30%, -30%)'};
}

.stat-icon {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    position: relative;
    z-index: 1;
}

.stat-icon svg {
    width: 24px;
    height: 24px;
}

.stat-content {
    flex: 1;
    position: relative;
    z-index: 1;
}

.stat-label {
    font-size: 12px;
    color: var(--text-muted);
    font-weight: 500;
    letter-spacing: 0.02em;
    margin-bottom: 4px;
}

.stat-value {
    font-size: 24px;
    font-weight: 700;
    font-family: 'Space Grotesk', sans-serif;
    color: var(--text-main);
    letter-spacing: -0.02em;
}

/* Table */
.table-wrapper {
    width: 100%;
    overflow-x: auto;
    margin-bottom: 20px;
}

.data-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
    min-width: 600px;
}

.data-table thead th {
    text-align: ${options.language === 'ar' ? 'right' : 'left'};
    padding: 16px 20px;
    font-family: 'Space Grotesk', sans-serif;
    font-weight: 700;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-muted);
    border-bottom: 1px solid var(--border-color);
    background-color: var(--table-header-bg);
}

.data-table tbody td {
    padding: 16px 20px;
    border-bottom: 1px solid var(--border-color);
    color: var(--text-main);
    vertical-align: middle;
    text-align: ${options.language === 'ar' ? 'right' : 'left'};
}

.data-table tbody tr:last-child td {
    border-bottom: none;
}

.status-badge {
    display: inline-flex;
    align-items: center;
    padding: 6px 10px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.02em;
    background: rgba(79, 172, 254, 0.1);
    color: var(--primary);
    line-height: 1;
}

.status-badge.warning {
     background: ${isDark ? 'rgba(251, 146, 60, 0.2)' : '#fff7ed'};
     color: ${isDark ? '#fbbf24' : '#ea580c'};
}

.status-badge.danger {
     background: ${isDark ? 'rgba(239, 68, 68, 0.2)' : '#fef2f2'};
     color: ${isDark ? '#f87171' : '#dc2626'};
}

.footer {
    margin-top: 60px;
    padding-top: 24px;
    border-top: 1px solid var(--border-color);
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    font-weight: 500;
    color: var(--text-muted);
    font-family: 'Space Grotesk', sans-serif;
}

@media print {
    body {
        background: var(--bg-card);
        padding: 0;
    }
    .report-container {
        box-shadow: none;
        max-width: 100%;
        width: 100%;
        padding: 20px;
        border-radius: 0;
    }
}
</style>
</head>
<body>
<div class="report-container">
<!-- Header -->
<div class="header">
<div>
<h1 class="report-title">${config.title}</h1>
<div style="margin-top: 8px; font-size: 14px; font-weight: 500; color: var(--text-muted);">
${options.language === 'ar' ? 'تقرير شامل للسجلات المحددة' : 'Comprehensive report of selected records'}
</div>
</div>
<div class="report-meta">
<div class="meta-item">${options.language === 'ar' ? 'رقم التقرير' : 'REPORT ID'}</div>
<div class="meta-value" style="margin-bottom: 8px;">#EXP-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000)}</div>
<div class="meta-item">${options.language === 'ar' ? 'تاريخ الإنشاء' : 'GENERATED ON'}</div>
<div class="meta-value">${dateStr}</div>
</div>
</div>

<!-- Summary -->
<div class="summary-grid">
    ${summaryHtml}
</div>

<!-- Table -->
<div class="table-wrapper">
<table class="data-table">
    <thead>
        <tr>
            ${headersHtml}
        </tr>
    </thead>
    <tbody>
        ${rowsHtml}
    </tbody>
</table>
</div>

<!-- Footer -->
<div class="footer">
    <div>GENERATED VIA OCTOPUS</div>
    <div>CONFIDENTIAL • DO NOT DISTRIBUTE</div>
</div>
</div>
<script>
  window.onload = function() { window.print(); }
</script>
</body>
</html>
      `

            const printWindow = window.open('', '_blank')
            if (printWindow) {
                printWindow.document.write(htmlContent)
                printWindow.document.close()
            }
        }
    }

    return { exportData }
}
