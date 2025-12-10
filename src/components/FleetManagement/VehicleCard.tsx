import React from 'react';
import { Vehicle, VehicleStatus } from './types';
import { Truck } from 'lucide-react';

interface Props {
  vehicle: Vehicle;
  isSelected: boolean;
  onClick: () => void;
}

const VehicleCard: React.FC<Props> = ({ vehicle, isSelected, onClick }) => {
  // Normalize properties for both API and legacy formats
  const vehicleId = vehicle.vehicle_id || vehicle.id;
  const capacityKg = vehicle.capacityKg || vehicle.capacity_kg || 0;
  const currentLoadKg = vehicle.currentLoadKg || vehicle.current_load_kg || 0;
  const vehicleImage = vehicle.image || vehicle.image_base64 || vehicle.image_url || '';
  const loadPercent = capacityKg > 0 ? Math.round((currentLoadKg / capacityKg) * 100) : 0;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 mb-3 rounded-2xl transition-all duration-300 relative group border
        ${isSelected 
          ? 'bg-white border-indigo-200 shadow-xl shadow-indigo-100/50 scale-[1.02]' 
          : 'bg-white border-transparent hover:border-zinc-200 hover:shadow-md bg-transparent'
        }
      `}
    >
      <div className="flex items-center gap-5">
        {/* Vehicle Thumbnail - BIGGER */}
        <div className={`w-28 h-28 rounded-2xl flex items-center justify-center flex-shrink-0 transition-colors overflow-hidden bg-zinc-100 border border-zinc-100
            ${isSelected ? 'ring-2 ring-indigo-500 ring-offset-2' : ''}
        `}>
             {vehicleImage ? (
                 <img src={vehicleImage} alt={vehicle.name} className="w-full h-full object-cover" />
             ) : (
                 <Truck className="text-zinc-300" size={40} />
             )}
        </div>

        <div className="flex-1 min-w-0 flex flex-col justify-between h-28 py-1">
          <div>
            <div className="flex justify-between items-start mb-1">
                <h3 className={`font-bold text-lg truncate ${isSelected ? 'text-indigo-900' : 'text-zinc-800'}`}>
                    {vehicleId}
                </h3>
            </div>
            
            <p className="text-sm text-zinc-600 font-medium truncate">{vehicle.name}</p>
            <p className="text-xs text-zinc-400 mt-0.5">{vehicle.model}</p>
          </div>

          <div className="space-y-3">
            {/* Status Indicator */}
            <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border
                    ${vehicle.status === VehicleStatus.IN_ROUTE 
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                        : 'bg-zinc-50 text-zinc-500 border-zinc-100'}
                `}>
                    {vehicle.status === VehicleStatus.IN_ROUTE ? 'In Transit' : 'Available'}
                </span>
            </div>

            <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-medium">
                <div className={`flex-1 h-2 rounded-full overflow-hidden bg-zinc-100`}>
                    <div 
                        className={`h-full rounded-full ${loadPercent > 90 ? 'bg-red-500' : 'bg-indigo-500'}`} 
                        style={{ width: `${Math.min(loadPercent, 100)}%` }}
                    />
                </div>
                <span className="w-8 text-right">{loadPercent}%</span>
            </div>
          </div>
        </div>
      </div>
    </button>
  );
};

export default VehicleCard;
