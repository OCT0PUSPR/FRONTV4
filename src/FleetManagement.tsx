import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../context/theme';
import { MOCK_VEHICLES, MOCK_ORDERS_POOL } from './components/FleetManagement/contants';
import { Vehicle, VehicleStatus, Order, normalizeVehicle, normalizeOrder } from './components/FleetManagement/types';
import LoadingView from './components/FleetManagement/LoadingView';
import RouteView from './components/FleetManagement/RouteView';
import VehicleCard from './components/FleetManagement/VehicleCard';
import { LayoutGrid, Plus, Bell, X, Search, Settings, Loader2, Upload, Image as ImageIcon } from 'lucide-react';
import * as fleetApi from './components/FleetManagement/fleetApi';

const GLOBAL_STYLES = `
  :root {
    --font-primary: 'Space Grotesk', sans-serif;
  }
  body {
    font-family: var(--font-primary);
    background-color: #f8fafc;
    color: #18181b;
    overflow: hidden;
    margin: 0;
    padding: 0;
  }
  
  /* Premium Scrollbar */
  ::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  ::-webkit-scrollbar-track {
    background: transparent; 
  }
  ::-webkit-scrollbar-thumb {
    background: #cbd5e1; 
    border-radius: 3px;
  }
  ::-webkit-scrollbar-thumb:hover {
    background: #94a3b8; 
  }
  
  .custom-scrollbar {
    scrollbar-width: thin;
    scrollbar-color: #cbd5e1 transparent;
  }

  /* Animations */
  @keyframes slide-up-fade {
    0% { opacity: 0; transform: translateY(12px) scale(0.98); }
    100% { opacity: 1; transform: translateY(0) scale(1); }
  }
  
  .animate-enter {
    animation: slide-up-fade 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  /* Stripe Animation for Progress Bar */
  @keyframes stripe-move {
    0% { background-position: 0 0; }
    100% { background-position: 40px 0; }
  }

  /* Leaflet Customization */
  .leaflet-control-attribution {
    background: rgba(0,0,0,0.2) !important;
    color: #71717a !important;
    font-size: 9px !important;
    backdrop-filter: blur(4px);
  }
  .custom-marker-icon {
    background: transparent;
    border: none;
  }
  
  /* Leaflet Popup overrides for dark mode feel if needed */
  .leaflet-popup-content-wrapper {
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(8px);
    border-radius: 16px;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
  }
  .leaflet-popup-tip {
    background: rgba(255, 255, 255, 0.95);
  }
`;

// Helper to inject scripts/styles
const loadResource = (type: 'script' | 'style', src: string, id: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (document.getElementById(id)) {
            resolve();
            return;
        }

        let element: HTMLElement;
        if (type === 'script') {
            const script = document.createElement('script');
            script.src = src;
            script.id = id;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
            element = script;
        } else {
            const link = document.createElement('link');
            link.href = src;
            link.rel = 'stylesheet';
            link.id = id;
            if (id.includes('font')) {
                 link.setAttribute('crossorigin', '');
            }
            element = link;
            resolve(); 
        }
        document.head.appendChild(element);
    });
};

