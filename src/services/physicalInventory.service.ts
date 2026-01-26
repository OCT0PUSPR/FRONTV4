/**
 * Physical Inventory API Service
 * Handles communication with the physical inventory management API
 */

import { API_CONFIG, getTenantHeaders } from '../config/api';
import type {
  ScanOrder,
  ScanOrderLine,
  ScanUpload,
  UnknownTag,
  ReasonCode,
  InventoryAuditLog,
  AdjustmentReversal,
  DashboardStats,
  CreateScanOrderRequest,
  UpdateScanOrderRequest,
  ScanUploadRequest,
  ScanUploadResponse,
  ChunkedUploadInitResponse,
  ChunkedUploadChunkResponse,
  ChunkedUploadCompleteResponse,
  ApproveDiscrepancyRequest,
  RejectDiscrepancyRequest,
  BulkDiscrepancyRequest,
  ValidateOrderRequest,
  RejectOrderRequest,
  RequestReversalRequest,
  ApproveReversalRequest,
  RejectReversalRequest,
  ScanOrderFilters,
  PaginationParams,
  PaginatedResponse,
  LocationOption,
  CategoryOption,
  UserOption,
  StockMovement,
  RFIDScan,
  ScanOrderStatus,
} from '../pages/WarehouseNavigator/physical-inventory/types';

const INVENTORY_BASE_URL = `${API_CONFIG.BACKEND_BASE_URL}/physical-inventory`;

/**
 * Physical Inventory API Service
 */
export class PhysicalInventoryService {
  /**
   * Get session ID from localStorage
   */
  private static getSessionId(): string | null {
    return localStorage.getItem('sessionId');
  }

  /**
   * Get headers for API requests (includes tenant headers and session ID)
   */
  private static getHeaders(): HeadersInit {
    const sessionId = this.getSessionId();
    return {
      ...getTenantHeaders(),
      ...(sessionId ? { 'X-Odoo-Session': sessionId } : {}),
    };
  }

  // ============================================
  // Dashboard
  // ============================================

