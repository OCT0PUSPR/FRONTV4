// Routing Algorithm for Warehouse Pick Path Optimization
// Calculates shortest path considering rack positions and levels

import { Vector3 } from 'three';
import { LocationNode, ParsedLocation } from '../types';
import { LAYOUT, getLevelIndex, calculatePickPosition, getRowFrontDirection } from './positionCalculator';

export interface PickItem {
  id: number;
  productId: number;
  productName: string;
  quantity: number;
  locationId: number;
  locationName: string;
  position: Vector3;
  parsed?: ParsedLocation;
  levelIndex: number;
}

export interface RouteStep {
  index: number;
  item: PickItem;
  distanceFromPrevious: number;
  cumulativeDistance: number;
}

export interface PickRoute {
  steps: RouteStep[];
  totalDistance: number;
  estimatedTime: number; // in seconds
  startPosition: Vector3;
  endPosition: Vector3;
}

// Constants for routing calculations
const VERTICAL_TRAVEL_COST = 2.0; // Cost multiplier for vertical movement (climbing/descending)
const AISLE_CHANGE_COST = 1.5;    // Cost multiplier for changing aisles
const AVERAGE_PICK_TIME = 15;     // Seconds per pick
const WALKING_SPEED = 1.2;        // Meters per second

/**
 * Calculate the CENTER of the aisle for a given Z coordinate
 * Aisles are between back-to-back rack pairs
 * The aisle center is at (row_pair_end + ROW_SPACING/2)
 */
function getAisleCenterZ(z: number): number {
  const pairWidth = LAYOUT.ROW_SPACING + LAYOUT.BACK_TO_BACK_GAP * 2;
  const pairIndex = Math.floor(z / pairWidth);
  // Aisle CENTER is between rack pairs: after the back-to-back gap + half the aisle width
  return pairIndex * pairWidth + LAYOUT.BACK_TO_BACK_GAP * 2 + LAYOUT.ROW_SPACING / 2;
}

/**
 * Get the front aisle Z position (main corridor in front of all racks)
 */
function getFrontAisleZ(): number {
  // The front aisle is before the first rack row, centered
  return -LAYOUT.ROW_SPACING / 2;
}

/**
 * Calculate Manhattan-style walking distance in a warehouse
 * Pickers must walk through aisles, not through racks
 */
export function calculateWalkingDistance(from: Vector3, to: Vector3): number {
  // If positions are in the same row (similar Z), can walk directly along X
  const sameRow = Math.abs(from.z - to.z) < LAYOUT.BACK_TO_BACK_GAP * 2;

  if (sameRow) {
    // Direct X distance plus any level change
    return Math.abs(to.x - from.x) + Math.abs(to.y - from.y) * VERTICAL_TRAVEL_COST;
  }

  // Need to go to aisle, walk along aisle, then to destination
  // Find the nearest aisle center for both positions
  const fromAisleZ = getAisleCenterZ(from.z);
  const toAisleZ = getAisleCenterZ(to.z);

  // Walk from current position to aisle center
  const toAisleDistance = Math.abs(from.z - fromAisleZ);
  // Walk along the aisle (X direction) - can happen at any point
  const alongAisleDistance = Math.abs(to.x - from.x);
  // Walk between aisles (Z direction through main corridor)
  const betweenAislesDistance = Math.abs(toAisleZ - fromAisleZ);
  // Walk from aisle center to destination
  const fromAisleDistance = Math.abs(to.z - toAisleZ);
  // Vertical movement
  const verticalDistance = Math.abs(to.y - from.y) * VERTICAL_TRAVEL_COST;

  return toAisleDistance + alongAisleDistance + betweenAislesDistance + fromAisleDistance + verticalDistance;
}

/**
 * Calculate distance between two positions considering level changes
 * Vertical movement is more costly than horizontal
 */
export function calculateWeightedDistance(from: Vector3, to: Vector3, fromLevel?: number, toLevel?: number): number {
  // Use walking distance for more realistic warehouse routing
  return calculateWalkingDistance(from, to);
}

/**
 * Simple distance calculation for display purposes
 */
export function calculateSimpleDistance(from: Vector3, to: Vector3): number {
  return Math.sqrt(
    Math.pow(to.x - from.x, 2) +
    Math.pow(to.y - from.y, 2) +
    Math.pow(to.z - from.z, 2)
  );
}

