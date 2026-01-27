// Hook for fetching deliveries and calculating pick routes

import { useState, useCallback, useMemo } from 'react';
import { Vector3 } from 'three';
import { API_CONFIG, getTenantHeaders } from '../../../config/api';
import { LocationNode } from '../types';
import {
  PickItem,
  PickRoute,
  RoutingAlgorithm,
  calculatePickRoute,
  findBestRoute,
} from '../utils/routingAlgorithm';
import { parseLocationCode, calculatePosition, getLevelIndex, LAYOUT } from '../utils/positionCalculator';
import { buildLocationCode, parseLocationPath } from '../utils/hierarchyBuilder';

export interface DeliveryOrder {
  id: number;
  name: string;
  partnerName: string;
  scheduledDate: string;
  state: string;
  moveLineCount: number;
  origin?: string;
}

export interface DeliveryMoveLine {
  id: number;
  productId: number;
  productName: string;
  quantity: number;
  quantityDone: number;
  locationId: number;
  locationName: string;
  locationDestId: number;
  locationDestName: string;
}

interface UseDeliveryRoutingReturn {
  // Deliveries list
  deliveries: DeliveryOrder[];
  isLoadingDeliveries: boolean;
  fetchDeliveries: () => Promise<void>;

  // Selected delivery
  selectedDelivery: DeliveryOrder | null;
  moveLines: DeliveryMoveLine[];
  isLoadingMoveLines: boolean;
  selectDelivery: (delivery: DeliveryOrder | null) => Promise<void>;

  // Pick items with locations
  pickItems: PickItem[];
  isLoadingLocations: boolean;

  // Route calculation
  currentRoute: PickRoute | null;
  routeAlgorithm: RoutingAlgorithm;
  setRouteAlgorithm: (algo: RoutingAlgorithm) => void;
  calculateRoute: (startPosition: Vector3) => void;
  routeComparison: { algorithm: RoutingAlgorithm; distance: number; time: number }[] | null;

  // Error handling
  error: string | null;
  clearError: () => void;
}

