/**
 * Fleet Management API Service
 * Handles all API calls for fleet management
 */

import { Vehicle, Order, Item, ApiResponse, normalizeVehicle, normalizeOrder } from './types';

const API_BASE = '/api/v1/fleet';

// Helper to handle API responses
async function handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'API request failed');
  }
  return data;
}

// ============================================================
// VEHICLE API
// ============================================================

export async function fetchVehicles(filters?: {
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<Vehicle[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.append('status', filters.status);
  if (filters?.search) params.append('search', filters.search);
  if (filters?.limit) params.append('limit', String(filters.limit));
  if (filters?.offset) params.append('offset', String(filters.offset));

  const url = `${API_BASE}/vehicles${params.toString() ? '?' + params.toString() : ''}`;
  const response = await fetch(url);
  const result = await handleResponse<Vehicle[]>(response);
  
  return (result.data || []).map(normalizeVehicle);
}

export async function fetchVehicleById(id: string | number): Promise<Vehicle | null> {
  const response = await fetch(`${API_BASE}/vehicles/${id}`);
  if (response.status === 404) return null;
  
  const result = await handleResponse<Vehicle>(response);
  return result.data ? normalizeVehicle(result.data) : null;
}

export async function createVehicle(vehicleData: {
  name: string;
  plate: string;
  model: string;
  capacity_kg: number;
  location?: string;
  image_base64?: string;
  image_url?: string;
  vehicle_id?: string;
}): Promise<Vehicle> {
  const response = await fetch(`${API_BASE}/vehicles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(vehicleData)
  });
  
  const result = await handleResponse<Vehicle>(response);
  return normalizeVehicle(result.data!);
}

export async function updateVehicle(
  id: string | number,
  vehicleData: Partial<Vehicle>
): Promise<Vehicle> {
  const response = await fetch(`${API_BASE}/vehicles/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(vehicleData)
  });
  
  const result = await handleResponse<Vehicle>(response);
  return normalizeVehicle(result.data!);
}

export async function deleteVehicle(id: string | number): Promise<void> {
  const response = await fetch(`${API_BASE}/vehicles/${id}`, {
    method: 'DELETE'
  });
  await handleResponse<void>(response);
}

// ============================================================
// ORDER API
// ============================================================

export async function fetchOrders(filters?: {
  status?: string;
  priority?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<Order[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.append('status', filters.status);
  if (filters?.priority) params.append('priority', filters.priority);
  if (filters?.search) params.append('search', filters.search);
  if (filters?.limit) params.append('limit', String(filters.limit));
  if (filters?.offset) params.append('offset', String(filters.offset));

  const url = `${API_BASE}/orders${params.toString() ? '?' + params.toString() : ''}`;
  const response = await fetch(url);
  const result = await handleResponse<Order[]>(response);
  
  return (result.data || []).map(normalizeOrder);
}

export async function fetchOrdersPool(): Promise<Order[]> {
  const response = await fetch(`${API_BASE}/orders/pool`);
  const result = await handleResponse<Order[]>(response);
  
  return (result.data || []).map(normalizeOrder);
}

export async function fetchOrderById(id: string | number): Promise<Order | null> {
  const response = await fetch(`${API_BASE}/orders/${id}`);
  if (response.status === 404) return null;
  
  const result = await handleResponse<Order>(response);
  return result.data ? normalizeOrder(result.data) : null;
}

export async function createOrder(orderData: {
  source: string;
  destination: string;
  latitude: number;
  longitude: number;
  order_id?: string;
  status?: string;
  priority?: string;
  eta?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  delivery_instructions?: string;
  notes?: string;
  items?: Array<{
    name: string;
    item_ref_id?: string;
    size?: string;
    weight_kg?: number;
    quantity_ordered?: number;
    quantity_available?: number;
    unit_price?: number;
    is_fragile?: boolean;
    special_handling?: string;
  }>;
}): Promise<Order> {
  const response = await fetch(`${API_BASE}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderData)
  });
  
  const result = await handleResponse<Order>(response);
  return normalizeOrder(result.data!);
}

export async function updateOrder(
  id: string | number,
  orderData: Partial<Order>
): Promise<Order> {
  const response = await fetch(`${API_BASE}/orders/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderData)
  });
  
  const result = await handleResponse<Order>(response);
  return normalizeOrder(result.data!);
}

export async function deleteOrder(id: string | number): Promise<void> {
  const response = await fetch(`${API_BASE}/orders/${id}`, {
    method: 'DELETE'
  });
  await handleResponse<void>(response);
}

// ============================================================
// ASSIGNMENT API
// ============================================================

export async function assignOrderToVehicle(
  vehicleId: string | number,
  orderId: string | number,
  routeSequence?: number
): Promise<{ success: boolean; id: number }> {
  const response = await fetch(`${API_BASE}/vehicles/${vehicleId}/orders/${orderId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ route_sequence: routeSequence })
  });
  
  const result = await handleResponse<{ success: boolean; id: number }>(response);
  return result.data!;
}

export async function updateItemLoad(
  vehicleId: string | number,
  orderId: string | number,
  itemId: string | number,
  quantityLoaded: number
): Promise<{ success: boolean; newLoad: number }> {
  const response = await fetch(
    `${API_BASE}/vehicles/${vehicleId}/orders/${orderId}/items/${itemId}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity_loaded: quantityLoaded })
    }
  );
  
  const result = await handleResponse<{ success: boolean; newLoad: number }>(response);
  return result.data!;
}

export async function updateRouteSequence(
  vehicleId: string | number,
  orderSequence: (string | number)[]
): Promise<{ success: boolean }> {
  const response = await fetch(`${API_BASE}/vehicles/${vehicleId}/route`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ order_sequence: orderSequence })
  });
  
  const result = await handleResponse<{ success: boolean }>(response);
  return result.data!;
}

// ============================================================
// STATISTICS API
// ============================================================

export async function fetchFleetStats(): Promise<{
  vehicles: {
    total_vehicles: number;
    idle_vehicles: number;
    in_route_vehicles: number;
    maintenance_vehicles: number;
    total_capacity: number;
    total_load: number;
  };
  orders: {
    total_orders: number;
    pending_orders: number;
    in_transit_orders: number;
    delivered_orders: number;
  };
}> {
  const response = await fetch(`${API_BASE}/stats`);
  const result = await handleResponse<any>(response);
  return result.data!;
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Convert a File to base64 string
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
}

/**
 * Compress and convert image to base64
 */
export async function compressImageToBase64(
  file: File,
  maxWidth = 800,
  quality = 0.8
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        const base64 = canvas.toDataURL('image/jpeg', quality);
        resolve(base64);
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
}
