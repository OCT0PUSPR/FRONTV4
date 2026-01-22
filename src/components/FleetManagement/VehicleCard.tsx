import React from 'react';
import { useTheme } from '../../../context/theme';
import { Vehicle, VehicleStatus } from './types';
import { Truck } from 'lucide-react';

interface Props {
  vehicle: Vehicle;
  isSelected: boolean;
  onClick: () => void;
}

const VehicleCard: React.FC<Props> = ({ vehicle, isSelected, onClick }) => {
  const { mode, colors } = useTheme();
  const isDarkMode = mode === "dark";
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
          ? 'shadow-xl scale-[1.02]'
          : 'hover:shadow-md bg-transparent'
        }
      `}
      style={{
        backgroundColor: colors.card,
        borderColor: isSelected ? colors.action : colors.border,
        boxShadow: isSelected ? `0 8px 24px ${colors.action}20` : 'none'
      }}
    >
      <div className="flex items-start gap-4">
        {/* Vehicle Thumbnail */}
        <div className={`w-20 h-20 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors overflow-hidden border
            ${isSelected ? 'ring-2 ring-offset-2' : ''}
        `}
        style={{
          backgroundColor: colors.mutedBg,
          borderColor: colors.border
        }}
        >
             {vehicleImage ? (
                 <img src={vehicleImage} alt={vehicle.name} className="w-full h-full object-cover" />
             ) : (
                 <Truck size={32} style={{ color: colors.textSecondary }} />
             )}
        </div>

        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div className="min-w-0">
            <div className="flex justify-between items-start mb-1">
                <h3 className="font-bold text-base truncate" style={{ color: isSelected ? colors.action : colors.textPrimary }}>
                    {vehicleId}
                </h3>
            </div>

            <p className="text-sm font-medium truncate" style={{ color: colors.textSecondary }}>{vehicle.name}</p>
            <p className="text-xs mt-0.5" style={{ color: colors.textSecondary }}>{vehicle.model}</p>
          </div>

          <div className="space-y-2">
            {/* Status Indicator */}
            <div className="flex items-center gap-2">
                <span className="px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border"
                    style={{
                      backgroundColor: vehicle.status === VehicleStatus.IN_ROUTE ? colors.success + '20' : colors.mutedBg,
                      color: vehicle.status === VehicleStatus.IN_ROUTE ? '#059669' : colors.textSecondary,
                      borderColor: vehicle.status === VehicleStatus.IN_ROUTE ? colors.success : colors.border
                    }}
                >
                    {vehicle.status === VehicleStatus.IN_ROUTE ? 'In Transit' : 'Available'}
                </span>
            </div>

            <div className="flex items-center gap-2 text-[10px] font-medium" style={{ color: colors.textSecondary }}>
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: colors.mutedBg }}>
                    <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(loadPercent, 100)}%`,
                          backgroundColor: loadPercent > 90 ? '#ef4444' : colors.action
                        }}
                    />
                </div>
                <span className="w-8 text-right shrink-0">{loadPercent}%</span>
            </div>
          </div>
        </div>
      </div>
    </button>
  );
};

export default VehicleCard;
