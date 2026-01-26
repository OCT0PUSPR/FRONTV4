// Physical Inventory Types
// Based on PRD specifications for inventory counting with RFID integration

// ============================================
// Enums and Constants
// ============================================

export const SCAN_ORDER_STATUSES = [
  'draft',
  'scheduled',
  'in_progress',
  'pending_review',
  'validated',
  'rejected',
  'cancelled',
] as const;

export type ScanOrderStatus = typeof SCAN_ORDER_STATUSES[number];

export const SCOPE_TYPES = [
  'full_warehouse',
  'locations',
  'categories',
  'mixed',
] as const;

export type ScopeType = typeof SCOPE_TYPES[number];

export const DISCREPANCY_STATUSES = [
  'none',
  'pending',
  'approved',
  'rejected',
] as const;

export type DiscrepancyStatus = typeof DISCREPANCY_STATUSES[number];

export const REASON_CATEGORIES = [
  'shortage',
  'surplus',
  'misplaced',
  'other',
] as const;

export type ReasonCategory = typeof REASON_CATEGORIES[number];

export const UPLOAD_STATUSES = [
  'processing',
  'completed',
  'failed',
] as const;

export type UploadStatus = typeof UPLOAD_STATUSES[number];

export const REVERSAL_STATUSES = [
  'pending',
  'approved',
  'rejected',
] as const;

export type ReversalStatus = typeof REVERSAL_STATUSES[number];

// Status colors for UI
export const STATUS_COLORS: Record<ScanOrderStatus, { bg: string; text: string; border: string }> = {
  draft: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' },
  scheduled: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
  in_progress: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300' },
  pending_review: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300' },
  validated: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
  rejected: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
  cancelled: { bg: 'bg-slate-100', text: 'text-slate-500', border: 'border-slate-300' },
};

// ============================================
// Core Interfaces
// ============================================

export interface ScanOrder {
  id: number;
  reference: string;
  name: string;
  status: ScanOrderStatus;

  // Scope
  scope_type: ScopeType;
  location_ids: number[] | null;
  category_ids: number[] | null;

  // Scheduling
  scheduled_date: string | null;
  recurring_rule: string | null;
  next_occurrence: string | null;

  // Configuration
  is_blind_count: boolean;
  timeout_days: number | null;

  // Assignment
  responsible_user_id: number | null;
  responsible_user_name?: string;
  assigned_counter_ids: number[] | null;
  assigned_counter_names?: string[];

  // Timestamps
  started_at: string | null;
  completed_at: string | null;
  validated_at: string | null;
  validated_by: number | null;
  validated_by_name?: string;

  // Audit
  created_by: number;
  created_by_name?: string;
  created_at: string;
  updated_at: string | null;

  // Odoo sync
  odoo_inventory_id: number | null;

  // Computed/joined fields (for list views)
  total_lines?: number;
  counted_lines?: number;
  discrepancy_count?: number;
  progress_percent?: number;
}

export interface ScanOrderLine {
  id: number;
  scan_order_id: number;

  // Product/Location reference
  product_id: number;
  product_name?: string;
  product_code?: string;
  product_barcode?: string;
  location_id: number;
  location_name?: string;
  lot_id: number | null;
  lot_name?: string;

  // Quantities
  expected_qty: number;
  counted_qty: number | null;
  difference: number;

  // Status
  is_counted: boolean;
  is_missing: boolean;
  is_misplaced: boolean;
  found_location_id: number | null;
  found_location_name?: string;

  // Discrepancy handling
  discrepancy_status: DiscrepancyStatus;
  reason_code_id: number | null;
  reason_code_name?: string;
  discrepancy_notes: string | null;
  reviewed_by: number | null;
  reviewed_by_name?: string;
  reviewed_at: string | null;

  // Audit
  last_scanned_at: string | null;
  scanned_by: number | null;
  scanned_by_name?: string;
}

export interface ScanUpload {
  id: number;
  scan_order_id: number;