const FleetManagementPage: React.FC = () => {
  const { mode, colors } = useTheme();
  const isDarkMode = mode === "dark";

  // State
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [ordersPool, setOrdersPool] = useState<Order[]>([]); // Global Inventory
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | number>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [resourcesLoaded, setResourcesLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [imageBase64, setImageBase64] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [useMockData, setUseMockData] = useState(false); // Toggle for demo mode

  // Load data from API
  const loadData = async () => {
    setIsLoading(true);
    try {
      if (useMockData) {
        // Use mock data for demo
        setVehicles(MOCK_VEHICLES.map(v => normalizeVehicle(v)));
        setOrdersPool(MOCK_ORDERS_POOL.map(o => normalizeOrder(o)));
        if (MOCK_VEHICLES.length > 0) {
          setSelectedVehicleId(MOCK_VEHICLES[0].id);
        }
      } else {
        // Fetch from API
        const [vehiclesData, ordersData] = await Promise.all([
          fleetApi.fetchVehicles(),
          fleetApi.fetchOrdersPool()
        ]);
        setVehicles(vehiclesData);
        setOrdersPool(ordersData);
        if (vehiclesData.length > 0) {
          setSelectedVehicleId(vehiclesData[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to load fleet data:', error);
      // Fallback to mock data on error
      setVehicles(MOCK_VEHICLES.map(v => normalizeVehicle(v)));
      setOrdersPool(MOCK_ORDERS_POOL.map(o => normalizeOrder(o)));
      if (MOCK_VEHICLES.length > 0) {
        setSelectedVehicleId(MOCK_VEHICLES[0].id);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Load Resources on Mount
  useEffect(() => {
    const initResources = async () => {
        try {
            // Fonts are loaded via local @font-face in index.css (Space Grotesk)
            
            // Load Leaflet CSS
            await loadResource('style', 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css', 'leaflet-css');

            // Load Scripts
            await Promise.all([
                loadResource('script', 'https://cdn.tailwindcss.com', 'tailwind-script'),
                loadResource('script', 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js', 'leaflet-script')
            ]);
            
            // Load data
            await loadData();
            
            // Artificial small delay to ensure styles apply before render to avoid FOUC
            setTimeout(() => setResourcesLoaded(true), 200);
        } catch (e) {
            console.error("Failed to load resources", e);
            setResourcesLoaded(true);
        }
    };

    initResources();
  }, [useMockData]);

  // Derived
  const selectedVehicle = vehicles.find(v => String(v.id) === String(selectedVehicleId)) || vehicles[0];

  const getOrdersWithVehicleContext = (vehicleId: string | number) => {
    // Find the vehicle
    const vehicle = vehicles.find(v => String(v.id) === String(vehicleId));
    if (!vehicle) return ordersPool;

    // We want to return the structure of ordersPool, but with `quantityLoaded` set to what is on THIS vehicle.
    return ordersPool.map(poolOrder => {
      // Check if this order exists in the vehicle's loadedOrders
      const vehicleOrder = vehicle.loadedOrders.find(vo => vo.id === poolOrder.id);
      
      return {
        ...poolOrder,
        items: poolOrder.items.map(poolItem => {
          // Find item in vehicle order
          const vehicleItem = vehicleOrder?.items.find(vi => vi.id === poolItem.id);
          return {
            ...poolItem,
            quantityLoaded: vehicleItem ? vehicleItem.quantityLoaded : 0
          };
        })
      };
    });
  };

  const handleUpdateLoad = async (vehicleId: string | number, orderId: string | number, itemId: string | number, newQuantity: number) => {
    // Update locally first for immediate feedback
    setVehicles(prevVehicles => prevVehicles.map(v => {
      if (String(v.id) !== String(vehicleId)) return v;

      // Deep copy loadedOrders to modify
      const newLoadedOrders = [...v.loadedOrders];
      let orderIndex = newLoadedOrders.findIndex(o => String(o.id) === String(orderId));

      if (orderIndex === -1 && newQuantity > 0) {
        // Add order to vehicle if not present and we are adding items
        const poolOrder = ordersPool.find(o => String(o.id) === String(orderId));
        if (poolOrder) {
            // Create a clone of the order for the vehicle, initially with 0 items loaded
            newLoadedOrders.push({
                ...poolOrder,
                items: poolOrder.items.map(i => ({...i, quantityLoaded: 0}))
            });
            orderIndex = newLoadedOrders.length - 1;
        }
      }

      if (orderIndex !== -1) {
        const order = newLoadedOrders[orderIndex];
        const itemIndex = order.items.findIndex(i => String(i.id) === String(itemId));
        
        if (itemIndex !== -1) {
            const item = order.items[itemIndex];
            // Update quantity
            order.items[itemIndex] = { ...item, quantityLoaded: newQuantity };
        }
      }

      // Recalculate total weight
      const totalWeight = newLoadedOrders.reduce((acc, order) => {
          return acc + order.items.reduce((sum, item) => sum + ((item.weightKg || item.weight_kg || 0) * (item.quantityLoaded || 0)), 0);
      }, 0);

      return {
          ...v,
          loadedOrders: newLoadedOrders,
          currentLoadKg: totalWeight
      };
    }));

    // Also update via API if not using mock data
    if (!useMockData) {
      try {
        await fleetApi.updateItemLoad(vehicleId, orderId, itemId, newQuantity);
      } catch (error) {
        console.error('Failed to update item load:', error);
      }
    }
  };

  // Handle image file selection
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const base64 = await fleetApi.compressImageToBase64(file, 800, 0.8);
        setImageBase64(base64);
        setImagePreview(base64);
      } catch (error) {
        console.error('Failed to process image:', error);
      }
    }
  };

  // Add Vehicle Logic
  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    
    // Default fallback image if none provided
    const defaultImage = "https://images.unsplash.com/photo-1519003722824-194d4455a60c?q=80&w=800&auto=format&fit=crop";

    const vehicleData = {
      name: formData.get('name') as string,
      plate: formData.get('plate') as string,
      model: formData.get('model') as string,
      capacity_kg: Number(formData.get('capacity')),
      location: (formData.get('location') as string) || 'Warehouse A',
      image_base64: imageBase64 || undefined,
      image_url: imageBase64 ? undefined : defaultImage
    };

    try {
      if (useMockData) {
        // Mock mode - add locally
        const newVehicle: Vehicle = {
          id: `TRUCK-${Math.floor(Math.random() * 1000)}`,
          name: vehicleData.name,
          plate: vehicleData.plate,
          model: vehicleData.model,
          capacityKg: vehicleData.capacity_kg,
          currentLoadKg: 0,
          status: VehicleStatus.IDLE,
          location: vehicleData.location,
          image: vehicleData.image_base64 || vehicleData.image_url || defaultImage,
          loadedOrders: []
        };
        setVehicles(prev => [...prev, newVehicle]);
      } else {
        // API mode - create via API
        const newVehicle = await fleetApi.createVehicle(vehicleData);
        setVehicles(prev => [...prev, newVehicle]);
      }
      
      setIsModalOpen(false);
      setImagePreview('');
      setImageBase64('');
      form.reset();
    } catch (error) {
      console.error('Failed to add vehicle:', error);
      alert('Failed to add vehicle. Please try again.');
    }
  };

  // Add Order Logic
  const handleAddOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    
    const orderData = {
      source: formData.get('source') as string,
      destination: formData.get('destination') as string,
      latitude: Number(formData.get('latitude')) || 34.0522,
      longitude: Number(formData.get('longitude')) || -118.2437,
      priority: (formData.get('priority') as string) || 'NORMAL',
      customer_name: formData.get('customer_name') as string,
      customer_phone: formData.get('customer_phone') as string,
      customer_email: formData.get('customer_email') as string,
      delivery_instructions: formData.get('delivery_instructions') as string,
      items: [] as any[]
    };

    // Parse items from form
    const itemName = formData.get('item_name') as string;
    const itemWeight = Number(formData.get('item_weight')) || 0;
    const itemQuantity = Number(formData.get('item_quantity')) || 1;
    const itemSize = formData.get('item_size') as string;

    if (itemName) {
      orderData.items.push({
        name: itemName,
        weight_kg: itemWeight,
        quantity_ordered: itemQuantity,
        quantity_available: itemQuantity,
        size: itemSize || `${itemWeight} kg`
      });
    }

    try {
      if (useMockData) {
        // Mock mode - add locally
        const newOrder: Order = {
          id: `SO-${Math.floor(Math.random() * 10000)}`,
          source: orderData.source,
          destination: orderData.destination,
          status: 'PENDING',
          priority: orderData.priority as any,
          customer_name: orderData.customer_name,
          coordinates: { lat: orderData.latitude, lng: orderData.longitude },
          items: orderData.items.map((item, idx) => ({
            id: `ITEM-${Date.now()}-${idx}`,
            name: item.name,
            refId: `REF-${Math.floor(Math.random() * 1000)}`,
            size: item.size,
            weightKg: item.weight_kg,
            quantityAvailable: item.quantity_available,
            quantityLoaded: 0
          }))
        };
        setOrdersPool(prev => [...prev, newOrder]);
      } else {
        // API mode
        const newOrder = await fleetApi.createOrder(orderData);
        setOrdersPool(prev => [...prev, newOrder]);
      }
      
      setIsOrderModalOpen(false);
      form.reset();
    } catch (error) {
      console.error('Failed to add order:', error);
      alert('Failed to add order. Please try again.');
    }
  };

  const ordersForView = selectedVehicle ? getOrdersWithVehicleContext(selectedVehicle.id) : [];

  if (!resourcesLoaded) {
      return (
          <div className="flex flex-col items-center justify-center h-screen w-full" style={{ backgroundColor: colors.background }}>
              <Loader2 className="animate-spin mb-4" size={40} style={{ color: colors.action }} />
              <div className="font-medium" style={{ color: colors.textSecondary }}>Initializing OctopusFleet...</div>
              <style>{GLOBAL_STYLES}</style>
          </div>
      );
  }

  return (
    <>
      <style>{GLOBAL_STYLES}</style>
      <div className="flex h-screen w-full overflow-hidden font-sans" style={{ backgroundColor: colors.background, color: colors.textPrimary }}>

        {/* Sidebar */}
        <aside className="w-80 h-full flex flex-col z-30 shadow-xl" style={{ backgroundColor: colors.card, borderRight: `1px solid ${colors.border}`, boxShadow: isDarkMode ? '0 0 20px rgba(0,0,0,0.5)' : '0 4px 20px rgba(0,0,0,0.08)' }}>
          <div className="p-6 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ backgroundColor: colors.action, boxShadow: '0 4px 12px rgba(79, 172, 254, 0.4)' }}>
                  <LayoutGrid size={20} />
              </div>
              <div>
                  <h1 className="text-xl font-bold tracking-tight" style={{ color: colors.textPrimary }}>Octopus<span style={{ color: colors.action }}>Fleet</span></h1>
                  <p className="text-xs font-medium tracking-wide" style={{ color: colors.textSecondary }}>LOGISTICS OS v2.0</p>
              </div>
          </div>

          <div className="px-6 mb-4">
              <div className="relative">
                  <Search className="absolute left-3 top-2.5" size={16} style={{ color: colors.textSecondary }} />
                  <input
                      type="text"
                      placeholder="Search fleet..."
                      className="w-full rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 transition-all"
                      style={{ backgroundColor: colors.mutedBg, borderColor: colors.border, color: colors.textPrimary }}
                  />
              </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-1 custom-scrollbar">
              <div className="px-2 mb-2 flex justify-between items-center text-xs font-bold uppercase tracking-wider" style={{ color: colors.textSecondary }}>
                  <span>Active Fleet</span>
                  <span style={{ color: colors.textPrimary }}>{vehicles.length}</span>
              </div>
              {vehicles.map(vehicle => (
                  <VehicleCard
                      key={String(vehicle.id)}
                      vehicle={vehicle}
                      isSelected={String(vehicle.id) === String(selectedVehicleId)}
                      onClick={() => setSelectedVehicleId(vehicle.id)}
                  />
              ))}
          </div>

          <div className="p-4 border-t space-y-2" style={{ borderTop: `1px solid ${colors.border}`, backgroundColor: colors.mutedBg }}>
              <button
                  onClick={() => setIsModalOpen(true)}
                  className="w-full py-3 rounded-xl border border-dashed transition-all flex items-center justify-center gap-2 text-sm font-bold"
                  style={{ borderColor: colors.border, color: colors.textSecondary }}
              >
                  <Plus size={16} /> Register New Vehicle
              </button>
              <button
                  onClick={() => setIsOrderModalOpen(true)}
                  className="w-full py-3 rounded-xl border border-dashed transition-all flex items-center justify-center gap-2 text-sm font-bold"
                  style={{ borderColor: colors.success, color: colors.success }}
              >
                  <Plus size={16} /> Create New Order
              </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 h-full relative overflow-hidden flex flex-col">
          {/* View Content */}
          <div className="flex-1 overflow-hidden relative">
              {isLoading ? (
                  <div className="flex items-center justify-center h-full">
                      <Loader2 className="animate-spin text-indigo-600" size={32} />
                  </div>
              ) : !selectedVehicle ? (
                  <div className="flex flex-col items-center justify-center h-full text-zinc-400">
                      <p>No vehicles found. Add a vehicle to get started.</p>
                  </div>
              ) : selectedVehicle.status === VehicleStatus.IN_ROUTE ? (
                  <RouteView vehicle={selectedVehicle} />
              ) : (
                  <LoadingView 
                      key={String(selectedVehicle.id)} 
                      vehicle={selectedVehicle}
                      poolOrders={ordersForView}
                      onUpdateLoad={handleUpdateLoad}
                  />
              )}
          </div>
        </main>

        {/* Add Vehicle Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-enter">
              <div className="rounded-2xl shadow-2xl w-full max-w-md p-8 transform transition-all max-h-[90vh] overflow-y-auto" style={{ backgroundColor: colors.card }}>
                  <div className="flex justify-between items-center mb-6">
                      <h2 className="text-2xl font-bold" style={{ color: colors.textPrimary }}>Add Vehicle</h2>
                      <button onClick={() => { setIsModalOpen(false); setImagePreview(''); setImageBase64(''); }} style={{ color: colors.textSecondary }}>
                          <X size={24} />
                      </button>
                  </div>

                  <form onSubmit={handleAddVehicle} className="space-y-4">
                      <div>
                          <label className="block text-sm font-medium mb-1" style={{ color: colors.textSecondary }}>Vehicle Name</label>
                          <input name="name" required placeholder="e.g. Red Hauler" className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2" style={{ borderColor: colors.border, color: colors.textPrimary }} />
                      </div>
                      <div>
                          <label className="block text-sm font-medium mb-1" style={{ color: colors.textSecondary }}>Model</label>
                          <input name="model" required placeholder="e.g. Ford F-150" className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2" style={{ borderColor: colors.border, color: colors.textPrimary }} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-sm font-medium mb-1" style={{ color: colors.textSecondary }}>Plate Number</label>
                              <input name="plate" required placeholder="XYZ-123" className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2" style={{ borderColor: colors.border, color: colors.textPrimary }} />
                          </div>
                          <div>
                              <label className="block text-sm font-medium mb-1" style={{ color: colors.textSecondary }}>Capacity (kg)</label>
                              <input name="capacity" type="number" required placeholder="3500" className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2" style={{ borderColor: colors.border, color: colors.textPrimary }} />
                          </div>
                      </div>

                      {/* Image Upload */}
                      <div>
                          <label className="block text-sm font-medium mb-1" style={{ color: colors.textSecondary }}>Vehicle Image</label>
                          <div className="flex items-center gap-4">
                              <input
                                  ref={fileInputRef}
                                  type="file"
                                  accept="image/*"
                                  onChange={handleImageChange}
                                  className="hidden"
                              />
                              <button
                                  type="button"
                                  onClick={() => fileInputRef.current?.click()}
                                  className="flex items-center gap-2 px-4 py-2 rounded-lg border text-sm transition-colors"
                                  style={{ borderColor: colors.border, color: colors.textSecondary }}
                              >
                                  <Upload size={16} /> Upload Image
                              </button>
                              {imagePreview && (
                                  <div className="w-16 h-16 rounded-lg overflow-hidden border" style={{ borderColor: colors.border }}>
                                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                  </div>
                              )}
                          </div>
                      </div>

                      <button type="submit" className="w-full font-bold py-3 rounded-xl mt-4 transition-colors shadow-lg text-white" style={{ background: colors.action, boxShadow: '0 4px 12px rgba(79, 172, 254, 0.4)' }}>
                          Add to Fleet
                      </button>
                  </form>
              </div>
          </div>
        )}

        {/* Add Order Modal */}
        {isOrderModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-enter">
              <div className="rounded-2xl shadow-2xl w-full max-w-lg p-8 transform transition-all max-h-[90vh] overflow-y-auto" style={{ backgroundColor: colors.card }}>
                  <div className="flex justify-between items-center mb-6">
                      <h2 className="text-2xl font-bold" style={{ color: colors.textPrimary }}>Create Order</h2>
                      <button onClick={() => setIsOrderModalOpen(false)} style={{ color: colors.textSecondary }}>
                          <X size={24} />
                      </button>
                  </div>

                  <form onSubmit={handleAddOrder} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-sm font-medium mb-1" style={{ color: colors.textSecondary }}>Source</label>
                              <input name="source" required placeholder="Central Warehouse" className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2" style={{ borderColor: colors.border, color: colors.textPrimary }} />
                          </div>
                          <div>
                              <label className="block text-sm font-medium mb-1" style={{ color: colors.textSecondary }}>Destination</label>
                              <input name="destination" required placeholder="Sector 7 Retail" className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2" style={{ borderColor: colors.border, color: colors.textPrimary }} />
                          </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-sm font-medium mb-1" style={{ color: colors.textSecondary }}>Latitude</label>
                              <input name="latitude" type="number" step="any" placeholder="34.0522" className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2" style={{ borderColor: colors.border, color: colors.textPrimary }} />
                          </div>
                          <div>
                              <label className="block text-sm font-medium mb-1" style={{ color: colors.textSecondary }}>Longitude</label>
                              <input name="longitude" type="number" step="any" placeholder="-118.2437" className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2" style={{ borderColor: colors.border, color: colors.textPrimary }} />
                          </div>
                      </div>

                      <div>
                          <label className="block text-sm font-medium mb-1" style={{ color: colors.textSecondary }}>Priority</label>
                          <select name="priority" className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2" style={{ borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.mutedBg }}>
                              <option value="LOW">Low</option>
                              <option value="NORMAL" selected>Normal</option>
                              <option value="HIGH">High</option>
                              <option value="URGENT">Urgent</option>
                          </select>
                      </div>

                      <div className="border-t pt-4 mt-4" style={{ borderTop: `1px solid ${colors.border}` }}>
                          <h3 className="text-sm font-bold mb-3" style={{ color: colors.textPrimary }}>Customer Info</h3>
                          <div className="grid grid-cols-2 gap-4">
                              <div>
                                  <label className="block text-sm font-medium mb-1" style={{ color: colors.textSecondary }}>Name</label>
                                  <input name="customer_name" placeholder="John Doe" className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2" style={{ borderColor: colors.border, color: colors.textPrimary }} />
                              </div>
                              <div>
                                  <label className="block text-sm font-medium mb-1" style={{ color: colors.textSecondary }}>Phone</label>
                                  <input name="customer_phone" placeholder="+1-555-0123" className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2" style={{ borderColor: colors.border, color: colors.textPrimary }} />
                              </div>
                          </div>
                          <div className="mt-4">
                              <label className="block text-sm font-medium mb-1" style={{ color: colors.textSecondary }}>Email</label>
                              <input name="customer_email" type="email" placeholder="customer@example.com" className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2" style={{ borderColor: colors.border, color: colors.textPrimary }} />
                          </div>
                      </div>

                      <div className="border-t pt-4 mt-4" style={{ borderTop: `1px solid ${colors.border}` }}>
                          <h3 className="text-sm font-bold mb-3" style={{ color: colors.textPrimary }}>Item Details</h3>
                          <div className="grid grid-cols-2 gap-4">
                              <div>
                                  <label className="block text-sm font-medium mb-1" style={{ color: colors.textSecondary }}>Item Name</label>
                                  <input name="item_name" placeholder="Office Chair" className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2" style={{ borderColor: colors.border, color: colors.textPrimary }} />
                              </div>
                              <div>
                                  <label className="block text-sm font-medium mb-1" style={{ color: colors.textSecondary }}>Size</label>
                                  <input name="item_size" placeholder="Medium" className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2" style={{ borderColor: colors.border, color: colors.textPrimary }} />
                              </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4 mt-4">
                              <div>
                                  <label className="block text-sm font-medium mb-1" style={{ color: colors.textSecondary }}>Weight (kg)</label>
                                  <input name="item_weight" type="number" step="0.1" placeholder="5.5" className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2" style={{ borderColor: colors.border, color: colors.textPrimary }} />
                              </div>
                              <div>
                                  <label className="block text-sm font-medium mb-1" style={{ color: colors.textSecondary }}>Quantity</label>
                                  <input name="item_quantity" type="number" placeholder="10" className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2" style={{ borderColor: colors.border, color: colors.textPrimary }} />
                              </div>
                          </div>
                      </div>

                      <div>
                          <label className="block text-sm font-medium mb-1" style={{ color: colors.textSecondary }}>Delivery Instructions</label>
                          <textarea name="delivery_instructions" rows={2} placeholder="Special handling notes..." className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 resize-none" style={{ borderColor: colors.border, color: colors.textPrimary }} />
                      </div>

                      <button type="submit" className="w-full font-bold py-3 rounded-xl mt-4 transition-colors shadow-lg text-white" style={{ background: colors.success, boxShadow: '0 4px 12px rgba(201, 245, 197, 0.5)' }}>
                          Create Order
                      </button>
                  </form>
              </div>
          </div>
        )}
      </div>
    </>
  );
};

export default FleetManagementPage;
