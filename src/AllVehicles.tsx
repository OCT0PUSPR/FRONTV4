import React, { useState, useEffect } from 'react';
import { MOCK_VEHICLES } from './components/FleetManagement/contants';
import { Vehicle, VehicleStatus, normalizeVehicle } from './components/FleetManagement/types';
import { ArrowLeft, Search, Filter, MapPin, Truck, Weight, Gauge, Loader2 } from 'lucide-react';
import * as fleetApi from './components/FleetManagement/fleetApi';

interface Props {
  onBack: () => void;
  onSelectVehicle: (vehicleId: string | number) => void;
}

const AllVehiclesPage: React.FC<Props> = ({ onBack, onSelectVehicle }) => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'AVAILABLE' | 'IN_ROUTE'>('ALL');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [useMockData, setUseMockData] = useState(false);

  // Load vehicles from API
  useEffect(() => {
    const loadVehicles = async () => {
      setIsLoading(true);
      try {
        if (useMockData) {
          setVehicles(MOCK_VEHICLES.map(v => normalizeVehicle(v)));
        } else {
          const data = await fleetApi.fetchVehicles();
          setVehicles(data);
        }
      } catch (error) {
        console.error('Failed to load vehicles:', error);
        // Fallback to mock data
        setVehicles(MOCK_VEHICLES.map(v => normalizeVehicle(v)));
      } finally {
        setIsLoading(false);
      }
    };
    loadVehicles();
  }, [useMockData]);

  const filteredVehicles = vehicles.filter(v => {
    const vehicleId = String(v.vehicle_id || v.id);
    const matchesSearch = v.name.toLowerCase().includes(search.toLowerCase()) || 
                          v.plate.toLowerCase().includes(search.toLowerCase()) ||
                          vehicleId.toLowerCase().includes(search.toLowerCase());
    
    if (!matchesSearch) return false;

    if (filter === 'AVAILABLE') return v.status === VehicleStatus.IDLE;
    if (filter === 'IN_ROUTE') return v.status === VehicleStatus.IN_ROUTE;
    
    return true;
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white border-b border-zinc-200 px-8 py-6 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col gap-6">
          
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
                <button 
                  onClick={onBack}
                  className="w-10 h-10 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-600 flex items-center justify-center transition-colors"
                >
                  <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Fleet Inventory</h1>
                    <p className="text-sm text-zinc-500 font-medium">Manage and monitor all assets</p>
                </div>
            </div>
            
            <div className="flex items-center gap-3">
               <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                  <input 
                    type="text" 
                    placeholder="Search by ID, model..." 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 pr-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-64 transition-all"
                  />
               </div>
               <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm font-bold text-zinc-700 hover:bg-zinc-50 transition-colors shadow-sm">
                  <Filter size={16} /> Filters
               </button>
               <label className="flex items-center gap-2 text-xs font-medium text-zinc-500 cursor-pointer ml-2">
                  <input 
                      type="checkbox" 
                      checked={useMockData} 
                      onChange={(e) => setUseMockData(e.target.checked)}
                      className="rounded border-zinc-300"
                  />
                  Demo Mode
               </label>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-zinc-100/50 p-1 rounded-xl w-fit">
              {['ALL', 'AVAILABLE', 'IN_ROUTE'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f as any)}
                    className={`px-6 py-2 rounded-lg text-xs font-bold transition-all ${
                        filter === f 
                        ? 'bg-white text-indigo-600 shadow-sm' 
                        : 'text-zinc-500 hover:text-zinc-700'
                    }`}
                  >
                      {f === 'ALL' ? 'All Vehicles' : f === 'IN_ROUTE' ? 'In Transit' : 'Available'}
                  </button>
              ))}
          </div>
        </div>
      </header>

      {/* Grid Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-8">
        
        {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
                <Loader2 size={48} className="text-indigo-500 animate-spin mb-4" />
                <p className="text-zinc-500">Loading vehicles...</p>
            </div>
        ) : filteredVehicles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 opacity-50">
                <Truck size={64} className="text-zinc-300 mb-4" />
                <h3 className="text-lg font-bold text-zinc-900">No vehicles found</h3>
                <p className="text-zinc-500">Try adjusting your filters or search terms.</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredVehicles.map((vehicle, idx) => {
                    const vehicleId = vehicle.vehicle_id || vehicle.id;
                    const capacityKg = vehicle.capacityKg || vehicle.capacity_kg || 0;
                    const currentLoadKg = vehicle.currentLoadKg || vehicle.current_load_kg || 0;
                    const vehicleImage = vehicle.image || vehicle.image_base64 || vehicle.image_url || '';
                    const loadPercent = capacityKg > 0 ? Math.round((currentLoadKg / capacityKg) * 100) : 0;
                    
                    return (
                    <div 
                        key={String(vehicle.id)} 
                        onClick={() => onSelectVehicle(vehicle.id)}
                        className="group bg-white rounded-3xl border border-zinc-100 overflow-hidden hover:shadow-2xl hover:shadow-indigo-100/50 hover:border-indigo-100 transition-all duration-300 cursor-pointer animate-enter"
                        style={{ animationDelay: `${idx * 0.05}s` }}
                    >
                        {/* Image Section */}
                        <div className="h-56 bg-zinc-50 relative overflow-hidden">
                            {vehicleImage ? (
                                <img 
                                    src={vehicleImage} 
                                    alt={vehicle.name} 
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <Truck size={64} className="text-zinc-300" />
                                </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60"></div>
                            
                            <div className="absolute top-4 left-4">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-md border border-white/20 shadow-lg ${
                                    vehicle.status === VehicleStatus.IN_ROUTE
                                    ? 'bg-emerald-500/90 text-white'
                                    : 'bg-white/90 text-zinc-800'
                                }`}>
                                    {vehicle.status === VehicleStatus.IN_ROUTE ? 'Active Mission' : 'Available'}
                                </span>
                            </div>

                            <div className="absolute bottom-4 left-4 text-white">
                                <h3 className="text-2xl font-bold tracking-tight">{vehicle.name}</h3>
                                <p className="text-white/80 text-sm font-medium">{vehicle.model}</p>
                            </div>
                        </div>

                        {/* Specs */}
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-6">
                                <div className="bg-zinc-50 px-3 py-1.5 rounded-lg border border-zinc-100">
                                    <span className="text-xs font-mono font-bold text-zinc-600 tracking-wider">{vehicleId}</span>
                                </div>
                                <div className="text-xs font-bold text-zinc-400 font-mono">{vehicle.plate}</div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-400">
                                        <Weight size={14} /> Capacity
                                    </div>
                                    <div className="text-sm font-bold text-zinc-900">{capacityKg.toLocaleString()} kg</div>
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-400">
                                        <Gauge size={14} /> Load
                                    </div>
                                    <div className={`text-sm font-bold ${currentLoadKg > 0 ? 'text-indigo-600' : 'text-zinc-900'}`}>
                                        {currentLoadKg.toLocaleString()} kg
                                    </div>
                                </div>
                            </div>
                            
                            {/* Progress Bar */}
                            <div className="space-y-2 mb-6">
                                <div className="flex justify-between text-[10px] font-bold uppercase text-zinc-400 tracking-wider">
                                    <span>Load Efficiency</span>
                                    <span>{loadPercent}%</span>
                                </div>
                                <div className="h-2 w-full bg-zinc-100 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full rounded-full transition-all duration-500 ${
                                            vehicle.status === VehicleStatus.IN_ROUTE ? 'bg-indigo-500' : 'bg-emerald-500'
                                        }`} 
                                        style={{ width: `${Math.max(loadPercent, 5)}%` }}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-2 text-xs text-zinc-500 bg-zinc-50 p-3 rounded-xl border border-zinc-100">
                                <MapPin size={14} className="text-indigo-500" />
                                <span className="truncate">{vehicle.location}</span>
                            </div>
                        </div>
                    </div>
                    );
                })}
            </div>
        )}
      </main>
    </div>
  );
};

export default AllVehiclesPage;
