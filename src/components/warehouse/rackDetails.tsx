import React from 'react';
import { useTranslation } from 'react-i18next';
import { X, Box, Thermometer, Droplets, AlertCircle, CheckCircle2, AlertTriangle, Layers } from 'lucide-react';
import { RackCell, RackStatus } from './types';

interface RackDetailsSidebarProps {
  rack: RackCell | null;
  onClose: () => void;
  colors: any;
}

export const RackDetailsSidebar: React.FC<RackDetailsSidebarProps> = ({ rack, onClose, colors }) => {
  const { t } = useTranslation();
  
  if (!rack) return null;

  const getStatusColor = (status: RackStatus) => {
    switch (status) {
      case RackStatus.CRITICAL: return { text: '#ef4444', bg: '#fef2f2', border: '#fecaca' };
      case RackStatus.FULL: return { text: colors.textPrimary, bg: colors.mutedBg, border: colors.border };
      case RackStatus.PARTIAL: return { text: colors.textSecondary, bg: colors.background, border: colors.border };
      case RackStatus.EMPTY: return { text: colors.textSecondary, bg: colors.card, border: colors.border };
      case RackStatus.RESERVED: return { text: '#2563eb', bg: '#dbeafe', border: '#bfdbfe' };
      default: return { text: colors.textSecondary, bg: colors.mutedBg, border: colors.border };
    }
  };

  const getStatusBadge = (status: RackStatus) => {
    switch (status) {
      case RackStatus.CRITICAL: 
        return <span className="flex items-center gap-1.5"><AlertCircle size={14} /> {t("Attention Needed")}</span>;
      case RackStatus.EMPTY: 
        return <span className="flex items-center gap-1.5"><Box size={14} /> {t("Available")}</span>;
      default: 
        return <span className="flex items-center gap-1.5"><CheckCircle2 size={14} /> {t("Operational")}</span>;
    }
  };

  const getCapacityColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 70) return 'text-amber-600';
    return 'text-emerald-600';
  };

  const getCapacityBarColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  return (
    <div 
      className="absolute right-0 top-0 bottom-0 z-40 w-[28rem] shadow-2xl flex flex-col h-full font-space"
      style={{ 
        background: colors.card,
        borderLeft: `1px solid ${colors.border}`
      }}
    >
      {/* Header */}
      <div 
        className="flex items-center justify-between p-6 shrink-0"
        style={{ borderBottom: `1px solid ${colors.border}` }}
      >
        <div>
          <h2 className="text-2xl font-bold tracking-tight" style={{ color: colors.textPrimary }}>{t("Rack")} {rack.label}</h2>
          <div className="flex items-center gap-2 mt-1">
            <span 
              className="px-2 py-0.5 rounded text-xs font-mono font-bold"
              style={{ background: colors.mutedBg, color: colors.textSecondary }}
            >
              {rack.aisleId}
            </span>
            <p className="text-sm font-mono" style={{ color: colors.textSecondary }}>{rack.id}</p>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="p-2 rounded-full transition-colors"
          style={{ color: colors.textSecondary }}
          onMouseEnter={(e) => e.currentTarget.style.background = colors.mutedBg}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >
          <X size={20} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        
        {/* Alerts & Status */}
        <div className="space-y-4">
           {rack.status === RackStatus.CRITICAL && (
            <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg flex items-start gap-3 shadow-sm">
                <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={18} />
                <div>
                    <h4 className="font-bold text-red-900 text-sm">{t("Action Required")}</h4>
                    <p className="text-sm text-red-700 mt-1 leading-relaxed">
                        {rack.issueDescription || t("Unspecified critical error. Technician required.")}
                    </p>
                </div>
            </div>
           )}

           <div 
             className="p-4 rounded-xl border flex justify-between items-center"
             style={{
               background: getStatusColor(rack.status).bg,
               borderColor: getStatusColor(rack.status).border,
               color: getStatusColor(rack.status).text
             }}
           >
              <div className="text-lg font-semibold flex items-center gap-2">
                {getStatusBadge(rack.status)}
              </div>
              <div className="text-xs font-bold uppercase tracking-wider opacity-70">{t("Status")}</div>
           </div>
        </div>

        {/* Telemetry Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div 
            className="p-4 rounded-xl border group transition-colors"
            style={{ 
              background: colors.mutedBg,
              borderColor: colors.border
            }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = colors.textSecondary}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = colors.border}
          >
            <div className="flex items-center gap-2 mb-1" style={{ color: colors.textSecondary }}>
              <Thermometer size={16} />
              <span className="text-xs font-medium">{t("Temperature")}</span>
            </div>
            <span className="text-2xl font-bold tracking-tight" style={{ color: colors.textPrimary }}>{rack.temperature}°C</span>
          </div>
          <div 
            className="p-4 rounded-xl border group transition-colors"
            style={{ 
              background: colors.mutedBg,
              borderColor: colors.border
            }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = colors.textSecondary}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = colors.border}
          >
            <div className="flex items-center gap-2 mb-1" style={{ color: colors.textSecondary }}>
              <Droplets size={16} />
              <span className="text-xs font-medium">{t("Humidity")}</span>
            </div>
            <span className="text-2xl font-bold tracking-tight" style={{ color: colors.textPrimary }}>{rack.humidity}%</span>
          </div>
        </div>

        {/* Shelf Layout */}
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2" style={{ color: colors.textPrimary }}>
            <Layers size={16} style={{ color: colors.textSecondary }} />
            {t("Shelf Configuration")}
          </h3>
          
          <div className="flex flex-col-reverse gap-4">
             {rack.shelves.map((shelf) => (
               <div 
                 key={shelf.id} 
                 className="border rounded-xl p-4 shadow-sm"
                 style={{ 
                   borderColor: colors.border,
                   background: colors.card
                 }}
               >
                   {/* Shelf Header */}
                   <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-2">
                         <span 
                           className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold"
                           style={{ 
                             background: colors.mutedBg,
                             color: colors.textSecondary
                           }}
                         >
                            L{shelf.level}
                         </span>
                         <span className="text-xs font-mono" style={{ color: colors.textSecondary }}>{shelf.id}</span>
                      </div>
                      <span 
                        className="text-xs font-bold"
                        style={{ color: getCapacityColor(shelf.capacityPercentage) }}
                      >
                         {shelf.capacityPercentage}% {t("Full")}
                      </span>
                   </div>

                   {/* Progress Bar */}
                   <div 
                     className="h-1.5 w-full rounded-full overflow-hidden mb-4"
                     style={{ background: colors.mutedBg }}
                   >
                      <div 
                        className="h-full rounded-full transition-all duration-500" 
                        style={{ 
                          width: `${shelf.capacityPercentage}%`,
                          background: getCapacityBarColor(shelf.capacityPercentage)
                        }}
                      />
                   </div>

                   {/* Items Grid */}
                   <div className="space-y-2">
                      {shelf.items.length === 0 ? (
                        <div 
                          className="text-center py-2 rounded-lg border border-dashed"
                          style={{ 
                            background: colors.mutedBg,
                            borderColor: colors.border
                          }}
                        >
                           <span className="text-[10px] uppercase font-bold tracking-wide" style={{ color: colors.textSecondary }}>{t("Empty Shelf")}</span>
                        </div>
                      ) : (
                        shelf.items.map(item => (
                           <div 
                             key={item.id} 
                             className="flex items-center justify-between p-2 rounded border text-xs"
                             style={{ 
                               background: colors.mutedBg,
                               borderColor: colors.border
                             }}
                           >
                              <div className="font-medium truncate max-w-[140px]" title={item.name} style={{ color: colors.textPrimary }}>{item.name}</div>
                              <div className="flex items-center gap-3">
                                <span className="font-mono" style={{ color: colors.textSecondary }}>{item.sku}</span>
                                <span 
                                  className="px-1.5 py-0.5 rounded border font-bold"
                                  style={{ 
                                    background: colors.card,
                                    borderColor: colors.border,
                                    color: colors.textPrimary
                                  }}
                                >
                                  x{item.quantity}
                                </span>
                              </div>
                           </div>
                        ))
                      )}
                   </div>
               </div>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
};