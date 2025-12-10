
import { Vehicle, VehicleStatus, Order } from './types';

// Global Inventory Pool (Warehouse)
export const MOCK_ORDERS_POOL: Order[] = [
  {
    id: "SO-102",
    source: "Central Warehouse",
    destination: "Sector 7 Retail",
    status: 'PENDING',
    items: [
      { id: "ITM-001", name: "Small Table", refId: "5BIG-TBL", size: "Small - 4.5 kg", weightKg: 4.5, quantityAvailable: 10, quantityLoaded: 0 },
      { id: "ITM-002", name: "Big Tables", refId: "5BIG-TBL", size: "Medium - 5.5 kg", weightKg: 5.5, quantityAvailable: 20, quantityLoaded: 0 },
      { id: "ITM-003", name: "Box of five Big Tables", refId: "5BIG-TBL", size: "Big - 10.8 kg", weightKg: 10.8, quantityAvailable: 5, quantityLoaded: 0 },
    ],
    coordinates: { lat: 34.0522, lng: -118.2437 }
  },
  {
    id: "SO-104",
    source: "Central Warehouse",
    destination: "Distribution Hub Delta",
    status: 'PENDING',
    items: [
      { id: "ITM-004", name: "Grand Table", refId: "SML-TBL", size: "Medium - 5.5 kg", weightKg: 5.5, quantityAvailable: 12, quantityLoaded: 0 },
      { id: "ITM-005", name: "Lot of five Grand Tables", refId: "SML-TBL", size: "Very Big - 18.8 kg", weightKg: 18.8, quantityAvailable: 12, quantityLoaded: 0 },
    ],
    coordinates: { lat: 34.0922, lng: -118.3437 }
  },
  {
    id: "SO-106",
    source: "Annex Storage",
    destination: "Uptown Office",
    status: 'PENDING',
    items: [
      { id: "ITM-006", name: "Office Chair", refId: "OFF-CHR", size: "Medium - 7.0 kg", weightKg: 7.0, quantityAvailable: 50, quantityLoaded: 0 },
    ],
    coordinates: { lat: 34.0722, lng: -118.4437 }
  }
];

