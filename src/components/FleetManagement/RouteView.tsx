
import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from '../../../context/theme';
import { Vehicle, Order } from './types';
import { Navigation, CheckCircle, Clock, MapPin, Truck, ChevronRight, ChevronLeft, Package, X, Weight, Box } from 'lucide-react';

// Access Leaflet from the global window object since we are using CDN
declare const L: any;

interface Props {
  vehicle: Vehicle;
}

interface RouteStats {
  durationText: string;
  durationValue: number;
  distanceText: string;
  distanceValue: number;
}

type ModalType = 'STOP' | 'TRUCK' | null;

interface ModalData {
    type: ModalType;
    data: Order | Vehicle | null;
}

const RouteView: React.FC<Props> = ({ vehicle }) => {
  const { mode, colors } = useTheme();
  const isDarkMode = mode === "dark";

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const routeLayerRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  
  const [routeStats, setRouteStats] = useState<RouteStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  
  // Modal State
  const [modal, setModal] = useState<ModalData>({ type: null, data: null });

  // Group orders for the panel
  const deliveredOrders = vehicle.loadedOrders.filter(o => o.status === 'DELIVERED');
  const activeOrder = vehicle.loadedOrders.find(o => o.status === 'UNLOADING') || 
                      vehicle.loadedOrders.find(o => o.status === 'PENDING'); // If unloading, that's active. If not, next pending is active target.
  const pendingOrders = vehicle.loadedOrders.filter(o => o.status === 'PENDING' && o.id !== activeOrder?.id);

  // Determine Truck coordinates
  const getTruckCoords = () => {
    const unloadingOrder = vehicle.loadedOrders.find(o => o.status === 'UNLOADING');
    if (unloadingOrder) {
        return [unloadingOrder.coordinates.lat, unloadingOrder.coordinates.lng];
    }
    
    if (activeOrder) {
        // Place it slightly offset to simulate "Approaching"
        return [activeOrder.coordinates.lat - 0.005, activeOrder.coordinates.lng - 0.005];
    }

    return [25.0443, 55.1232]; // Default fallback UAE coords
  };

  const truckCoords = getTruckCoords();

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    
    if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
    }

    const map = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false
    }).setView(truckCoords, 11);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 20
    }).addTo(map);

    mapInstanceRef.current = map;
    
    fetchRoute();

    return () => {
        if (mapInstanceRef.current) {
            mapInstanceRef.current.remove();
            mapInstanceRef.current = null;
        }
    };
  }, [vehicle]);

  const fetchRoute = async () => {
    if (vehicle.loadedOrders.length === 0) {
        setLoading(false);
        return;
    }

    setLoading(true);

    const startCoords = [24.9857, 55.0273]; // Jebel Ali Warehouse
    
    const waypoints = [
        `${startCoords[1]},${startCoords[0]}`,
        ...vehicle.loadedOrders.map(o => `${o.coordinates.lng},${o.coordinates.lat}`)
    ].join(';');

    try {
        const url = `https://router.project-osrm.org/route/v1/driving/${waypoints}?overview=full&geometries=geojson`;
        
        const response = await fetch(url);
        const data = await response.json();

        if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
            const route = data.routes[0];
            drawRoute(route.geometry);
            
            setRouteStats({
                distanceText: `${(route.distance / 1000).toFixed(1)} km`,
                distanceValue: route.distance,
                durationText: formatDuration(route.duration),
                durationValue: route.duration,
            });
        }
    } catch (error) {
        console.error("Routing error:", error);
    } finally {
        setLoading(false);
    }
  };

  const drawRoute = (geojson: any) => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (routeLayerRef.current) map.removeLayer(routeLayerRef.current);
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];

    // Draw Route Lines
    const routeGlow = L.geoJSON(geojson, {
        style: { color: '#6366f1', weight: 8, opacity: 0.3, lineCap: 'round' }
    }).addTo(map);

    const routeCore = L.geoJSON(geojson, {
        style: { color: '#818cf8', weight: 3, opacity: 0.9, lineCap: 'round' }
    }).addTo(map);

    routeLayerRef.current = L.layerGroup([routeGlow, routeCore]).addTo(map);

    // --- Markers ---

    // 1. Warehouse (Start)
    const warehouseIcon = L.divIcon({
        className: 'custom-marker-icon',
        html: `<div class="w-4 h-4 rounded-full bg-zinc-800 border border-zinc-600 flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"><div class="w-1.5 h-1.5 bg-zinc-400 rounded-full"></div></div>`,
        iconSize: [16, 16]
    });
    const startM = L.marker([24.9857, 55.0273], { icon: warehouseIcon }).addTo(map);
    markersRef.current.push(startM);

    // 2. Order Stops
    vehicle.loadedOrders.forEach((order, index) => {
        let markerHtml = '';
        let zIndex = 100;

        if (order.status === 'DELIVERED') {
            markerHtml = `
                <div class="w-6 h-6 rounded-full bg-emerald-900/80 border border-emerald-500/50 flex items-center justify-center text-emerald-500 shadow-sm cursor-pointer hover:scale-110 transition-transform">
                   <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </div>
            `;
        } else if (order.status === 'UNLOADING') {
            zIndex = 500;
            markerHtml = `
                <div class="relative cursor-pointer hover:scale-110 transition-transform">
                    <div class="absolute inset-0 bg-amber-500 rounded-full animate-ping opacity-75"></div>
                    <div class="relative w-8 h-8 rounded-full bg-amber-500 border-2 border-white shadow-lg flex items-center justify-center text-white">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                    </div>
                    <div class="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-black/80 text-white text-[10px] px-2 py-0.5 rounded whitespace-nowrap">
                        Unloading #${index + 1}
                    </div>
                </div>
            `;
        } else {
            // Pending
            markerHtml = `
                <div class="w-6 h-6 rounded-full bg-zinc-900 border-2 border-indigo-500 flex items-center justify-center text-white font-bold text-[10px] shadow-lg cursor-pointer hover:scale-110 transition-transform">
                    ${index + 1}
                </div>
            `;
        }

        const icon = L.divIcon({
            className: 'custom-marker-icon',
            html: markerHtml,
            iconSize: order.status === 'UNLOADING' ? [32, 32] : [24, 24],
            iconAnchor: order.status === 'UNLOADING' ? [16, 16] : [12, 12]
        });

        const m = L.marker([order.coordinates.lat, order.coordinates.lng], { icon, zIndexOffset: zIndex }).addTo(map);
        
        // Add click listener
        m.on('click', () => {
            setModal({ type: 'STOP', data: order });
        });

        markersRef.current.push(m);
    });

    // 3. Truck Location
    const truckIcon = L.divIcon({
        className: 'custom-marker-icon',
        html: `
            <div class="relative z-[600] cursor-pointer hover:scale-110 transition-transform">
                 <div class="w-10 h-10 rounded-full bg-white border-2 border-indigo-600 shadow-2xl flex items-center justify-center text-indigo-700">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
                 </div>
                 <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-1.5 bg-black/30 blur-[2px] rounded-full"></div>
            </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20]
    });
    
    const tM = L.marker(truckCoords, { icon: truckIcon, zIndexOffset: 1000 }).addTo(map);
    tM.on('click', () => {
        setModal({ type: 'TRUCK', data: vehicle });
    });
    markersRef.current.push(tM);

    // Bounds
    const bounds = routeCore.getBounds();
    map.fitBounds(bounds, { padding: [100, 100] });
  };

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h > 0 ? h + 'h ' : ''}${m}m`;
  };

  // --- Modal Content Renderers ---

  const renderStopModal = (order: Order) => {
    const isUnloading = order.status === 'UNLOADING';
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-start">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider
                            ${isUnloading ? 'bg-amber-100 text-amber-600' : 
                              order.status === 'DELIVERED' ? 'bg-emerald-100 text-emerald-600' : 
                              'bg-zinc-100 text-zinc-500'}`
                        }>
                            {order.status}
                        </span>
                        <span className="text-zinc-400 text-xs font-mono">#{order.id}</span>
                    </div>
                    <h3 className="text-xl font-bold text-zinc-900">{order.destination}</h3>
                    <p className="text-sm text-zinc-500 flex items-center gap-1 mt-1">
                        <MapPin size={14} /> Lat: {order.coordinates.lat.toFixed(4)}, Lng: {order.coordinates.lng.toFixed(4)}
                    </p>
                </div>
            </div>

            <div>
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Package size={14} /> Cargo Manifest
                </h4>
                <div className="space-y-3">
                    {order.items.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-zinc-200 shadow-sm text-zinc-400">
                                    <Box size={16} />
                                </div>
                                <div>
                                    <div className="font-bold text-sm text-zinc-800">{item.name}</div>
                                    <div className="text-xs text-zinc-500">{item.size}</div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="font-bold text-sm text-indigo-600">{item.quantityLoaded}x</div>
                                <div className="text-xs text-zinc-400 font-mono">{item.weightKg}kg</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            
            {isUnloading && (
                 <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex items-start gap-3">
                     <Clock className="text-amber-500 mt-0.5" size={18} />
                     <div>
                         <h5 className="font-bold text-amber-800 text-sm">Operation in Progress</h5>
                         <p className="text-xs text-amber-700 mt-1">
                             Vehicle is currently unloading items at this location. Estimated completion: 15 mins.
                         </p>
                     </div>
                 </div>
            )}
        </div>
    );
  };

  const renderTruckModal = (veh: Vehicle) => {
    return (
        <div className="space-y-6">
            <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                    <Truck size={32} />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-zinc-900">{veh.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded text-xs font-mono font-bold border border-zinc-200">{veh.plate}</span>
                        <span className="text-zinc-400 text-xs">| {veh.model}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-1 text-xs font-medium text-zinc-500">
                        <Weight size={12} /> {veh.currentLoadKg} / {veh.capacityKg} kg
                    </div>
                </div>
            </div>

            <div className="w-full bg-zinc-100 h-2 rounded-full overflow-hidden">
                <div 
                    className="h-full bg-indigo-500 rounded-full"
                    style={{ width: `${Math.min((veh.currentLoadKg / veh.capacityKg) * 100, 100)}%` }}
                ></div>
            </div>

            <div>
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Route Itinerary</h4>
                <div className="relative space-y-0">
                    <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-zinc-100 z-0"></div>
                    {veh.loadedOrders.map((order, idx) => (
                        <div key={idx} className="relative z-10 pl-10 pb-6 last:pb-0 group">
                            <div className={`absolute left-0 top-0 w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold bg-white
                                ${order.status === 'DELIVERED' ? 'border-emerald-500 text-emerald-600' : 
                                  order.status === 'UNLOADING' ? 'border-amber-500 text-amber-600 animate-pulse' : 
                                  'border-zinc-200 text-zinc-400'}
                            `}>
                                {idx + 1}
                            </div>
                            
                            <div className="bg-white p-3 rounded-xl border border-zinc-100 shadow-sm group-hover:border-indigo-200 transition-colors">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="font-bold text-sm text-zinc-800">{order.destination}</span>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                                        order.status === 'DELIVERED' ? 'bg-emerald-50 text-emerald-600' : 'bg-zinc-100 text-zinc-500'
                                    }`}>{order.status}</span>
                                </div>
                                <div className="text-xs text-zinc-500 space-y-1">
                                    {order.items.map((it, i) => (
                                        <div key={i} className="flex justify-between border-t border-zinc-50 pt-1 mt-1 first:border-0 first:pt-0 first:mt-0">
                                            <span>{it.quantityLoaded}x {it.name}</span>
                                            <span className="text-zinc-300">{it.weightKg * it.quantityLoaded}kg</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
  };

  return (
    <div className="h-full flex flex-col md:flex-row relative" style={{ backgroundColor: isDarkMode ? '#09090b' : '#f4f4f5' }}>
      
      {/* Loading Overlay */}
      {loading && (
          <div className="absolute inset-0 z-[1000] flex items-center justify-center" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.9)' : 'rgba(255,255,255,0.8)', backdropFilter: 'blur(4px)' }}>
              <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: colors.action, borderTopColor: 'transparent' }}></div>
              </div>
          </div>
      )}

      {/* Map Layer */}
      <div className="flex-1 h-full relative z-0">
         <div ref={mapContainerRef} className="w-full h-full"></div>
         <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b pointer-events-none z-[400]" style={{ background: isDarkMode ? 'linear-gradient(to bottom, rgba(9,9,11,0.95), transparent)' : 'linear-gradient(to bottom, rgba(244,244,245,0.8), transparent)' }}></div>
      </div>

      {/* Interactive Modal Overlay */}
      {modal.type && (
          <div className="absolute inset-0 z-[2000] flex items-center justify-center p-4 animate-enter" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.2)', backdropFilter: 'blur(2px)' }} onClick={() => setModal({type: null, data: null})}>
              <div className="w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]" onClick={(e) => e.stopPropagation()} style={{ backgroundColor: colors.card }}>
                  <div className="flex justify-between items-center p-4" style={{ borderBottom: `1px solid ${colors.border}`, backgroundColor: colors.mutedBg }}>
                      <span className="text-xs font-bold uppercase tracking-wider" style={{ color: colors.textSecondary }}>
                          {modal.type === 'TRUCK' ? 'Vehicle Manifest' : 'Stop Details'}
                      </span>
                      <button onClick={() => setModal({type: null, data: null})} className="w-8 h-8 rounded-full flex items-center justify-center transition-colors" style={{ backgroundColor: colors.mutedBg, color: colors.textSecondary }} hover={{ backgroundColor: colors.border }}>
                          <X size={16} />
                      </button>
                  </div>
                  <div className="p-6 overflow-y-auto custom-scrollbar">
                      {modal.type === 'TRUCK' && vehicle && renderTruckModal(modal.data as Vehicle)}
                      {modal.type === 'STOP' && renderStopModal(modal.data as Order)}
                  </div>
              </div>
          </div>
      )}

      {/* Floating Right Panel (Manifest Summary) */}
      <div className={`absolute top-4 bottom-4 right-4 z-[500] flex transition-all duration-300 pointer-events-none ${isPanelOpen ? 'translate-x-0' : 'translate-x-[calc(100%-20px)]'}`}>

        {/* Toggle Handle */}
        <button
            onClick={() => setIsPanelOpen(!isPanelOpen)}
            className="pointer-events-auto h-12 w-8 rounded-l-xl shadow-lg flex items-center justify-center mt-6"
            style={{
              backgroundColor: colors.card,
              color: colors.textSecondary,
              borderTop: `1px solid ${colors.border}`,
              borderLeft: `1px solid ${colors.border}`,
              borderBottom: `1px solid ${colors.border}`
            }}
            hover={{ backgroundColor: colors.mutedBg }}
        >
            {isPanelOpen ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>

        {/* Panel Content */}
        <div className="pointer-events-auto w-96 rounded-2xl shadow-2xl border overflow-hidden flex flex-col" style={{
          backgroundColor: isDarkMode ? 'rgba(24, 24, 27, 0.95)' : 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(16px)',
          borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.2)'
        }}>
            <div className="p-5" style={{ borderBottom: `1px solid ${colors.border}`, backgroundColor: colors.mutedBg }}>
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-lg font-bold" style={{ color: colors.textPrimary }}>Active Route</h2>
                        <p className="text-xs font-medium mt-1 flex items-center gap-1" style={{ color: colors.textSecondary }}>
                            <Navigation size={12} /> {routeStats?.distanceText || '...'} • {vehicle.loadedOrders.length} Stops
                        </p>
                    </div>
                    <div className="px-2 py-1 rounded text-xs font-bold font-mono" style={{ backgroundColor: `${colors.action}10`, color: colors.action }}>
                        {vehicle.plate}
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                
                {/* Active/Unloading Section */}
                {activeOrder && (
                    <div>
                        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3 px-1 flex items-center gap-2">
                             Current Stop
                             {activeOrder.status === 'UNLOADING' && <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>}
                        </h3>
                        <div 
                            onClick={() => setModal({ type: 'STOP', data: activeOrder })}
                            className={`rounded-xl border-2 p-4 shadow-sm relative overflow-hidden group cursor-pointer transition-all hover:scale-[1.02]
                            ${activeOrder.status === 'UNLOADING' ? 'bg-amber-50 border-amber-200' : 'bg-white border-indigo-100 ring-4 ring-indigo-50'}
                        `}>
                            {activeOrder.status === 'UNLOADING' && (
                                <div className="absolute top-0 right-0 bg-amber-200 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-bl-lg">
                                    UNLOADING IN PROGRESS
                                </div>
                            )}
                            
                            <div className="flex justify-between items-start mb-3">
                                <div className="font-bold text-zinc-800">{activeOrder.destination}</div>
                                <div className="text-xs font-mono text-zinc-500">#{String(activeOrder.id).split('-')[1]}</div>
                            </div>
                            
                            {/* Items being handled */}
                            <div className="space-y-2">
                                {activeOrder.items.map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between text-sm bg-white/60 p-2 rounded border border-transparent hover:border-black/5">
                                        <div className="flex items-center gap-2 text-zinc-700">
                                            <Package size={14} className="text-zinc-400" />
                                            <span>{item.quantityLoaded}x {item.name}</span>
                                        </div>
                                        {activeOrder.status === 'UNLOADING' ? (
                                            <div className="w-4 h-4 rounded-full border-2 border-amber-400 border-t-transparent animate-spin"></div>
                                        ) : (
                                            <span className="text-xs text-zinc-400">{item.weightKg}kg</span>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {activeOrder.status === 'UNLOADING' && (
                                <div className="mt-3 w-full bg-amber-200/50 h-1.5 rounded-full overflow-hidden">
                                    <div className="h-full bg-amber-500 w-2/3 animate-[stripe-move_1s_linear_infinite]" 
                                         style={{backgroundImage: 'linear-gradient(45deg,rgba(255,255,255,.3) 25%,transparent 25%,transparent 50%,rgba(255,255,255,.3) 50%,rgba(255,255,255,.3) 75%,transparent 75%,transparent)', backgroundSize: '1rem 1rem'}}
                                    ></div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Pending Stops */}
                {pendingOrders.length > 0 && (
                    <div>
                        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3 px-1">Up Next ({pendingOrders.length})</h3>
                        <div className="space-y-3 relative">
                            <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-zinc-100"></div>
                            {pendingOrders.map((order, i) => (
                                <div key={order.id} className="relative pl-8 py-1 group cursor-pointer" onClick={() => setModal({ type: 'STOP', data: order })}>
                                    <div className="absolute left-0 top-3 w-6 h-6 rounded-full bg-white border border-zinc-200 flex items-center justify-center text-xs font-medium text-zinc-500 z-10 group-hover:border-indigo-400 group-hover:text-indigo-600 transition-colors shadow-sm">
                                        {i + (activeOrder ? 2 : 1)}
                                    </div>
                                    <div className="bg-white p-3 rounded-xl border border-zinc-100 hover:border-zinc-300 transition-colors shadow-sm">
                                        <div className="flex justify-between">
                                            <span className="font-semibold text-zinc-800 text-sm">{order.destination}</span>
                                            <span className="text-xs text-zinc-400">{order.items.length} items</span>
                                        </div>
                                        <div className="text-xs text-zinc-400 mt-1 flex items-center gap-1">
                                            <Clock size={10} /> Est. arrival +{30 * (i+1)} min
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Delivered History */}
                {deliveredOrders.length > 0 && (
                    <div className="opacity-60 hover:opacity-100 transition-opacity">
                        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3 px-1">Completed</h3>
                        <div className="space-y-2">
                            {deliveredOrders.map((order) => (
                                <div key={order.id} onClick={() => setModal({ type: 'STOP', data: order })} className="flex items-center gap-3 p-3 bg-zinc-50 rounded-lg border border-zinc-100 cursor-pointer hover:bg-zinc-100">
                                    <CheckCircle size={16} className="text-emerald-500" />
                                    <div className="flex-1">
                                        <div className="text-sm font-medium text-zinc-600 line-through decoration-zinc-300">{order.destination}</div>
                                    </div>
                                    <div className="text-xs font-mono text-zinc-400">
                                        Done
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

            </div>
        </div>
      </div>

    </div>
  );
};

export default RouteView;