/**
 * Nearest Neighbor Algorithm for route optimization
 * Starts from a given position and always goes to the nearest unvisited location
 */
export function nearestNeighborRoute(items: PickItem[], startPosition: Vector3): PickRoute {
  if (items.length === 0) {
    return {
      steps: [],
      totalDistance: 0,
      estimatedTime: 0,
      startPosition,
      endPosition: startPosition,
    };
  }

  const unvisited = [...items];
  const steps: RouteStep[] = [];
  let currentPosition = startPosition;
  let totalDistance = 0;

  while (unvisited.length > 0) {
    // Find nearest unvisited item
    let nearestIndex = 0;
    let nearestDistance = Infinity;

    for (let i = 0; i < unvisited.length; i++) {
      const distance = calculateWeightedDistance(
        currentPosition,
        unvisited[i].position,
        steps.length > 0 ? steps[steps.length - 1].item.levelIndex : 0,
        unvisited[i].levelIndex
      );

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = i;
      }
    }

    // Add to route
    const item = unvisited.splice(nearestIndex, 1)[0];
    totalDistance += nearestDistance;

    steps.push({
      index: steps.length,
      item,
      distanceFromPrevious: nearestDistance,
      cumulativeDistance: totalDistance,
    });

    currentPosition = item.position;
  }

  // Calculate estimated time
  const travelTime = totalDistance / WALKING_SPEED;
  const pickTime = items.length * AVERAGE_PICK_TIME;
  const estimatedTime = travelTime + pickTime;

  return {
    steps,
    totalDistance,
    estimatedTime,
    startPosition,
    endPosition: currentPosition,
  };
}

/**
 * S-Pattern (Serpentine) Algorithm
 * Efficient for warehouses with parallel aisles
 * Goes through each aisle completely before moving to the next
 */
export function sPatternRoute(items: PickItem[], startPosition: Vector3): PickRoute {
  if (items.length === 0) {
    return {
      steps: [],
      totalDistance: 0,
      estimatedTime: 0,
      startPosition,
      endPosition: startPosition,
    };
  }

  // Group items by row (Z position cluster)
  const rowGroups = new Map<number, PickItem[]>();
  const ROW_THRESHOLD = LAYOUT.ROW_SPACING / 2;

  items.forEach(item => {
    // Round Z to nearest row
    const rowZ = Math.round(item.position.z / ROW_THRESHOLD) * ROW_THRESHOLD;
    if (!rowGroups.has(rowZ)) {
      rowGroups.set(rowZ, []);
    }
    rowGroups.get(rowZ)!.push(item);
  });

  // Sort row groups by Z position
  const sortedRows = Array.from(rowGroups.entries())
    .sort(([a], [b]) => a - b);

  // Build route going through each row in serpentine pattern
  const orderedItems: PickItem[] = [];
  let reverseDirection = false;

  for (const [_, rowItems] of sortedRows) {
    // Sort items in row by X position
    const sortedInRow = [...rowItems].sort((a, b) => a.position.x - b.position.x);

    // Reverse every other row for serpentine pattern
    if (reverseDirection) {
      sortedInRow.reverse();
    }

    // Further sort by level within each X position for efficiency
    sortedInRow.sort((a, b) => {
      if (Math.abs(a.position.x - b.position.x) < 0.5) {
        // Same bay, sort by level (ground first, then up)
        return a.levelIndex - b.levelIndex;
      }
      return 0;
    });

    orderedItems.push(...sortedInRow);
    reverseDirection = !reverseDirection;
  }

  // Calculate distances for the ordered route
  const steps: RouteStep[] = [];
  let currentPosition = startPosition;
  let totalDistance = 0;

  for (const item of orderedItems) {
    const distance = calculateWeightedDistance(
      currentPosition,
      item.position,
      steps.length > 0 ? steps[steps.length - 1].item.levelIndex : 0,
      item.levelIndex
    );

    totalDistance += distance;

    steps.push({
      index: steps.length,
      item,
      distanceFromPrevious: distance,
      cumulativeDistance: totalDistance,
    });

    currentPosition = item.position;
  }

  // Calculate estimated time
  const travelTime = totalDistance / WALKING_SPEED;
  const pickTime = items.length * AVERAGE_PICK_TIME;
  const estimatedTime = travelTime + pickTime;

  return {
    steps,
    totalDistance,
    estimatedTime,
    startPosition,
    endPosition: currentPosition,
  };
}

