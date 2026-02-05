
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Download, Camera } from 'lucide-react';
import { WidgetConfig } from './types';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  PieChart, Pie, Cell, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

const COLORS = ['#4facfe', '#00f2fe', '#43e97b', '#dc2626', '#ea580c', '#30cfd0', '#a8edea', '#fed6e3'];

interface SimulationModalProps {
  isOpen: boolean;
  onClose: () => void;
  widget: WidgetConfig;
  originalData: any[];
  colors: any;
  mode: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  colors?: any;
  mode?: string;
}

const CustomTooltip = ({ active, payload, label, colors, mode }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    // Check if this is a pie/donut chart tooltip (has name in payload)
    const isPieChart = payload[0]?.name !== undefined;
    
    if (isPieChart) {
      // For pie/donut charts, show name and value
      const name = payload[0].name || label || 'Unknown';
      const value = payload[0].value;
      
      return (
        <div
          style={{
            backgroundColor: colors?.card || '#FFF',
            border: `1px solid ${colors?.border || '#E6E6E6'}`,
            borderRadius: '12px',
            padding: '12px 16px',
            boxShadow: mode === 'dark' ? '0 20px 40px -10px rgba(0, 0, 0, 0.5)' : '0 20px 40px -10px rgba(0, 0, 0, 0.15)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <p style={{ color: colors?.textSecondary || '#4F4F4F', fontSize: '11px', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
            {name}
          </p>
          <p
            style={{
              color: colors?.textPrimary || '#0A0A0A',
              fontSize: '14px',
              fontWeight: 600,
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          >
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
        </div>
      );
    }
    
    // For other charts, use the original format
    return (
      <div
        style={{
          backgroundColor: colors?.card || '#FFF',
          border: `1px solid ${colors?.border || '#E6E6E6'}`,
          borderRadius: '12px',
          padding: '12px 16px',
          boxShadow: mode === 'dark' ? '0 20px 40px -10px rgba(0, 0, 0, 0.5)' : '0 20px 40px -10px rgba(0, 0, 0, 0.15)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <p style={{ color: colors?.textSecondary || '#4F4F4F', fontSize: '11px', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
          {label}
        </p>
        {payload.map((entry: any, index: number) => (
          <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: entry.color }}></div>
            <p
              style={{
                color: colors?.textPrimary || '#0A0A0A',
                fontSize: '14px',
                fontWeight: 600,
                fontFamily: "'Space Grotesk', sans-serif",
              }}
            >
              {entry.value}
            </p>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function SimulationModal({
  isOpen,
  onClose,
  widget,
  originalData,
  colors,
  mode,
}: SimulationModalProps) {
  const [simulatedData, setSimulatedData] = useState<any[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const captureRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && originalData) {
      // Deep clone the original data
      setSimulatedData(JSON.parse(JSON.stringify(originalData)));
    }
  }, [isOpen, originalData]);

  const handleValueChange = (index: number, field: string, value: number) => {
    setSimulatedData((prev) => {
      const newData = [...prev];
      if (newData[index]) {
        newData[index] = {
          ...newData[index],
          [field]: isNaN(value) ? 0 : value,
        };
      }
      return newData;
    });
  };

  const handleExport = async () => {
    if (!captureRef.current) return;
    setIsExporting(true);

    try {
      // Dynamic import for html2canvas to avoid adding imports to file
      // We check if it exists globally or load it from CDN for this specific action
      if (!(window as any).html2canvas) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://html2canvas.hertzen.com/dist/html2canvas.min.js';
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      const html2canvas = (window as any).html2canvas;
      const canvas = await html2canvas(captureRef.current, {
        backgroundColor: '#09090b', // Force dark background
        scale: 2, // Higher resolution
        logging: false,
        useCORS: true
      });

      const image = canvas.toDataURL("image/png");
      const link = document.createElement('a');
      link.href = image;
      link.download = `simulation-${widget.title.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.png`;
      link.click();
    } catch (err) {
      console.error("Export failed:", err);
      alert("Failed to export image.");
    } finally {
      setIsExporting(false);
    }
  };

  // Sort data for line/area charts
  const settings = widget.settings || {};
  const xAxisKey = settings.xAxisKey || 'name';
  const sortedData = useMemo(() => {
    if (['line', 'area', 'sparkline'].includes(widget.type)) {
      return [...simulatedData].sort((a, b) => {
        const aVal = a[xAxisKey];
        const bVal = b[xAxisKey];
        if (!aVal || !bVal) return 0;
        const aDate = new Date(aVal);
        const bDate = new Date(bVal);
        if (!isNaN(aDate.getTime()) && !isNaN(bDate.getTime())) {
          return aDate.getTime() - bDate.getTime();
        }
        return String(aVal).localeCompare(String(bVal));
      });
    }
    return simulatedData;
  }, [simulatedData, widget.type, xAxisKey]);

  const renderInputFields = () => {
    const settings = widget.settings || {};
    const xAxisKey = settings.xAxisKey || 'name';
    const yAxisKey = settings.yAxisKey || 'value';

    const inputContainerStyle = {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '12px',
      paddingRight: '12px',
    };

    const itemStyle = {
      padding: '16px',
      borderRadius: '14px',
      backgroundColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : colors?.mutedBg || '#F6FAFD',
      border: `1px solid ${mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : colors?.border || '#E6E6E6'}`,
      transition: 'all 0.2s ease',
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '14px'
    };

    const labelStyle = {
      fontSize: '11px',
      fontWeight: 700,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.05em',
      color: mode === 'dark' ? 'rgba(255, 255, 255, 0.6)' : colors?.textSecondary || '#4F4F4F',
      marginBottom: '8px',
      display: 'block',
    };

    const inputStyle = {
      width: '100%',
      backgroundColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : colors?.card || '#FFF',
      border: `1px solid ${mode === 'dark' ? 'rgba(255, 255, 255, 0.15)' : colors?.border || '#E6E6E6'}`,
      borderRadius: '10px',
      padding: '12px 14px',
      color: mode === 'dark' ? '#f4f4f5' : colors?.textPrimary || '#0A0A0A',
      fontSize: '14px',
      fontWeight: 500,
      fontFamily: "'Space Grotesk', sans-serif",
      outline: 'none',
      transition: 'border-color 0.2s, box-shadow 0.2s, background-color 0.2s',
    };

    if (widget.type === 'scatter') {
      return (
        <div style={inputContainerStyle}>
          {simulatedData.map((item, index) => (
            <div
              key={index}
              style={itemStyle}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = mode === 'dark' ? 'rgba(255, 255, 255, 0.07)' : colors?.mutedBg || '#F6FAFD';
                e.currentTarget.style.borderColor = mode === 'dark' ? 'rgba(255, 255, 255, 0.15)' : colors?.border || '#E6E6E6';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : colors?.mutedBg || '#F6FAFD';
                e.currentTarget.style.borderColor = mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : colors?.border || '#E6E6E6';
              }}
            >
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                 <span style={{ fontSize: '13px', fontWeight: 600, color: mode === 'dark' ? '#f4f4f5' : colors?.textPrimary || '#0A0A0A' }}>Point {index + 1}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={labelStyle}>X Value</label>
                  <input
                    type="number"
                    value={item.x || 0}
                    onChange={(e) => handleValueChange(index, 'x', parseFloat(e.target.value))}
                    style={inputStyle}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = colors?.action || '#4facfe';
                      e.currentTarget.style.boxShadow = `0 0 0 3px ${colors?.action || '#4facfe'}25`;
                      e.currentTarget.style.backgroundColor = mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : colors?.card || '#FFF';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = mode === 'dark' ? 'rgba(255, 255, 255, 0.15)' : colors?.border || '#E6E6E6';
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.backgroundColor = mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : colors?.card || '#FFF';
                    }}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Y Value</label>
                  <input
                    type="number"
                    value={item.y || 0}
                    onChange={(e) => handleValueChange(index, 'y', parseFloat(e.target.value))}
                    style={inputStyle}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = colors?.action || '#4facfe';
                      e.currentTarget.style.boxShadow = `0 0 0 3px ${colors?.action || '#4facfe'}25`;
                      e.currentTarget.style.backgroundColor = mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : colors?.card || '#FFF';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = mode === 'dark' ? 'rgba(255, 255, 255, 0.15)' : colors?.border || '#E6E6E6';
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.backgroundColor = mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : colors?.card || '#FFF';
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    // For line, area, sparkline, bar, pie, donut
    return (
      <div style={inputContainerStyle}>
        {simulatedData.map((item, index) => {
          const label = item[xAxisKey] || item.name || `Item ${index + 1}`;
          const value = item[yAxisKey] || item.value || 0;
          
          return (
            <div
              key={index}
              style={itemStyle}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = mode === 'dark' ? 'rgba(255, 255, 255, 0.07)' : colors?.mutedBg || '#F6FAFD';
                e.currentTarget.style.borderColor = mode === 'dark' ? 'rgba(255, 255, 255, 0.15)' : colors?.border || '#E6E6E6';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : colors?.mutedBg || '#F6FAFD';
                e.currentTarget.style.borderColor = mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : colors?.border || '#E6E6E6';
              }}
            >
              <div style={{ fontSize: '14px', fontWeight: 600, color: mode === 'dark' ? '#f4f4f5' : colors?.textPrimary || '#0A0A0A', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {String(label)}
              </div>
              <div>
                <label style={labelStyle}>Metric Value</label>
                <input
                  type="number"
                  value={value}
                  onChange={(e) => handleValueChange(index, yAxisKey, parseFloat(e.target.value))}
                  style={inputStyle}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = colors?.action || '#4facfe';
                    e.currentTarget.style.boxShadow = `0 0 0 3px ${colors?.action || '#4facfe'}25`;
                    e.currentTarget.style.backgroundColor = mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : colors?.card || '#FFF';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = mode === 'dark' ? 'rgba(255, 255, 255, 0.15)' : colors?.border || '#E6E6E6';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.backgroundColor = mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : colors?.card || '#FFF';
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderChart = () => {
    const yAxisKey = settings.yAxisKey || 'value';
    const chartColor = settings.color || COLORS[0];

    switch (widget.type) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sortedData} margin={{ top: 10, right: 10, bottom: 40, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.1)'} vertical={false} />
              <XAxis
                dataKey={xAxisKey}
                stroke={colors?.textSecondary || '#71717a'}
                fontSize={10}
                tickLine={false}
                axisLine={false}
                dy={10}
                tickFormatter={(value) => {
                  if (!value) return '';
                  if (typeof value === 'string') {
                    const dateMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
                    if (dateMatch) {
                      const date = new Date(value);
                      if (!isNaN(date.getTime())) {
                        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                      }
                    }
                  }
                  return String(value).substring(0, 10);
                }}
              />
              <YAxis stroke={colors?.textSecondary || '#71717a'} fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip colors={colors} mode={mode} />} />
              <Line
                type="basis"
                dataKey={yAxisKey}
                stroke={chartColor}
                strokeWidth={3}
                dot={{ r: 4, fill: colors?.card || '#FFF', strokeWidth: 2, stroke: chartColor }}
                activeDot={{ r: 6, strokeWidth: 0, fill: mode === 'dark' ? '#fff' : '#000' }}
                animationDuration={1500}
              />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sortedData} margin={{ top: 10, right: 10, bottom: 40, left: 20 }}>
              <defs>
                <linearGradient id={`gradient-sim-${widget.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartColor} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.1)'} vertical={false} />
              <XAxis
                dataKey={xAxisKey}
                stroke={colors?.textSecondary || '#71717a'}
                fontSize={10}
                tickLine={false}
                axisLine={false}
                dy={10}
                tickFormatter={(value) => {
                  if (!value) return '';
                  if (typeof value === 'string') {
                    const dateMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
                    if (dateMatch) {
                      const date = new Date(value);
                      if (!isNaN(date.getTime())) {
                        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                      }
                    }
                  }
                  return String(value).substring(0, 10);
                }}
              />
              <YAxis stroke={colors?.textSecondary || '#71717a'} fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip colors={colors} mode={mode} />} />
              <Area
                type="basis"
                dataKey={yAxisKey}
                stroke={chartColor}
                strokeWidth={2}
                fillOpacity={1}
                fill={`url(#gradient-sim-${widget.id})`}
                animationDuration={1500}
              />
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'bar':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={simulatedData} margin={{ top: 10, right: 10, bottom: 40, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={'rgba(255, 255, 255, 0.05)'} vertical={false} />
              <XAxis
                dataKey={xAxisKey}
                stroke={'#71717a'}
                fontSize={10}
                tickLine={false}
                axisLine={false}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis stroke={colors?.textSecondary || '#71717a'} fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip colors={colors} mode={mode} />} />
              <Bar dataKey={yAxisKey} fill={chartColor} radius={[8, 8, 0, 0]} animationDuration={1500} />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'pie':
      case 'donut':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%' }}>
            <div style={{ flex: 1, minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={simulatedData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${String(name).substring(0, 15)} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={widget.type === 'donut' ? 80 : 100}
                    innerRadius={widget.type === 'donut' ? 40 : 0}
                    fill="#8884d8"
                    dataKey={yAxisKey}
                    nameKey={xAxisKey}
                    animationDuration={1500}
                  >
                    {simulatedData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip colors={colors} mode={mode} />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Color Legend */}
            {simulatedData.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '12px',
                  marginTop: '16px',
                  paddingTop: '16px',
                  borderTop: `1px solid ${colors?.border || '#27272a'}`,
                  justifyContent: 'center',
                }}
              >
                {simulatedData.map((entry: any, index: number) => {
                  const categoryName = entry[xAxisKey] || entry.name || `Category ${index + 1}`;
                  const color = COLORS[index % COLORS.length];
                  return (
                    <div
                      key={`legend-${index}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '12px',
                      }}
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
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart data={simulatedData} margin={{ top: 10, right: 10, bottom: 40, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={'rgba(255, 255, 255, 0.05)'} />
              <XAxis
                type="number"
                dataKey="x"
                stroke={'#71717a'}
                fontSize={10}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                type="number"
                dataKey="y"
                stroke={'#71717a'}
                fontSize={10}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip colors={colors} mode={mode} />} />
              <Scatter dataKey="y" fill={chartColor} />
            </ScatterChart>
          </ResponsiveContainer>
        );

      case 'sparkline':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sortedData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
              <defs>
                <linearGradient id={`gradient-spark-sim-${widget.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartColor} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Tooltip content={<CustomTooltip colors={colors} mode={mode} />} />
              <Area
                type="basis"
                dataKey={yAxisKey}
                stroke={chartColor}
                strokeWidth={2}
                fill={`url(#gradient-spark-sim-${widget.id})`}
                animationDuration={1500}
              />
            </AreaChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: mode === 'dark' ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
        padding: '1rem',
        fontFamily: "'Space Grotesk', sans-serif"
      }}
      onClick={onClose}
    >
      <style>{`
        
        .simulation-input-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .simulation-input-scroll::-webkit-scrollbar-track {
          background: ${mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)'};
        }
        .simulation-input-scroll::-webkit-scrollbar-thumb {
          background: ${mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'};
          border-radius: 3px;
        }
        .simulation-input-scroll::-webkit-scrollbar-thumb:hover {
          background: ${mode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'};
        }
      `}</style>
      
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          style={{
            width: 'min(100%, 1200px)',
            height: '85vh',
            display: 'flex',
            flexDirection: 'column',
            background: colors?.card || (mode === 'dark' ? '#18181b' : '#FFF'),
            borderRadius: 24,
            boxShadow: mode === 'dark' ? '0 40px 80px -12px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)' : '0 40px 80px -12px rgba(0, 0, 0, 0.15)',
            overflow: 'hidden',
            border: `1px solid ${colors?.border || '#E6E6E6'}`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '24px 32px',
              borderBottom: `1px solid ${colors?.border || '#E6E6E6'}`,
              background: colors?.mutedBg || (mode === 'dark' ? 'rgba(9, 9, 11, 0.4)' : '#F6FAFD'),
              backdropFilter: 'blur(20px)',
              position: 'relative',
              zIndex: 10
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '16px',
                  background: `linear-gradient(135deg, ${colors?.action || '#4facfe'}1A, ${colors?.action || '#4facfe'}0D)`,
                  border: `1px solid ${colors?.action || '#4facfe'}33`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: colors?.action || '#4facfe',
                  boxShadow: `0 8px 16px ${colors?.action || '#4facfe'}26`
                }}
              >
                <Play size={22} fill="currentColor" style={{ marginLeft: '2px' }} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                   <h2 style={{ fontSize: '20px', fontWeight: 700, color: colors?.textPrimary || '#0A0A0A', letterSpacing: '-0.02em' }}>
                    Simulation Lab
                   </h2>
                   <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '20px', backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.1)' : colors?.mutedBg || '#F6FAFD', color: colors?.textSecondary || '#4F4F4F', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>BETA</span>
                </div>
                 <p style={{ fontSize: '14px', color: colors?.textSecondary || '#4F4F4F', marginTop: '2px' }}>
                   Adjust parameters to forecast outcomes for <span style={{ color: colors?.textPrimary || '#0A0A0A', fontWeight: 500 }}>{widget.title}</span>
                 </p>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={handleExport}
                disabled={isExporting}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  borderRadius: '12px',
                  backgroundColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : colors?.mutedBg || '#F6FAFD',
                  border: `1px solid ${colors?.border || '#E6E6E6'}`,
                  color: colors?.textPrimary || '#0A0A0A',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: isExporting ? 'wait' : 'pointer',
                  transition: 'all 0.2s ease',
                  opacity: isExporting ? 0.7 : 1
                }}
                onMouseEnter={(e) => {
                  if(!isExporting) {
                    e.currentTarget.style.backgroundColor = mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : colors?.mutedBg || '#F6FAFD';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if(!isExporting) {
                    e.currentTarget.style.backgroundColor = mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : colors?.mutedBg || '#F6FAFD';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }
                }}
              >
                {isExporting ? <div style={{width: 16, height: 16, borderRadius: '50%', border: `2px solid ${colors?.textSecondary || '#4F4F4F'}33`, borderTopColor: colors?.textPrimary || '#0A0A0A', animation: 'spin 1s linear infinite'}} /> : <Camera size={18} />}
                {isExporting ? 'Capturing...' : 'Export Snapshot'}
              </button>

              <button
                onClick={onClose}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: colors?.textSecondary || '#4F4F4F',
                  backgroundColor: 'transparent',
                  border: '1px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = colors?.cancel ? `${colors.cancel}1A` : 'rgba(239, 68, 68, 0.1)';
                  e.currentTarget.style.color = colors?.cancel || '#ef4444';
                  e.currentTarget.style.border = `1px solid ${colors?.cancel ? `${colors.cancel}33` : 'rgba(239, 68, 68, 0.2)'}`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = colors?.textSecondary || '#4F4F4F';
                  e.currentTarget.style.border = '1px solid transparent';
                }}
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Capture Area Content */}
          <div 
            ref={captureRef}
            style={{ 
              flex: 1, 
              display: 'flex', 
              overflow: 'hidden',
              background: colors?.background || (mode === 'dark' ? '#09090b' : '#FFF'),
            }}
          >
            {/* Left: Input Fields */}
            <div 
              className="simulation-input-scroll"
              style={{ 
                width: '320px', 
                padding: '24px', 
                overflowY: 'auto', 
                borderRight: `1px solid ${colors?.border || '#E6E6E6'}`,
                backgroundColor: mode === 'dark' ? 'rgba(0, 0, 0, 0.2)' : colors?.mutedBg || '#F6FAFD'
              }}
            >
              <div style={{ marginBottom: '24px' }}>
                 <h4 style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: colors?.textSecondary || '#4F4F4F', marginBottom: '8px' }}>Parameters</h4>
                 <div style={{ height: '2px', width: '20px', background: colors?.action || '#4facfe' }}></div>
              </div>
              {renderInputFields()}
            </div>

            {/* Right: Chart Preview */}
            <div 
              style={{ 
                flex: 1, 
                padding: '32px', 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center',
                position: 'relative'
              }}
            >
               <div style={{ 
                 position: 'absolute', 
                 top: 0, 
                 left: 0, 
                 right: 0, 
                 bottom: 0, 
                 backgroundImage: `radial-gradient(circle at 50% 50%, ${colors?.action || '#4facfe'}08 0%, transparent 70%)`,
                 pointerEvents: 'none'
               }}></div>
               
               <div style={{ 
                 width: '100%', 
                 height: '100%', 
                 maxHeight: '500px',
                 backgroundColor: colors?.card || (mode === 'dark' ? 'rgba(255, 255, 255, 0.01)' : '#FFF'),
                 borderRadius: '24px',
                 border: `1px solid ${colors?.border || '#E6E6E6'}`,
                 padding: '24px',
                 boxShadow: mode === 'dark' ? 'inset 0 0 100px rgba(0,0,0,0.5)' : '0 4px 12px rgba(0,0,0,0.05)'
               }}>
                  {renderChart()}
               </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );

  // Render modal using portal to document body for proper overlay
  return typeof window !== 'undefined' && document.body
    ? createPortal(modalContent, document.body)
    : null;
}