  /**
   * Get dashboard statistics
   * Returns mock data if backend is not available (404)
   */
  static async getDashboardStats(): Promise<DashboardStats | null> {
    try {
      const response = await fetch(`${INVENTORY_BASE_URL}/dashboard`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch dashboard stats`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch dashboard stats');
      }

      return data.stats;
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      // Return empty stats on error so dashboard still renders
      return {
        active_orders: 0,
        pending_validation: 0,
        scheduled_upcoming: 0,
        total_adjustments_month: 0,
        discrepancies_by_reason: [],
        accuracy_trend: [],
        adjustments_by_location: [],
      };
    }
  }

  // ============================================
  // Scan Orders (Count Orders)
  // ============================================

  /**
   * List scan orders with filters and pagination
   */
  static async listOrders(
    filters?: ScanOrderFilters,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<ScanOrder>> {
    try {
      const params = new URLSearchParams();

      if (filters) {
        if (filters.status?.length) {
          params.append('status', filters.status.join(','));
        }
        if (filters.date_from) params.append('date_from', filters.date_from);
        if (filters.date_to) params.append('date_to', filters.date_to);
        if (filters.location_ids?.length) {
          params.append('location_ids', filters.location_ids.join(','));
        }
        if (filters.responsible_user_id) {
          params.append('responsible_user_id', String(filters.responsible_user_id));
        }
        if (filters.created_by) {
          params.append('created_by', String(filters.created_by));
        }
        if (filters.search) params.append('search', filters.search);
      }

      if (pagination) {
        params.append('page', String(pagination.page));
        params.append('limit', String(pagination.limit));
        if (pagination.sort_by) params.append('sort_by', pagination.sort_by);
        if (pagination.sort_order) params.append('sort_order', pagination.sort_order);
      }

      const response = await fetch(
        `${INVENTORY_BASE_URL}/orders?${params.toString()}`,
        {
          method: 'GET',
          headers: this.getHeaders(),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch orders`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error listing orders:', error);
      return {
        success: true,
        data: [],
        pagination: { page: 1, limit: 20, total: 0, total_pages: 0 },
      };
    }
  }

  /**
   * Get available orders for a counter (assigned and in valid status)
   */
  static async getAvailableOrders(): Promise<ScanOrder[]> {
    try {
      const response = await fetch(`${INVENTORY_BASE_URL}/orders/available`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch available orders');
      }

      return data.orders || [];
    } catch (error) {
      console.error('Error fetching available orders:', error);
      return [];
    }
  }

  /**
   * Get a single scan order by ID
   */
  static async getOrder(orderId: number): Promise<ScanOrder | null> {
    try {
      const response = await fetch(`${INVENTORY_BASE_URL}/orders/${orderId}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch order');
      }

      return data.order;
    } catch (error) {
      console.error('Error fetching order:', error);
      return null;
    }
  }

  /**
   * Create a new scan order
   */
  static async createOrder(request: CreateScanOrderRequest): Promise<{ success: boolean; order?: ScanOrder; error?: string }> {
    try {
      const response = await fetch(`${INVENTORY_BASE_URL}/orders`, {
        method: 'POST',
        headers: { ...this.getHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error creating order:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Update an existing scan order
   */
  static async updateOrder(
    orderId: number,
    request: UpdateScanOrderRequest
  ): Promise<{ success: boolean; order?: ScanOrder; error?: string }> {
    try {
      const response = await fetch(`${INVENTORY_BASE_URL}/orders/${orderId}`, {
        method: 'PUT',
        headers: { ...this.getHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error updating order:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Update order status
   */
  static async updateOrderStatus(
    orderId: number,
    status: ScanOrderStatus,
    notes?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${INVENTORY_BASE_URL}/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { ...this.getHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, notes }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error updating order status:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Start a count order (change to in_progress)
   */
  static async startOrder(orderId: number): Promise<{ success: boolean; error?: string }> {
    return this.updateOrderStatus(orderId, 'in_progress');
  }

  /**
   * Complete counting (move to pending_review)
   */
  static async completeOrder(orderId: number): Promise<{ success: boolean; error?: string }> {
    return this.updateOrderStatus(orderId, 'pending_review');
  }

  /**
   * Cancel a count order
   */
  static async cancelOrder(orderId: number, reason?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${INVENTORY_BASE_URL}/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: { ...this.getHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error cancelling order:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Delete a draft order
   */
  static async deleteOrder(orderId: number): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${INVENTORY_BASE_URL}/orders/${orderId}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error deleting order:', error);
      return { success: false, error: String(error) };
    }
  }

  // ============================================
  // Order Lines
  // ============================================

  /**
   * Get lines for a scan order
   */
  static async getOrderLines(
    orderId: number,
    filters?: {
      discrepancy_only?: boolean;
      is_counted?: boolean;
      search?: string;
    },
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<ScanOrderLine>> {
    try {
      const params = new URLSearchParams();
      params.append('order_id', String(orderId));

      if (filters) {
        if (filters.discrepancy_only !== undefined) {
          params.append('discrepancy_only', String(filters.discrepancy_only));
        }
        if (filters.is_counted !== undefined) {
          params.append('is_counted', String(filters.is_counted));
        }
        if (filters.search) params.append('search', filters.search);
      }

      if (pagination) {
        params.append('page', String(pagination.page));
        params.append('limit', String(pagination.limit));
        if (pagination.sort_by) params.append('sort_by', pagination.sort_by);
        if (pagination.sort_order) params.append('sort_order', pagination.sort_order);
      }

      const response = await fetch(
        `${INVENTORY_BASE_URL}/orders/${orderId}/lines?${params.toString()}`,
        {
          method: 'GET',
          headers: this.getHeaders(),
        }
      );

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching order lines:', error);
      return {
        success: false,
        data: [],
        pagination: { page: 1, limit: 50, total: 0, total_pages: 0 },
      };
    }
  }

  /**
   * Update manual count for a line
   */
  static async updateLineCount(
    lineId: number,
    counted_qty: number
  ): Promise<{ success: boolean; line?: ScanOrderLine; error?: string }> {
    try {
      const response = await fetch(`${INVENTORY_BASE_URL}/lines/${lineId}/count`, {
        method: 'PUT',
        headers: { ...this.getHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ counted_qty }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error updating line count:', error);
      return { success: false, error: String(error) };
    }
  }

  // ============================================
  // RFID Scan Upload
  // ============================================

  /**
   * Upload a batch of RFID scans
   */
  static async uploadScans(request: ScanUploadRequest): Promise<ScanUploadResponse> {
    try {
      const response = await fetch(`${INVENTORY_BASE_URL}/scans/upload`, {
        method: 'POST',
        headers: {
          ...this.getHeaders(),
          'Content-Type': 'application/json',
          'X-Odoo-Session': this.getSessionId() || '',
        },
        body: JSON.stringify(request),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error uploading scans:', error);
      return { success: false, errors: [String(error)] };
    }
  }

  /**
   * Initialize chunked upload for large batches
   */
  static async initChunkedUpload(
    orderId: number,
    totalScans: number
  ): Promise<ChunkedUploadInitResponse> {
    try {
      const response = await fetch(`${INVENTORY_BASE_URL}/scans/upload/init`, {
        method: 'POST',
        headers: {
          ...this.getHeaders(),
          'Content-Type': 'application/json',
          'X-Odoo-Session': this.getSessionId() || '',
        },
        body: JSON.stringify({ scan_order_id: orderId, total_scans: totalScans }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error initializing chunked upload:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Upload a chunk of scans
   */
  static async uploadChunk(
    uploadSessionId: string,
    chunkNumber: number,
    scans: RFIDScan[]
  ): Promise<ChunkedUploadChunkResponse> {
    try {
      const response = await fetch(
        `${INVENTORY_BASE_URL}/scans/upload/${uploadSessionId}/chunk`,
        {
          method: 'POST',
          headers: {
            ...this.getHeaders(),
            'Content-Type': 'application/json',
            'X-Odoo-Session': this.getSessionId() || '',
          },
          body: JSON.stringify({ chunk_number: chunkNumber, scans }),
        }
      );

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error uploading chunk:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Complete chunked upload
   */
  static async completeChunkedUpload(
    uploadSessionId: string
  ): Promise<ChunkedUploadCompleteResponse> {
    try {
      const response = await fetch(
        `${INVENTORY_BASE_URL}/scans/upload/${uploadSessionId}/complete`,
        {
          method: 'POST',
          headers: {
            ...this.getHeaders(),
            'Content-Type': 'application/json',
            'X-Odoo-Session': this.getSessionId() || '',
          },
        }
      );

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error completing chunked upload:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Get upload history for an order
   */
  static async getUploadHistory(orderId: number): Promise<ScanUpload[]> {
    try {
      const response = await fetch(
        `${INVENTORY_BASE_URL}/orders/${orderId}/uploads`,
        {
          method: 'GET',
          headers: this.getHeaders(),
        }
      );

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch upload history');
      }

      return data.uploads || [];
    } catch (error) {
      console.error('Error fetching upload history:', error);
      return [];
    }
  }

  // ============================================
  // Unknown Tags
  // ============================================

  /**
   * Get unknown tags for an order
   */
  static async getUnknownTags(orderId: number): Promise<UnknownTag[]> {
    try {
      const response = await fetch(
        `${INVENTORY_BASE_URL}/orders/${orderId}/unknown-tags`,
        {
          method: 'GET',
          headers: this.getHeaders(),
        }
      );

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch unknown tags');
      }

      return data.tags || [];
    } catch (error) {
      console.error('Error fetching unknown tags:', error);
      return [];
    }
  }

  /**
   * Resolve an unknown tag
   */
  static async resolveUnknownTag(
    tagId: number,
    notes: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(
        `${INVENTORY_BASE_URL}/unknown-tags/${tagId}/resolve`,
        {
          method: 'POST',
          headers: { ...this.getHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ notes }),
        }
      );

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error resolving unknown tag:', error);
      return { success: false, error: String(error) };
    }
  }

  // ============================================
  // Discrepancy Management
  // ============================================

  /**
   * Approve a discrepancy
   */
  static async approveDiscrepancy(
    request: ApproveDiscrepancyRequest
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(
        `${INVENTORY_BASE_URL}/lines/${request.line_id}/approve`,
        {
          method: 'POST',
          headers: { ...this.getHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reason_code_id: request.reason_code_id,
            notes: request.notes,
          }),
        }
      );

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error approving discrepancy:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Reject a discrepancy
   */
  static async rejectDiscrepancy(
    request: RejectDiscrepancyRequest
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(
        `${INVENTORY_BASE_URL}/lines/${request.line_id}/reject`,
        {
          method: 'POST',
          headers: { ...this.getHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ rejection_reason: request.rejection_reason }),
        }
      );

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error rejecting discrepancy:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Bulk approve/reject discrepancies
   */
  static async bulkDiscrepancyAction(
    request: BulkDiscrepancyRequest
  ): Promise<{ success: boolean; processed: number; errors?: string[] }> {
    try {
      const response = await fetch(`${INVENTORY_BASE_URL}/lines/bulk-action`, {
        method: 'POST',
        headers: { ...this.getHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error bulk action:', error);
      return { success: false, processed: 0, errors: [String(error)] };
    }
  }

  // ============================================
  // Validation & Sync
  // ============================================

  /**
   * Validate a count order (apply adjustments to Odoo)
   */
  static async validateOrder(
    request: ValidateOrderRequest
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(
        `${INVENTORY_BASE_URL}/orders/${request.order_id}/validate`,
        {
          method: 'POST',
          headers: { ...this.getHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ notes: request.notes }),
        }
      );

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error validating order:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Reject a count order
   */
  static async rejectOrder(
    request: RejectOrderRequest
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(
        `${INVENTORY_BASE_URL}/orders/${request.order_id}/reject`,
        {
          method: 'POST',
          headers: { ...this.getHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: request.reason }),
        }
      );

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error rejecting order:', error);
      return { success: false, error: String(error) };
    }
  }

  // ============================================
  // Reversals
  // ============================================

  /**
   * Request a reversal for a validated order
   */
  static async requestReversal(
    request: RequestReversalRequest
  ): Promise<{ success: boolean; reversal?: AdjustmentReversal; error?: string }> {
    try {
      const response = await fetch(
        `${INVENTORY_BASE_URL}/orders/${request.order_id}/reversal`,
        {
          method: 'POST',
          headers: { ...this.getHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: request.reason }),
        }
      );

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error requesting reversal:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Approve a reversal request
   */
  static async approveReversal(
    request: ApproveReversalRequest
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(
        `${INVENTORY_BASE_URL}/reversals/${request.reversal_id}/approve`,
        {
          method: 'POST',
          headers: this.getHeaders(),
        }
      );

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error approving reversal:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Reject a reversal request
   */
  static async rejectReversal(
    request: RejectReversalRequest
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(
        `${INVENTORY_BASE_URL}/reversals/${request.reversal_id}/reject`,
        {
          method: 'POST',
          headers: { ...this.getHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: request.reason }),
        }
      );

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error rejecting reversal:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Get pending reversals
   */
  static async getPendingReversals(): Promise<AdjustmentReversal[]> {
    try {
      const response = await fetch(`${INVENTORY_BASE_URL}/reversals/pending`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch pending reversals');
      }

      return data.reversals || [];
    } catch (error) {
      console.error('Error fetching pending reversals:', error);
      return [];
    }
  }

  // ============================================
  // Reason Codes
  // ============================================

  /**
   * Get all reason codes
   */
  static async getReasonCodes(activeOnly: boolean = true): Promise<ReasonCode[]> {
    try {
      const params = new URLSearchParams();
      if (activeOnly) params.append('active_only', 'true');

      const response = await fetch(
        `${INVENTORY_BASE_URL}/reason-codes?${params.toString()}`,
        {
          method: 'GET',
          headers: this.getHeaders(),
        }
      );

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch reason codes');
      }

      return data.reason_codes || [];
    } catch (error) {
      console.error('Error fetching reason codes:', error);
      return [];
    }
  }

  /**
   * Create a custom reason code
   */
  static async createReasonCode(
    code: string,
    name: string,
    category: string,
    description?: string
  ): Promise<{ success: boolean; reason_code?: ReasonCode; error?: string }> {
    try {
      const response = await fetch(`${INVENTORY_BASE_URL}/reason-codes`, {
        method: 'POST',
        headers: { ...this.getHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, name, category, description }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error creating reason code:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Update a reason code
   */
  static async updateReasonCode(
    id: number,
    updates: Partial<Pick<ReasonCode, 'name' | 'description' | 'is_active'>>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${INVENTORY_BASE_URL}/reason-codes/${id}`, {
        method: 'PUT',
        headers: { ...this.getHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error updating reason code:', error);
      return { success: false, error: String(error) };
    }
  }

  // ============================================
  // Audit Log
  // ============================================

  /**
   * Get audit log for an order
   */
  static async getAuditLog(orderId: number): Promise<InventoryAuditLog[]> {
    try {
      const response = await fetch(
        `${INVENTORY_BASE_URL}/orders/${orderId}/audit-log`,
        {
          method: 'GET',
          headers: this.getHeaders(),
        }
      );

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch audit log');
      }

      return data.logs || [];
    } catch (error) {
      console.error('Error fetching audit log:', error);
      return [];
    }
  }

  // ============================================
  // Reference Data
  // ============================================

  /**
   * Get location options for scope selection
   * Uses the main locations API which fetches from Odoo stock.location
   */
  static async getLocations(warehouseId?: number): Promise<LocationOption[]> {
    try {
      const sessionId = this.getSessionId();
      if (!sessionId) {
        console.error('No session ID found');
        return [];
      }

      const response = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/locations`, {
        method: 'POST',
        headers: {
          ...this.getHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId }),
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch locations');
      }

      // Map Odoo location data to LocationOption format
      // Filter to internal locations only (used for inventory counts)
      const locations: LocationOption[] = (data.locations || [])
        .filter((loc: any) => loc.usage === 'internal')
        .map((loc: any) => ({
          id: typeof loc.id === 'number' ? loc.id : (Array.isArray(loc.id) ? loc.id[0] : loc.id),
          name: loc.complete_name || loc.display_name || loc.name,
          barcode: loc.barcode,
          parent_id: loc.location_id ? (Array.isArray(loc.location_id) ? loc.location_id[0] : loc.location_id) : null,
          warehouse_id: loc.warehouse_id ? (Array.isArray(loc.warehouse_id) ? loc.warehouse_id[0] : loc.warehouse_id) : undefined,
        }));

      // Filter by warehouse if specified
      if (warehouseId) {
        return locations.filter(loc => loc.warehouse_id === warehouseId);
      }

      return locations;
    } catch (error) {
      console.error('Error fetching locations:', error);
      return [];
    }
  }

  /**
   * Get location barcodes for RFID device
   */
  static async getLocationBarcodes(orderId: number): Promise<{ id: number; barcode: string; name: string }[]> {
    try {
      const response = await fetch(
        `${INVENTORY_BASE_URL}/locations?order_id=${orderId}`,
        {
          method: 'GET',
          headers: this.getHeaders(),
        }
      );

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch location barcodes');
      }

      return data.locations || [];
    } catch (error) {
      console.error('Error fetching location barcodes:', error);
      return [];
    }
  }

  /**
   * Get category options for scope selection
   * Uses the main categories API which fetches from Odoo product.category
   */
  static async getCategories(): Promise<CategoryOption[]> {
    try {
      const sessionId = this.getSessionId();
      if (!sessionId) {
        console.error('No session ID found');
        return [];
      }

      const response = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/categories`, {
        method: 'POST',
        headers: {
          ...this.getHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId }),
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch categories');
      }

      // Map Odoo category data to CategoryOption format
      const categories: CategoryOption[] = (data.categories || []).map((cat: any) => ({
        id: typeof cat.id === 'number' ? cat.id : (Array.isArray(cat.id) ? cat.id[0] : cat.id),
        name: cat.name,
        complete_name: cat.complete_name || cat.display_name || cat.name,
        parent_id: cat.parent_id ? (Array.isArray(cat.parent_id) ? cat.parent_id[0] : cat.parent_id) : null,
      }));

      return categories;
    } catch (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
  }

  /**
   * Get user options for assignment
   * Uses the ABAC users endpoint which returns Odoo users
   */
  static async getUsers(): Promise<UserOption[]> {
    try {
      // Use the ABAC users endpoint which fetches from Odoo res_users
      const response = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/v1/abac/users`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch users');
      }

      // Map ABAC user data to UserOption format
      const users: UserOption[] = (data.data || []).map((user: any) => ({
        id: user.id,
        name: user.name || user.login || `User ${user.id}`,
        email: user.email || user.login,
        avatar_url: user.avatar_url,
      }));

      return users;
    } catch (error) {
      console.error('Error fetching users:', error);
      return [];
    }
  }

  // ============================================
  // Movement History
  // ============================================

  /**
   * Get movement history for a product/location
   */
  static async getMovementHistory(
    productId: number,
    locationId: number,
    limit: number = 20
  ): Promise<StockMovement[]> {
    try {
      const params = new URLSearchParams({
        product_id: String(productId),
        location_id: String(locationId),
        limit: String(limit),
      });

      const response = await fetch(
        `${INVENTORY_BASE_URL}/movements?${params.toString()}`,
        {
          method: 'GET',
          headers: this.getHeaders(),
        }
      );

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch movement history');
      }

      return data.movements || [];
    } catch (error) {
      console.error('Error fetching movement history:', error);
      return [];
    }
  }

  // ============================================
  // Reports & Exports
  // ============================================

  /**
   * Export order to PDF
   */
  static async exportOrderPDF(orderId: number): Promise<Blob | null> {
    try {
      const response = await fetch(
        `${INVENTORY_BASE_URL}/orders/${orderId}/export/pdf`,
        {
          method: 'GET',
          headers: this.getHeaders(),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to export PDF');
      }

      return await response.blob();
    } catch (error) {
      console.error('Error exporting PDF:', error);
      return null;
    }
  }

  /**
   * Export order to Excel
   */
  static async exportOrderExcel(orderId: number): Promise<Blob | null> {
    try {
      const response = await fetch(
        `${INVENTORY_BASE_URL}/orders/${orderId}/export/excel`,
        {
          method: 'GET',
          headers: this.getHeaders(),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to export Excel');
      }

      return await response.blob();
    } catch (error) {
      console.error('Error exporting Excel:', error);
      return null;
    }
  }

  /**
   * Generate accuracy report
   */
  static async getAccuracyReport(
    dateFrom: string,
    dateTo: string,
    locationIds?: number[]
  ): Promise<any> {
    try {
      const params = new URLSearchParams({
        date_from: dateFrom,
        date_to: dateTo,
      });
      if (locationIds?.length) {
        params.append('location_ids', locationIds.join(','));
      }

      const response = await fetch(
        `${INVENTORY_BASE_URL}/reports/accuracy?${params.toString()}`,
        {
          method: 'GET',
          headers: this.getHeaders(),
        }
      );

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching accuracy report:', error);
      return { success: false, error: String(error) };
    }
  }
}

export default PhysicalInventoryService;