/**
 * Level-First Algorithm
 * Minimizes vertical movement by completing all picks on one level before moving to next
 */
export function levelFirstRoute(items: PickItem[], startPosition: Vector3): PickRoute {
  if (items.length === 0) {
    return {
      steps: [],
      totalDistance: 0,
      estimatedTime: 0,
      startPosition,
      endPosition: startPosition,
    };
  }

  // Group by level
  const levelGroups = new Map<number, PickItem[]>();

  items.forEach(item => {
    if (!levelGroups.has(item.levelIndex)) {
      levelGroups.set(item.levelIndex, []);
    }
    levelGroups.get(item.levelIndex)!.push(item);
  });

  // Sort levels (start from ground level)
  const sortedLevels = Array.from(levelGroups.entries())
    .sort(([a], [b]) => a - b);

  // Build route level by level
  const orderedItems: PickItem[] = [];

  for (const [_, levelItems] of sortedLevels) {
    // Within each level, use nearest neighbor
    const itemsOnLevel = [...levelItems];
    let currentPos = orderedItems.length > 0
      ? orderedItems[orderedItems.length - 1].position
      : startPosition;

    while (itemsOnLevel.length > 0) {
      let nearestIdx = 0;
      let nearestDist = Infinity;

      for (let i = 0; i < itemsOnLevel.length; i++) {
        const dist = calculateSimpleDistance(currentPos, itemsOnLevel[i].position);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestIdx = i;
        }
      }

      const item = itemsOnLevel.splice(nearestIdx, 1)[0];
      orderedItems.push(item);
      currentPos = item.position;
    }
  }

  // Calculate distances
  const steps: RouteStep[] = [];
  let currentPosition = startPosition;
  let totalDistance = 0;

  for (const item of orderedItems) {
    const distance = calculateWeightedDistance(
      currentPosition,
      item.position,
      steps.length > 0 ? steps[steps.length - 1].item.levelIndex : 0,
      item.levelIndex
    );

    totalDistance += distance;

    steps.push({
      index: steps.length,
      item,
      distanceFromPrevious: distance,
      cumulativeDistance: totalDistance,
    });

    currentPosition = item.position;
  }

  const travelTime = totalDistance / WALKING_SPEED;
  const pickTime = items.length * AVERAGE_PICK_TIME;
  const estimatedTime = travelTime + pickTime;

  return {
    steps,
    totalDistance,
    estimatedTime,
    startPosition,
    endPosition: currentPosition,
  };
}

export type RoutingAlgorithm = 'nearest' | 'sPattern' | 'levelFirst';

/**
 * Calculate optimal pick route using specified algorithm
 */
export function calculatePickRoute(
  items: PickItem[],
  startPosition: Vector3,
  algorithm: RoutingAlgorithm = 'nearest'
): PickRoute {
  switch (algorithm) {
    case 'sPattern':
      return sPatternRoute(items, startPosition);
    case 'levelFirst':
      return levelFirstRoute(items, startPosition);
    case 'nearest':
    default:
      return nearestNeighborRoute(items, startPosition);
  }
}

/**
 * Compare all algorithms and return the best route
 */
export function findBestRoute(items: PickItem[], startPosition: Vector3): {
  bestRoute: PickRoute;
  algorithm: RoutingAlgorithm;
  comparison: { algorithm: RoutingAlgorithm; distance: number; time: number }[];
} {
  const routes: { algorithm: RoutingAlgorithm; route: PickRoute }[] = [
    { algorithm: 'nearest', route: nearestNeighborRoute(items, startPosition) },
    { algorithm: 'sPattern', route: sPatternRoute(items, startPosition) },
    { algorithm: 'levelFirst', route: levelFirstRoute(items, startPosition) },
  ];

  // Find best by total distance
  routes.sort((a, b) => a.route.totalDistance - b.route.totalDistance);

  return {
    bestRoute: routes[0].route,
    algorithm: routes[0].algorithm,
    comparison: routes.map(r => ({
      algorithm: r.algorithm,
      distance: Math.round(r.route.totalDistance * 100) / 100,
      time: Math.round(r.route.estimatedTime),
    })),
  };
}