  // Upload metadata
  upload_reference: string | null;
  device_id: string | null;
  uploaded_by: number;
  uploaded_by_name?: string;
  uploaded_at: string;

  // Statistics
  total_scans: number;
  matched_scans: number;
  unknown_scans: number;

  // Status
  status: UploadStatus;
  error_message: string | null;
}

export interface ScanRecord {
  id: number;
  upload_id: number;

  // Scan data
  rfid_tag_id: string;
  location_barcode: string | null;
  scanned_location_id: number | null;
  scanned_at: string;
  device_id: string | null;
  signal_strength: number | null;

  // Matching result
  is_matched: boolean;
  matched_product_id: number | null;
  matched_lot_id: number | null;
  matched_line_id: number | null;
}

export interface UnknownTag {
  id: number;
  scan_order_id: number;
  upload_id: number;

  rfid_tag_id: string;
  scanned_location_id: number | null;
  scanned_location_name?: string;
  scanned_at: string | null;
  device_id: string | null;

  // Resolution
  is_resolved: boolean;
  resolution_notes: string | null;
  resolved_by: number | null;
  resolved_by_name?: string;
  resolved_at: string | null;
}

export interface ReasonCode {
  id: number;
  code: string;
  name: string;
  description: string | null;
  is_system: boolean;
  is_active: boolean;
  category: ReasonCategory;
  created_at: string;
}

export interface InventoryAuditLog {
  id: number;
  entity_type: 'scan_order' | 'scan_line' | 'discrepancy' | 'reversal';
  entity_id: number;
  action: 'created' | 'updated' | 'validated' | 'rejected' | 'reversed' | 'synced';
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  performed_by: number;
  performed_by_name?: string;
  performed_at: string;
  reason: string | null;
  ip_address: string | null;
  user_agent: string | null;
}

export interface AdjustmentReversal {
  id: number;
  scan_order_id: number;

  // Approval workflow
  requested_by: number;
  requested_by_name?: string;
  requested_at: string;
  reason: string;

  approved_by: number | null;
  approved_by_name?: string;
  approved_at: string | null;

  status: ReversalStatus;
  rejection_reason: string | null;

  // Odoo sync
  reversal_move_ids: number[] | null;
}

// ============================================
// API Request/Response Types
// ============================================

export interface CreateScanOrderRequest {
  name: string;
  scope_type: ScopeType;
  location_ids?: number[];
  category_ids?: number[];
  scheduled_date?: string;
  recurring_rule?: string;
  is_blind_count?: boolean;
  timeout_days?: number;
  responsible_user_id?: number;
  assigned_counter_ids?: number[];
}

export interface UpdateScanOrderRequest {
  name?: string;
  scope_type?: ScopeType;
  location_ids?: number[];
  category_ids?: number[];
  scheduled_date?: string;
  recurring_rule?: string;
  is_blind_count?: boolean;
  timeout_days?: number;
  responsible_user_id?: number;
  assigned_counter_ids?: number[];
}

export interface RFIDScan {
  rfid_tag_id: string;
  location_barcode: string;
  scanned_at: string;
  device_id?: string;
  signal_strength?: number;
}

export interface BarcodeScan {
  scan_type: 'barcode';
  barcode: string;
  location_barcode: string;
  scanned_at: string;
  quantity: number;
}

export interface ScanUploadRequest {
  scan_order_id: number;
  scans: (RFIDScan | BarcodeScan)[];
  is_final_batch: boolean;
}

export interface ScanUploadResponse {
  success: boolean;
  upload_id?: number;
  summary?: {
    total_scans: number;
    matched: number;
    unknown: number;
    misplaced: number;
  };
  unknown_tags?: string[];
  errors?: string[];
}

export interface ChunkedUploadInitResponse {
  success: boolean;
  upload_session_id?: string;
  error?: string;
}

export interface ChunkedUploadChunkResponse {
  success: boolean;
  chunk_number?: number;
  scans_processed?: number;
  error?: string;
}

