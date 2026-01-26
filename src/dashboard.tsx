import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, LayoutGroup, AnimatePresence } from 'framer-motion';
import { Plus, LayoutGrid, Bell, Search, Menu, ChevronDown, X, Play, Clock, Database, TrendingUp, DollarSign, Package, Layers, Activity, BarChart3, Hash, Calculator, Settings2 } from 'lucide-react';
import { StatCardEditModal } from './components/Dashboard/StatCardEditModal';
import { useTheme } from '../context/theme';
import { useAuth } from '../context/auth';
import { INITIAL_WIDGETS } from './components/Dashboard/constants';
import { WidgetConfig, WidgetType } from './components/Dashboard/types';
import { WidgetRenderer } from './components/Dashboard/WidgetRenderer';
import { WidgetModal } from './components/Dashboard/WidgetModal';
import SimulationModal from './components/Dashboard/SimulationModal';
import { ActionDropdown } from './components/ActionDropdown';
import { StatCard } from './components/StatCard';
import { buildApiUrl, getCurrentTenantId } from './config/api';
import type { LucideIcon } from 'lucide-react';

// Separate component to handle local state for filters
const WidgetCard: React.FC<{
  widget: WidgetConfig;
  onRemove: (id: string) => void;
  colors: any;
  mode: string;
}> = ({ widget, onRemove, colors, mode }) => {
  const [timeRange, setTimeRange] = useState('all');
  const [widgetData, setWidgetData] = useState<any[]>([]);
  const [isSimulationOpen, setIsSimulationOpen] = useState(false);

  const ranges = [
    { label: 'All Time', value: 'all' },
    { label: 'Last 7 Days', value: '7d' },
    { label: 'Last Month', value: '1m' },
    { label: 'Last Quarter', value: '3m' },
  ];

  // Prepare time filter actions for ActionDropdown
  const timeFilterActions = ranges.map(range => ({
    key: range.value,
    label: range.label,
    onClick: () => setTimeRange(range.value),
  }));

  const currentTimeRangeLabel = ranges.find(r => r.value === timeRange)?.label || 'All Time';

  return (
    <motion.div
      layoutId={widget.id}
      initial={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
      animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
      transition={{ duration: 0.4, type: 'spring', damping: 20 }}
      className={`relative group backdrop-blur-sm rounded-2xl p-5 transition-all duration-300 flex flex-col ${widget.gridSpan === 2 ? 'md:col-span-2' : ''}`}
      style={{
        backgroundColor: colors.card,
        border: `1px solid ${colors.border}`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : colors.border;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = colors.border;
      }}
    >
      {/* Widget Header */}
      <div className="flex items-start justify-between mb-4 z-20 relative">
        <h3 className="font-display font-medium text-lg mt-1" style={{ color: colors.textPrimary }}>{widget.title}</h3>

        <div className="flex items-center gap-2">
          {/* Time Filter Dropdown - For time-series charts (line, area, sparkline) and latestOperations (latestTransfers, latestActivities) */}
          {(['line', 'area', 'sparkline'].includes(widget.type) || 
            (widget.type === 'latestOperations' && ['latestTransfers', 'latestActivities'].includes(widget.settings?.operationType))) && (
            <ActionDropdown
              actions={timeFilterActions}
              label={currentTimeRangeLabel}
              icon={Clock}
              placement="bottom"
              align="right"
            />
          )}

          <button
            onClick={() => onRemove(widget.id)}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg"
            style={{ color: colors.textSecondary }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#ef4444';
              e.currentTarget.style.backgroundColor = colors.mutedBg;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = colors.textSecondary;
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            title="Remove Widget"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Widget Content */}
      <div className="flex-1 min-h-0 relative z-0">
        <WidgetRenderer 
          widget={widget} 
          timeRange={timeRange} 
          colors={colors} 
          mode={mode}
          onDataChange={setWidgetData}
        />
      </div>

      {/* Simulate Button - Bottom Right - Only for chart types */}
      {['line', 'bar', 'area', 'pie', 'donut', 'scatter', 'sparkline'].includes(widget.type) && (
        <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <ActionDropdown
            actions={[
              {
                key: 'simulate',
                label: 'Simulate',
                icon: Play,
                onClick: () => setIsSimulationOpen(true),
              }
            ]}
            label="Simulate"
            icon={Play}
            placement="top"
            align="right"
          />
        </div>
      )}

      {/* Simulation Modal */}
      <SimulationModal
        isOpen={isSimulationOpen}
        onClose={() => setIsSimulationOpen(false)}
        widget={widget}
        originalData={widgetData}
        colors={colors}
        mode={mode}
      />
    </motion.div>
  );
};

// Helper function to get icon and gradient for stat cards
const getStatCardConfig = (widget: WidgetConfig, index: number): { icon: LucideIcon; gradient: string } => {
  const title = widget.title?.toLowerCase() || '';
  const dataSource = widget.dataSource?.toLowerCase() || '';
  const yAxisKey = widget.settings?.yAxisKey?.toLowerCase() || '';

  // Default gradients array for variety
  const gradients = [
    'linear-gradient(135deg, #dc2626 0%, #ea580c 100%)',
    'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #f6d365 0%, #fda085 100%)',
  ];

  // Array of fallback icons for variety when no keywords match
  const fallbackIcons: LucideIcon[] = [Calculator, BarChart3, Hash, TrendingUp, Activity, Database, Layers, Package];

  // Determine icon based on title, dataSource, or yAxisKey
  let icon: LucideIcon | null = null;

  if (title.includes('revenue') || title.includes('income') || title.includes('sales') || title.includes('money') || yAxisKey.includes('revenue') || yAxisKey.includes('profit')) {
    icon = DollarSign;
  } else if (title.includes('profit') || title.includes('margin') || title.includes('earning')) {
    icon = TrendingUp;
  } else if (title.includes('product') || title.includes('item') || title.includes('sku') || dataSource.includes('product') || yAxisKey.includes('product')) {
    icon = Package;
  } else if (title.includes('stock') || title.includes('inventory') || title.includes('quantity') || title.includes('qty') || dataSource.includes('stock') || dataSource.includes('inventory')) {
    icon = Layers;
  } else if (title.includes('order') || title.includes('transfer') || title.includes('receipt') || title.includes('shipment') || dataSource.includes('picking') || dataSource.includes('transfer')) {
    icon = Activity;
  } else if (title.includes('count') || title.includes('total') || title.includes('number') || title.includes('amount')) {
    icon = Hash;
  } else if (title.includes('trend') || title.includes('growth') || title.includes('increase') || title.includes('change')) {
    icon = TrendingUp;
  } else if (title.includes('database') || title.includes('data') || title.includes('record') || dataSource.includes('database')) {
    icon = Database;
  } else if (title.includes('warehouse') || title.includes('location') || title.includes('zone')) {
    icon = Layers;
  } else if (title.includes('user') || title.includes('employee') || title.includes('worker')) {
    icon = Activity;
  }

  // If no keyword matched, use fallback icons based on index for variety
  if (!icon) {
    icon = fallbackIcons[index % fallbackIcons.length];
  }

  return {
    icon,
    gradient: gradients[index % gradients.length],
  };
};

// Component to render stat cards row
const StatCardsRow: React.FC<{
  statWidgets: WidgetConfig[];
  colors: any;
  mode: string;
  onRemove: (id: string) => void;
  onEdit: (widget: WidgetConfig) => void;
}> = ({ statWidgets, colors, mode, onRemove, onEdit }) => {
  const [statData, setStatData] = useState<Record<string, { value: string | number; label: string }>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatData = async () => {
      setLoading(true);
      const dataMap: Record<string, { value: string | number; label: string }> = {};

      await Promise.all(
        statWidgets.map(async (widget) => {
          try {
            const settings = widget.settings || {};
            // Extract calculationType from widget type if it's encoded (statcardsum, statcardcount, etc.)
            let calculationType = settings.calculationType;
            if (!calculationType && widget.type.startsWith('statcard')) {
              calculationType = widget.type.replace('statcard', '') as 'count' | 'sum' | 'average' | 'min' | 'max';
            }
            calculationType = calculationType || 'count';
            
            const requestConfig: any = {
              widgetType: 'stat', // Required for backend to recognize as stat widget
              calculationType,
              title: widget.title, // Pass title so backend can infer missing config
            };

            if (calculationType !== 'count' && settings.yAxisKey) {
              requestConfig.yAxisKey = settings.yAxisKey;
            } else if (settings.yAxisKey) {
              // Also include yAxisKey even if calculationType is count, in case it's needed for inference
              requestConfig.yAxisKey = settings.yAxisKey;
            }

            const tenantId = getCurrentTenantId();
            const response = await fetch(buildApiUrl('/v1/smart-widgets/widgets/preview'), {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(tenantId && { 'X-Tenant-ID': tenantId }),
              },
              body: JSON.stringify({
                sourceTable: widget.dataSource,
                config: requestConfig,
              }),
            });

            const data = await response.json();
            console.log(`[Dashboard] Stat widget ${widget.id} response:`, { 
              success: data.success, 
              dataLength: data.data?.length,
              calculationType,
              tableData: data.data 
            });
            
            if (data.success && data.data && data.data.length > 0) {
              const tableData = data.data;
              const key = settings.yAxisKey;
              let result = 0;
              let label = widget.title || 'Stat';

              if (calculationType === 'count') {
                // For count, backend returns: [{ _count: 72 }]
                const countValue = tableData.length === 1 && tableData[0]._count !== undefined 
                  ? tableData[0]._count 
                  : tableData.length;
                
                // Parse the count value (handle both string and number)
                result = typeof countValue === 'string' 
                  ? parseInt(countValue, 10) 
                  : Number(countValue);
                
                if (isNaN(result)) {
                  result = tableData.length;
                }
                
                label = widget.title || 'Count';
                
                // Set the dataMap for count widgets
                dataMap[widget.id] = {
                  value: result.toLocaleString(),
                  label: label,
                };
              } else if (key) {
                // For sum/average/min/max, the backend returns the calculated value directly
                // Check if the backend already calculated it (single row with the key or 'value' key)
                if (tableData.length === 1) {
                  const row = tableData[0];
                  // Backend returns: { [yAxisKey]: value } or { value: value }
                  const backendValue = row[key] ?? row.value ?? row[key.replace('_id', '_name')];
                  
                  if (backendValue !== undefined && backendValue !== null) {
                    // Parse the value - handle both string and number
                    const parsedValue = typeof backendValue === 'string' 
                      ? parseFloat(backendValue) 
                      : Number(backendValue);
                    
                    if (!isNaN(parsedValue)) {
                      result = parsedValue;
                    }
                  }
                } else {
                  // Fallback: try to extract values from multiple rows (shouldn't happen for stat widgets)
                  const values = tableData
                    .map((d: any) => {
                      const value = d[key] || d[`${key}_name`] || d[key.replace('_id', '_name')] || d.value;
                      // Parse string values to numbers
                      if (typeof value === 'string') {
                        const parsed = parseFloat(value);
                        return !isNaN(parsed) ? parsed : null;
                      }
                      return typeof value === 'number' ? value : null;
                    })
                    .filter((v: any) => v !== null && !isNaN(v)) as number[];

                  if (values.length > 0) {
                    switch (calculationType) {
                      case 'sum':
                        result = values.reduce((a: number, b: number) => a + b, 0);
                        break;
                      case 'average':
                        result = values.reduce((a: number, b: number) => a + b, 0) / values.length;
                        break;
                      case 'min':
                        result = Math.min(...values);
                        break;
                      case 'max':
                        result = Math.max(...values);
                        break;
                    }
                  }
                }

                // Format the result - convert to integer if it's a whole number, otherwise keep decimals for average
                let formattedValue: string | number;
                const isCurrency = settings.format === 'currency' || 
                  key.toLowerCase().includes('revenue') || 
                  key.toLowerCase().includes('profit') || 
                  key.toLowerCase().includes('amount') || 
                  key.toLowerCase().includes('price') ||
                  key.toLowerCase().includes('cost');

                if (calculationType === 'average') {
                  // For average, show 2 decimal places
                  formattedValue = result.toFixed(2);
                } else {
                  // For sum/min/max, convert to integer if it's a whole number
                  const isWholeNumber = result % 1 === 0;
                  formattedValue = isWholeNumber ? Math.round(result) : result.toFixed(2);
                }

                if (isCurrency) {
                  dataMap[widget.id] = {
                    value: `$${typeof formattedValue === 'number' ? formattedValue.toLocaleString() : formattedValue}`,
                    label: widget.title || `Sum of ${key}`,
                  };
                } else {
                  dataMap[widget.id] = {
                    value: typeof formattedValue === 'number' ? formattedValue.toLocaleString() : formattedValue,
                    label: widget.title || `${calculationType} of ${key}`,
                  };
                }
              } else {
                dataMap[widget.id] = { value: 0, label: widget.title || 'No data' };
              }
            } else {
              dataMap[widget.id] = { value: 0, label: widget.title || 'No data' };
            }
          } catch (error) {
            console.error(`Error fetching data for stat widget ${widget.id}:`, error);
            dataMap[widget.id] = { value: 0, label: widget.title || 'Error' };
          }
        })
      );

      setStatData(dataMap);
      setLoading(false);
    };

    if (statWidgets.length > 0) {
      fetchStatData();
    } else {
      setLoading(false);
    }
  }, [statWidgets]);

  if (statWidgets.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {statWidgets.map((widget, index) => {
        const { icon, gradient } = getStatCardConfig(widget, index);
        const data = statData[widget.id];
        
        if (loading || !data) {
          return (
            <div
              key={widget.id}
              className="rounded-2xl p-6 animate-pulse"
              style={{
                backgroundColor: colors.card,
                border: `1px solid ${colors.border}`,
              }}
            >
              <div className="h-12 bg-gray-300 rounded-lg mb-4" style={{ backgroundColor: colors.mutedBg }} />
              <div className="h-8 bg-gray-300 rounded" style={{ backgroundColor: colors.mutedBg }} />
            </div>
          );
        }

        return (
          <div key={widget.id} className="relative group">
            <StatCard
              label={data.label}
              value={data.value}
              icon={icon}
              gradient={gradient}
              delay={index}
            />
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-10">
              <button
                onClick={() => onEdit(widget)}
                className="p-1.5 rounded-lg"
                style={{ 
                  color: colors.textSecondary,
                  backgroundColor: colors.mutedBg,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = colors.action || '#3b82f6';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = colors.textSecondary;
                }}
                title="Edit Stat Card"
              >
                <Settings2 size={14} />
              </button>
              <button
                onClick={() => onRemove(widget.id)}
                className="p-1.5 rounded-lg"
                style={{ 
                  color: colors.textSecondary,
                  backgroundColor: colors.mutedBg,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#ef4444';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = colors.textSecondary;
                }}
                title="Remove Stat Card"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const Dashboard: React.FC = () => {
  const { colors, mode } = useTheme();
  const { uid, sessionId } = useAuth();
  const [widgets, setWidgets] = useState<WidgetConfig[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingStatCard, setEditingStatCard] = useState<WidgetConfig | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Fetch widgets from backend on mount
  useEffect(() => {
    fetchWidgets();
  }, []);

  const fetchWidgets = async () => {
    setLoading(true);
    try {
      const tenantId = getCurrentTenantId();
      const response = await fetch(buildApiUrl(`/v1/smart-widgets/widgets${uid ? `?user_id=${uid}` : ''}`), {
        headers: {
          'Content-Type': 'application/json',
          ...(sessionId && { 'X-Session-ID': sessionId }),
          ...(tenantId && { 'X-Tenant-ID': tenantId }),
        },
      });
      const data = await response.json();
      // Always start with mock widgets first
      let allWidgets: WidgetConfig[] = [];

      if (data.success && data.data && data.data.length > 0) {
        // Convert backend widgets to frontend format
        const convertedWidgets = data.data.map((w: any) => {
          const config = w.config || {};
          // Fix: Convert calculationType to aggregateType for charts (backward compatibility)
          const settings: any = { ...config };
          if (['bar', 'pie', 'donut', 'line', 'area', 'sparkline'].includes(w.widget_type)) {
            if (config.calculationType && !config.aggregateType) {
              settings.aggregateType = config.calculationType;
              delete settings.calculationType;
            }
          }
          
          // For stat widgets, encode calculationType in the type if it exists
          let widgetType = w.widget_type;
          if (w.widget_type === 'stat' && config.calculationType) {
            widgetType = `statcard${config.calculationType}` as WidgetType;
          } else if (w.widget_type === 'stat' && !config.calculationType) {
            // If no calculationType in config, default to count
            widgetType = 'statcardcount' as WidgetType;
            settings.calculationType = 'count';
          }
          
          return {
            id: `w-${w.id}`,
            type: widgetType,
            title: w.title || w.widget_name,
            dataSource: w.source_table,
            settings: settings,
            gridSpan: w.grid_span || 1,
          };
        });
        // Only use widgets from the database, no mock/initial widgets
        allWidgets = [...convertedWidgets];
      }

      setWidgets(allWidgets);
    } catch (error) {
      console.error('Error fetching widgets:', error);
      // Fallback to empty array on error (no default widgets)
      setWidgets([]);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to check if a widget is a stat widget (including statcard variants)
  const isStatWidget = (type: string) => {
    return type === 'stat' || type.startsWith('statcard');
  };

  // Separate stat widgets from other widgets
  const { statWidgets, otherWidgets } = useMemo(() => {
    const stats = widgets.filter(w => isStatWidget(w.type));
    const others = widgets.filter(w => !isStatWidget(w.type));

    return {
      statWidgets: stats, // Only show user-created stat widgets, no defaults
      otherWidgets: others,
    };
  }, [widgets]);

  const handleAddWidget = async (newWidget: WidgetConfig) => {
    try {
      // Save to backend
      // Flatten settings into config object for backend
      const config: any = {};
      if (newWidget.settings) {
        Object.entries(newWidget.settings).forEach(([key, value]) => {
          // Only include non-null/undefined values
          if (value !== null && value !== undefined) {
          config[key] = value;
          }
        });
      }
      
      // For stat widgets, extract calculationType from widget type if it's encoded (statcardsum, statcardcount, etc.)
      let widgetTypeToSave = newWidget.type;
      if (newWidget.type.startsWith('statcard')) {
        // Extract calculationType from widget type (e.g., "statcardsum" -> "sum")
        const calcType = newWidget.type.replace('statcard', '');
        config.calculationType = calcType;
        widgetTypeToSave = 'stat'; // Save as 'stat' in database, but keep calculationType in config
        // Ensure yAxisKey is included if it exists
        if (newWidget.settings?.yAxisKey) {
          config.yAxisKey = newWidget.settings.yAxisKey;
        }
      } else if (newWidget.type === 'stat' || newWidget.type === 'statcardcount' || newWidget.type === 'statcardsum' || newWidget.type === 'statcardaverage' || newWidget.type === 'statcardmin' || newWidget.type === 'statcardmax') {
        // Legacy support: if it's just 'stat', use calculationType from settings
        if (!config.calculationType && newWidget.settings?.calculationType) {
          config.calculationType = newWidget.settings.calculationType;
        }
        // If still not set, default to count but log a warning
        if (!config.calculationType) {
          console.warn('[Dashboard] Stat widget missing calculationType, defaulting to count');
          config.calculationType = 'count';
        }
        // Ensure yAxisKey is included if it exists
        if (newWidget.settings?.yAxisKey) {
          config.yAxisKey = newWidget.settings.yAxisKey;
        }
      }

      console.log('[Dashboard] Creating widget with config:', {
        widget_name: newWidget.title,
        widget_type: newWidget.type,
        source_table: newWidget.dataSource,
        config: config,
        originalSettings: newWidget.settings,
      });

      const tenantId = getCurrentTenantId();
      const response = await fetch(buildApiUrl('/v1/smart-widgets/widgets'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionId && { 'X-Session-ID': sessionId }),
          ...(tenantId && { 'X-Tenant-ID': tenantId }),
        },
        body: JSON.stringify({
          widget_name: newWidget.title,
          widget_type: widgetTypeToSave,
          source_table: newWidget.dataSource,
          title: newWidget.title,
          grid_span: newWidget.gridSpan,
          config: config,
          user_id: uid || null,
        }),
      });
      const data = await response.json();
      if (data.success) {
        // Convert backend widget to frontend format and add to state
        const convertedWidget = {
          id: `w-${data.data.id}`,
          type: data.data.widget_type,
          title: data.data.title || data.data.widget_name,
          dataSource: data.data.source_table,
          settings: data.data.config || {},
          gridSpan: data.data.grid_span || 1,
        };
        setWidgets([...widgets, convertedWidget]);
      } else {
        console.error('Error creating widget:', data.message);
        // Still add to local state even if backend save fails
        setWidgets([...widgets, newWidget]);
      }
    } catch (error) {
      console.error('Error saving widget to backend:', error);
      // Still add to local state even if backend save fails
      setWidgets([...widgets, newWidget]);
    }
  };

  const removeWidget = async (id: string) => {
    // Extract numeric ID from widget ID (format: w-123)
    const widgetId = id.replace('w-', '');
    try {
      const tenantId = getCurrentTenantId();
      const response = await fetch(buildApiUrl(`/v1/smart-widgets/widgets/${widgetId}`), {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionId && { 'X-Session-ID': sessionId }),
          ...(tenantId && { 'X-Tenant-ID': tenantId }),
        },
      });
      const data = await response.json();
      if (data.success) {
        setWidgets(widgets.filter(w => w.id !== id));
      } else {
        console.error('Error deleting widget:', data.message);
        // Still remove from local state even if backend delete fails
        setWidgets(widgets.filter(w => w.id !== id));
      }
    } catch (error) {
      console.error('Error deleting widget from backend:', error);
      // Still remove from local state even if backend delete fails
      setWidgets(widgets.filter(w => w.id !== id));
    }
  };

  const handleEditStatCard = useCallback((widget: WidgetConfig) => {
    setEditingStatCard(widget);
    setIsEditModalOpen(true);
  }, []);

  const handleSaveStatCard = useCallback(async (updatedWidget: WidgetConfig) => {
    // Update local state immediately
    setWidgets(prev => prev.map(w => w.id === updatedWidget.id ? updatedWidget : w));
    
    // If it's a backend widget (has w- prefix with numeric id), update on backend
    const widgetId = updatedWidget.id.replace('w-', '');
    if (!isNaN(Number(widgetId))) {
      try {
        const tenantId = getCurrentTenantId();
        // Ensure calculationType is in the config
        const config: any = { ...updatedWidget.settings };
        if (updatedWidget.type.startsWith('statcard')) {
          const calcType = updatedWidget.type.replace('statcard', '');
          config.calculationType = calcType;
        } else if (updatedWidget.type === 'stat' && !config.calculationType) {
          config.calculationType = updatedWidget.settings?.calculationType || 'count';
        }
        
        await fetch(buildApiUrl(`/v1/smart-widgets/widgets/${widgetId}`), {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(sessionId && { 'X-Session-ID': sessionId }),
            ...(tenantId && { 'X-Tenant-ID': tenantId }),
          },
          body: JSON.stringify({
            title: updatedWidget.title,
            source_table: updatedWidget.dataSource,
            config: config,
          }),
        });
      } catch (error) {
        console.error('Error updating widget on backend:', error);
      }
    }
    
    setIsEditModalOpen(false);
    setEditingStatCard(null);
  }, [sessionId]);

  return (
    <div className="min-h-screen selection:bg-primary/30" style={{ backgroundColor: colors.background, color: colors.textPrimary }}>
      {/* Page-Specific Global Styles */}
      <style>{`
        /* Custom Scrollbar */
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: ${mode === 'dark' ? '#27272a' : '#d1d5db'};
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: ${mode === 'dark' ? '#3f3f46' : '#9ca3af'};
        }
      `}</style>

      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full blur-[120px] animate-blob" style={{ backgroundColor: `${colors.action}15` }} />
      </div>

      <main className="max-w-[1600px] mx-auto p-6 md:p-8 relative z-10">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
          <div>
            <h1 className="text-3xl md:text-4xl font-display font-bold" style={{ color: colors.textPrimary }}>
              Performance Overview
            </h1>
            <p className="mt-2 font-light tracking-wide" style={{ color: colors.textSecondary }}>Custom real-time data visualization dashboard.</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="group flex items-center gap-2 px-5 py-3 rounded-lg font-semibold transition-all active:scale-95 shadow-lg"
            style={{ backgroundColor: mode === 'dark' ? '#ffffff' : colors.textPrimary, color: mode === 'dark' ? '#000000' : '#ffffff' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = mode === 'dark' ? '#f3f4f6' : colors.textPrimary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = mode === 'dark' ? '#ffffff' : colors.textPrimary;
            }}
          >
            <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
            <span>Add Widget</span>
          </button>
        </header>

        <LayoutGroup>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-sm" style={{ color: colors.textSecondary }}>Loading widgets...</div>
            </div>
          ) : (
            <>
              {/* Stat Cards Row */}
              <StatCardsRow
                statWidgets={statWidgets}
                colors={colors}
                mode={mode}
                onRemove={removeWidget}
                onEdit={handleEditStatCard}
              />

              {/* Other Widgets Grid */}
              {otherWidgets.length > 0 ? (
                <motion.div
                  layout
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-[minmax(320px,auto)]"
                >
                  {otherWidgets.map((widget) => (
                    <WidgetCard
                      key={widget.id}
                      widget={widget}
                      onRemove={removeWidget}
                      colors={colors}
                      mode={mode}
                    />
                  ))}
                </motion.div>
              ) : (
                <div className="h-80 flex flex-col items-center justify-center border-2 border-dashed rounded-2xl" style={{ borderColor: colors.border, backgroundColor: colors.mutedBg, color: colors.textSecondary }}>
                  <p className="mb-4 font-display text-lg">No widgets added yet.</p>
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="font-medium flex items-center gap-2"
                    style={{ color: colors.action }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = mode === 'dark' ? 'rgba(79, 172, 254, 0.8)' : colors.action;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = colors.action;
                    }}
                  >
                    <Plus size={16} /> Create your first widget
                  </button>
                </div>
              )}
            </>
          )}
        </LayoutGroup>
      </main>

      <WidgetModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={handleAddWidget}
        colors={colors}
        mode={mode}
      />

      <StatCardEditModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingStatCard(null);
        }}
        onSave={handleSaveStatCard}
        widget={editingStatCard}
        colors={colors}
        mode={mode}
      />
    </div>
  );
};