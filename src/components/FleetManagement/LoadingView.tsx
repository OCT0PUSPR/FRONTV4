
import React, { useState, useEffect, useMemo } from 'react';
import { Vehicle, Order } from './types';
import { ArrowRight, Minus, Plus, Box, ArrowDown, ArrowUp, Zap, Map } from 'lucide-react';

interface Props {
  vehicle: Vehicle;
  poolOrders: Order[]; // Global pool of orders
  onUpdateLoad: (vehicleId: string | number, orderId: string | number, itemId: string | number, newQuantity: number) => void;
}

const LoadingView: React.FC<Props> = ({ vehicle, poolOrders, onUpdateLoad }) => {
  // We manage a local route order state. 
  // Initial state is the order in which they appear in vehicle.loadedOrders
  const [routeOrder, setRouteOrder] = useState<(string | number)[]>([]);

  // Normalize vehicle properties
  const capacityKg = vehicle.capacityKg || vehicle.capacity_kg || 0;
  const currentLoadKg = vehicle.currentLoadKg || vehicle.current_load_kg || 0;
  const vehicleImage = vehicle.image || vehicle.image_base64 || vehicle.image_url || '';
  const vehicleId = vehicle.vehicle_id || vehicle.id;

  // Calculate stats
  const currentLoad = useMemo(() => {
    return currentLoadKg;
  }, [currentLoadKg]);

  const capacityPct = capacityKg > 0 ? Math.min((currentLoad / capacityKg) * 100, 100) : 0;

  // Sync route order with loaded orders initially
  useEffect(() => {
    const loadedIds = vehicle.loadedOrders.map(o => String(o.id));
    // If we have a stored route order, we want to keep it, but ensure all loaded orders are in it
    // and removed orders are out.
    setRouteOrder(prev => {
        const uniqueIds = new Set([...prev.map(String), ...loadedIds]);
        return Array.from(uniqueIds).filter(id => loadedIds.includes(String(id)));
    });
  }, [vehicle.loadedOrders]);

  // Loading Logic: First Out (First Delivery) -> Last In (Loaded near door)
  // Therefore: Last Out (Last Delivery) -> First In (Loaded deep in truck)
  const loadingInstructions = useMemo(() => {
     // The delivery route is the 'routeOrder'.
     // 1. First Stop
     // 2. Second Stop
     // 3. Last Stop
     
     // Loading Plan (LIFO based on Stops):
     // 1. Load Last Stop items (Deepest)
     // 2. Load Second Stop items
     // 3. Load First Stop items (Door)
     
     const reverseRoute = [...routeOrder].reverse();
     
     return reverseRoute.map((orderId, index) => {
         const order = vehicle.loadedOrders.find(o => o.id === orderId);
         if (!order) return null;
         
         const itemCount = order.items.reduce((acc, i) => acc + i.quantityLoaded, 0);
         if (itemCount === 0) return null;

         return {
             step: index + 1,
             orderId: order.id,
             destination: order.destination,
             instruction: index === 0 
                ? "Load FIRST (Deepest in truck)" 
                : index === reverseRoute.length - 1 
                    ? "Load LAST (Near door)" 
                    : "Load next",
             items: order.items.filter(i => i.quantityLoaded > 0)
         };
     }).filter(Boolean);
  }, [routeOrder, vehicle.loadedOrders]);

  const moveStop = (index: number, direction: 'up' | 'down') => {
      const newOrder = [...routeOrder];
      if (direction === 'up' && index > 0) {
          [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];
      } else if (direction === 'down' && index < newOrder.length - 1) {
          [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
      }
      setRouteOrder(newOrder);
  };

  const optimizeRoute = () => {
    // Simple "Nearest Neighbor" logic starting from Warehouse (Jebel Ali)
    // Jebel Ali approx: 24.9857, 55.0273
    let currentLocation = { lat: 24.9857, lng: 55.0273 };
    const remainingOrders = [...vehicle.loadedOrders];
    const optimizedIds: string[] = [];

    while (remainingOrders.length > 0) {
        let nearestIndex = -1;
        let minDist = Infinity;

        remainingOrders.forEach((order, idx) => {
            const d = Math.sqrt(
                Math.pow(order.coordinates.lat - currentLocation.lat, 2) + 
                Math.pow(order.coordinates.lng - currentLocation.lng, 2)
            );
            if (d < minDist) {
                minDist = d;
                nearestIndex = idx;
            }
        });

        if (nearestIndex !== -1) {
            const nearest = remainingOrders[nearestIndex];
            optimizedIds.push(String(nearest.id));
            currentLocation = nearest.coordinates;
            remainingOrders.splice(nearestIndex, 1);
        }
    }
    setRouteOrder(optimizedIds);
  };

  return (
    <div className="h-full flex flex-col bg-[#F8FAFC]">
      {/* Top Section: Vehicle Viz & Capacity */}
      <div className="bg-white border-b border-zinc-200 px-8 py-8 shadow-sm z-10">
        <div className="flex flex-col md:flex-row items-center gap-12 max-w-7xl mx-auto">
             
             {/* Truck Visual */}
             <div className="relative w-full md:w-1/2 h-64 flex items-center justify-center bg-zinc-50 rounded-3xl border border-zinc-100 overflow-hidden">
                {vehicleImage ? (
                    <img 
                        src={vehicleImage} 
                        className="w-full h-full object-contain p-4 z-10 relative animate-enter" 
                        alt="Truck Visualization"
                    />
                ) : (
                    <div className="flex flex-col items-center gap-2 z-10 relative opacity-50">
                        <div className="w-12 h-12 border-4 border-zinc-300 border-t-indigo-500 rounded-full animate-spin"></div>
                    </div>
                )}
                
                {/* Capacity Overlay */}
                <div className="absolute inset-0 z-0">
                    <div className="absolute bottom-0 left-0 w-full bg-indigo-50/50 transition-all duration-700" style={{ height: `${capacityPct}%` }} />
                </div>

                <div className="absolute top-6 right-6 text-right z-20">
                    <div className="text-5xl font-extrabold text-zinc-900 tracking-tight">
                        {Math.round(capacityPct)}<span className="text-2xl text-zinc-400">%</span>
                    </div>
                    <div className="text-sm font-medium text-zinc-500 uppercase tracking-wide mt-1">Loaded</div>
                    <div className="text-xs font-mono text-zinc-400 mt-1">{currentLoad}kg / {capacityKg}kg</div>
                </div>
             </div>

             {/* Vehicle Info */}
             <div className="w-full md:w-1/2 space-y-6">
                <div>
                    <h1 className="text-3xl font-bold text-zinc-900 mb-1">{vehicle.id}</h1>
                    <p className="text-zinc-500 font-medium text-lg">{vehicle.name} <span className="text-zinc-300 mx-2">|</span> {vehicle.model}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                        <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Location</div>
                        <div className="font-semibold text-zinc-800 flex items-center gap-2">
                             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                             {vehicle.location}
                        </div>
                    </div>
                    <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                         <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2 flex justify-between">
                            Loading Strategy
                         </div>
                         <div className="font-semibold text-indigo-700 flex items-center gap-2">
                             <ArrowUp size={16} /> First Out, Last In (LIFO)
                         </div>
                         <div className="text-[10px] text-zinc-400 mt-1">Based on Route Order</div>
                    </div>
                </div>
             </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex max-w-7xl mx-auto w-full">
         
         {/* Left: Global Inventory */}
         <div className="flex-1 overflow-hidden flex flex-col border-r border-zinc-200">
             <div className="px-6 py-4 border-b border-zinc-100 flex justify-between items-center bg-white sticky top-0 z-10">
                <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
                    Available Orders <span className="bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded-full text-xs">Global Inventory</span>
                </h2>
             </div>

             <div className="flex-1 overflow-y-auto px-6 py-4 pb-40 custom-scrollbar space-y-4">
                {poolOrders.map((order) => (
                    <div key={order.id} className="bg-white rounded-xl border border-zinc-100 shadow-sm overflow-hidden group hover:border-indigo-200 transition-colors">
                        <div className="bg-zinc-50/50 px-4 py-2 border-b border-zinc-100 flex justify-between items-center">
                            <div>
                                <span className="font-bold text-sm text-zinc-900 block">{order.destination}</span>
                                <span className="text-[10px] text-zinc-400 font-mono">Order: {order.id}</span>
                            </div>
                            <span className="text-xs font-medium text-zinc-500">{order.items.length} Items</span>
                        </div>
                        <div className="divide-y divide-zinc-50">
                            {order.items.map((item) => {
                                const isFullyLoaded = item.quantityLoaded >= item.quantityAvailable;
                                return (
                                    <div key={item.id} className="grid grid-cols-12 gap-2 px-4 py-3 items-center">
                                        <div className="col-span-6">
                                            <div className="font-medium text-zinc-800 text-sm">{item.name}</div>
                                            <div className="text-[10px] text-zinc-400">{item.weightKg} kg • {item.size}</div>
                                        </div>
                                        <div className="col-span-6 flex justify-end">
                                            <div className={`flex items-center gap-1 p-1 rounded-lg border ${item.quantityLoaded > 0 ? 'bg-indigo-50 border-indigo-100' : 'bg-white border-zinc-200'}`}>
                                                <button 
                                                    onClick={() => onUpdateLoad(vehicle.id, order.id, item.id, item.quantityLoaded - 1)}
                                                    disabled={item.quantityLoaded <= 0}
                                                    className="w-6 h-6 flex items-center justify-center rounded hover:bg-white text-zinc-500 disabled:opacity-30"
                                                >
                                                    <Minus size={12} />
                                                </button>
                                                <div className="w-12 text-center">
                                                    <span className={`text-sm font-bold ${item.quantityLoaded > 0 ? 'text-indigo-600' : 'text-zinc-900'}`}>{item.quantityLoaded}</span>
                                                    <span className="text-[10px] text-zinc-400 ml-1">/ {item.quantityAvailable}</span>
                                                </div>
                                                <button 
                                                    onClick={() => onUpdateLoad(vehicle.id, order.id, item.id, item.quantityLoaded + 1)}
                                                    disabled={isFullyLoaded}
                                                    className="w-6 h-6 flex items-center justify-center rounded hover:bg-white text-zinc-500 disabled:opacity-30"
                                                >
                                                    <Plus size={12} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
             </div>
         </div>

         {/* Right: Route & Loading Plan */}
         <div className="w-96 bg-zinc-50 flex flex-col border-l border-zinc-200">
             
             {/* 1. Route Sequence */}
             <div className="p-4 border-b border-zinc-200">
                 <div className="flex justify-between items-center mb-3">
                     <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                         <Map size={12} /> Delivery Route
                     </h3>
                     <button onClick={optimizeRoute} className="text-[10px] font-bold text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded flex items-center gap-1 transition-colors">
                         <Zap size={10} /> Auto-Optimize
                     </button>
                 </div>
                 
                 {routeOrder.length === 0 ? (
                     <div className="text-sm text-zinc-400 italic text-center py-4">Add items to create route</div>
                 ) : (
                     <div className="space-y-2">
                         {routeOrder.map((orderId, idx) => {
                             const order = vehicle.loadedOrders.find(o => o.id === orderId);
                             if(!order) return null;
                             return (
                                 <div key={orderId} className="bg-white p-2 rounded-lg border border-zinc-200 shadow-sm flex items-center gap-3">
                                     <div className="w-5 h-5 rounded-full bg-zinc-100 flex items-center justify-center text-[10px] font-bold text-zinc-500">
                                         {idx + 1}
                                     </div>
                                     <div className="flex-1 min-w-0">
                                         <div className="text-xs font-bold text-zinc-800 truncate">{order.destination}</div>
                                     </div>
                                     <div className="flex flex-col gap-0.5">
                                         <button onClick={() => moveStop(idx, 'up')} disabled={idx === 0} className="text-zinc-400 hover:text-indigo-600 disabled:opacity-20"><ArrowUp size={10} /></button>
                                         <button onClick={() => moveStop(idx, 'down')} disabled={idx === routeOrder.length - 1} className="text-zinc-400 hover:text-indigo-600 disabled:opacity-20"><ArrowDown size={10} /></button>
                                     </div>
                                 </div>
                             );
                         })}
                     </div>
                 )}
             </div>

             {/* 2. Loading Instructions */}
             <div className="flex-1 overflow-y-auto p-4 pb-40 custom-scrollbar">
                 <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                     <Box size={12} /> Loading Plan (LIFO)
                 </h3>
                 
                 <div className="relative border-l-2 border-indigo-100 ml-2 space-y-6 pl-4 py-2">
                    {loadingInstructions.map((step, idx) => (
                        <div key={idx} className="relative animate-enter" style={{ animationDelay: `${idx * 0.1}s` }}>
                            <div className="absolute -left-[21px] top-0 w-3 h-3 rounded-full bg-indigo-600 border-2 border-white shadow-sm"></div>
                            
                            <div className="bg-white p-3 rounded-xl border border-zinc-200 shadow-sm">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">Step {step?.step}</span>
                                    <span className="text-[10px] text-zinc-400 font-mono">Order {String(step?.orderId).split('-')[1] || step?.orderId}</span>
                                </div>
                                <div className="font-bold text-sm text-zinc-900 mb-1">{step?.destination}</div>
                                <div className="text-xs font-medium text-amber-600 mb-2">{step?.instruction}</div>
                                
                                <div className="space-y-1">
                                    {step?.items.map((item, i) => (
                                        <div key={i} className="flex justify-between text-xs text-zinc-500 bg-zinc-50 px-2 py-1 rounded">
                                            <span>{item.quantityLoaded}x {item.name}</span>
                                            <span>{item.weightKg}kg</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                    {loadingInstructions.length === 0 && (
                        <div className="text-sm text-zinc-400 italic">No items loaded.</div>
                    )}
                 </div>
             </div>

         </div>
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-80 right-0 bg-white/80 backdrop-blur-xl border-t border-indigo-100 px-8 py-4 z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] flex justify-between items-center">
         <div>
            <div className="text-xs text-zinc-400 font-medium uppercase">Loading Sequence</div>
            <div className="font-bold text-zinc-900">
                {routeOrder.length > 0 ? "Optimized by Route Order" : "Pending Route Selection"}
            </div>
         </div>
         <button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-indigo-200 transition-all active:scale-95 flex items-center gap-2">
            Confirm Load & Start <ArrowRight size={18} />
         </button>
      </div>
    </div>
  );
};

export default LoadingView;
