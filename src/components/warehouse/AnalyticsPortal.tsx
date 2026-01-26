import React, { useState, useEffect } from 'react';
import { TrendingUp, AlertTriangle, Package, Activity, ArrowRight, PanelLeftClose, PanelLeftOpen, GripVertical, MapPin, ChevronDown, Check, Plus, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { WAREHOUSES } from './constants';
import { useAuth } from '../../../context/auth';
import { API_CONFIG } from '../../config/api';

interface AnalyticsPanelProps {
  stats: {
    totalUnits: number; // Sum of all item quantities
    totalCells: number;
    critical: number;
    full: number;
    utilization: number;
  };
  isOpen: boolean;
  width: number;
  onToggle: () => void;
  onResize: (width: number) => void;
  onOpenInbound: () => void;
  selectedWarehouseId: string;
  onSelectWarehouse: (id: string) => void;
  onAddWarehouse?: () => void;
  onConfigureWarehouse?: (warehouseId: string) => void;
  colors: any;
}

export const AnalyticsPanel: React.FC<AnalyticsPanelProps> = ({ 
  stats, 
  isOpen, 
  width, 
  onToggle, 
  onResize,
  onOpenInbound,
  selectedWarehouseId,
  onSelectWarehouse,
  onAddWarehouse,
  onConfigureWarehouse,
  colors
}) => {
  const { t } = useTranslation();
  const { sessionId } = useAuth();
  const [isResizing, setIsResizing] = useState(false);
  const [isWarehouseMenuOpen, setIsWarehouseMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [warehouses, setWarehouses] = useState<Array<{ id: string; name: string; location?: string }>>([]);
  const [loadingWarehouses, setLoadingWarehouses] = useState(false);

  const getTenantId = () => localStorage.getItem('current_tenant_id');

  const getHeaders = (): Record<string, string> => {
    const tenantId = getTenantId();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (tenantId) headers['X-Tenant-ID'] = tenantId;
    if (sessionId) headers['X-Odoo-Session'] = sessionId;
    return headers;
  };

  // Fetch warehouses from stock.warehouse
  useEffect(() => {
    if (!sessionId) return;

    const fetchWarehouses = async () => {
      setLoadingWarehouses(true);
      try {
        const url = `${API_CONFIG.BACKEND_BASE_URL}/smart-fields/data/stock.warehouse?limit=1000&context=list`;
        const response = await fetch(url, {
          method: 'GET',
          headers: getHeaders(),
        });
        const data = await response.json();

        if (data.success && data.records) {
          const fetchedWarehouses = data.records.map((wh: any) => ({
            id: wh.id?.toString() || '',
            name: wh.name || wh.display_name || 'Unnamed Warehouse',
            location: wh.partner_id?.[1] || '', // Partner address if available
          }));
          setWarehouses(fetchedWarehouses);
          
          // If no warehouse is selected or selected warehouse doesn't exist, select the first one
          if (fetchedWarehouses.length > 0 && (!selectedWarehouseId || !fetchedWarehouses.find((w: any) => w.id === selectedWarehouseId))) {
            onSelectWarehouse(fetchedWarehouses[0].id);
          }
        }
      } catch (err) {
        console.error('Error fetching warehouses:', err);
        // Fallback to hardcoded warehouses on error
        setWarehouses(WAREHOUSES.map(w => ({ id: w.id, name: w.name, location: w.location })));
      } finally {
        setLoadingWarehouses(false);
      }
    };

    fetchWarehouses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // Use fetched warehouses if available, otherwise fallback to hardcoded
  const availableWarehouses = warehouses.length > 0 ? warehouses : WAREHOUSES.map(w => ({ id: w.id, name: w.name, location: w.location }));
  const currentWarehouse = availableWarehouses.find(w => w.id === selectedWarehouseId) || availableWarehouses[0] || { id: '', name: 'No Warehouse', location: '' };

  // Check for dark mode
  useEffect(() => {
    const checkDarkMode = () => {
      const isDark = document.documentElement.classList.contains('dark') || 
                    window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDarkMode(isDark);
    };
    
    checkDarkMode();
    
    // Watch for changes
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', checkDarkMode);
    
    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener('change', checkDarkMode);
    };
  }, []);

  // Resize Handlers
  const startResizing = React.useCallback(() => {
    setIsResizing(true);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', stopResizing);
  }, []);

  const handleMouseMove = React.useCallback((e: MouseEvent) => {
    const newWidth = Math.max(280, Math.min(600, e.clientX)); // Min 280, Max 600
    onResize(newWidth);
  }, [onResize]);

  const stopResizing = React.useCallback(() => {
    setIsResizing(false);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', stopResizing);
  }, [handleMouseMove]);


  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (stats.utilization / 100) * circumference;

  // Collapsed View
  if (!isOpen) {
    return (
      <div 
        className="w-14 flex flex-col items-center py-4 gap-6 z-20 shadow-xl h-full"
        style={{ 
          background: colors.card,
          borderRight: `1px solid ${colors.border}`
        }}
      >
        <button 
          onClick={onToggle}
          className="p-2 rounded-lg transition-colors"
          style={{ color: colors.textSecondary }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = colors.textPrimary;
            e.currentTarget.style.background = colors.mutedBg;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = colors.textSecondary;
            e.currentTarget.style.background = 'transparent';
          }}
          title={t("Expand Panel")}
        >
          <PanelLeftOpen size={20} />
        </button>
        <div className="flex flex-col items-center gap-2">
          <div 
            className="w-8 h-8 rounded-full border-4 flex items-center justify-center"
            style={{ 
              borderColor: colors.border,
              color: colors.textPrimary
            }}
          >
             <div className="text-[8px] font-bold">{stats.utilization}</div>
          </div>
        </div>
        <div className="mt-auto mb-4">
           {stats.critical > 0 && <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        .critical-temp-title {
          color: #991b1b !important;
        }
      `}</style>
      <div 
        className="relative flex flex-col h-full z-20 shadow-xl group/panel"
        style={{ 
          width,
          background: colors.card,
          borderRight: `1px solid ${colors.border}`
        }}
      >
      {/* Header */}
      <div 
        className="p-6 shrink-0"
        style={{ borderBottom: `1px solid ${colors.border}` }}
      >
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-bold tracking-tight flex items-center gap-2" style={{ color: colors.textPrimary }}>
            <Activity size={18} style={{ color: colors.textSecondary }} />
            {t("Live Analytics")}
          </h2>
          <button 
            onClick={onToggle}
            className="p-1.5 rounded-md transition-colors"
            style={{ color: colors.textSecondary }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = colors.textPrimary;
              e.currentTarget.style.background = colors.mutedBg;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = colors.textSecondary;
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <PanelLeftClose size={18} />
          </button>
        </div>
        <p className="text-xs" style={{ color: colors.textSecondary }}>{t("Real-time inventory telemetry")}</p>

        {/* Warehouse Selector */}
        <div className="mt-6">
          <div className="relative">
            <button 
              onClick={() => setIsWarehouseMenuOpen(!isWarehouseMenuOpen)}
              className="w-full flex items-center justify-between p-3 border rounded-xl transition-all text-left group"
              style={{ 
                background: colors.mutedBg,
                borderColor: colors.border
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = colors.textSecondary;
                e.currentTarget.style.background = colors.card;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = colors.border;
                e.currentTarget.style.background = colors.mutedBg;
              }}
            >
                <div className="flex items-center gap-3">
                    <div 
                      className="w-8 h-8 border rounded-lg flex items-center justify-center shadow-sm"
                      style={{ 
                        background: colors.card,
                        borderColor: colors.border,
                        color: colors.textPrimary
                      }}
                    >
                        <MapPin size={16} />
                    </div>
                    <div>
                        <div className="text-sm font-bold leading-tight" style={{ color: colors.textPrimary }}>{currentWarehouse.name}</div>
                        <div className="text-[10px] leading-tight mt-0.5" style={{ color: colors.textSecondary }}>{currentWarehouse.location}</div>
                    </div>
                </div>
                <ChevronDown 
                  size={14} 
                  className="transition-transform duration-200"
                  style={{ 
                    color: colors.textSecondary,
                    transform: isWarehouseMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)'
                  }}
                />
            </button>
            
            {/* Dropdown */}
            {isWarehouseMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setIsWarehouseMenuOpen(false)} />
                <div 
                  className="absolute top-full left-0 w-full mt-2 border rounded-xl shadow-xl z-20 overflow-hidden animate-fade-in"
                  style={{ 
                    background: colors.card,
                    borderColor: colors.border
                  }}
                >
                    <div className="p-1 space-y-1">
                        {loadingWarehouses ? (
                          <div className="p-2.5 text-center text-sm" style={{ color: colors.textSecondary }}>
                            {t("Loading warehouses...")}
                          </div>
                        ) : (
                          availableWarehouses.map(wh => (
                            <div key={wh.id} className="flex items-center gap-1">
                              <button 
                                onClick={() => {
                                  onSelectWarehouse(wh.id);
                                  setIsWarehouseMenuOpen(false);
                                }}
                                className="flex-1 text-left p-2.5 rounded-lg flex items-center justify-between transition-colors"
                                style={{
                                  background: selectedWarehouseId === wh.id ? colors.mutedBg : 'transparent',
                                  color: selectedWarehouseId === wh.id ? colors.textPrimary : colors.textSecondary
                                }}
                                onMouseEnter={(e) => {
                                  if (selectedWarehouseId !== wh.id) {
                                    e.currentTarget.style.background = colors.mutedBg;
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (selectedWarehouseId !== wh.id) {
                                    e.currentTarget.style.background = 'transparent';
                                  }
                                }}
                              >
                                <span className="text-sm font-medium">{wh.name}</span>
                                {selectedWarehouseId === wh.id && <Check size={14} style={{ color: colors.textPrimary }} />}
                              </button>
                              {onConfigureWarehouse && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onConfigureWarehouse(wh.id);
                                    setIsWarehouseMenuOpen(false);
                                  }}
                                  className="p-2 rounded-lg transition-colors"
                                  style={{ color: colors.textSecondary }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.background = colors.mutedBg;
                                    e.currentTarget.style.color = colors.textPrimary;
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'transparent';
                                    e.currentTarget.style.color = colors.textSecondary;
                                  }}
                                  title={t("Configure Warehouse")}
                                >
                                  <Settings size={14} />
                                </button>
                              )}
                            </div>
                          ))
                        )}
                    </div>
                    {/* Add Warehouse Button */}
                    {onAddWarehouse && (
                      <div 
                        className="p-2 border-t"
                        style={{ borderColor: colors.border }}
                      >
                        <button
                          onClick={() => {
                            onAddWarehouse();
                            setIsWarehouseMenuOpen(false);
                          }}
                          className="w-full flex items-center justify-center gap-2 p-2.5 rounded-lg transition-colors"
                          style={{ 
                            background: colors.mutedBg,
                            color: colors.textSecondary
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#4facfe20';
                            e.currentTarget.style.color = '#4facfe';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = colors.mutedBg;
                            e.currentTarget.style.color = colors.textSecondary;
                          }}
                        >
                          <Plus size={14} />
                          <span className="text-sm font-medium">{t("Add Warehouse")}</span>
                        </button>
                      </div>
                    )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        
        {/* Utilization Gauge */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold uppercase tracking-wider text-[10px]" style={{ color: colors.textSecondary }}>{t("Total Utilization")}</span>
            <span className="text-xs font-mono text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">+2.4%</span>
          </div>
          
          <div className="relative w-40 h-40 mx-auto">
            <svg className="transform -rotate-90 w-full h-full" viewBox="0 0 128 128">
              <defs>
                <linearGradient id="utilizationGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#f5576c" />
                </linearGradient>
              </defs>
              <circle
                strokeWidth="8"
                stroke={colors.border}
                fill="transparent"
                r={radius}
                cx="64"
                cy="64"
              />
              <circle
                className="transition-all duration-1000 ease-out"
                strokeWidth="8"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                stroke="url(#utilizationGradient)"
                fill="transparent"
                r={radius}
                cx="64"
                cy="64"
              />
            </svg>
            
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <div className="flex items-start ml-1">
                <span className="text-4xl font-black tracking-tighter leading-none" style={{ color: colors.textPrimary }}>{stats.utilization}</span>
                <span className="text-sm font-bold mt-1 items-start flex" style={{ color: colors.textSecondary }}>%</span>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest mt-1" style={{ color: colors.textSecondary }}>{t("Capacity")}</span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div 
              className="p-3 rounded-lg border"
              style={{ 
                background: colors.mutedBg,
                borderColor: colors.border
              }}
            >
              <div className="text-xs mb-1" style={{ color: colors.textSecondary }}>{t("Total Units")}</div>
              <div className="text-lg font-bold" style={{ color: colors.textPrimary }}>
                {stats.totalUnits.toLocaleString()}
              </div>
            </div>
            <div 
              className="p-3 rounded-lg border"
              style={{ 
                background: colors.mutedBg,
                borderColor: colors.border
              }}
            >
              <div className="text-xs mb-1" style={{ color: colors.textSecondary }}>{t("Free Space")}</div>
              <div className="text-lg font-bold" style={{ color: colors.textPrimary }}>
                {stats.totalCells - stats.full} <span className='text-[10px] font-normal' style={{ color: colors.textSecondary }}>{t("cells")}</span>
              </div>
            </div>
          </div>
        </div>

        <hr style={{ borderColor: colors.border }} />

        {/* Throughput Sparkline */}
        <div className="space-y-3">
           <div className="flex items-center justify-between">
            <span className="text-sm font-bold uppercase tracking-wider text-[10px]" style={{ color: colors.textSecondary }}>{t("Hourly Throughput")}</span>
            <TrendingUp size={14} style={{ color: colors.textSecondary }} />
          </div>
          <div className="h-24 w-full flex items-end gap-1">
             {[40, 65, 50, 80, 55, 90, 70, 85, 60, 75, 95, 80].map((h, i) => (
               <div 
                 key={i} 
                 className="relative group flex-1 h-full flex items-end"
               >
                 <div 
                    className="w-full rounded-t-sm transition-all duration-200"
                    style={{ 
                      height: `${h}%`,
                      background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'linear-gradient(135deg, #3d8bfe 0%, #00d4f2 100%)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'}
                 />
                 {/* Individual Tooltip on Hover */}
                 <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50">
                   <div 
                     className="text-[10px] font-bold px-2 py-1 rounded shadow-lg whitespace-nowrap relative"
                     style={{ 
                       background: colors.textPrimary,
                       color: colors.background
                     }}
                   >
                     {h * 12} {t("units")}
                     <div 
                       className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent"
                       style={{ borderTopColor: colors.textPrimary }}
                     ></div>
                   </div>
                 </div>
               </div>
             ))}
          </div>
          <div className="flex justify-between text-[10px] font-mono" style={{ color: colors.textSecondary }}>
            <span>08:00</span>
            <span>12:00</span>
            <span>16:00</span>
          </div>
        </div>

        <hr style={{ borderColor: colors.border }} />

        {/* Alert Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
             <span className="text-sm font-bold uppercase tracking-wider text-[10px]" style={{ color: colors.textSecondary }}>{t("System Alerts")}</span>
             <span className="bg-red-100 text-red-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{stats.critical} {t("Active")}</span>
          </div>

          <div className="space-y-2">
            {stats.critical > 0 ? (
              <div 
                className="p-3 bg-red-50 border border-red-100 rounded-lg flex items-start gap-3 cursor-pointer transition-colors"
                onMouseEnter={(e) => {
                  // Only apply hover in light mode
                  if (!isDarkMode) {
                    e.currentTarget.style.backgroundColor = 'rgb(254 226 226)'; // bg-red-100/50
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isDarkMode) {
                    e.currentTarget.style.backgroundColor = 'rgb(254 242 242)'; // bg-red-50
                  }
                }}
              >
                <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={16} />
                <div>
                  <p
                    className="text-xs font-bold critical-temp-title"
                    style={{ color: '#991b1b' }}
                  >
                    {t("Critical Temperature")}
                  </p>
                  <p className="text-[10px] text-red-700 mt-0.5 leading-relaxed">
                    {t("Zone A-B122 reporting elevated heat levels above threshold.")}
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-lg text-center">
                <span className="text-xs font-medium text-emerald-800">{t("All systems normal")}</span>
              </div>
            )}
            
            {/* Inbound Button */}
            <div 
              onClick={onOpenInbound}
              className="p-3 border rounded-lg flex items-start gap-3 group cursor-pointer transition-all active:scale-[0.98]"
              style={{ 
                background: colors.mutedBg,
                borderColor: colors.border
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = colors.card;
                e.currentTarget.style.borderColor = colors.textSecondary;
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = colors.mutedBg;
                e.currentTarget.style.borderColor = colors.border;
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
               <Package 
                 className="shrink-0 mt-0.5 transition-colors" 
                 size={16}
                 style={{ color: colors.textSecondary }}
               />
               <div className="w-full">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-bold" style={{ color: colors.textPrimary }}>{t("Inbound Shipment")}</h4>
                    <ArrowRight 
                      size={12} 
                      className="transition-colors"
                      style={{ color: colors.textSecondary }}
                    />
                  </div>
                  <p className="text-[10px] mt-0.5" style={{ color: colors.textSecondary }}>
                    {t("View incoming manifest & schedules")}
                  </p>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* Resize Handle */}
      <div 
        className="absolute top-0 right-0 w-1 h-full cursor-col-resize transition-colors z-30 group/resize"
        style={{ background: colors.border }}
        onMouseEnter={(e) => e.currentTarget.style.background = colors.textSecondary}
        onMouseLeave={(e) => e.currentTarget.style.background = colors.border}
        onMouseDown={startResizing}
      >
        {isResizing && (
          <div 
            className="absolute top-1/2 right-1 transform -translate-y-1/2 p-1 rounded"
            style={{ background: colors.textPrimary, color: colors.background }}
          >
            <GripVertical size={12} />
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div 
        className="p-4 shrink-0"
        style={{ 
          borderTop: `1px solid ${colors.border}`,
          background: colors.mutedBg
        }}
      >
        <button 
          className="w-full py-2.5 border text-xs font-bold uppercase tracking-wider rounded-lg transition-all shadow-sm"
          style={{ 
            background: colors.card,
            borderColor: colors.border,
            color: colors.textPrimary
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = colors.mutedBg;
            e.currentTarget.style.borderColor = colors.textSecondary;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = colors.card;
            e.currentTarget.style.borderColor = colors.border;
          }}
        >
          {t("Download Report")}
        </button>
      </div>
    </div>
    </>
  );
};