export function useDeliveryRouting(
  locations: LocationNode[],
  warehouseId?: number | null,
  warehouseCode?: string | null
): UseDeliveryRoutingReturn {
  const [deliveries, setDeliveries] = useState<DeliveryOrder[]>([]);
  const [isLoadingDeliveries, setIsLoadingDeliveries] = useState(false);

  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryOrder | null>(null);
  const [moveLines, setMoveLines] = useState<DeliveryMoveLine[]>([]);
  const [isLoadingMoveLines, setIsLoadingMoveLines] = useState(false);

  const [pickItems, setPickItems] = useState<PickItem[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);

  const [currentRoute, setCurrentRoute] = useState<PickRoute | null>(null);
  const [routeAlgorithm, setRouteAlgorithm] = useState<RoutingAlgorithm>('nearest');
  const [routeComparison, setRouteComparison] = useState<{ algorithm: RoutingAlgorithm; distance: number; time: number }[] | null>(null);

  const [error, setError] = useState<string | null>(null);

  const getSessionId = (): string | null => localStorage.getItem('sessionId');

  const getApiHeaders = (): Record<string, string> => {
    const headers = getTenantHeaders();
    const sessionId = getSessionId();
    if (sessionId) {
      headers['X-Odoo-Session'] = sessionId;
    }
    return headers;
  };

  // Build location lookup map from hierarchy
  const locationMap = useMemo(() => {
    const map = new Map<number, LocationNode>();

    const addToMap = (node: LocationNode) => {
      map.set(node.id, node);
      node.children.forEach(addToMap);
    };

    locations.forEach(addToMap);
    return map;
  }, [locations]);

  // Fetch outgoing deliveries (ready to pick) for the selected warehouse
  const fetchDeliveries = useCallback(async () => {
    const sessionId = getSessionId();
    if (!sessionId) {
      setError('No session. Please sign in.');
      return;
    }

    setIsLoadingDeliveries(true);
    setError(null);

    try {
      // Build domain filter - filter by warehouse if provided
      const domainConditions: any[] = [
        ['picking_type_code', '=', 'outgoing'],
        ['state', 'in', ['assigned', 'confirmed', 'waiting']],
      ];

      // If warehouse ID is provided, filter by picking_type_id.warehouse_id
      // The picking_type belongs to a specific warehouse
      if (warehouseId) {
        domainConditions.push(['picking_type_id.warehouse_id', '=', warehouseId]);
      }

      const domain = JSON.stringify(domainConditions);

      console.log('[useDeliveryRouting] Fetching deliveries with domain:', domain);
      console.log('[useDeliveryRouting] Warehouse ID:', warehouseId, 'Code:', warehouseCode);

      const response = await fetch(
        `${API_CONFIG.BACKEND_BASE_URL}/smart-fields/data/stock.picking?domain=${encodeURIComponent(domain)}&limit=100`,
        {
          method: 'GET',
          headers: getApiHeaders(),
        }
      );

      const data = await response.json();

      if (data.success && Array.isArray(data.records)) {
        let deliveryList: DeliveryOrder[] = data.records.map((p: any) => ({
          id: p.id,
          name: p.name || p.display_name || `Picking ${p.id}`,
          partnerName: Array.isArray(p.partner_id) ? p.partner_id[1] : (p.partner_id || 'Customer'),
          scheduledDate: p.scheduled_date || '',
          state: p.state || 'draft',
          moveLineCount: Array.isArray(p.move_line_ids) ? p.move_line_ids.length :
            (Array.isArray(p.move_ids_without_package) ? p.move_ids_without_package.length : 0),
          origin: p.origin || '',
        }));

        // Additional filter by warehouse code in picking name (e.g., "AE/OUT/00001" for AE warehouse)
        // This is a fallback in case the domain filter by warehouse_id doesn't work
        if (warehouseCode && deliveryList.length === 0) {
          console.log('[useDeliveryRouting] No results with warehouse_id filter, trying name-based filter');

          // Fetch without warehouse filter and filter client-side by name prefix
          const fallbackDomain = JSON.stringify([
            ['picking_type_code', '=', 'outgoing'],
            ['state', 'in', ['assigned', 'confirmed', 'waiting']],
          ]);

          const fallbackResponse = await fetch(
            `${API_CONFIG.BACKEND_BASE_URL}/smart-fields/data/stock.picking?domain=${encodeURIComponent(fallbackDomain)}&limit=100`,
            {
              method: 'GET',
              headers: getApiHeaders(),
            }
          );

          const fallbackData = await fallbackResponse.json();

          if (fallbackData.success && Array.isArray(fallbackData.records)) {
            // Filter by picking name starting with warehouse code (e.g., "AE/OUT/...")
            deliveryList = fallbackData.records
              .filter((p: any) => {
                const name = p.name || p.display_name || '';
                return name.startsWith(`${warehouseCode}/`);
              })
              .map((p: any) => ({
                id: p.id,
                name: p.name || p.display_name || `Picking ${p.id}`,
                partnerName: Array.isArray(p.partner_id) ? p.partner_id[1] : (p.partner_id || 'Customer'),
                scheduledDate: p.scheduled_date || '',
                state: p.state || 'draft',
                moveLineCount: Array.isArray(p.move_line_ids) ? p.move_line_ids.length :
                  (Array.isArray(p.move_ids_without_package) ? p.move_ids_without_package.length : 0),
                origin: p.origin || '',
              }));
          }
        }

        console.log('[useDeliveryRouting] Found', deliveryList.length, 'deliveries');
        setDeliveries(deliveryList);

        if (deliveryList.length === 0) {
          setError(`No pending deliveries found for warehouse ${warehouseCode || warehouseId || 'selected'}. Deliveries must be in 'Ready' or 'Waiting' state.`);
        }
      } else {
        setError(data.error || 'Failed to fetch deliveries');
      }
    } catch (err) {
      console.error('Error fetching deliveries:', err);
      setError('Failed to connect to server');
    } finally {
      setIsLoadingDeliveries(false);
    }
  }, [warehouseId, warehouseCode]);

  // Select a delivery and fetch its move lines
  const selectDelivery = useCallback(async (delivery: DeliveryOrder | null) => {
    setSelectedDelivery(delivery);
    setMoveLines([]);
    setPickItems([]);
    setCurrentRoute(null);
    setRouteComparison(null);

    if (!delivery) return;

    const sessionId = getSessionId();
    if (!sessionId) {
      setError('No session. Please sign in.');
      return;
    }

    setIsLoadingMoveLines(true);
    setError(null);

    try {
      // Fetch stock.move.line for this picking
      const domain = JSON.stringify([['picking_id', '=', delivery.id]]);

      const response = await fetch(
        `${API_CONFIG.BACKEND_BASE_URL}/smart-fields/data/stock.move.line?domain=${encodeURIComponent(domain)}&limit=500`,
        {
          method: 'GET',
          headers: getApiHeaders(),
        }
      );

      const data = await response.json();

      if (data.success && Array.isArray(data.records)) {
        const lines: DeliveryMoveLine[] = data.records.map((ml: any) => ({
          id: ml.id,
          productId: Array.isArray(ml.product_id) ? ml.product_id[0] : ml.product_id,
          productName: Array.isArray(ml.product_id) ? ml.product_id[1] : (ml.product_name || 'Unknown'),
          quantity: ml.quantity || ml.product_uom_qty || ml.reserved_qty || 0,
          quantityDone: ml.qty_done || 0,
          locationId: Array.isArray(ml.location_id) ? ml.location_id[0] : ml.location_id,
          locationName: Array.isArray(ml.location_id) ? ml.location_id[1] : (ml.location_name || ''),
          locationDestId: Array.isArray(ml.location_dest_id) ? ml.location_dest_id[0] : ml.location_dest_id,
          locationDestName: Array.isArray(ml.location_dest_id) ? ml.location_dest_id[1] : '',
        }));

        setMoveLines(lines);

        // Now fetch stock.quant to get exact positions for these products
        await fetchPickItemLocations(lines);
      } else {
        setError(data.error || 'Failed to fetch move lines');
      }
    } catch (err) {
      console.error('Error fetching move lines:', err);
      setError('Failed to fetch delivery details');
    } finally {
      setIsLoadingMoveLines(false);
    }
  }, []);

  // Helper function to check if a location is a valid bin (has position)
  const isValidBinLocation = useCallback((locName: string, locId: number): { valid: boolean; position?: Vector3; parsed?: any; levelIndex?: number } => {
    // Check in location map first
    const locationNode = locationMap.get(locId);
    if (locationNode?.position && locationNode.type === 'bin') {
      return {
        valid: true,
        position: locationNode.position.clone(),
        parsed: locationNode.parsed,
        levelIndex: locationNode.parsed ? getLevelIndex(locationNode.parsed.level) : 0,
      };
    }

    // Try to parse from complete location name (e.g., "WH/Stock/AR/14/AF/01")
    const path = parseLocationPath(locName);

    // Need at least 4 parts after WH/Stock to be a bin (Row/Bay/Level or Row/Bay/Level/Side)
    if (path.length < 5) {
      // Not a bin - it's a parent location like "WH/Stock" or "WH/Stock/AR"
      return { valid: false };
    }

    const code = buildLocationCode(path);
    if (code) {
      const parsedLoc = parseLocationCode(code);
      if (parsedLoc) {
        return {
          valid: true,
          position: calculatePosition(parsedLoc),
          parsed: parsedLoc,
          levelIndex: getLevelIndex(parsedLoc.level),
        };
      }
    }

    // Try direct pattern match on location name
    const nameMatch = locName.match(/([A-Z]{2})(\d{2})([A-Z]{2})(\d{2})/);
    if (nameMatch) {
      const directParsed = parseLocationCode(nameMatch[0]);
      if (directParsed) {
        return {
          valid: true,
          position: calculatePosition(directParsed),
          parsed: directParsed,
          levelIndex: getLevelIndex(directParsed.level),
        };
      }
    }

    // Search in the location tree
    const searchInNodes = (nodes: LocationNode[]): LocationNode | null => {
      for (const node of nodes) {
        if (node.id === locId && node.type === 'bin' && node.position) {
          return node;
        }
        const found = searchInNodes(node.children);
        if (found) return found;
      }
      return null;
    };

    const foundNode = searchInNodes(locations);
    if (foundNode?.position) {
      return {
        valid: true,
        position: foundNode.position.clone(),
        parsed: foundNode.parsed,
        levelIndex: foundNode.parsed ? getLevelIndex(foundNode.parsed.level) : 0,
      };
    }

    return { valid: false };
  }, [locationMap, locations]);

  // Fetch stock.quant to get actual locations of items to pick
  const fetchPickItemLocations = useCallback(async (lines: DeliveryMoveLine[]) => {
    if (lines.length === 0) return;

    setIsLoadingLocations(true);

    try {
      // Get unique product IDs
      const productIds = [...new Set(lines.map(l => l.productId))];

      // Fetch quants for these products - look for quants in SPECIFIC bin locations
      const domain = JSON.stringify([
        ['product_id', 'in', productIds],
        ['quantity', '>', 0],
        ['location_id.usage', '=', 'internal'],
      ]);

      const response = await fetch(
        `${API_CONFIG.BACKEND_BASE_URL}/smart-fields/data/stock.quant?domain=${encodeURIComponent(domain)}&limit=1000`,
        {
          method: 'GET',
          headers: getApiHeaders(),
        }
      );

      const data = await response.json();

      if (data.success && Array.isArray(data.records)) {
        const items: PickItem[] = [];
        const itemsWithoutBins: string[] = [];

        for (const line of lines) {
          // Find quants for this product
          const productQuants = data.records.filter((q: any) => {
            const qProductId = Array.isArray(q.product_id) ? q.product_id[0] : q.product_id;
            return qProductId === line.productId;
          });

          // First, try to find a quant in a VALID bin location
          let bestQuant: any = null;
          let bestLocationInfo: { valid: boolean; position?: Vector3; parsed?: any; levelIndex?: number } = { valid: false };

          for (const quant of productQuants) {
            const qLocId = Array.isArray(quant.location_id) ? quant.location_id[0] : quant.location_id;
            const qLocName = Array.isArray(quant.location_id) ? quant.location_id[1] : '';

            const locationInfo = isValidBinLocation(qLocName, qLocId);
            if (locationInfo.valid) {
              // Prefer the location specified in the move line
              if (qLocId === line.locationId) {
                bestQuant = quant;
                bestLocationInfo = locationInfo;
                break; // Perfect match
              } else if (!bestQuant) {
                bestQuant = quant;
                bestLocationInfo = locationInfo;
              }
            }
          }

          // If no quant in a valid bin, check if the move line location itself is valid
          if (!bestQuant) {
            const moveLineLocationInfo = isValidBinLocation(line.locationName, line.locationId);
            if (moveLineLocationInfo.valid) {
              // Use the move line location even without a matching quant
              items.push({
                id: line.id,
                productId: line.productId,
                productName: line.productName,
                quantity: line.quantity,
                locationId: line.locationId,
                locationName: line.locationName,
                position: moveLineLocationInfo.position!,
                parsed: moveLineLocationInfo.parsed,
                levelIndex: moveLineLocationInfo.levelIndex || 0,
              });
              console.log(`[useDeliveryRouting] Using move line location for ${line.productName}: ${line.locationName}`);
              continue;
            }
          }

          if (bestQuant && bestLocationInfo.valid) {
            const locId = Array.isArray(bestQuant.location_id) ? bestQuant.location_id[0] : bestQuant.location_id;
            const locName = Array.isArray(bestQuant.location_id) ? bestQuant.location_id[1] : '';

            items.push({
              id: line.id,
              productId: line.productId,
              productName: line.productName,
              quantity: line.quantity,
              locationId: locId,
              locationName: locName,
              position: bestLocationInfo.position!,
              parsed: bestLocationInfo.parsed,
              levelIndex: bestLocationInfo.levelIndex || 0,
            });
            console.log(`[useDeliveryRouting] Found bin location for ${line.productName}: ${locName}`);
          } else {
            // No valid bin location found - item is at a general location
            itemsWithoutBins.push(`${line.productName} (at ${line.locationName})`);
            console.warn(`[useDeliveryRouting] No bin location for ${line.productName}, source: ${line.locationName}`);
          }
        }

        setPickItems(items);

        // Show warning if some items don't have bin locations
        if (itemsWithoutBins.length > 0) {
          setError(`${itemsWithoutBins.length} item(s) not in specific bin locations:\n${itemsWithoutBins.join(', ')}\n\nThese items are stored at a general location and cannot be shown on the route.`);
        }
      }
    } catch (err) {
      console.error('Error fetching stock locations:', err);
      setError('Failed to fetch item locations');
    } finally {
      setIsLoadingLocations(false);
    }
  }, [locationMap, locations, isValidBinLocation]);

  // Calculate route for current pick items
  const calculateRoute = useCallback((startPosition: Vector3) => {
    if (pickItems.length === 0) {
      setCurrentRoute(null);
      setRouteComparison(null);
      setError('No items with valid bin locations to create a route. Please ensure items are stored in specific bin locations (e.g., AG01AA01) rather than general stock locations.');
      return;
    }

    // Clear any previous errors
    setError(null);

    // Find best route and compare algorithms
    const result = findBestRoute(pickItems, startPosition);

    // Use specified algorithm or best
    const route = routeAlgorithm === result.algorithm
      ? result.bestRoute
      : calculatePickRoute(pickItems, startPosition, routeAlgorithm);

    setCurrentRoute(route);
    setRouteComparison(result.comparison);
  }, [pickItems, routeAlgorithm]);

  const clearError = useCallback(() => setError(null), []);

  return {
    deliveries,
    isLoadingDeliveries,
    fetchDeliveries,
    selectedDelivery,
    moveLines,
    isLoadingMoveLines,
    selectDelivery,
    pickItems,
    isLoadingLocations,
    currentRoute,
    routeAlgorithm,
    setRouteAlgorithm,
    calculateRoute,
    routeComparison,
    error,
    clearError,
  };
}
