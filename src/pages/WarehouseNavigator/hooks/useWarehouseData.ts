// Hook for fetching warehouse data from Odoo via SmartFieldSelector API

import { useState, useEffect, useCallback } from 'react';
import { OdooWarehouse, OdooLocation, OdooQuant, LocationNode, StockItem } from '../types';
import { buildLocationHierarchy, updateStockCounts } from '../utils/hierarchyBuilder';
import { API_CONFIG, getTenantHeaders } from '../../../config/api';

interface UseWarehouseDataReturn {
  warehouses: OdooWarehouse[];
  locations: LocationNode[];
  isLoading: boolean;
  isLoadingStock: boolean;
  error: string | null;
  fetchWarehouses: () => Promise<void>;
  fetchLocations: (warehouseId: number) => Promise<void>;
  fetchStockForLocation: (locationId: number) => Promise<StockItem[]>;
  refreshLocations: () => Promise<void>;
}

export function useWarehouseData(): UseWarehouseDataReturn {
  const [warehouses, setWarehouses] = useState<OdooWarehouse[]>([]);
  const [rawLocations, setRawLocations] = useState<OdooLocation[]>([]);
  const [locations, setLocations] = useState<LocationNode[]>([]);
  const [currentWarehouseId, setCurrentWarehouseId] = useState<number | null>(null);
  const [currentWarehouseCode, setCurrentWarehouseCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingStock, setIsLoadingStock] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get session ID from localStorage
  const getSessionId = (): string | null => {
    return localStorage.getItem('sessionId');
  };

  // Build headers with session ID for SmartFieldSelector API
  const getApiHeaders = (): Record<string, string> => {
    const headers = getTenantHeaders();
    const sessionId = getSessionId();
    if (sessionId) {
      headers['X-Odoo-Session'] = sessionId;
    }
    return headers;
  };

  // Fetch all warehouses using SmartFieldSelector API
  const fetchWarehouses = useCallback(async () => {
    const sessionId = getSessionId();
    if (!sessionId) {
      setError('No session ID found. Please sign in.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Use SmartFieldSelector's data endpoint for stock.warehouse
      const url = `${API_CONFIG.BACKEND_BASE_URL}/smart-fields/data/stock.warehouse?limit=100`;
      const headers = getApiHeaders();

      console.log('[WarehouseNavigator] Fetching warehouses from:', url);
      console.log('[WarehouseNavigator] Headers:', headers);

      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      console.log('[WarehouseNavigator] Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[WarehouseNavigator] HTTP Error:', response.status, errorText);
        setError(`HTTP Error: ${response.status} - ${errorText.substring(0, 100)}`);
        return;
      }

      const data = await response.json();
      console.log('[WarehouseNavigator] Response data:', data);

      if (data.success && Array.isArray(data.records)) {
        // Map response to OdooWarehouse format
        const warehouseList: OdooWarehouse[] = data.records.map((wh: any) => ({
          id: wh.id,
          name: wh.name || wh.display_name || 'Unknown',
          code: wh.code || '',
          lot_stock_id: wh.lot_stock_id || false,
          view_location_id: wh.view_location_id || false,
          company_id: wh.company_id || false,
          active: wh.active !== false,
        }));
        setWarehouses(warehouseList);
      } else {
        console.error('[WarehouseNavigator] API Error:', data);
        setError(data.error || data.message || 'Failed to fetch warehouses');
      }
    } catch (err) {
      console.error('[WarehouseNavigator] Error fetching warehouses:', err);
      setError(`Failed to connect to server: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch locations for a specific warehouse using SmartFieldSelector API
  const fetchLocations = useCallback(async (warehouseId: number) => {
    const sessionId = getSessionId();
    if (!sessionId) {
      setError('No session ID found. Please sign in.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setCurrentWarehouseId(warehouseId);

    // Find the warehouse to get its code (short name used in location paths)
    const selectedWarehouse = warehouses.find(wh => wh.id === warehouseId);
    const warehouseCode = selectedWarehouse?.code || null;
    setCurrentWarehouseCode(warehouseCode);

    console.log('[WarehouseNavigator] Selected warehouse:', selectedWarehouse);
    console.log('[WarehouseNavigator] Warehouse code for filtering:', warehouseCode);

    try {
      // Use SmartFieldSelector's data endpoint for stock.location
      // Filter by warehouse_id to only get locations for this warehouse
      // Use higher limit to accommodate large warehouses
      const domain = JSON.stringify([['warehouse_id', '=', warehouseId]]);
      const response = await fetch(
        `${API_CONFIG.BACKEND_BASE_URL}/smart-fields/data/stock.location?domain=${encodeURIComponent(domain)}&limit=10000`,
        {
          method: 'GET',
          headers: getApiHeaders(),
        }
      );

      const data = await response.json();

      if (data.success && Array.isArray(data.records)) {
        console.log('[WarehouseNavigator] Total locations fetched:', data.records.length);

        // Map response to OdooLocation format
        const locationList: OdooLocation[] = data.records.map((loc: any) => ({
          id: loc.id,
          name: loc.name || '',
          complete_name: loc.complete_name || loc.display_name || loc.name || '',
          usage: loc.usage || 'internal',
          location_id: loc.location_id || false,
          parent_id: loc.parent_id || loc.location_id || false,
          child_ids: loc.child_ids || [],
          warehouse_id: loc.warehouse_id || false,
          barcode: loc.barcode || '',
          posx: loc.posx || 0,
          posy: loc.posy || 0,
          posz: loc.posz || 0,
          active: loc.active !== false,
          company_id: loc.company_id || false,
          scrap_location: loc.scrap_location || false,
          is_a_dock: loc.is_a_dock || false,
          replenish_location: loc.replenish_location || false,
        }));

        setRawLocations(locationList);
        // Build hierarchy from flat locations using both warehouse ID and code
        const hierarchy = buildLocationHierarchy(locationList, warehouseId, warehouseCode || undefined);
        console.log('[WarehouseNavigator] Built hierarchy with', hierarchy.length, 'root nodes');
        setLocations(hierarchy);
      } else {
        setError(data.error || 'Failed to fetch locations');
      }
    } catch (err) {
      console.error('Error fetching locations:', err);
      setError('Failed to connect to server');
    } finally {
      setIsLoading(false);
    }
  }, [warehouses]);

  // Fetch stock (quants) for a specific location using SmartFieldSelector API
  const fetchStockForLocation = useCallback(async (locationId: number): Promise<StockItem[]> => {
    const sessionId = getSessionId();
    if (!sessionId) {
      setError('No session ID found. Please sign in.');
      return [];
    }

    setIsLoadingStock(true);

    try {
      // Use SmartFieldSelector's data endpoint for stock.quant
      // Filter by location_id
      const domain = JSON.stringify([['location_id', '=', locationId]]);
      const response = await fetch(
        `${API_CONFIG.BACKEND_BASE_URL}/smart-fields/data/stock.quant?domain=${encodeURIComponent(domain)}&limit=500`,
        {
          method: 'GET',
          headers: getApiHeaders(),
        }
      );

      const data = await response.json();

      if (data.success && Array.isArray(data.records)) {
        // Convert to StockItem format
        const stockItems: StockItem[] = data.records.map((q: any) => ({
          productId: Array.isArray(q.product_id) ? q.product_id[0] : (q.product_id || 0),
          productName: Array.isArray(q.product_id) ? q.product_id[1] : (q.product_name || 'Unknown'),
          quantity: q.quantity || 0,
          lotId: Array.isArray(q.lot_id) ? q.lot_id[0] : (q.lot_id || undefined),
          lotName: Array.isArray(q.lot_id) ? q.lot_id[1] : (q.lot_name || undefined),
          uomId: Array.isArray(q.product_uom_id) ? q.product_uom_id[0] : (q.product_uom_id || 0),
          uomName: Array.isArray(q.product_uom_id) ? q.product_uom_id[1] : (q.uom_name || 'Units'),
        }));

        return stockItems;
      } else {
        return [];
      }
    } catch (err) {
      console.error('Error fetching stock:', err);
      return [];
    } finally {
      setIsLoadingStock(false);
    }
  }, []);

  // Refresh locations (re-fetch with current warehouse)
  const refreshLocations = useCallback(async () => {
    if (currentWarehouseId) {
      await fetchLocations(currentWarehouseId);
    }
  }, [currentWarehouseId, fetchLocations]);

  // Fetch stock summary for all locations and update counts
  useEffect(() => {
    const fetchAllStock = async () => {
      if (locations.length === 0) return;

      const sessionId = getSessionId();
      if (!sessionId) return;

      try {
        // Use SmartFieldSelector's data endpoint for stock.quant
        const response = await fetch(
          `${API_CONFIG.BACKEND_BASE_URL}/smart-fields/data/stock.quant?limit=5000`,
          {
            method: 'GET',
            headers: getApiHeaders(),
          }
        );

        const data = await response.json();

        if (data.success && Array.isArray(data.records)) {
          // Build stock summary by location
          const stockByLocation = new Map<number, { itemCount: number; totalQty: number }>();

          data.records.forEach((q: any) => {
            const locId = Array.isArray(q.location_id) ? q.location_id[0] : q.location_id;
            if (locId) {
              const existing = stockByLocation.get(locId) || { itemCount: 0, totalQty: 0 };
              stockByLocation.set(locId, {
                itemCount: existing.itemCount + 1,
                totalQty: existing.totalQty + (q.quantity || 0),
              });
            }
          });

          // Update location hierarchy with stock counts
          const updatedLocations = [...locations];
          updateStockCounts(updatedLocations, stockByLocation);
          setLocations(updatedLocations);
        }
      } catch (err) {
        console.error('Error fetching stock summary:', err);
      }
    };

    fetchAllStock();
    // We intentionally exclude 'locations' from deps to avoid infinite loop
    // This effect should only run when rawLocations changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawLocations]);

  return {
    warehouses,
    locations,
    isLoading,
    isLoadingStock,
    error,
    fetchWarehouses,
    fetchLocations,
    fetchStockForLocation,
    refreshLocations,
  };
}