/**
 * Extract row code from location name
 * e.g., "WH/Stock/AR/14/AF/01" -> "AR"
 */
function extractRowCode(locationName: string): string | null {
  const parts = locationName.split('/');
  if (parts.length >= 4) {
    const rowCode = parts[parts.length - 4];
    // Validate it's a 2-letter code
    if (rowCode && /^[A-Z]{2}$/.test(rowCode)) {
      return rowCode;
    }
  }
  return null;
}

/**
 * Generate path points for 3D visualization
 * Creates realistic path that follows the CENTER of aisles
 * Routes to PICK POSITIONS (in the aisle, in front of bins) not bin positions
 */
export function generatePathPoints(route: PickRoute): Vector3[] {
  if (route.steps.length === 0) return [];

  const points: Vector3[] = [route.startPosition.clone()];
  const GROUND_LEVEL = 0.1;
  const FRONT_AISLE_Z = getFrontAisleZ(); // Center of front corridor

  for (const step of route.steps) {
    const lastPoint = points[points.length - 1];
    const binPosition = step.item.position;

    // Get the row code and calculate pick position (in the aisle)
    const rowCode = extractRowCode(step.item.locationName);
    const pickPosition = rowCode
      ? calculatePickPosition(binPosition, rowCode, false) // false = at ground level for routing
      : new Vector3(binPosition.x, GROUND_LEVEL, binPosition.z);

    // Check if we need to change aisles (significant Z position change)
    const sameAisle = Math.abs(lastPoint.z - pickPosition.z) < LAYOUT.ROW_SPACING;

    if (!sameAisle) {
      // Need to navigate through aisles - use AISLE CENTERS

      // 1. Go to ground level at current position
      if (lastPoint.y > GROUND_LEVEL) {
        points.push(new Vector3(lastPoint.x, GROUND_LEVEL, lastPoint.z));
      }

      // 2. Walk to the center of the front corridor
      points.push(new Vector3(lastPoint.x, GROUND_LEVEL, FRONT_AISLE_Z));

      // 3. Walk along the front corridor (center) to the target X position
      points.push(new Vector3(pickPosition.x, GROUND_LEVEL, FRONT_AISLE_Z));

      // 4. Walk into the pick position (already in the aisle)
      points.push(new Vector3(pickPosition.x, GROUND_LEVEL, pickPosition.z));
    } else {
      // Same aisle - walk directly

      // Go to ground level if needed
      if (lastPoint.y > GROUND_LEVEL) {
        points.push(new Vector3(lastPoint.x, GROUND_LEVEL, lastPoint.z));
      }

      // Walk along the aisle to the pick position
      // First go to the aisle Z (should already be in aisle)
      if (Math.abs(lastPoint.z - pickPosition.z) > 0.1) {
        points.push(new Vector3(lastPoint.x, GROUND_LEVEL, pickPosition.z));
      }

      // Then walk to the X position
      points.push(new Vector3(pickPosition.x, GROUND_LEVEL, pickPosition.z));
    }

    // Final destination: pick position at bin height (for visualization showing connection to bin)
    const finalPickPosition = rowCode
      ? calculatePickPosition(binPosition, rowCode, true) // true = at bin height
      : binPosition;
    points.push(finalPickPosition);
  }

  // Remove duplicate consecutive points
  const cleanedPoints: Vector3[] = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const prev = cleanedPoints[cleanedPoints.length - 1];
    const curr = points[i];
    if (prev.distanceTo(curr) > 0.1) {
      cleanedPoints.push(curr);
    }
  }

  return cleanedPoints;
}

/**
 * Format time in minutes and seconds
 */
export function formatEstimatedTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);

  if (mins === 0) {
    return `${secs}s`;
  }
  return `${mins}m ${secs}s`;
}

/**
 * Format distance in meters
 */
export function formatDistance(meters: number): string {
  if (meters < 1) {
    return `${Math.round(meters * 100)}cm`;
  }
  return `${meters.toFixed(1)}m`;
}
