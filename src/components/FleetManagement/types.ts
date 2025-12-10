export enum VehicleStatus {
  IDLE = 'IDLE',
  IN_ROUTE = 'IN_ROUTE',
  MAINTENANCE = 'MAINTENANCE',
  OUT_OF_SERVICE = 'OUT_OF_SERVICE'
}

export interface Item {
  id: number | string;
  item_ref_id?: string;
  refId?: string; // Legacy support
  name: string;
  description?: string;
  size: string; // e.g., "Medium - 5.5 kg"
  weight_kg?: number;
  weightKg?: number; // Legacy support
  quantity_available?: number;
  quantityAvailable?: number; // Legacy support
  quantity_ordered?: number;
  quantity_loaded?: number;
  quantityLoaded?: number; // Legacy support
  quantity_delivered?: number;
  unit_price?: number;
  is_fragile?: boolean;
  special_handling?: string;
}

export interface Order {
  id: number | string;
  order_id?: string;
  source: string;
  destination: string;
  status: 'PENDING' | 'LOADING' | 'IN_TRANSIT' | 'UNLOADING' | 'DELIVERED' | 'PARTIAL' | 'CANCELLED';
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  eta?: string;
  actual_arrival?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  delivery_instructions?: string;
  total_weight_kg?: number;
  total_items?: number;
  notes?: string;
  items: Item[];
  coordinates: { lat: number; lng: number };
  latitude?: number;
  longitude?: number;
}

export interface Vehicle {
  id: number | string;
  vehicle_id?: string;
  name: string;
  plate: string;
  model: string;
  capacity_kg?: number;
  capacityKg?: number; // Legacy support
  current_load_kg?: number;
  currentLoadKg?: number; // Legacy support
  status: VehicleStatus;
  location: string;
  image_base64?: string;
  image_url?: string;
  image?: string; // Legacy support
  latitude?: number;
  longitude?: number;
  fuel_level?: number;
  mileage?: number;
  driver_id?: number;
  notes?: string;
  loadedOrders: Order[];
}

export enum LoadingLogic {
  FIFO = "First In Last Out",
  LIFO = "Last In First Out",
  WEIGHT_BALANCED = "Weight Balanced",
  FRAGILE_TOP = "Fragile on Top"
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Helper functions to normalize data between API and legacy format
export const normalizeVehicle = (v: any): Vehicle => ({
  ...v,
  id: v.vehicle_id || v.id,
  capacityKg: v.capacity_kg || v.capacityKg || 0,
  currentLoadKg: v.current_load_kg || v.currentLoadKg || 0,
  image: v.image_base64 || v.image_url || v.image || '',
  loadedOrders: (v.loadedOrders || []).map(normalizeOrder)
});

export const normalizeOrder = (o: any): Order => ({
  ...o,
  id: o.order_id || o.id,
  coordinates: o.coordinates || { lat: o.latitude || 0, lng: o.longitude || 0 },
  items: (o.items || []).map(normalizeItem)
});

export const normalizeItem = (i: any): Item => ({
  ...i,
  refId: i.item_ref_id || i.refId || '',
  weightKg: i.weight_kg || i.weightKg || 0,
  quantityAvailable: i.quantity_available || i.quantityAvailable || 0,
  quantityLoaded: i.quantity_loaded || i.quantityLoaded || 0
});
  