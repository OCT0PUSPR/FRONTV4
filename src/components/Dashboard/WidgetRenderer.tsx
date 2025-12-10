import React, { useMemo, useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  PieChart, Pie, Cell, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { WidgetConfig } from './types';
import { MOCK_DB } from './constants';
import { AlertTriangle, TrendingUp, DollarSign, Hash, CheckCircle2, Clock, XCircle, FileText, Truck, BarChart3, TrendingDown, Package, User, Star, Mail, Phone } from 'lucide-react';
import { motion } from 'framer-motion';
import { buildApiUrl, getCurrentTenantId } from '../../config/api';

interface Props {
  widget: WidgetConfig;
  timeRange?: string;
  colors?: any;
  mode?: string;
  onDataChange?: (data: any[]) => void; // Callback to expose current data
}

const COLORS = ['#8b5cf6', '#ec4899', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

const CustomTooltip = ({ active, payload, label, colors }: any) => {
  if (active && payload && payload.length) {
    // Check if this is a pie/donut chart tooltip (has name in payload)
    const isPieChart = payload[0]?.name !== undefined;
    
    if (isPieChart) {
      // For pie/donut charts, show name and value
      const name = payload[0].name || label || 'Unknown';
      const value = payload[0].value;
      
      return (
        <div className="p-3 rounded-lg shadow-2xl backdrop-blur-xl z-50" style={{ backgroundColor: colors?.card || '#18181b', border: `1px solid ${colors?.border || '#27272a'}` }}>
          <p className="text-xs font-medium mb-1" style={{ color: colors?.textSecondary || '#a1a1aa' }}>{name}</p>
          <p className="text-sm font-bold font-display" style={{ color: colors?.textPrimary || '#f4f4f5' }}>
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
        </div>
      );
    }
    
    // For other charts (line, bar, area, etc.), format the label as date
    let formattedLabel = label;
    if (label) {
      if (typeof label === 'string') {
        // If it's a date string, try to parse and format it
        const dateMatch = label.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (dateMatch) {
          const date = new Date(label);
          if (!isNaN(date.getTime())) {
            // Format as "MMM DD, YYYY" (date only, no time)
            formattedLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          }
        } else {
          // Check if it contains a time component (T or space followed by time)
          const timeMatch = label.match(/^(.+?)[T\s](\d{2}:\d{2})/);
          if (timeMatch) {
            const date = new Date(timeMatch[1]);
            if (!isNaN(date.getTime())) {
              formattedLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            }
          }
        }
      } else if (label instanceof Date) {
        formattedLabel = label.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
    }

    return (
      <div className="p-3 rounded-lg shadow-2xl backdrop-blur-xl z-50" style={{ backgroundColor: colors?.card || '#18181b', border: `1px solid ${colors?.border || '#27272a'}` }}>
        <p className="text-xs font-medium mb-1" style={{ color: colors?.textSecondary || '#a1a1aa' }}>{formattedLabel}</p>
        <p className="text-sm font-bold font-display" style={{ color: colors?.textPrimary || '#f4f4f5' }}>
          {typeof payload[0].value === 'number' ? payload[0].value.toLocaleString() : payload[0].value}
        </p>
      </div>
    );
  }
  return null;
};

export const WidgetRenderer: React.FC<Props> = ({ widget, timeRange = 'all', colors, mode, onDataChange }) => {
  const { type, settings, dataSource } = widget;
  const [rawData, setRawData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if dataSource is a real table (not in MOCK_DB)
  const isRealTable = !MOCK_DB[dataSource];

  // Fetch data from backend if it's a real table
  useEffect(() => {
    if (isRealTable && dataSource) {
      fetchWidgetData();
    } else {
      // Use mock data for backward compatibility
      setRawData(MOCK_DB[dataSource]?.data || []);
    }
  }, [dataSource, type, settings, isRealTable, timeRange]);

  const fetchWidgetData = async () => {
    setLoading(true);
    setError(null);
    try {
      const requestConfig: any = {
        widgetType: type,
        filters: (settings as any).filters || [],
        limit: 1000,
        timeRange: timeRange, // Pass time range to backend
      };

      // Add widget-specific config
      if (type === 'list') {
        requestConfig.dataKeys = settings.dataKeys || [];
      } else if (type === 'stat' || type.startsWith('statcard')) {
        // Extract calculationType from widget type if it's encoded (statcardsum, statcardcount, etc.)
        let calculationType = settings.calculationType;
        if (!calculationType && type.startsWith('statcard')) {
          calculationType = type.replace('statcard', '') as 'count' | 'sum' | 'average' | 'min' | 'max';
        }
        requestConfig.calculationType = calculationType || 'count';
        if (requestConfig.calculationType !== 'count' && settings.yAxisKey) {
          requestConfig.yAxisKey = settings.yAxisKey;
        }
      } else if (['line', 'area', 'sparkline'].includes(type)) {
        // Time series charts
        if (settings.xAxisKey) requestConfig.xAxisKey = settings.xAxisKey;
        // Handle both aggregateType and calculationType (for backward compatibility)
        requestConfig.aggregateType = settings.aggregateType || (settings as any).calculationType || 'count';
        if (settings.yAxisKey) requestConfig.yAxisKey = settings.yAxisKey;
      } else if (['bar', 'pie', 'donut'].includes(type)) {
        // Grouped charts
        if (settings.xAxisKey) requestConfig.xAxisKey = settings.xAxisKey;
        // Handle both aggregateType and calculationType (for backward compatibility)
        requestConfig.aggregateType = settings.aggregateType || (settings as any).calculationType || 'count';
        if (settings.yAxisKey) requestConfig.yAxisKey = settings.yAxisKey;
      } else if (type === 'latestOperations') {
        // Latest Operations widgets
        if (settings.operationType) {
          requestConfig.operationType = settings.operationType;
        } else {
          console.warn(`[WidgetRenderer] Warning: latestOperations widget ${widget.id} missing operationType in settings:`, settings);
        }
      }

      console.log(`[WidgetRenderer] Fetching data for widget ${widget.id} (${type})`, requestConfig);
      const tenantId = getCurrentTenantId();
      const response = await fetch(buildApiUrl('/v1/smart-widgets/widgets/preview'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(tenantId && { 'X-Tenant-ID': tenantId }),
        },
        body: JSON.stringify({
          sourceTable: dataSource,
          config: requestConfig,
        }),
      });
      const data = await response.json();
      console.log(`[WidgetRenderer] Response for widget ${widget.id}:`, data);

      if (data.success) {
        setRawData(data.data || []);
      } else {
        setError(data.message || 'Failed to fetch data');
        setRawData([]);
      }
    } catch (err: any) {
      console.error('Error fetching widget data:', err);
      setError(err.message || 'Failed to fetch data');
      setRawData([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter Data Logic
  const tableData = useMemo(() => {
    if (timeRange === 'all') return rawData;

    // For real tables, we could add date filtering here if needed
    // For now, return all data
    return rawData;
  }, [rawData, timeRange, dataSource]);

  // Expose data to parent component for simulation
  useEffect(() => {
    if (onDataChange && ['line', 'bar', 'area', 'pie', 'donut', 'scatter', 'sparkline'].includes(type)) {
      onDataChange(tableData);
    }
  }, [tableData, type, onDataChange]);

  // Sort data by date for time-series charts (line, area, sparkline)
  const sortedLineData = useMemo(() => {
    if (widget.type !== 'line' || !widget.settings.xAxisKey) return tableData;
    return [...tableData].sort((a, b) => {
      const dateA = new Date(a[widget.settings.xAxisKey] || 0).getTime();
      const dateB = new Date(b[widget.settings.xAxisKey] || 0).getTime();
      return dateA - dateB;
    });
  }, [tableData, widget.type, widget.settings.xAxisKey]);

  const sortedAreaData = useMemo(() => {
    if (widget.type !== 'area' || !widget.settings.xAxisKey) return tableData;
    return [...tableData].sort((a, b) => {
      const dateA = new Date(a[widget.settings.xAxisKey] || 0).getTime();
      const dateB = new Date(b[widget.settings.xAxisKey] || 0).getTime();
      return dateA - dateB;
    });
  }, [tableData, widget.type, widget.settings.xAxisKey]);

  const sortedSparkData = useMemo(() => {
    if (widget.type !== 'sparkline' || !widget.settings.xAxisKey) return tableData;
    return [...tableData].sort((a, b) => {
      const dateA = new Date(a[widget.settings.xAxisKey] || 0).getTime();
      const dateB = new Date(b[widget.settings.xAxisKey] || 0).getTime();
      return dateA - dateB;
    });
  }, [tableData, widget.type, widget.settings.xAxisKey]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-sm" style={{ color: colors?.textSecondary || '#71717a' }}>Loading data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-sm" style={{ color: '#ef4444' }}>Error: {error}</div>
      </div>
    );
  }

  switch (type) {
    case 'stat': {
      const calculationType = settings.calculationType || 'count';
      const key = settings.yAxisKey;
      
      let result = 0;
      let label = '';
      let isCurrency = false;

      if (calculationType === 'count') {
        result = (tableData.length === 1 && tableData[0]._count !== undefined) ? tableData[0]._count : tableData.length;
        label = 'Count';
      } else if (key) {
        const values = tableData
          .map((d: any) => {
            // Handle foreign key display names (e.g., category_id_name)
            const value = d[key] || d[`${key}_name`] || d[key.replace('_id', '_name')];
            return typeof value === 'number' ? value : null;
          })
          .filter((v: any) => v !== null && !isNaN(v)) as number[];

        if (values.length === 0) {
          return <div className="text-sm" style={{ color: colors?.textSecondary || '#71717a' }}>No numeric data available</div>;
        }

        switch (calculationType) {
          case 'sum':
        result = values.reduce((a: number, b: number) => a + b, 0);
            label = `Sum of ${key}`;
            break;
          case 'average':
            result = values.reduce((a: number, b: number) => a + b, 0) / values.length;
            label = `Average of ${key}`;
            break;
          case 'min':
            result = Math.min(...values);
            label = `Min of ${key}`;
            break;
          case 'max':
            result = Math.max(...values);
            label = `Max of ${key}`;
            break;
        }

        // Check if it's currency
        isCurrency = settings.format === 'currency' || 
                    key.toLowerCase().includes('revenue') || 
                    key.toLowerCase().includes('profit') || 
                    key.toLowerCase().includes('amount') || 
                    key.toLowerCase().includes('price') ||
                    key.toLowerCase().includes('cost');
      } else {
        return <div className="text-sm" style={{ color: colors?.textSecondary || '#71717a' }}>Please select a column for {calculationType}</div>;
      }

      return (
        <div className="flex flex-col items-start justify-center h-full p-2">
           <div className="flex items-center gap-2 mb-2">
             <div className={`p-2 rounded-lg ${isCurrency ? 'bg-emerald-500/20 text-emerald-400' : ''}`} style={!isCurrency ? { backgroundColor: `${colors?.action || '#4facfe'}33`, color: colors?.action || '#4facfe' } : {}}>
                {isCurrency ? <DollarSign size={20} /> : <Hash size={20} />}
             </div>
             <span className="text-xs font-medium uppercase tracking-wider" style={{ color: colors?.textSecondary || '#a1a1aa' }}>{label}</span>
           </div>
           <motion.div 
             key={result} // Re-animate on change
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.1, type: "spring" }}
             className="text-4xl md:text-5xl font-display font-bold"
             style={{ color: colors?.textPrimary || '#f4f4f5' }}
           >
             {isCurrency ? '$' : ''}{calculationType === 'average' ? result.toFixed(2) : result.toLocaleString()}
           </motion.div>
           <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex items-center gap-1 mt-3 text-xs font-medium px-2 py-1 rounded-full"
            style={{ color: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)' }}
           >
             <TrendingUp size={12} />
             <span>View for {timeRange === 'all' ? 'all time' : timeRange}</span>
           </motion.div>
        </div>
      );
    }

    case 'line':
      if (!settings.xAxisKey) {
        return <div className="text-sm" style={{ color: colors?.textSecondary || '#71717a' }}>Please configure X-axis (date column)</div>;
      }
      // Backend returns: { [xAxisKey]: date, [yAxisKey || 'value']: aggregate_value }
      const lineYKey = settings.yAxisKey || 'value';
      return (
        <div className="w-full h-full min-h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sortedLineData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'} vertical={false} />
              <XAxis 
                dataKey={settings.xAxisKey} 
                stroke={colors?.textSecondary || '#71717a'} 
                fontSize={10} 
                tickLine={false} 
                axisLine={false} 
                dy={10}
                tickFormatter={(value) => {
                  // Format date values - handle various date formats
                  if (!value) return '';

                  // If it's already a formatted date string (YYYY-MM-DD), format it nicely
                  if (typeof value === 'string') {
                    // Check if it's a date string (YYYY-MM-DD format)
                    const dateMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
                    if (dateMatch) {
                      const date = new Date(value);
                      if (!isNaN(date.getTime())) {
                        // Format as "MMM DD" for readability
                        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                      }
                    }
                    // Check if it's a month format (YYYY-MM)
                    const monthMatch = value.match(/^(\d{4})-(\d{2})$/);
                    if (monthMatch) {
                      const date = new Date(value + '-01');
                      if (!isNaN(date.getTime())) {
                        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                      }
                    }
                    // Week format is now handled as dates (start of week), so no special handling needed
                    return value;
                  }
                  if (value instanceof Date) {
                    const date = new Date(value);
                    if (!isNaN(date.getTime())) {
                      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    }
                  }
                  return String(value).substring(0, 10);
                }}
              />
              <YAxis stroke={colors?.textSecondary || '#71717a'} fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value) => `${value >= 1000 ? value / 1000 + 'k' : value}`} />
              <Tooltip content={<CustomTooltip colors={colors} />} />
              <Line
                type="monotone"
                dataKey={lineYKey}
                stroke={settings.color || COLORS[0]}
                strokeWidth={3}
                dot={{ r: 4, fill: mode === 'dark' ? colors?.card || '#18181b' : colors?.card || '#ffffff', strokeWidth: 2, stroke: settings.color || COLORS[0] }}
                activeDot={{ r: 6, strokeWidth: 0, fill: mode === 'dark' ? '#fff' : '#000' }}
                animationDuration={1500}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      );

    case 'area':
      if (!settings.xAxisKey) {
        return <div className="text-sm" style={{ color: colors?.textSecondary || '#71717a' }}>Please configure X-axis (date column)</div>;
      }
      const areaYKey = settings.yAxisKey || 'value';
      return (
        <div className="w-full h-full min-h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sortedAreaData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id={`gradient-${widget.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={settings.color || COLORS[0]} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={settings.color || COLORS[0]} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'} vertical={false} />
              <XAxis 
                dataKey={settings.xAxisKey} 
                stroke={colors?.textSecondary || '#71717a'} 
                fontSize={10} 
                tickLine={false} 
                axisLine={false} 
                dy={10}
                tickFormatter={(value) => {
                  // Format date values - handle various date formats
                  if (!value) return '';

                  // If it's already a formatted date string (YYYY-MM-DD), format it nicely
                  if (typeof value === 'string') {
                    // Check if it's a date string (YYYY-MM-DD format)
                    const dateMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
                    if (dateMatch) {
                      const date = new Date(value);
                      if (!isNaN(date.getTime())) {
                        // Format as "MMM DD" for readability
                        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                      }
                    }
                    // Check if it's a month format (YYYY-MM)
                    const monthMatch = value.match(/^(\d{4})-(\d{2})$/);
                    if (monthMatch) {
                      const date = new Date(value + '-01');
                      if (!isNaN(date.getTime())) {
                        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                      }
                    }
                    // Week format is now handled as dates (start of week), so no special handling needed
                    return value;
                  }
                  if (value instanceof Date) {
                    const date = new Date(value);
                    if (!isNaN(date.getTime())) {
                      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    }
                  }
                  return String(value).substring(0, 10);
                }}
              />
              <YAxis stroke={colors?.textSecondary || '#71717a'} fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value) => `${value >= 1000 ? value / 1000 + 'k' : value}`} />
              <Tooltip content={<CustomTooltip colors={colors} />} />
              <Area
                type="monotone"
                dataKey={areaYKey}
                stroke={settings.color || COLORS[0]}
                strokeWidth={2}
                fillOpacity={1}
                fill={`url(#gradient-${widget.id})`}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: settings.color || COLORS[0], fill: settings.color || COLORS[0] }}
                animationDuration={1500}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      );

    case 'bar':
      if (!settings.xAxisKey) {
        return <div className="text-sm" style={{ color: colors?.textSecondary || '#71717a' }}>Please configure X-axis (category column)</div>;
      }
      // Backend returns: { [xAxisKey]: category_name, [yAxisKey || 'value']: aggregate_value }
      const barYKey = settings.yAxisKey || 'value';
      return (
        <div className="w-full h-full min-h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={tableData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'} vertical={false} />
              <XAxis 
                dataKey={settings.xAxisKey} 
                stroke={colors?.textSecondary || '#71717a'} 
                fontSize={10} 
                tickLine={false} 
                axisLine={false} 
                dy={10}
                angle={-45}
                textAnchor="end"
                height={60}
                tickFormatter={(value) => {
                  return String(value).substring(0, 15);
                }}
              />
              <YAxis stroke={colors?.textSecondary || '#71717a'} fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value) => `${value >= 1000 ? value / 1000 + 'k' : value}`} />
              <Tooltip content={<CustomTooltip colors={colors} />} cursor={{ fill: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }} />
              <Bar dataKey={barYKey} fill={settings.color || COLORS[1]} radius={[4, 4, 0, 0]} animationDuration={1500} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      );

    case 'pie':
    case 'donut':
      if (!settings.xAxisKey) {
        return <div className="text-sm" style={{ color: colors?.textSecondary || '#71717a' }}>Please configure X-axis (category column)</div>;
      }
      const pieYKey = settings.yAxisKey || 'value';
      return (
        <div className="w-full h-full min-h-[200px] flex flex-col">
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={tableData}
                  innerRadius={type === 'donut' ? '60%' : '0%'}
                  outerRadius="80%"
                  paddingAngle={1}
                  dataKey={pieYKey}
                  nameKey={settings.xAxisKey}
                  stroke={mode === 'dark' ? '#18181b' : '#ffffff'}
                  strokeWidth={1}
                  animationDuration={1500}
                >
                  {tableData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip colors={colors} />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {/* Color Legend */}
          {tableData.length > 0 && (
            <div className="flex flex-wrap gap-3 mt-4 pt-4 justify-center" style={{ borderTop: `1px solid ${colors?.border || '#27272a'}` }}>
              {tableData.map((entry: any, index: number) => {
                const categoryName = entry[settings.xAxisKey] || `Category ${index + 1}`;
                const color = COLORS[index % COLORS.length];
                return (
                  <div
                    key={`legend-${index}`}
                    className="flex items-center gap-2"
                    style={{ fontSize: '12px' }}
                  >
                    <div
                      style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        backgroundColor: color,
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ color: colors?.textPrimary || '#f4f4f5' }}>
                      {String(categoryName).length > 20 
                        ? `${String(categoryName).substring(0, 20)}...` 
                        : String(categoryName)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );

    case 'scatter':
      return (
        <div className="w-full h-full min-h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'} />
              <XAxis type="number" dataKey={settings.xAxisKey} name={settings.xAxisKey} stroke={colors?.textSecondary || '#71717a'} fontSize={10} tickLine={false} axisLine={false} dy={10} />
              <YAxis type="number" dataKey={settings.yAxisKey} name={settings.yAxisKey} stroke={colors?.textSecondary || '#71717a'} fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip colors={colors} />} />
              <Scatter name="Values" data={tableData} fill={settings.color || COLORS[2]} animationDuration={1500} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      );

    case 'sparkline':
      if (!settings.xAxisKey) {
        return <div className="text-sm" style={{ color: colors?.textSecondary || '#71717a' }}>Please configure X-axis (date column)</div>;
      }
      const sparkYKey = settings.yAxisKey || 'value';
      return (
        <div className="w-full h-full flex flex-col">
            <div className="flex-1 min-h-[100px]">
                <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sortedSparkData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                        <defs>
                        <linearGradient id={`gradient-spark-${widget.id}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={settings.color || COLORS[3]} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={settings.color || COLORS[3]} stopOpacity={0} />
                        </linearGradient>
                        </defs>
                        <Tooltip 
                            content={<CustomTooltip colors={colors} />} 
                            cursor={{ stroke: mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', strokeWidth: 1 }}
                        />
                        <Area
                            type="monotone"
                            dataKey={sparkYKey}
                            stroke={settings.color || COLORS[3]}
                            strokeWidth={2}
                            fill={`url(#gradient-spark-${widget.id})`}
                            dot={false}
                            activeDot={{ r: 4, strokeWidth: 2, stroke: settings.color || COLORS[3], fill: settings.color || COLORS[3] }}
                            animationDuration={1500}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-between px-2 pt-2" style={{ borderTop: `1px solid ${colors?.border || '#27272a'}` }}>
                <span className="text-xs font-medium tracking-wide" style={{ color: colors?.textSecondary || '#71717a' }}>Trend Activity</span>
                 <div className="flex items-center gap-1">
                    <TrendingUp size={12} className="text-emerald-500" />
                    <span className="text-xs font-bold font-display" style={{ color: colors?.textPrimary || '#e4e4e7' }}>
                    {timeRange === 'all' ? 'All Time' : timeRange}
                    </span>
                 </div>
            </div>
        </div>
      );

    case 'lowStock':
      const lowStockItems = tableData.filter((item: any) => item.stock < 20);
      return (
        <div className="flex flex-col gap-3 h-full overflow-y-auto pr-2 custom-scrollbar">
          {lowStockItems.length === 0 ? (
            <div className="flex items-center justify-center h-full text-sm" style={{ color: colors?.textSecondary || '#71717a' }}>
                <div className="text-center">
                    <div className="p-3 rounded-full inline-block mb-2" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>
                         <AlertTriangle className="text-emerald-500" size={20} />
                    </div>
                    <p>No critical stock levels.</p>
                </div>
            </div>
          ) : (
            lowStockItems.map((item: any, idx: number) => (
              <motion.div
                key={`${item.id}-${idx}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="flex items-center justify-between p-3 rounded-lg transition-colors"
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.2)]" style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)' }}>
                    <AlertTriangle size={16} />
                  </div>
                  <div>
                    <div className="font-medium text-red-200">{item.product}</div>
                    <div className="text-xs text-red-400/70">{item.category}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-display font-bold text-red-400">{item.stock}</div>
                  <div className="text-[10px] uppercase tracking-wider text-red-500/60">Units</div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      );

    case 'transfers':
      return (
        <div className="flex flex-col gap-2 h-full overflow-y-auto pr-2 custom-scrollbar">
           {tableData.length === 0 && <div className="text-sm text-center mt-10" style={{ color: colors?.textSecondary || '#71717a' }}>No transfers in this period.</div>}
           {tableData.slice(0, 50).map((item: any, idx: number) => (
              <motion.div 
                key={`${item.id}-${idx}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="flex items-center justify-between p-3 rounded-lg transition-colors group"
                style={{
                  backgroundColor: colors?.mutedBg || 'rgba(255, 255, 255, 0.05)',
                  border: `1px solid ${colors?.border || 'rgba(255, 255, 255, 0.05)'}`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : colors?.mutedBg;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = colors?.mutedBg || 'rgba(255, 255, 255, 0.05)';
                }}
              >
                <div className="flex flex-col">
                  <span className="font-medium flex items-center gap-2 transition-colors" style={{ color: colors?.textPrimary || '#e4e4e7' }}>
                    {item.to}
                    {item.status === 'Completed' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>}
                    {item.status === 'Pending' && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"></span>}
                    {item.status === 'Processing' && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></span>}
                    {item.status === 'Failed' && <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>}
                  </span>
                  <span className="text-xs" style={{ color: colors?.textSecondary || '#71717a' }}>{item.date}</span>
                </div>
                <div className="font-display font-bold" style={{ color: colors?.textPrimary || '#e4e4e7' }}>
                  ${item.amount.toLocaleString()}
                </div>
              </motion.div>
           ))}
        </div>
      );

    case 'list':
      if (!settings.dataKeys || settings.dataKeys.length === 0) {
        return <div className="text-sm" style={{ color: colors?.textSecondary || '#71717a' }}>Please select columns to display</div>;
      }
      
      // Check if any column is an image field
      const imageColumns = ['image_512', 'image_1920', 'image_1024', 'image_256', 'image_128'];
      const isImageColumn = (key: string) => imageColumns.includes(key.toLowerCase());
      
      // Helper function to extract image data from value (handles objects, strings, etc.)
      const extractImageData = (value: any, isImageField: boolean = false): string | null => {
        if (!value) return null;
        
        // If it's already a string
        if (typeof value === 'string') {
          const trimmed = value.trim();
          if (!trimmed) return null;
          
          // Check if it's already a data URI
          if (/^data:image\//.test(trimmed)) {
            return trimmed;
          }
          
          // For image fields, if it's a non-empty string, treat it as base64
          if (isImageField && trimmed.length > 0) {
            // Remove any whitespace/newlines that might be in the base64 string
            const cleanBase64 = trimmed.replace(/\s/g, '');
            // Check if it looks like base64 (contains only base64 characters)
            if (/^[A-Za-z0-9+/=]+$/.test(cleanBase64)) {
              return `data:image/png;base64,${cleanBase64}`;
            }
          }
          
          // For non-image fields, check if it looks like base64 (long string)
          if (!isImageField && trimmed.length > 50) {
            const cleanBase64 = trimmed.replace(/\s/g, '');
            if (/^[A-Za-z0-9+/=]+$/.test(cleanBase64)) {
              return `data:image/png;base64,${cleanBase64}`;
            }
          }
          
          return null;
        }
        
        // If it's an object, try to extract image data
        if (typeof value === 'object' && value !== null) {
          // Try common object structures
          if (value.data) {
            return extractImageData(value.data, isImageField);
          }
          if (value.image) {
            return extractImageData(value.image, isImageField);
          }
          if (value.base64) {
            return extractImageData(value.base64, isImageField);
          }
          // If object has a toString that might work
          if (value.toString && value.toString() !== '[object Object]') {
            return extractImageData(value.toString(), isImageField);
          }
        }
        
        return null;
      };
      
      // Helper function to check if a value is a base64 image string
      const isBase64Image = (value: any): boolean => {
        return extractImageData(value) !== null;
      };
      
      const columnCount = settings.dataKeys.length;
      return (
        <div className="flex flex-col gap-0 h-[280px] overflow-y-auto pr-2 custom-scrollbar">
          {/* Enhanced Header */}
          <div 
            className="grid gap-4 pb-3 mb-3 text-xs font-bold uppercase tracking-wider sticky top-0 backdrop-blur-md z-10 px-1" 
            style={{ 
              gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
              borderBottom: `2px solid ${colors?.border || '#27272a'}`, 
              backgroundColor: mode === 'dark' 
                ? `${colors?.card || '#09090b'}F8` 
                : `${colors?.card || '#ffffff'}F8`, 
              color: colors?.textSecondary || '#71717a',
              paddingTop: '8px',
              paddingBottom: '12px'
            }}
          >
            {settings.dataKeys?.map(key => (
              <div key={key} className="truncate" title={key}>
                {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </div>
            ))}
          </div>
          
          {/* Enhanced Table Rows */}
          <div className="space-y-1">
            {tableData.length === 0 ? (
              <div className="text-sm text-center py-10" style={{ color: colors?.textSecondary || '#71717a' }}>
                No data available
              </div>
            ) : (
              tableData.map((row: any, i: number) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="grid gap-4 py-3 px-3 rounded-lg transition-all duration-200 border"
                  style={{
                    gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
                    color: colors?.textPrimary || '#e4e4e7',
                    borderColor: 'transparent',
                    backgroundColor: 'transparent',
                    marginBottom: '4px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = colors?.mutedBg || 'rgba(255, 255, 255, 0.05)';
                    e.currentTarget.style.borderColor = colors?.border || '#27272a';
                    e.currentTarget.style.boxShadow = `0 2px 8px ${mode === 'dark' ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.1)'}`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.borderColor = 'transparent';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  {settings.dataKeys?.map((key) => {
                    // Prefer display name for foreign keys (e.g., category_id_name)
                    const displayKey = `${key}_name`;
                    const value = row[displayKey] || row[key];
                    const isImage = isImageColumn(key);
                    
                    // Render image if it's an image column
                    if (isImage) {
                      const imageSrc = extractImageData(value, true);
                      
                      if (imageSrc) {
                        return (
                          <div 
                            key={key} 
                            className="flex items-center justify-center"
                            style={{ minHeight: '60px' }}
                          >
                            <div
                              className="w-12 h-12 rounded-lg overflow-hidden border flex items-center justify-center"
                              style={{
                                backgroundColor: '#ffffff',
                                borderColor: colors?.border || '#27272a',
                                boxShadow: `0 2px 4px ${mode === 'dark' ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.1)'}`
                              }}
                            >
                              <img
                                src={imageSrc}
                                alt={key}
                                className="w-full h-full object-contain"
                                onError={(e) => {
                                  // Fallback if image fails to load
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  if (target.parentElement) {
                                    const fallback = document.createElement('span');
                                    fallback.textContent = '-';
                                    fallback.style.fontSize = '10px';
                                    fallback.style.color = '#71717a';
                                    target.parentElement.appendChild(fallback);
                                  }
                                }}
                              />
                            </div>
                          </div>
                        );
                      } else {
                        // Image column but no valid image data
                        return (
                          <div 
                            key={key} 
                            className="flex items-center justify-center"
                            style={{ minHeight: '60px' }}
                          >
                            <span style={{ color: colors?.textSecondary || '#71717a', opacity: 0.5, fontSize: '12px' }}>-</span>
                          </div>
                        );
                      }
                    }
                    
                    // Render regular text value
                    // Handle objects by trying to stringify them properly
                    let displayValue: string;
                    if (value == null) {
                      displayValue = '-';
                    } else if (typeof value === 'object') {
                      // Try to extract meaningful string from object
                      if (value.toString && value.toString() !== '[object Object]') {
                        displayValue = value.toString();
                      } else if (value.name) {
                        displayValue = String(value.name);
                      } else if (value.label) {
                        displayValue = String(value.label);
                      } else if (value.id) {
                        displayValue = String(value.id);
                      } else {
                        // Last resort: try JSON stringify (but limit length)
                        try {
                          const jsonStr = JSON.stringify(value);
                          displayValue = jsonStr.length > 100 ? jsonStr.substring(0, 100) + '...' : jsonStr;
                        } catch {
                          displayValue = '-';
                        }
                      }
                    } else {
                      displayValue = String(value);
                    }
                    
                    return (
                      <div 
                        key={key} 
                        className="truncate flex items-center"
                        style={{ 
                          minHeight: '24px',
                          fontSize: '13px',
                          lineHeight: '1.5'
                        }}
                        title={displayValue !== '-' ? displayValue : undefined}
                      >
                        {displayValue !== '-' ? (
                          <span className="truncate">{displayValue}</span>
                        ) : (
                          <span style={{ color: colors?.textSecondary || '#71717a', opacity: 0.5 }}>-</span>
                        )}
                      </div>
                    );
                  })}
                </motion.div>
              ))
            )}
          </div>
        </div>
      );

    case 'latestOperations': {
      const operationType = settings.operationType;
      
      if (!operationType) {
        return <div className="text-sm" style={{ color: colors?.textSecondary || '#71717a' }}>Please configure operation type</div>;
      }

      // Latest Transfers
      if (operationType === 'latestTransfers') {
        return (
          <div className="flex flex-col gap-2 h-[280px] overflow-y-auto pr-2 custom-scrollbar">
            {tableData.length === 0 ? (
              <div className="text-sm text-center mt-10" style={{ color: colors?.textSecondary || '#71717a' }}>No transfers available</div>
            ) : (
              tableData.map((transfer: any, index: number) => {
                const name = transfer.name || `#${transfer.id}`;
                const state = transfer.state || "draft";
                
                const getStatusTheme = (status: string) => {
                  switch (status) {
                    case "done":
                      return {
                        icon: <CheckCircle2 className="w-4 h-4" />,
                        iconColor: "#10b981",
                        label: "Completed",
                        bg: "bg-emerald-500/10",
                        text: "text-emerald-600 dark:text-emerald-400",
                      };
                    case "ready":
                    case "assigned":
                    case "confirmed":
                      return {
                        icon: <Clock className="w-4 h-4" />,
                        iconColor: "#3b82f6",
                        label: "Ready",
                        bg: "bg-blue-500/10",
                        text: "text-blue-600 dark:text-blue-400",
                      };
                    case "cancel":
                    case "cancelled":
                      return {
                        icon: <XCircle className="w-4 h-4" />,
                        iconColor: "#ef4444",
                        label: "Cancelled",
                        bg: "bg-rose-500/10",
                        text: "text-rose-600 dark:text-rose-400",
                      };
                    case "draft":
                    default:
                      return {
                        icon: <FileText className="w-4 h-4" />,
                        iconColor: "#f59e0b",
                        label: "Draft",
                        bg: "bg-orange-500/10",
                        text: "text-orange-600 dark:text-orange-400",
                      };
                  }
                };
                
                const statusTheme = getStatusTheme(state);
                
                return (
                  <motion.div
                    key={transfer.id || index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                      padding: "0.75rem",
                      borderRadius: "0.5rem",
                      background: colors?.card,
                      border: `1px solid ${colors?.border}`,
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = colors?.mutedBg;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = colors?.card;
                    }}
                  >
                    <div
                      className="flex items-center justify-center flex-shrink-0"
                      style={{ 
                        width: "32px",
                        height: "32px",
                        borderRadius: "0.5rem",
                        background: `${statusTheme.iconColor}15`,
                        color: statusTheme.iconColor
                      }}
                    >
                      {statusTheme.icon}
                    </div>
                    
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "0.875rem", fontWeight: "600", color: colors?.textPrimary }}>
                        {name}
                      </div>
                    </div>
                    
                    <div
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${statusTheme.bg} ${statusTheme.text}`}
                    >
                      {statusTheme.label}
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        );
      }

      // Latest Activities
      if (operationType === 'latestActivities') {
        return (
          <div className="flex flex-col gap-2 h-[280px] overflow-y-auto pr-2 custom-scrollbar">
            {tableData.length === 0 ? (
              <div className="text-sm text-center mt-10" style={{ color: colors?.textSecondary || '#71717a' }}>No recent activities</div>
            ) : (
              tableData.map((move: any, index: number) => {
                const prodId = Array.isArray(move.product_id) ? move.product_id[0] : move.product_id;
                const productName = Array.isArray(move.product_id) ? move.product_id[1] : (move.product_id_name || "Unknown");
                const qty = typeof move.product_uom_qty === "number" ? move.product_uom_qty : (typeof move.quantity === "number" ? move.quantity : 0);
                const moveType = move.location_id?.[1]?.toLowerCase().includes("supplier") || move.location_id?.[1]?.toLowerCase().includes("vendor") ? "in" :
                                move.location_dest_id?.[1]?.toLowerCase().includes("customer") || move.location_dest_id?.[1]?.toLowerCase().includes("client") ? "out" :
                                move.picking_code === "incoming" ? "in" :
                                move.picking_code === "outgoing" ? "out" : "adjust";
                const date = move.date ? new Date(move.date) : new Date();
                const hoursAgo = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60));
                const timeStr = hoursAgo < 1 ? "Just now" : hoursAgo === 1 ? "1 hour ago" : `${hoursAgo} hours ago`;
                const action = moveType === "in" ? "Stock Received" : moveType === "out" ? "Order Shipped" : "Stock Adjusted";
                
                const getActivityTheme = () => {
                  switch (moveType) {
                    case "in":
                      return {
                        icon: <TrendingUp className="w-4 h-4" />,
                        iconColor: "#10b981",
                      };
                    case "out":
                      return {
                        icon: <Truck className="w-4 h-4" />,
                        iconColor: "#3b82f6",
                      };
                    case "adjust":
                      return {
                        icon: <BarChart3 className="w-4 h-4" />,
                        iconColor: "#f59e0b",
                      };
                    default:
                      return {
                        icon: <TrendingDown className="w-4 h-4" />,
                        iconColor: "#ef4444",
                      };
                  }
                };
                
                const activityTheme = getActivityTheme();
                
                return (
                  <motion.div
                    key={move.id || index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "0.75rem",
                      paddingBottom: "1rem",
                      borderBottom: index < tableData.length - 1 ? `1px solid ${colors?.border}` : "none",
                    }}
                  >
                    <div
                      className="flex items-center justify-center flex-shrink-0"
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "0.5rem",
                        background: `${activityTheme.iconColor}15`,
                        color: activityTheme.iconColor,
                      }}
                    >
                      {activityTheme.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "0.875rem", fontWeight: "600", color: colors?.textPrimary, marginBottom: "0.125rem" }}>
                        {action}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: colors?.textSecondary, marginBottom: "0.25rem" }}>
                        {productName} ({qty} units)
                      </div>
                      <div style={{ fontSize: "0.75rem", color: colors?.textSecondary }}>{timeStr}</div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        );
      }

      // Suppliers
      if (operationType === 'suppliers') {
        return (
          <div className="flex flex-col gap-2 h-[280px] overflow-y-auto pr-2 custom-scrollbar">
            {tableData.length === 0 ? (
              <div className="text-sm text-center mt-10" style={{ color: colors?.textSecondary || '#71717a' }}>No suppliers available</div>
            ) : (
              tableData.map((partner: any, index: number) => {
                const name = partner.name || `#${partner.id}`;
                const email = partner.email || "-";
                const phone = partner.phone || partner.mobile || "-";
                const isSupplier = partner.supplier_rank && partner.supplier_rank > 0;
                const isCustomer = partner.customer_rank && partner.customer_rank > 0;
                const type = isSupplier && isCustomer ? "Both" : isSupplier ? "Supplier" : isCustomer ? "Customer" : "Other";
                
                const getTypeTheme = () => {
                  if (isSupplier && isCustomer) {
                    return {
                      icon: <User className="w-4 h-4" />,
                      iconColor: "#a78bfa",
                      bg: "bg-purple-500/10",
                      text: "text-purple-600 dark:text-purple-400",
                    };
                  } else if (isSupplier) {
                    return {
                      icon: <Package className="w-4 h-4" />,
                      iconColor: "#3b82f6",
                      bg: "bg-blue-500/10",
                      text: "text-blue-600 dark:text-blue-400",
                    };
                  } else if (isCustomer) {
                    return {
                      icon: <Star className="w-4 h-4" />,
                      iconColor: "#10b981",
                      bg: "bg-emerald-500/10",
                      text: "text-emerald-600 dark:text-emerald-400",
                    };
                  } else {
                    return {
                      icon: <User className="w-4 h-4" />,
                      iconColor: "#f59e0b",
                      bg: "bg-orange-500/10",
                      text: "text-orange-600 dark:text-orange-400",
                    };
                  }
                };
                
                const typeTheme = getTypeTheme();
                
                return (
                  <motion.div
                    key={partner.id || index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                      padding: "0.75rem",
                      borderRadius: "0.5rem",
                      background: colors?.card,
                      border: `1px solid ${colors?.border}`,
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = colors?.mutedBg;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = colors?.card;
                    }}
                  >
                    <div
                      className="flex items-center justify-center flex-shrink-0"
                      style={{ 
                        width: "32px",
                        height: "32px",
                        borderRadius: "0.5rem",
                        background: `${typeTheme.iconColor}15`,
                        color: typeTheme.iconColor
                      }}
                    >
                      {typeTheme.icon}
                    </div>
                    
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "0.875rem", fontWeight: "600", color: colors?.textPrimary, marginBottom: "0.25rem" }}>
                        {name}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "1rem", fontSize: "0.75rem", color: colors?.textSecondary, flexWrap: "wrap" }}>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${typeTheme.bg} ${typeTheme.text}`}>
                          {type}
                        </span>
                        {email !== "-" && (
                          <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                            <Mail className="w-3 h-3" />
                            {email}
                          </span>
                        )}
                        {phone !== "-" && (
                          <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                            <Phone className="w-3 h-3" />
                            {phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        );
      }

      // Low Stock
      if (operationType === 'lowStock') {
        return (
          <div className="flex flex-col gap-2 h-[280px] overflow-y-auto pr-2 custom-scrollbar">
            {tableData.length === 0 ? (
              <div className="text-sm text-center mt-10" style={{ color: colors?.textSecondary || '#71717a' }}>No low stock alerts</div>
            ) : (
              tableData.map((product: any, index: number) => {
                const qtyAvailable = typeof product.qty_available === "number" ? product.qty_available : 0;
                const minQty = typeof product.reordering_min_qty === "number" ? product.reordering_min_qty : (typeof product.min_qty === "number" ? product.min_qty : 50);
                const status = qtyAvailable < (minQty * 0.3) ? "critical" : "warning";
                const productName = product.name || `#${product.id}`;
                const sku = product.default_code || product.barcode || `SKU-${product.id}`;
                
                return (
                  <motion.div
                    key={product.id || index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="group"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                      padding: "0.75rem",
                      borderRadius: "0.5rem",
                      background: status === "critical" ? "rgb(254 242 242)" : "rgb(254 242 242)",
                      border: `1px solid ${status === "critical" ? "rgb(254 226 226)" : "rgb(254 226 226)"}`,
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      if (status === "critical") {
                        e.currentTarget.style.backgroundColor = "rgb(254 226 226)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (status === "critical") {
                        e.currentTarget.style.backgroundColor = "rgb(254 242 242)";
                      }
                    }}
                  >
                    <AlertTriangle className="text-red-500 shrink-0" size={16} style={{ color: "#991b1b" }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "0.875rem", fontWeight: "600", color: "#991b1b", marginBottom: "0.125rem" }}>
                        {productName}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "rgb(127 29 29)" }}>SKU: {sku}</div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        );
      }

      return <div className="text-sm" style={{ color: colors?.textSecondary || '#71717a' }}>Invalid operation type</div>;
    }

    default:
      return <div style={{ color: colors?.textSecondary || '#71717a' }}>Unsupported widget type</div>;
  }
};