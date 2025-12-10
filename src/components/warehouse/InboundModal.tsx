import React from 'react';
import { useTranslation } from 'react-i18next';
import { X, Truck, Clock, Package, MapPin, AlertCircle } from 'lucide-react';
import { InboundShipment } from './types';

const styles = `
  @keyframes fadeIn {
    from { 
      opacity: 0;
      transform: scale(0.95);
    }
    to { 
      opacity: 1;
      transform: scale(1);
    }
  }
  .animate-fade-in {
    animation: fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }
`;

interface InboundModalProps {
  isOpen: boolean;
  onClose: () => void;
  shipments: InboundShipment[];
  colors: any;
}

export const InboundModal: React.FC<InboundModalProps> = ({ isOpen, onClose, shipments, colors }) => {
  const { t } = useTranslation();
  if (!isOpen) return null;

  // Theme-aware status colors
  const getStatusColors = (status: string) => {
    if (status === 'Arriving') {
      return {
        iconBg: 'rgba(16, 185, 129, 0.1)',
        iconColor: '#10b981',
        badgeBg: 'rgba(16, 185, 129, 0.15)',
        badgeColor: '#065f46'
      };
    } else if (status === 'Delayed') {
      return {
        iconBg: 'rgba(239, 68, 68, 0.1)',
        iconColor: '#ef4444',
        badgeBg: 'rgba(239, 68, 68, 0.15)',
        badgeColor: '#991b1b'
      };
    } else {
      return {
        iconBg: colors.mutedBg,
        iconColor: colors.textSecondary,
        badgeBg: 'rgba(245, 158, 11, 0.15)',
        badgeColor: '#92400e'
      };
    }
  };

  return (
    <>
      <style>{styles}</style>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div 
          className="absolute inset-0 backdrop-blur-sm transition-opacity" 
          style={{ background: `${colors.textPrimary}60` }}
          onClick={onClose} 
        />
        
        <div 
          className="relative w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden animate-fade-in flex flex-col max-h-[85vh]"
          style={{
            background: colors.card,
          }}
        >
          
          {/* Header */}
          <div 
            className="flex items-center justify-between p-6"
            style={{ 
              borderBottom: `1px solid ${colors.border}`,
              background: colors.mutedBg
            }}
          >
            <div className="flex items-center gap-3">
              <div 
                className="p-2 rounded-lg shadow-md"
                style={{ 
                  background: '#1f2937',
                  color: '#ffffff'
                }}
              >
                <Truck size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold" style={{ color: colors.textPrimary }}>{t("Inbound Schedule")}</h2>
                <p className="text-sm" style={{ color: colors.textSecondary }}>{t("Today's incoming deliveries")}</p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="p-2 rounded-full transition-colors"
              style={{ color: colors.textSecondary }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = colors.border;
                e.currentTarget.style.color = colors.textPrimary;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = colors.textSecondary;
              }}
            >
              <X size={20} />
            </button>
          </div>

          {/* List */}
          <div className="overflow-y-auto p-6 space-y-3">
            {shipments.map((shipment) => {
              const statusColors = getStatusColors(shipment.status);
              return (
                <div 
                  key={shipment.id} 
                  className="group p-4 border rounded-xl hover:shadow-md transition-all duration-200"
                  style={{ 
                    background: colors.card,
                    borderColor: colors.border
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = colors.textSecondary;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = colors.border;
                  }}
                >
                  <div className="flex items-start justify-between">
                    
                    <div className="flex items-start gap-4">
                      <div 
                        className="mt-1 p-2 rounded-lg"
                        style={{
                          background: statusColors.iconBg,
                          color: statusColors.iconColor
                        }}
                      >
                        <Package size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg" style={{ color: colors.textPrimary }}>{shipment.supplier}</h3>
                        <div className="flex items-center gap-4 mt-1 text-sm" style={{ color: colors.textSecondary }}>
                          <span 
                            className="font-mono px-1.5 rounded"
                            style={{ 
                              background: colors.mutedBg,
                              color: colors.textPrimary
                            }}
                          >
                            {shipment.poNumber}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock size={14} /> {t("ETA")}: {shipment.eta}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <span 
                        className="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide flex items-center gap-1.5"
                        style={{
                          background: statusColors.badgeBg,
                          color: statusColors.badgeColor
                        }}
                      >
                        {shipment.status === 'Delayed' && <AlertCircle size={12} />}
                        {shipment.status === 'Arriving' && <Truck size={12} />}
                        {shipment.status === 'Pending' && <Clock size={12} />}
                        {shipment.status}
                      </span>
                      <div className="flex items-center gap-1.5 text-xs font-bold" style={{ color: colors.textPrimary }}>
                        <MapPin size={14} />
                        {shipment.dock}
                      </div>
                    </div>

                  </div>
                  
                  <div 
                    className="mt-4 pt-3 flex items-center justify-between text-xs"
                    style={{ 
                      borderTop: `1px solid ${colors.border}`,
                      color: colors.textSecondary
                    }}
                  >
                    <span>{t("ID")}: {shipment.id}</span>
                    <span className="font-medium" style={{ color: colors.textPrimary }}>{shipment.items} {t("Units expected")}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div 
            className="p-4 flex justify-end gap-3"
            style={{ 
              borderTop: `1px solid ${colors.border}`,
              background: colors.mutedBg
            }}
          >
            <button 
              onClick={onClose} 
              className="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
              style={{ 
                color: colors.textSecondary,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = colors.textPrimary;
                e.currentTarget.style.background = colors.border;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = colors.textSecondary;
                e.currentTarget.style.background = 'transparent';
              }}
            >
              {t("Close")}
            </button>
            <button 
              className="px-4 py-2 text-sm font-bold rounded-lg shadow-lg transition-colors"
              style={{
                background: '#1f2937',
                color: '#ffffff',
                boxShadow: '0 4px 12px rgba(31, 41, 55, 0.1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '0.9';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1';
              }}
            >
              {t("Download Manifest")}
            </button>
          </div>

        </div>
      </div>
    </>
  );
};