export const MOCK_VEHICLES: Vehicle[] = [
  {
    id: "TRUCK-102",
    name: "Kenworth T680",
    plate: "KW-9982",
    model: "Semi-Trailer Truck",
    capacityKg: 3500,
    currentLoadKg: 0,
    status: VehicleStatus.IDLE,
    location: "Warehouse A",
    image: "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?q=80&w=800&auto=format&fit=crop", 
    loadedOrders: [] 
  },
  {
    id: "VAN-404",
    name: "Peterbilt 579",
    plate: "PB-1123",
    model: "Box Truck",
    capacityKg: 3500,
    currentLoadKg: 1200,
    status: VehicleStatus.IN_ROUTE,
    location: "In Transit",
    image: "https://images.unsplash.com/photo-1586864387967-d02ef85d93e8?q=80&w=800&auto=format&fit=crop",
    loadedOrders: [
       {
        id: "SO-102-ACTIVE",
        source: "Warehouse A",
        destination: "Sector 7 Retail",
        status: 'LOADING', 
        coordinates: { lat: 34.0522, lng: -118.2437 },
        items: [
            { id: "ITM-001", name: "Small Table", refId: "5BIG-TBL", size: "Small - 4.5 kg", weightKg: 4.5, quantityAvailable: 10, quantityLoaded: 5 },
        ]
       }
    ]
  },
  {
    id: "TRUCK-407",
    name: "Hino 300",
    plate: "HN-5541",
    model: "Light Commercial Truck",
    capacityKg: 16000,
    currentLoadKg: 8500,
    status: VehicleStatus.IN_ROUTE,
    location: "Stop 2 - Unloading",
    image: "https://images.unsplash.com/photo-1616432043562-3671ea2e5242?q=80&w=800&auto=format&fit=crop",
    loadedOrders: [
      {
        id: "ORD-407-1",
        source: "Warehouse A",
        destination: "Tech Park Zone 1",
        status: 'DELIVERED',
        coordinates: { lat: 34.0400, lng: -118.2500 },
        items: [{ id: "I1", name: "Server Racks", refId: "SR-100", size: "Large", weightKg: 500, quantityAvailable: 2, quantityLoaded: 2 }]
      },
      {
        id: "ORD-407-2",
        source: "Warehouse A",
        destination: "Downtown Plaza",
        status: 'UNLOADING', // Currently here
        coordinates: { lat: 34.0488, lng: -118.2518 },
        items: [{ id: "I2", name: "Office Desks", refId: "OD-20", size: "Medium", weightKg: 2000, quantityAvailable: 10, quantityLoaded: 10 }]
      },
      {
        id: "ORD-407-3",
        source: "Warehouse A",
        destination: "Westside Pavilion",
        status: 'PENDING',
        coordinates: { lat: 34.0550, lng: -118.2600 },
        items: [{ id: "I3", name: "Chairs", refId: "CH-50", size: "Small", weightKg: 1000, quantityAvailable: 50, quantityLoaded: 50 }]
      },
      {
        id: "ORD-407-4",
        source: "Warehouse A",
        destination: "Santa Monica Hub",
        status: 'PENDING',
        coordinates: { lat: 34.0195, lng: -118.4912 },
        items: [{ id: "I4", name: "Monitors", refId: "MN-200", size: "Fragile", weightKg: 5000, quantityAvailable: 100, quantityLoaded: 100 }]
      }
    ]
  },
  {
    id: "TRUCK-802",
    name: "Foton Aumark",
    plate: "FT-8892",
    model: "Refrigerated Truck",
    capacityKg: 49000,
    currentLoadKg: 24000,
    status: VehicleStatus.IN_ROUTE,
    location: "En route to Stop 3",
    image: "https://images.unsplash.com/photo-1605806616949-1e87b487bc2a?q=80&w=800&auto=format&fit=crop",
    loadedOrders: [
      {
        id: "ORD-802-1",
        source: "HQ",
        destination: "Stop 1: Industrial District",
        status: 'DELIVERED',
        coordinates: { lat: 34.0300, lng: -118.2300 },
        items: [{ id: "J1", name: "Steel Beams", refId: "SB-01", size: "XL", weightKg: 5000, quantityAvailable: 5, quantityLoaded: 5 }]
      },
      {
        id: "ORD-802-2",
        source: "HQ",
        destination: "Stop 2: Logistics Center",
        status: 'DELIVERED',
        coordinates: { lat: 34.0450, lng: -118.2400 },
        items: [{ id: "J2", name: "Concrete Mix", refId: "CM-99", size: "Palette", weightKg: 8000, quantityAvailable: 10, quantityLoaded: 10 }]
      },
      {
        id: "ORD-802-3",
        source: "HQ",
        destination: "Stop 3: Construction Site Alpha",
        status: 'PENDING',
        coordinates: { lat: 34.0600, lng: -118.2800 }, // Heading here
        items: [{ id: "J3", name: "Glass Panels", refId: "GP-22", size: "Fragile", weightKg: 4000, quantityAvailable: 20, quantityLoaded: 20 }]
      },
      {
        id: "ORD-802-4",
        source: "HQ",
        destination: "Stop 4: Storage Unit 9",
        status: 'PENDING',
        coordinates: { lat: 34.0750, lng: -118.3200 },
        items: [{ id: "J4", name: "Insulation Rolls", refId: "IR-55", size: "Large", weightKg: 3000, quantityAvailable: 50, quantityLoaded: 50 }]
      },
      {
        id: "ORD-802-5",
        source: "HQ",
        destination: "Stop 5: Final Depot",
        status: 'PENDING',
        coordinates: { lat: 34.1000, lng: -118.3500 },
        items: [{ id: "J5", name: "Tools", refId: "TL-100", size: "Small", weightKg: 4000, quantityAvailable: 200, quantityLoaded: 200 }]
      }
    ]
  }
];
