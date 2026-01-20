/**
 * Custom Reports API Service
 * Handles communication with the custom warehouse reports API
 */

import { API_CONFIG, getTenantHeaders } from '../config/api';

const REPORTS_BASE_URL = `${API_CONFIG.BACKEND_BASE_URL}/reports`;

// Types
export interface CustomReportConfig {
  id: number;
  report_key: string;
  report_name: string;
  description: string | null;
  report_category: 'single_record' | 'list_report';
  odoo_model: string;
  picking_type_filter: string | null;
  available_filters: Record<string, FilterConfig> | null;
  page_size: 'A4' | 'A5' | 'Letter' | 'Legal';
  page_orientation: 'portrait' | 'landscape';
  is_active: boolean;
}

export interface FilterConfig {
  type: 'date' | 'selection';
  label: string;
  required?: boolean;
  model?: string;
  options?: { value: string; label: string }[];
}

export interface PickingRecord {
  id: number;
  name: string;
  scheduled_date: string;
  state: string;
  origin: string | null;
  picking_type_name: string;
  picking_type_code: string;
  partner_name: string | null;
}

export interface ProductRecord {
  id: number;
  name: string;
  default_code: string | null;
  barcode: string | null;
  category_name: string | null;
  qty_available: number;
}

export interface LocationOption {
  id: number;
  name: string;
  complete_name: string;
  usage: string;
}

export interface CategoryOption {
  id: number;
  name: string;
  complete_name: string;
}

export interface GenerateReportParams {
  report_key: string;
  record_id?: number;
  filters?: Record<string, any>;
  return_base64?: boolean;
}

export interface GenerateReportResponse {
  success: boolean;
  reportUuid?: string;
  pdfBase64?: string;
  pdfSize?: number;
  generationTime?: number;
  filename?: string;
  error?: string;
}

/**
 * Custom Reports API Service
 */
export class CustomReportsService {
  /**
   * Get headers for API requests
   */
  private static getHeaders(): HeadersInit {
    return getTenantHeaders();
  }

  /**
   * List all available custom reports
   */
  static async listReports(): Promise<CustomReportConfig[]> {
    try {
      const response = await fetch(`${REPORTS_BASE_URL}/custom-reports`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch reports');
      }

      return data.reports || [];
    } catch (error) {
      console.error('Error listing custom reports:', error);
      return [];
    }
  }

  /**
   * Get a specific report configuration
   */
  static async getReportConfig(reportKey: string): Promise<CustomReportConfig | null> {
    try {
      const response = await fetch(`${REPORTS_BASE_URL}/custom-reports/${reportKey}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch report config');
      }

      return data.report || null;
    } catch (error) {
      console.error('Error getting report config:', error);
      return null;
    }
  }

  /**
   * Get records for single-record report selection
   */
  static async getRecordsForSelection(
    reportKey: string,
    model: string,
    pickingTypeFilter?: string | null,
    limit: number = 100
  ): Promise<(PickingRecord | ProductRecord)[]> {
    try {
      const params = new URLSearchParams({
        report_key: reportKey,
        model,
        limit: String(limit),
      });

      if (pickingTypeFilter) {
        params.append('picking_type_filter', pickingTypeFilter);
      }

      const response = await fetch(
        `${REPORTS_BASE_URL}/custom-reports/records?${params.toString()}`,
        {
          method: 'GET',
          headers: this.getHeaders(),
        }
      );

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch records');
      }

      return data.records || [];
    } catch (error) {
      console.error('Error fetching records for selection:', error);
      return [];
    }
  }

  /**
   * Get filter options (locations, categories, etc.)
   */
  static async getFilterOptions(
    filterType: string
  ): Promise<(LocationOption | CategoryOption)[]> {
    try {
      const response = await fetch(
        `${REPORTS_BASE_URL}/custom-reports/filter-options?filter_type=${filterType}`,
        {
          method: 'GET',
          headers: this.getHeaders(),
        }
      );

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch filter options');
      }

      return data.options || [];
    } catch (error) {
      console.error('Error fetching filter options:', error);
      return [];
    }
  }

  /**
   * Preview report HTML
   */
  static async previewReport(params: GenerateReportParams): Promise<string> {
    try {
      const response = await fetch(`${REPORTS_BASE_URL}/custom-reports/preview`, {
        method: 'POST',
        headers: { ...this.getHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to preview report');
      }

      return data.html || '';
    } catch (error) {
      console.error('Error previewing report:', error);
      throw error;
    }
  }

  /**
   * Generate report PDF and return as base64
   */
  static async generateReport(params: GenerateReportParams): Promise<GenerateReportResponse> {
    try {
      const response = await fetch(`${REPORTS_BASE_URL}/custom-reports/generate`, {
        method: 'POST',
        headers: { ...this.getHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...params, return_base64: true }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error generating report:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Generate and download report PDF directly
   */
  static async downloadReport(params: GenerateReportParams): Promise<void> {
    try {
      const response = await fetch(`${REPORTS_BASE_URL}/custom-reports/generate`, {
        method: 'POST',
        headers: { ...this.getHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...params, return_base64: false }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate report');
      }

      // Get the PDF blob
      const blob = await response.blob();

      // Get filename from Content-Disposition header or generate one
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `${params.report_key}_${Date.now()}.pdf`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading report:', error);
      throw error;
    }
  }

  /**
   * Open report PDF in new tab
   */
  static async openReportInNewTab(params: GenerateReportParams): Promise<void> {
    try {
      const result = await this.generateReport(params);

      if (!result.success || !result.pdfBase64) {
        throw new Error(result.error || 'Failed to generate report');
      }

      // Convert base64 to blob
      const byteCharacters = atob(result.pdfBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });

      // Open in new tab
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');

      // Clean up after a delay
      setTimeout(() => window.URL.revokeObjectURL(url), 60000);
    } catch (error) {
      console.error('Error opening report in new tab:', error);
      throw error;
    }
  }
}

export default CustomReportsService;