export interface ChunkedUploadCompleteResponse {
  success: boolean;
  upload_id?: number;
  summary?: {
    total_scans: number;
    matched: number;
    unknown: number;
    misplaced: number;
  };
  error?: string;
}

export interface ApproveDiscrepancyRequest {
  line_id: number;
  reason_code_id: number;
  notes?: string;
}

export interface RejectDiscrepancyRequest {
  line_id: number;
  rejection_reason: string;
}

export interface BulkDiscrepancyRequest {
  line_ids: number[];
  action: 'approve' | 'reject';
  reason_code_id?: number;
  notes?: string;
  rejection_reason?: string;
}

export interface ValidateOrderRequest {
  order_id: number;
  notes?: string;
}

export interface RejectOrderRequest {
  order_id: number;
  reason: string;
}

export interface RequestReversalRequest {
  order_id: number;
  reason: string;
}

export interface ApproveReversalRequest {
  reversal_id: number;
}

export interface RejectReversalRequest {
  reversal_id: number;
  reason: string;
}

// ============================================
// Dashboard/Statistics Types
// ============================================

export interface DashboardStats {
  active_orders: number;
  pending_validation: number;
  scheduled_upcoming: number;
  total_adjustments_month: number;
  accuracy_trend: AccuracyTrendPoint[];
  discrepancies_by_reason: DiscrepancyByReason[];
  adjustments_by_location: AdjustmentByLocation[];
}

export interface AccuracyTrendPoint {
  date: string;
  accuracy_percent: number;
}

export interface DiscrepancyByReason {
  reason_code: string;
  reason_name: string;
  count: number;
  percentage: number;
}

export interface AdjustmentByLocation {
  location_name: string;
  shortage_count: number;
  surplus_count: number;
  total_value: number;
}

// ============================================
// Filter/Query Types
// ============================================

export interface ScanOrderFilters {
  status?: ScanOrderStatus[];
  date_from?: string;
  date_to?: string;
  location_ids?: number[];
  responsible_user_id?: number;
  created_by?: number;
  search?: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

// ============================================
// Location/Product Reference Types
// ============================================

export interface LocationOption {
  id: number;
  name: string;
  complete_name?: string;
  barcode?: string;
  usage?: string;
  parent_id: number | null;
  child_ids?: number[];
  warehouse_id?: number;
}

export interface CategoryOption {
  id: number;
  name: string;
  complete_name: string;
  parent_id: number | null;
}

export interface UserOption {
  id: number;
  name: string;
  email?: string;
  role?: string;
  avatar_url?: string;
}

// ============================================
// Movement History Types
// ============================================

export interface StockMovement {
  id: number;
  reference: string;
  date: string;
  product_id: number;
  product_name: string;
  quantity: number;
  location_from_id: number;
  location_from_name: string;
  location_to_id: number;
  location_to_name: string;
  lot_id: number | null;
  lot_name: string | null;
  state: string;
  origin: string | null;
}

// ============================================
// Report Types
// ============================================

export interface CountSummaryReport {
  order: ScanOrder;
  lines: ScanOrderLine[];
  uploads: ScanUpload[];
  unknown_tags: UnknownTag[];
  audit_logs: InventoryAuditLog[];
}

export interface AccuracyReport {
  period_start: string;
  period_end: string;
  overall_accuracy: number;
  by_location: {
    location_id: number;
    location_name: string;
    accuracy_percent: number;
    total_counted: number;
    discrepancies: number;
  }[];
  by_category: {
    category_id: number;
    category_name: string;
    accuracy_percent: number;
    total_counted: number;
    discrepancies: number;
  }[];
}

export interface AdjustmentReport {
  period_start: string;
  period_end: string;
  total_adjustments: number;
  shortage_total: number;
  surplus_total: number;
  adjustments: {
    date: string;
    order_reference: string;
    product_name: string;
    location_name: string;
    adjustment_type: 'shortage' | 'surplus';
    quantity: number;
    reason_code: string;
    validated_by: string;
  }[];
}
