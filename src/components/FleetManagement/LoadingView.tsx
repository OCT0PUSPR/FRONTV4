import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from '../../../context/theme';
import { Vehicle, Order } from './types';
import { ArrowRight, Minus, Plus, Box, ArrowDown, ArrowUp, Zap, Map, Truck, Weight, MapPin, Package } from 'lucide-react';

interface Props {
  vehicle: Vehicle;
  poolOrders: Order[]; // Global pool of orders
  onUpdateLoad: (vehicleId: string | number, orderId: string | number, itemId: string | number, newQuantity: number) => void;
}

const LoadingView: React.FC<Props> = ({ vehicle, poolOrders, onUpdateLoad }) => {
  const { mode, colors } = useTheme();
  const isDarkMode = mode === "dark";
  
  // We manage a local route order state. 
  // Initial state is order in which they appear in vehicle.loadedOrders
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
     // The delivery route is 'routeOrder'.
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
    <div className="h-full flex flex-col" style={{ backgroundColor: colors.background }}>
      {/* Top Section: Vehicle Viz & Capacity */}
      <div className="px-6 py-6 shadow-sm z-10" style={{ backgroundColor: colors.card, borderBottom: `1px solid ${colors.border}` }}>
        <div className="flex flex-col lg:flex-row items-stretch gap-6 max-w-7xl mx-auto">

             {/* Truck Visual */}
             <div className="relative w-full lg:w-1/2 h-72 flex items-center justify-center rounded-3xl overflow-hidden shadow-lg" style={{ backgroundColor: colors.mutedBg, border: `1px solid ${colors.border}` }}>
                {vehicleImage ? (
                    <img
                        src={vehicleImage}
                        className="w-full h-full object-contain p-6 z-10 relative animate-enter"
                        alt="Truck Visualization"
                    />
                ) : (
                    <div className="flex flex-col items-center gap-2 z-10 relative opacity-50">
                        <Truck size={48} style={{ color: colors.textSecondary }} />
                    </div>
                )}

                {/* Capacity Overlay */}
                <div className="absolute inset-0 z-0">
                    <div className="absolute bottom-0 left-0 w-full transition-all duration-700" style={{ height: `${capacityPct}%`, backgroundColor: `${colors.action}15` }} />
                </div>

                <div className="absolute top-4 right-4 text-right z-20">
                    <div className="text-4xl font-extrabold tracking-tight" style={{ color: colors.textPrimary }}>
                        {Math.round(capacityPct)}<span className="text-xl" style={{ color: colors.textSecondary }}>%</span>
                    </div>
                    <div className="text-xs font-bold uppercase tracking-wide mt-1" style={{ color: colors.textSecondary }}>Loaded</div>
                    <div className="text-xs font-mono mt-1" style={{ color: colors.textSecondary }}>{currentLoad}kg / {capacityKg}kg</div>
                </div>
             </div>

             {/* Vehicle Info */}
             <div className="w-full lg:w-1/2 flex flex-col justify-center space-y-4">
                <div className="p-6 rounded-2xl" style={{ backgroundColor: colors.mutedBg, border: `1px solid ${colors.border}` }}>
                    <h1 className="text-3xl font-bold mb-2" style={{ color: colors.textPrimary }}>{vehicle.id}</h1>
                    <p className="font-medium text-lg mb-4" style={{ color: colors.textSecondary }}>{vehicle.name} <span className="mx-2" style={{ color: colors.textSecondary }}>|</span> {vehicle.model}</p>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 rounded-xl" style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }}>
                            <div className="flex items-center gap-2 mb-2">
                                <MapPin size={14} style={{ color: colors.action }} />
                                <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: colors.textSecondary }}>Location</div>
                            </div>
                            <div className="font-semibold text-sm flex items-center gap-2" style={{ color: colors.textPrimary }}>
                                 <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: colors.success }}></div>
                                 {vehicle.location}
                            </div>
                        </div>
                        <div className="p-3 rounded-xl" style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }}>
                            <div className="flex items-center gap-2 mb-2">
                                <Weight size={14} style={{ color: colors.action }} />
                                <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: colors.textSecondary }}>Capacity</div>
                            </div>
                            <div className="font-semibold text-sm" style={{ color: colors.textPrimary }}>{capacityKg.toLocaleString()} kg</div>
                        </div>
                        <div className="p-3 rounded-xl" style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }}>
                            <div className="flex items-center gap-2 mb-2">
                                <Package size={14} style={{ color: colors.action }} />
                                <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: colors.textSecondary }}>Load</div>
                            </div>
                            <div className="font-semibold text-sm" style={{ color: colors.textPrimary }}>{currentLoad.toLocaleString()} kg</div>
                        </div>
                        <div className="p-3 rounded-xl" style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }}>
                            <div className="flex items-center gap-2 mb-2">
                                <ArrowUp size={14} style={{ color: colors.action }} />
                                <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: colors.textSecondary }}>Strategy</div>
                            </div>
                            <div className="font-semibold text-xs" style={{ color: colors.textPrimary }}>LIFO</div>
                            <div className="text-[10px]" style={{ color: colors.textSecondary }}>First Out, Last In</div>
                        </div>
                    </div>
                </div>
             </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex max-w-7xl mx-auto w-full">

         {/* Left: Global Inventory */}
         <div className="flex-1 overflow-hidden flex flex-col" style={{ borderRight: `1px solid ${colors.border}` }}>
             <div className="px-6 py-4 flex justify-between items-center sticky top-0 z-10" style={{ backgroundColor: colors.card, borderBottom: `1px solid ${colors.border}` }}>
                <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: colors.textPrimary }}>
                    Available Orders <span className="px-2 py-0.5 rounded-full text-xs" style={{ backgroundColor: colors.mutedBg, color: colors.textSecondary }}>Global Inventory</span>
                </h2>
             </div>

             <div className="flex-1 overflow-y-auto px-6 py-4 pb-40 custom-scrollbar space-y-4">
                {poolOrders.map((order) => (
                    <div key={order.id} className="rounded-xl shadow-sm overflow-hidden group transition-colors" style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }}>
                        <div className="px-4 py-3 flex justify-between items-center" style={{ backgroundColor: colors.mutedBg, borderBottom: `1px solid ${colors.border}` }}>
                            <div>
                                <span className="font-bold text-sm block" style={{ color: colors.textPrimary }}>{order.destination}</span>
                                <span className="text-[10px] font-mono" style={{ color: colors.textSecondary }}>Order: {order.id}</span>
                            </div>
                            <span className="text-xs font-medium" style={{ color: colors.textSecondary }}>{order.items.length} Items</span>
                        </div>
                        <div className="divide-y" style={{ borderColor: colors.border }}>
                            {order.items.map((item) => {
                                const isFullyLoaded = item.quantityLoaded >= item.quantityAvailable;
                                return (
                                    <div key={item.id} className="grid grid-cols-12 gap-2 px-4 py-3 items-center">
                                        <div className="col-span-6">
                                            <div className="font-medium text-sm" style={{ color: colors.textPrimary }}>{item.name}</div>
                                            <div className="text-[10px]" style={{ color: colors.textSecondary }}>{item.weightKg} kg • {item.size}</div>
                                        </div>
                                        <div className="col-span-6 flex justify-end">
                                            <div className="flex items-center gap-1 p-1 rounded-lg border" style={{
                                              backgroundColor: item.quantityLoaded > 0 ? `${colors.action}10` : colors.card,
                                              borderColor: item.quantityLoaded > 0 ? colors.action : colors.border
                                            }}>
                                                <button
                                                    onClick={() => onUpdateLoad(vehicle.id, order.id, item.id, item.quantityLoaded - 1)}
                                                    disabled={item.quantityLoaded <= 0}
                                                    className="w-6 h-6 flex items-center justify-center rounded disabled:opacity-30"
                                                    style={{ color: colors.textSecondary }}
                                                >
                                                    <Minus size={12} />
                                                </button>
                                                <div className="w-12 text-center">
                                                    <span className="text-sm font-bold" style={{ color: item.quantityLoaded > 0 ? colors.action : colors.textPrimary }}>{item.quantityLoaded}</span>
                                                    <span className="text-[10px] ml-1" style={{ color: colors.textSecondary }}>/ {item.quantityAvailable}</span>
                                                </div>
                                                <button
                                                    onClick={() => onUpdateLoad(vehicle.id, order.id, item.id, item.quantityLoaded + 1)}
                                                    disabled={isFullyLoaded}
                                                    className="w-6 h-6 flex items-center justify-center rounded disabled:opacity-30"
                                                    style={{ color: colors.textSecondary }}
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

         {/* Right: Route & Loading Plan - Fixed width container */}
         <div className="w-96 flex flex-col relative" style={{ backgroundColor: colors.mutedBg, borderLeft: `1px solid ${colors.border}` }}>

             {/* 1. Route Sequence */}
             <div className="p-4" style={{ borderBottom: `1px solid ${colors.border}` }}>
                 <div className="flex justify-between items-center mb-3">
                     <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2" style={{ color: colors.textSecondary }}>
                         <Map size={12} /> Delivery Route
                     </h3>
                     <button onClick={optimizeRoute} className="text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1 transition-colors" style={{ color: colors.action, backgroundColor: `${colors.action}10` }}>
                         <Zap size={10} /> Auto-Optimize
                     </button>
                 </div>

                 {routeOrder.length === 0 ? (
                     <div className="text-sm italic text-center py-4" style={{ color: colors.textSecondary }}>Add items to create route</div>
                 ) : (
                     <div className="space-y-2">
                         {routeOrder.map((orderId, idx) => {
                             const order = vehicle.loadedOrders.find(o => o.id === orderId);
                             if(!order) return null;
                             return (
                                 <div key={orderId} className="p-2 rounded-lg shadow-sm flex items-center gap-3" style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }}>
                                     <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ backgroundColor: colors.mutedBg, color: colors.textSecondary }}>
                                         {idx + 1}
                                     </div>
                                     <div className="flex-1 min-w-0">
                                         <div className="text-xs font-bold truncate" style={{ color: colors.textPrimary }}>{order.destination}</div>
                                     </div>
                                     <div className="flex flex-col gap-0.5">
                                         <button onClick={() => moveStop(idx, 'up')} disabled={idx === 0} style={{ color: colors.textSecondary }} className="w-6 h-6 flex items-center justify-center rounded opacity-20 disabled:opacity-100 hover:opacity-40"><ArrowUp size={10} /></button>
                                         <button onClick={() => moveStop(idx, 'down')} disabled={idx === routeOrder.length - 1} style={{ color: colors.textSecondary }} className="w-6 h-6 flex items-center justify-center rounded opacity-20 disabled:opacity-100 hover:opacity-40"><ArrowDown size={10} /></button>
                                     </div>
                                 </div>
                             );
                         })}
                     </div>
                 )}
             </div>

             {/* 2. Loading Instructions */}
             <div className="flex-1 overflow-y-auto p-4 pb-24 custom-scrollbar">
                 <h3 className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: colors.textSecondary }}>
                     <Box size={12} /> Loading Plan (LIFO)
                 </h3>

                 <div className="relative border-l-2 ml-2 space-y-6 pl-4 py-2" style={{ borderColor: colors.action }}>
                    {loadingInstructions.map((step, idx) => (
                        <div key={idx} className="relative animate-enter" style={{ animationDelay: `${idx * 0.1}s` }}>
                            <div className="absolute -left-[21px] top-0 w-3 h-3 rounded-full border-2 shadow-sm" style={{ backgroundColor: colors.action, borderColor: colors.card }}></div>

                            <div className="p-3 rounded-xl shadow-sm" style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }}>
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ color: colors.action, backgroundColor: `${colors.action}10` }}>Step {step?.step}</span>
                                    <span className="text-[10px] font-mono" style={{ color: colors.textSecondary }}>Order {String(step?.orderId).split('-')[1] || step?.orderId}</span>
                                </div>
                                <div className="font-bold text-sm mb-1" style={{ color: colors.textPrimary }}>{step?.destination}</div>
                                <div className="text-xs font-medium mb-2" style={{ color: '#f59e0b' }}>{step?.instruction}</div>

                                <div className="space-y-1">
                                    {step?.items.map((item, i) => (
                                        <div key={i} className="flex justify-between text-xs px-2 py-1 rounded" style={{ color: colors.textSecondary, backgroundColor: colors.mutedBg }}>
                                            <span>{item.quantityLoaded}x {item.name}</span>
                                            <span>{item.weightKg}kg</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                    {loadingInstructions.length === 0 && (
                        <div className="text-sm italic" style={{ color: colors.textSecondary }}>No items loaded.</div>
                    )}
                 </div>
             </div>

             {/* Footer - Within Right Panel */}
             <div className="absolute bottom-0 left-0 right-0 px-4 py-3 z-50 flex justify-between items-center" style={{ backgroundColor: colors.card, borderTop: `1px solid ${colors.border}` }}>
                 <div>
                    <div className="text-xs font-medium uppercase" style={{ color: colors.textSecondary }}>Loading Sequence</div>
                    <div className="font-bold" style={{ color: colors.textPrimary }}>
                        {routeOrder.length > 0 ? "Optimized by Route Order" : "Pending Route Selection"}
                    </div>
                 </div>
                 <button className="font-bold py-2 px-4 rounded-xl transition-all active:scale-95 flex items-center gap-2 text-sm text-white" style={{ background: colors.action, boxShadow: '0 4px 12px rgba(79, 172, 254, 0.4)' }}>
                    Confirm Load & Start <ArrowRight size={14} />
                 </button>
             </div>

         </div>
      </div>
    </div>
  );
};

export default LoadingView;
