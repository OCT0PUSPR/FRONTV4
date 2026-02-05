import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, Check } from 'lucide-react';
import * as Icons from 'lucide-react';
import { CHART_TYPES, MOCK_DB } from './constants';
import { WidgetConfig, WidgetType } from './types';

// Get base URL and normalize it (remove trailing /api if present to avoid double /api)
const getBaseUrl = () => {
  const url = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_BACKEND_BASE_URL || 'http://localhost:3006';
  // Remove trailing /api if present to avoid double /api in URLs
  return url.replace(/\/api\/?$/, '');
};

const API_CONFIG = {
  BACKEND_BASE_URL: getBaseUrl(),
};

// Get tenant ID from localStorage
const getTenantId = () => localStorage.getItem('current_tenant_id');

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (config: WidgetConfig) => void;
  colors?: any;
  mode?: string;
}

// --- Custom Modern Components ---

const ModernInput = ({ label, value, onChange, placeholder, type = "text", colors, mode, maxLength, showCount }: any) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between">
      <label className="text-xs font-bold uppercase tracking-wider ml-1 font-display" style={{ color: colors?.textSecondary }}>{label}</label>
      {showCount && maxLength && (
        <span className="text-xs font-medium" style={{ color: value?.length >= maxLength ? '#ef4444' : colors?.textSecondary }}>
          {value?.length || 0}/{maxLength}
        </span>
      )}
    </div>
    <div className="relative group">
       <input
         type={type}
         value={value}
         onChange={(e) => onChange(e.target.value)}
         placeholder={placeholder}
         maxLength={maxLength}
         className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 transition-all placeholder:opacity-50 font-sans"
         style={{
           backgroundColor: colors?.card,
           border: `1px solid ${colors?.border}`,
           color: colors?.textPrimary,
         }}
       />
    </div>
  </div>
);

const ModernDropdown = ({ label, value, options, onChange, multiple = false, placeholder = "Select option", colors, mode }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const ChevronDown = (Icons as any).ChevronDown;
  const CheckIcon = (Icons as any).Check;
  const XIcon = (Icons as any).X;
  const SearchIcon = (Icons as any).Search;

  // Filter options based on search term
  const filteredOptions = options.filter((opt: string) =>
    opt.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Update dropdown position when opening
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width,
      });
    }
  }, [isOpen]);

  // Close on click outside (check both dropdownRef and portalRef)
  useEffect(() => {
    const handleClickOutside = (event: any) => {
      const clickedInTrigger = dropdownRef.current && dropdownRef.current.contains(event.target);
      const clickedInPortal = portalRef.current && portalRef.current.contains(event.target);
      if (!clickedInTrigger && !clickedInPortal) {
        setIsOpen(false);
        setSearchTerm("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset search when dropdown closes
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm("");
    }
  }, [isOpen]);

  const handleSelect = (option: string) => {
    if (multiple) {
      const currentValues = Array.isArray(value) ? value : [];
      const newValue = currentValues.includes(option)
        ? currentValues.filter(v => v !== option)
        : [...currentValues, option];
      onChange(newValue);
    } else {
      onChange(option);
      setIsOpen(false);
    }
  };

  const removeTag = (e: any, option: string) => {
    e.stopPropagation();
    const currentValues = Array.isArray(value) ? value : [];
    onChange(currentValues.filter(v => v !== option));
  };

  const dropdownMenu = isOpen && typeof window !== 'undefined' && document.body ? createPortal(
    <AnimatePresence>
      <motion.div
        ref={portalRef}
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.98 }}
        className="rounded-xl shadow-2xl overflow-hidden"
        style={{
          position: 'fixed',
          top: dropdownPosition.top,
          left: dropdownPosition.left,
          width: dropdownPosition.width,
          backgroundColor: colors?.card,
          border: `1px solid ${colors?.border}`,
          zIndex: 99999,
          maxHeight: '300px',
        }}
      >
        {/* Search input for filtering */}
        {options.length > 5 && (
          <div className="p-2 border-b" style={{ borderColor: colors?.border }}>
            <div className="relative">
              <SearchIcon size={14} className="absolute left-2 top-1/2 -translate-y-1/2" style={{ color: colors?.textSecondary }} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  e.stopPropagation();
                  setSearchTerm(e.target.value);
                }}
                onClick={(e) => e.stopPropagation()}
                placeholder="Search..."
                className="w-full rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none"
                style={{
                  backgroundColor: colors?.background,
                  border: `1px solid ${colors?.border}`,
                  color: colors?.textPrimary,
                }}
              />
            </div>
          </div>
        )}
        <div className="max-h-60 overflow-y-auto custom-scrollbar p-1">
           {filteredOptions.length === 0 ? (
             <div className="p-3 text-center text-xs" style={{ color: colors?.textSecondary }}>
               {searchTerm ? `No options matching "${searchTerm}"` : 'No options available'}
             </div>
           ) : (
             filteredOptions.map((opt: string) => {
               const isSelected = multiple ? (Array.isArray(value) && value.includes(opt)) : value === opt;
               return (
                 <button
                   key={opt}
                   onClick={() => handleSelect(opt)}
                   className="w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all flex items-center justify-between group"
                   style={{
                     backgroundColor: isSelected ? `${colors?.action}33` : 'transparent',
                     color: isSelected ? colors?.action : colors?.textPrimary,
                   }}
                   onMouseEnter={(e) => {
                     if (!isSelected) {
                       e.currentTarget.style.backgroundColor = colors?.mutedBg || 'rgba(255, 255, 255, 0.05)';
                     }
                   }}
                   onMouseLeave={(e) => {
                     if (!isSelected) {
                       e.currentTarget.style.backgroundColor = 'transparent';
                     }
                   }}
                 >
                   <span className="truncate">{opt}</span>
                   {isSelected && <CheckIcon size={14} style={{ color: colors?.action }} />}
                 </button>
               )
             })
           )}
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body
  ) : null;

  return (
    <div className="space-y-2 relative" ref={dropdownRef}>
       <label className="text-xs font-bold uppercase tracking-wider ml-1 font-display" style={{ color: colors?.textSecondary }}>{label}</label>
       <div
         ref={triggerRef}
         onClick={() => setIsOpen(!isOpen)}
         className="min-h-[48px] w-full rounded-xl px-3 py-2 text-sm cursor-pointer transition-all flex items-center justify-between"
         style={{
           backgroundColor: colors?.card,
           border: `1px solid ${isOpen ? colors?.action : colors?.border}`,
           color: colors?.textPrimary,
         }}
         onMouseEnter={(e) => {
           if (!isOpen) {
             e.currentTarget.style.backgroundColor = colors?.card;
           }
         }}
         onMouseLeave={(e) => {
           if (!isOpen) {
             e.currentTarget.style.backgroundColor = colors?.card;
           }
         }}
       >
          <div className="flex flex-wrap gap-2">
             {multiple && Array.isArray(value) && value.length > 0 ? (
               value.map(v => (
                 <motion.span
                    layout
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    key={v}
                    className="bg-primary/20 text-primary border border-primary/20 px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1.5"
                 >
                   {v}
                   <button
                    onClick={(e) => removeTag(e, v)}
                    className="hover:text-white hover:bg-primary/40 rounded-full p-0.5 transition-colors"
                   >
                     <XIcon size={12} />
                   </button>
                 </motion.span>
               ))
             ) : (
                !multiple && value ? <span className="pl-1" style={{ color: colors?.textPrimary }}>{value}</span> : <span className="pl-1 opacity-50" style={{ color: colors?.textSecondary }}>{placeholder}</span>
             )}
          </div>
          <ChevronDown size={16} className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} style={{ color: colors?.textSecondary }} />
       </div>
       {dropdownMenu}
    </div>
  )
};

export const WidgetModal: React.FC<Props> = ({ isOpen, onClose, onAdd, colors, mode }) => {
  const [step, setStep] = useState(1);
  const [selectedType, setSelectedType] = useState<WidgetType | null>(null);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [availableTables, setAvailableTables] = useState<Array<{table_name: string; display_name: string}>>([]);
  const [tableColumns, setTableColumns] = useState<Array<any>>([]);
  const [loadingTables, setLoadingTables] = useState(false);
  const [loadingColumns, setLoadingColumns] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statCalculationType, setStatCalculationType] = useState<'count' | 'sum' | 'average' | 'min' | 'max'>('count');
  const [chartAggregateType, setChartAggregateType] = useState<'count' | 'sum' | 'average' | 'min' | 'max'>('count');
  const [selectedOperationType, setSelectedOperationType] = useState<'latestTransfers' | 'latestActivities' | 'suppliers' | 'lowStock' | null>(null);
  const [config, setConfig] = useState<Partial<WidgetConfig>>({
    settings: {
      calculationType: 'count'
    },
    gridSpan: 1
  });

  const SearchIcon = (Icons as any).Search;
  const CheckIcon = (Icons as any).Check;

  // Filter tables based on search
  const filteredTables = availableTables.filter(t => 
    t.display_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.table_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Fetch available tables when step 2 is reached
  useEffect(() => {
    if (step === 2 && availableTables.length === 0 && !loadingTables) {
      fetchAvailableTables();
    }
  }, [step]);

  // Fetch columns when a table is selected
  useEffect(() => {
    if (selectedTable && step === 2) {
      fetchTableColumns(selectedTable);
    }
  }, [selectedTable, step]);

  const fetchAvailableTables = async () => {
    setLoadingTables(true);
    try {
      const tenantId = getTenantId();
      const response = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/api/v1/smart-widgets/tables`, {
        headers: {
          'Content-Type': 'application/json',
          ...(tenantId && { 'X-Tenant-ID': tenantId }),
        },
      });
      const data = await response.json();
      if (data.success) {
        setAvailableTables(data.data);
      }
    } catch (error) {
      console.error('Error fetching tables:', error);
    } finally {
      setLoadingTables(false);
    }
  };

  const fetchTableColumns = async (tableName: string) => {
    setLoadingColumns(true);
    try {
      const tenantId = getTenantId();
      console.log('[WidgetModal] Fetching columns for table:', tableName, 'with tenantId:', tenantId);
      
      const url = `${API_CONFIG.BACKEND_BASE_URL}/api/v1/smart-widgets/tables/${tableName}/columns`;
      console.log('[WidgetModal] Fetching from URL:', url);
      
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...(tenantId && { 'X-Tenant-ID': tenantId }),
        },
      });
      
      console.log('[WidgetModal] Response status:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[WidgetModal] Response error:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      console.log('[WidgetModal] Response data:', data);
      
      if (data.success) {
        setTableColumns(data.data || []);
        console.log('[WidgetModal] Set columns:', data.data?.length || 0, 'columns');
      } else {
        console.error('[WidgetModal] API returned success:false', data.message);
        setTableColumns([]);
      }
    } catch (error) {
      console.error('[WidgetModal] Error fetching table columns:', error);
      setTableColumns([]);
    } finally {
      setLoadingColumns(false);
    }
  };

  const handleTypeSelect = (type: string) => {
    setSelectedType(type as WidgetType);
    if (type === 'lowStock') {
       setSelectedTable('inventory');
       setConfig(prev => ({ ...prev, type: 'lowStock', dataSource: 'inventory', title: 'Low Stock Alerts', settings: {} }));
       setStep(3); 
    } else if (type === 'transfers') {
       setSelectedTable('transfers');
       setConfig(prev => ({ ...prev, type: 'transfers', dataSource: 'transfers', title: 'Recent Transfers', settings: {} }));
       setStep(3);
    } else if (type === 'latestOperations') {
       // Skip table selection, go directly to operation type selection
       setStep(2);
    } else {
       setStep(2);
    }
  };

  const generateSmartTitle = (): string => {
    if (config.title && config.title.trim()) {
      return config.title.trim();
    }

    // Get table display name
    const tableDisplayName = availableTables.find(t => t.table_name === selectedTable)?.display_name || selectedTable;

    if (selectedType === 'latestOperations' && selectedOperationType) {
      const titles: Record<string, string> = {
        latestTransfers: 'Latest Transfers',
        latestActivities: 'Latest Activities',
        suppliers: 'Suppliers',
        lowStock: 'Low Stock Alerts'
      };
      return titles[selectedOperationType] || 'Latest Operations';
    }

    if (selectedType === 'stat') {
      const calcType = statCalculationType || config.settings?.calculationType || 'count';
      const yAxisKey = config.settings?.yAxisKey;
      
      if (calcType === 'count') {
        return `Total ${tableDisplayName} Count`;
      } else if (yAxisKey) {
        const calcLabels: Record<string, string> = {
          sum: 'Sum',
          average: 'Average',
          min: 'Minimum',
          max: 'Maximum'
        };
        // Find the column object to get the label from smart_field_details
        const columnObj = tableColumns.find((c: any) => c.name === yAxisKey);
        const fieldLabel = columnObj?.label || yAxisKey;
        return `${calcLabels[calcType] || calcType} of ${fieldLabel}`;
      } else {
        return `${calcType.charAt(0).toUpperCase() + calcType.slice(1)} of ${tableDisplayName}`;
      }
    }

    if (['line', 'area', 'sparkline'].includes(selectedType)) {
      const xAxisKey = config.settings?.xAxisKey;
      const yAxisKey = config.settings?.yAxisKey;
      const aggType = chartAggregateType || config.settings?.aggregateType || 'count';
      
      if (yAxisKey && aggType !== 'count') {
        const aggLabels: Record<string, string> = {
          sum: 'Sum',
          average: 'Average',
          min: 'Min',
          max: 'Max'
        };
        // Find the column object to get the label from smart_field_details
        const columnObj = tableColumns.find((c: any) => c.name === yAxisKey);
        const fieldLabel = columnObj?.label || yAxisKey;
        return `${aggLabels[aggType] || aggType} of ${fieldLabel} Over Time`;
      } else {
        return `${tableDisplayName} Count Over Time`;
      }
    }

    if (['bar', 'pie', 'donut'].includes(selectedType)) {
      const xAxisKey = config.settings?.xAxisKey;
      const yAxisKey = config.settings?.yAxisKey;
      const aggType = chartAggregateType || config.settings?.aggregateType || 'count';
      
      if (xAxisKey) {
        if (yAxisKey && aggType !== 'count') {
          const aggLabels: Record<string, string> = {
            sum: 'Sum',
            average: 'Average',
            min: 'Min',
            max: 'Max'
          };
          // Find the column objects to get the labels from smart_field_details
          const yColumnObj = tableColumns.find((c: any) => c.name === yAxisKey);
          const xColumnObj = tableColumns.find((c: any) => c.name === xAxisKey);
          const yFieldLabel = yColumnObj?.label || yAxisKey;
          const xFieldLabel = xColumnObj?.label || xAxisKey;
          return `${aggLabels[aggType] || aggType} of ${yFieldLabel} by ${xFieldLabel}`;
        } else {
          const xColumnObj = tableColumns.find((c: any) => c.name === xAxisKey);
          const xFieldLabel = xColumnObj?.label || xAxisKey;
          return `Count by ${xFieldLabel}`;
        }
      } else {
        return `${tableDisplayName} ${selectedType.charAt(0).toUpperCase() + selectedType.slice(1)} Chart`;
      }
    }

    if (selectedType === 'list') {
      return `${tableDisplayName} List`;
    }

    return `${tableDisplayName} ${selectedType.charAt(0).toUpperCase() + selectedType.slice(1)}`;
  };

  const handleFinish = () => {
    if (!selectedType) return;
    
    // For latestOperations, set dataSource based on operationType
    let dataSource = selectedTable || 'sales';
    if (selectedType === 'latestOperations' && selectedOperationType) {
      switch (selectedOperationType) {
        case 'latestTransfers':
          dataSource = 'stock_picking';
          break;
        case 'latestActivities':
          dataSource = 'stock_move';
          break;
        case 'suppliers':
          dataSource = 'res_partner';
          break;
        case 'lowStock':
          dataSource = 'product_template';
          break;
      }
    }
    
    const smartTitle = generateSmartTitle();
    
    // Build settings object, ensuring calculationType and aggregateType are properly set
    const settings: any = {
      ...config.settings,
    };
    
    // For stat widgets, ensure calculationType is set from statCalculationType state
    if (selectedType === 'stat') {
      settings.calculationType = statCalculationType || config.settings?.calculationType || 'count';
      // Keep yAxisKey if it exists
      if (config.settings?.yAxisKey) {
        settings.yAxisKey = config.settings.yAxisKey;
      }
    }
    
    // For chart widgets, ensure aggregateType is set from chartAggregateType state
    if (['bar', 'pie', 'donut', 'line', 'area', 'sparkline'].includes(selectedType)) {
      settings.aggregateType = chartAggregateType || config.settings?.aggregateType || 'count';
      if (config.settings?.xAxisKey) {
        settings.xAxisKey = config.settings.xAxisKey;
      }
      if (config.settings?.yAxisKey) {
        settings.yAxisKey = config.settings.yAxisKey;
      }
    }
    
    // For latestOperations widgets
    if (selectedType === 'latestOperations' && selectedOperationType) {
      settings.operationType = selectedOperationType;
    }
    
    // For stat widgets, encode calculationType in the widget type
    let finalWidgetType = selectedType;
    if (selectedType === 'stat') {
      const calcType = settings.calculationType || 'count';
      finalWidgetType = `statcard${calcType}` as WidgetType;
    }
    
    const newWidget: WidgetConfig = {
      id: `w-${Date.now()}`,
      type: finalWidgetType,
      title: smartTitle,
      dataSource: dataSource,
      settings: settings,
      gridSpan: config.gridSpan || 1,
    };
    
    console.log('[WidgetModal] Creating widget with type:', finalWidgetType, 'and settings:', settings);
    onAdd(newWidget);
    handleClose();
  };

  const handleClose = () => {
    setStep(1);
    setSelectedType(null);
    setConfig({ settings: {}, gridSpan: 1 });
    setSelectedTable('');
    setSelectedOperationType(null);
    onClose();
  };

  const renderIcon = (iconName: string) => {
    const Icon = (Icons as any)[iconName];
    return Icon ? <Icon size={24} /> : null;
  };

  // Get numeric columns for calculations
  // For sum/average/min/max, show all numeric columns (int, decimal, float, etc.)
  // Otherwise, show all numeric columns
  const numericColumns = tableColumns.filter((col: any) => {
    const numericTypes = ['int', 'bigint', 'decimal', 'float', 'double', 'numeric', 'tinyint', 'smallint', 'mediumint'];
    const isNumeric = numericTypes.includes(col.type?.toLowerCase() || '');
    
    // For sum/average/min/max operations, show all numeric columns (int, decimal, float, etc.)
    // This includes all number types from the database
    return isNumeric;
  });
  
  const dateColumns = tableColumns.filter((col: any) => {
    return col.isDateType || col.type?.toLowerCase().includes('date') || 
           col.type?.toLowerCase().includes('time') || col.type?.toLowerCase().includes('timestamp');
  });
  
  const nonDateColumns = tableColumns.filter((col: any) => {
    return !col.isDateType && !col.type?.toLowerCase().includes('date') && 
           !col.type?.toLowerCase().includes('time') && !col.type?.toLowerCase().includes('timestamp');
  });

  const currentTable = selectedTable && tableColumns.length > 0 
    ? { 
        columns: tableColumns.map((col: any) => col.name),
        numericColumns: numericColumns.map((col: any) => col.name),
        dateColumns: dateColumns.map((col: any) => col.name),
        nonDateColumns: nonDateColumns.map((col: any) => col.name)
      }
    : MOCK_DB[selectedTable];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            style={{ backgroundColor: mode === 'dark' ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.5)' }}
            className="absolute inset-0 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            style={{
              backgroundColor: colors?.card,
              border: `1px solid ${colors?.border}`,
            }}
          >
            {/* Header */}
            <div className="p-6 flex items-center justify-between" style={{ borderBottom: `1px solid ${colors?.border}` }}>
              <div>
                <h2 className="text-xl font-display font-semibold" style={{ color: colors?.textPrimary }}>
                  {step === 1 && 'Select Visualization'}
                  {step === 2 && 'Configure Data'}
                  {step === 3 && 'Finalize'}
                </h2>
                <p className="text-sm mt-1" style={{ color: colors?.textSecondary }}>
                  {step === 1 && 'Choose how you want to present your data'}
                  {step === 2 && 'Map your data fields to the visualization'}
                  {step === 3 && 'Review and add to dashboard'}
                </p>
              </div>
              <button 
                onClick={handleClose} 
                className="p-2 rounded-full transition-colors"
                style={{ color: colors?.textSecondary }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = colors?.textPrimary;
                  e.currentTarget.style.backgroundColor = colors?.card;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = colors?.textSecondary;
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar" style={{ backgroundColor: colors?.background }}>
              {step === 1 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {CHART_TYPES.map((t) => (
                    <button
                      key={t.type}
                      onClick={() => handleTypeSelect(t.type)}
                      className="group flex flex-col items-center justify-center gap-4 p-6 rounded-2xl border transition-all duration-300 relative overflow-hidden"
                      style={{
                        borderColor: colors?.border,
                        backgroundColor: colors?.card,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = colors?.action;
                        e.currentTarget.style.backgroundColor = colors?.card;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = colors?.border;
                        e.currentTarget.style.backgroundColor = colors?.card;
                      }}
                    >
                      <div className="transition-colors group-hover:scale-110 duration-300 transform" style={{ color: colors?.textSecondary }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = colors?.action; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = colors?.textSecondary; }}
                      >
                        {renderIcon(t.icon)}
                      </div>
                      <span className="font-medium font-display" style={{ color: colors?.textPrimary }}>{t.label}</span>
                    </button>
                  ))}
                </div>
              )}

              {step === 2 && selectedType === 'latestOperations' && (
                <div className="space-y-8">
                  {/* Operation Type Selection */}
                  <div className="space-y-3">
                     <label className="text-xs font-bold uppercase tracking-wider ml-1 font-display" style={{ color: colors?.textSecondary }}>Operation Type</label>
                     <div className="grid grid-cols-2 gap-4">
                       {[
                         { value: 'latestTransfers', label: 'Latest Transfers', icon: 'ArrowRightLeft' },
                         { value: 'latestActivities', label: 'Latest Activities', icon: 'Activity' },
                         { value: 'suppliers', label: 'Suppliers', icon: 'Users' },
                         { value: 'lowStock', label: 'Low Stock', icon: 'AlertTriangle' }
                       ].map((op) => {
                         const Icon = (Icons as any)[op.icon];
                         const isSelected = selectedOperationType === op.value;
                         return (
                           <button
                             key={op.value}
                             onClick={() => {
                               setSelectedOperationType(op.value as any);
                               const titles: Record<string, string> = {
                                 latestTransfers: 'Latest Transfers',
                                 latestActivities: 'Latest Activities',
                                 suppliers: 'Suppliers',
                                 lowStock: 'Low Stock Alerts'
                               };
                               setConfig(prev => ({ ...prev, title: titles[op.value] }));
                             }}
                             className="p-4 rounded-xl border transition-all duration-200 flex flex-col items-center gap-2"
                             style={{
                               backgroundColor: isSelected ? `${colors?.action}1A` : colors?.card,
                               borderColor: isSelected ? `${colors?.action}80` : colors?.border,
                             }}
                             onMouseEnter={(e) => {
                               if (!isSelected) {
                                 e.currentTarget.style.backgroundColor = colors?.mutedBg;
                                 e.currentTarget.style.borderColor = colors?.border;
                               }
                             }}
                             onMouseLeave={(e) => {
                               if (!isSelected) {
                                 e.currentTarget.style.backgroundColor = colors?.card;
                                 e.currentTarget.style.borderColor = colors?.border;
                               }
                             }}
                           >
                             {Icon && <Icon size={24} style={{ color: isSelected ? colors?.action : colors?.textSecondary }} />}
                             <span className="text-sm font-medium" style={{ color: isSelected ? colors?.action : colors?.textPrimary }}>
                               {op.label}
                             </span>
                           </button>
                         );
                       })}
                     </div>
                  </div>

                  <div className="col-span-full">
                     <ModernInput
                        label="Widget Title"
                        placeholder="e.g., Latest Transfers"
                        value={config.title || ''}
                        onChange={(val: string) => setConfig({...config, title: val})}
                        colors={colors}
                        mode={mode}
                        maxLength={40}
                        showCount={true}
                     />
                  </div>
                  
                  <div className="col-span-full space-y-2">
                     <label className="text-xs font-bold uppercase tracking-wider ml-1 font-display" style={{ color: colors?.textSecondary || '#a1a1aa' }}>Widget Size</label>
                     <div className="flex gap-4">
                        {[1, 2].map((span) => (
                          <button
                             key={span}
                             onClick={() => setConfig({...config, gridSpan: span})}
                             className="flex-1 p-3 rounded-xl border text-center text-sm font-medium transition-all"
                             style={{
                               borderColor: config.gridSpan === span
                                 ? `${colors?.action || '#4facfe'}80`
                                 : colors?.border || 'rgba(255, 255, 255, 0.1)',
                               backgroundColor: config.gridSpan === span
                                 ? `${colors?.action || '#4facfe'}1A`
                                 : colors?.mutedBg || 'rgba(255, 255, 255, 0.05)',
                               color: config.gridSpan === span
                                 ? colors?.action || '#4facfe'
                                 : colors?.textSecondary || '#71717a',
                             }}
                             onMouseEnter={(e) => {
                               if (config.gridSpan !== span) {
                                 e.currentTarget.style.backgroundColor = colors?.mutedBg || 'rgba(255, 255, 255, 0.05)';
                                 e.currentTarget.style.color = colors?.textPrimary || '#f4f4f5';
                               }
                             }}
                             onMouseLeave={(e) => {
                               if (config.gridSpan !== span) {
                                 e.currentTarget.style.backgroundColor = colors?.mutedBg || 'rgba(255, 255, 255, 0.05)';
                                 e.currentTarget.style.color = colors?.textSecondary || '#71717a';
                               }
                             }}
                          >
                             {span === 1 ? 'Half Width' : 'Full Width'}
                          </button>
                        ))}
                     </div>
                  </div>
                </div>
              )}

              {step === 2 && selectedType !== 'latestOperations' && (
                <div className="space-y-8">
                  {/* Widget Title - Moved to top */}
                  <div className="space-y-3">
                     <ModernInput
                        label="Widget Title"
                        placeholder="e.g., Q3 Revenue Overview"
                        value={config.title || ''}
                        onChange={(val: string) => setConfig({...config, title: val})}
                        colors={colors}
                        mode={mode}
                        maxLength={40}
                        showCount={true}
                     />
                  </div>
                  
                  {/* Data Source Selection - Improved List Layout */}
                  <div className="space-y-3">
                     <label className="text-xs font-bold uppercase tracking-wider ml-1 font-display" style={{ color: colors?.textSecondary }}>Data Source</label>
                     <div className="rounded-2xl overflow-hidden flex flex-col max-h-[280px]" style={{ backgroundColor: colors?.card, border: `1px solid ${colors?.border}` }}>
                        {/* Search Header */}
                        <div className="p-3" style={{ borderBottom: `1px solid ${colors?.border}`, backgroundColor: colors?.card }}>
                           <div className="relative">
                              <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: colors?.textSecondary }} />
                              <input 
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                placeholder="Search tables..."
                                className="w-full rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none transition-all"
                                style={{
                                  backgroundColor: colors?.background,
                                  border: `1px solid ${colors?.border}`,
                                  color: colors?.textPrimary,
                                }}
                                onFocus={(e) => {
                                  e.currentTarget.style.borderColor = colors?.action;
                                }}
                                onBlur={(e) => {
                                  e.currentTarget.style.borderColor = colors?.border;
                                }}
                              />
                           </div>
                        </div>
                        
                        {/* Scrollable List */}
                        <div className="overflow-y-auto flex-1 p-2 custom-scrollbar space-y-1">
                           {loadingTables ? (
                              <div className="flex flex-col items-center justify-center py-8 gap-2" style={{ color: colors?.textSecondary }}>
                                <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: colors?.action, borderTopColor: 'transparent' }} />
                                <span className="text-xs">Loading tables...</span>
                              </div>
                           ) : filteredTables.length === 0 ? (
                              <div className="p-8 text-center text-sm" style={{ color: colors?.textSecondary }}>No tables found matching "{searchTerm}"</div>
                           ) : (
                              filteredTables.map(table => (
                        <button
                                    key={table.table_name}
                                    onClick={() => setSelectedTable(table.table_name)}
                                    className="w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all duration-200 group"
                                    style={{
                                      backgroundColor: selectedTable === table.table_name 
                                        ? `${colors?.action}1A` 
                                        : 'transparent',
                                      borderColor: selectedTable === table.table_name 
                                        ? `${colors?.action}80` 
                                        : 'transparent',
                                    }}
                                    onMouseEnter={(e) => {
                                      if (selectedTable !== table.table_name) {
                                        e.currentTarget.style.backgroundColor = colors?.card;
                                        e.currentTarget.style.borderColor = colors?.border;
                                      }
                                    }}
                                    onMouseLeave={(e) => {
                                      if (selectedTable !== table.table_name) {
                                        e.currentTarget.style.backgroundColor = 'transparent';
                                        e.currentTarget.style.borderColor = 'transparent';
                                      }
                                    }}
                                 >
                                    <div className="flex flex-col">
                                       <span className="text-sm font-medium transition-colors" style={{ color: selectedTable === table.table_name ? colors?.action : colors?.textPrimary }}>
                                         {table.display_name}
                                       </span>
                                    </div>
                                    {selectedTable === table.table_name && (
                                      <div className="rounded-full p-1 shadow-lg" style={{ backgroundColor: colors?.action, color: '#ffffff' }}>
                                         <CheckIcon size={12} strokeWidth={3} />
                                      </div>
                                    )}
                        </button>
                              ))
                           )}
                        </div>
                    </div>
                  </div>

                  {selectedTable && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }} 
                      animate={{ opacity: 1, height: 'auto' }}
                      style={{ borderTop: `1px solid ${colors?.border}` }}
                      className="space-y-6 pt-4"
                    >
                      {loadingColumns ? (
                        <div className="flex items-center gap-2 text-sm" style={{ color: colors?.textSecondary || '#71717a' }}>
                           <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: colors?.action || '#4facfe', borderTopColor: 'transparent' }} />
                           Loading columns...
                        </div>
                      ) : currentTable && currentTable.columns && currentTable.columns.length > 0 ? (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Configuration Fields */}
                            {selectedType === 'list' ? (
                               <div className="col-span-full">
                                  <ModernDropdown
                                     label="Columns to Display"
                                     value={(config.settings?.dataKeys || []).map((colName: string) => {
                                       // Map column names to labels for display
                                       const columnObj = tableColumns.find((c: any) => c.name === colName);
                                       return columnObj?.label || colName;
                                     })}
                                     options={currentTable.columns.map((col: any) => {
                                       // Use field label from smart_field_details if available, otherwise use column name
                                       const columnObj = tableColumns.find((c: any) => c.name === col);
                                       return columnObj?.label || col;
                                     })}
                                     onChange={(val: string[]) => {
                                       // Map labels back to column names
                                       const columnNames = val.map((label: string) => {
                                         const columnObj = tableColumns.find((c: any) => c.label === label || c.name === label);
                                         return columnObj?.name || label;
                                       });
                                       setConfig({ ...config, settings: { ...config.settings, dataKeys: columnNames } });
                                     }}
                                     multiple={true}
                                     placeholder="Select columns..."
                                     colors={colors}
                                     mode={mode}
                                  />
                               </div>
                            ) : selectedType === 'stat' ? (
                               <>
                                 <div className="col-span-full">
                                    <ModernDropdown
                                       label="Calculation Type"
                                       value={statCalculationType}
                                       options={['count', 'sum', 'average', 'min', 'max']}
                                       onChange={(val: string) => {
                                         const calcType = val as 'count' | 'sum' | 'average' | 'min' | 'max';
                                         setStatCalculationType(calcType);
                                         setConfig({ ...config, settings: { ...config.settings, calculationType: calcType } });
                                       }}
                                       placeholder="Select calculation type..."
                                       colors={colors}
                                       mode={mode}
                                    />
                                 </div>
                                 {(statCalculationType === 'sum' || statCalculationType === 'average' || statCalculationType === 'min' || statCalculationType === 'max') && (
                                   <div className="col-span-full">
                                      <ModernDropdown
                                         label="Value Column"
                                         value={(() => {
                                           // Show the label instead of the column name
                                           if (config.settings?.yAxisKey) {
                                             const columnObj = tableColumns.find((c: any) => c.name === config.settings.yAxisKey);
                                             return columnObj?.label || config.settings.yAxisKey;
                                           }
                                           return '';
                                         })()}
                                         options={(currentTable as any)?.numericColumns?.map((col: any) => {
                                           // Use field label from smart_field_details if available, otherwise use column name
                                           const columnObj = tableColumns.find((c: any) => c.name === col);
                                           return columnObj?.label || col;
                                         }) || []}
                                         onChange={(val: string) => {
                                           // Find the actual column name from the label
                                           const columnObj = tableColumns.find((c: any) => c.label === val || c.name === val);
                                           const actualColumnName = columnObj?.name || val;
                                           setConfig({ ...config, settings: { ...config.settings, yAxisKey: actualColumnName } });
                                         }}
                                         placeholder="Select numeric column..."
                                         colors={colors}
                                         mode={mode}
                                      />
                                   </div>
                                 )}
                               </>
                            ) : ['line', 'area', 'sparkline'].includes(selectedType) ? (
                               <>
                                 {/* Time Series Charts: X = Date, Y = Aggregation */}
                                 <div className="col-span-full grid grid-cols-2 gap-4">
                                   <ModernDropdown
                                     label="X Axis (Date)"
                                     value={(() => {
                                       // Show the label instead of the column name
                                       if (config.settings?.xAxisKey) {
                                         const columnObj = tableColumns.find((c: any) => c.name === config.settings.xAxisKey);
                                         return columnObj?.label || config.settings.xAxisKey;
                                       }
                                       return '';
                                     })()}
                                     options={(currentTable as any)?.dateColumns?.map((col: any) => {
                                       // Use field label from smart_field_details if available, otherwise use column name
                                       const columnObj = tableColumns.find((c: any) => c.name === col);
                                       return columnObj?.label || col;
                                     }) || []}
                                     onChange={(val: string) => {
                                       // Find the actual column name from the label
                                       const columnObj = tableColumns.find((c: any) => c.label === val || c.name === val);
                                       const actualColumnName = columnObj?.name || val;
                                       setConfig({ ...config, settings: { ...config.settings, xAxisKey: actualColumnName } });
                                     }}
                                     placeholder="Select date column..."
                                     colors={colors}
                                     mode={mode}
                                   />
                                   <ModernDropdown
                                     label="Aggregation Type"
                                     value={chartAggregateType}
                                     options={['count', 'sum', 'average', 'min', 'max']}
                                     onChange={(val: string) => {
                                       const aggType = val as 'count' | 'sum' | 'average' | 'min' | 'max';
                                       setChartAggregateType(aggType);
                                       setConfig({ ...config, settings: { ...config.settings, aggregateType: aggType } });
                                     }}
                                     placeholder="Select aggregation type..."
                                     colors={colors}
                                     mode={mode}
                                   />
                                 </div>
                                 {(chartAggregateType === 'sum' || chartAggregateType === 'average' || chartAggregateType === 'min' || chartAggregateType === 'max') && (
                                   <div className="col-span-full">
                                      <ModernDropdown
                                         label="Value Column (Optional)"
                                         value={tableColumns.find((c: any) => c.name === config.settings?.yAxisKey)?.label || config.settings?.yAxisKey || ''}
                                         options={(currentTable as any)?.numericColumns?.map((col: any) => {
                                           // Use field label from smart_field_details if available, otherwise use column name
                                           const columnObj = tableColumns.find((c: any) => c.name === col);
                                           return columnObj?.label || col;
                                         }) || []}
                                         onChange={(val: string) => {
                                           // Find the actual column name from the label
                                           const columnObj = tableColumns.find((c: any) => c.label === val || c.name === val);
                                           const actualColumnName = columnObj?.name || val;
                                           setConfig({ ...config, settings: { ...config.settings, yAxisKey: actualColumnName } });
                                         }}
                                         placeholder="Select numeric column to aggregate..."
                                         colors={colors}
                                         mode={mode}
                                      />
                                   </div>
                                 )}
                               </>
                            ) : ['bar', 'pie', 'donut'].includes(selectedType) ? (
                               <>
                                 {/* Grouped Charts: X = Any Column, Y = Aggregation */}
                                 <div className="col-span-full grid grid-cols-2 gap-4">
                                   <ModernDropdown
                                     label="X Axis"
                                     value={(() => {
                                       // Show the label instead of the column name
                                       if (config.settings?.xAxisKey) {
                                         const columnObj = tableColumns.find((c: any) => c.name === config.settings.xAxisKey);
                                         return columnObj?.label || config.settings.xAxisKey;
                                       }
                                       return '';
                                     })()}
                                     options={((currentTable as any)?.nonDateColumns || currentTable.columns || []).map((col: any) => {
                                       // Use field label from smart_field_details if available, otherwise use column name
                                       const columnObj = tableColumns.find((c: any) => c.name === col);
                                       return columnObj?.label || col;
                                     })}
                                     onChange={(val: string) => {
                                       // Find the actual column name from the label
                                       const columnObj = tableColumns.find((c: any) => c.label === val || c.name === val);
                                       const actualColumnName = columnObj?.name || val;
                                       setConfig({ ...config, settings: { ...config.settings, xAxisKey: actualColumnName } });
                                     }}
                                     placeholder="Select column..."
                                     colors={colors}
                                     mode={mode}
                                   />
                                   <ModernDropdown
                                     label="Aggregation Type"
                                     value={chartAggregateType}
                                     options={['count', 'sum', 'average', 'min', 'max']}
                                     onChange={(val: string) => {
                                       const aggType = val as 'count' | 'sum' | 'average' | 'min' | 'max';
                                       setChartAggregateType(aggType);
                                       setConfig({ ...config, settings: { ...config.settings, aggregateType: aggType } });
                                     }}
                                     placeholder="Select aggregation type..."
                                     colors={colors}
                                     mode={mode}
                                   />
                                 </div>
                                 {(chartAggregateType === 'sum' || chartAggregateType === 'average' || chartAggregateType === 'min' || chartAggregateType === 'max') && (
                                   <div className="col-span-full">
                                      <ModernDropdown
                                         label="Value Column (Optional)"
                                         value={tableColumns.find((c: any) => c.name === config.settings?.yAxisKey)?.label || config.settings?.yAxisKey || ''}
                                         options={(currentTable as any)?.numericColumns?.map((col: any) => {
                                           // Use field label from smart_field_details if available, otherwise use column name
                                           const columnObj = tableColumns.find((c: any) => c.name === col);
                                           return columnObj?.label || col;
                                         }) || []}
                                         onChange={(val: string) => {
                                           // Find the actual column name from the label
                                           const columnObj = tableColumns.find((c: any) => c.label === val || c.name === val);
                                           const actualColumnName = columnObj?.name || val;
                                           setConfig({ ...config, settings: { ...config.settings, yAxisKey: actualColumnName } });
                                         }}
                                         placeholder="Select numeric column to aggregate..."
                                         colors={colors}
                                         mode={mode}
                                      />
                                   </div>
                                 )}
                               </>
                            ) : null}

                            <div className="col-span-full space-y-2">
                               <label className="text-xs font-bold uppercase tracking-wider ml-1 font-display" style={{ color: colors?.textSecondary || '#a1a1aa' }}>Widget Size</label>
                               <div className="flex gap-4">
                                  {[1, 2].map((span) => (
                                <button
                                        key={span}
                                        onClick={() => setConfig({...config, gridSpan: span})}
                                        className="flex-1 p-3 rounded-xl border text-center text-sm font-medium transition-all"
                                        style={{
                                          borderColor: config.gridSpan === span
                                            ? `${colors?.action || '#4facfe'}80`
                                            : colors?.border || 'rgba(255, 255, 255, 0.1)',
                                          backgroundColor: config.gridSpan === span
                                            ? `${colors?.action || '#4facfe'}1A`
                                            : colors?.mutedBg || 'rgba(255, 255, 255, 0.05)',
                                          color: config.gridSpan === span
                                            ? colors?.action || '#4facfe'
                                            : colors?.textSecondary || '#71717a',
                                        }}
                                        onMouseEnter={(e) => {
                                          if (config.gridSpan !== span) {
                                            e.currentTarget.style.backgroundColor = colors?.mutedBg || 'rgba(255, 255, 255, 0.05)';
                                            e.currentTarget.style.color = colors?.textPrimary || '#f4f4f5';
                                          }
                                        }}
                                        onMouseLeave={(e) => {
                                          if (config.gridSpan !== span) {
                                            e.currentTarget.style.backgroundColor = colors?.mutedBg || 'rgba(255, 255, 255, 0.05)';
                                            e.currentTarget.style.color = colors?.textSecondary || '#71717a';
                                          }
                                        }}
                                     >
                                        {span === 1 ? 'Half Width' : 'Full Width'}
                                </button>
                              ))}
                            </div>
                         </div>

                        </div>
                        </>
                      ) : (
                        <div className="p-4 rounded-xl text-sm" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444' }}>
                           No columns available for this table.
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 flex justify-end gap-3" style={{ borderTop: `1px solid ${colors?.border || 'rgba(255, 255, 255, 0.1)'}`, backgroundColor: colors?.mutedBg || 'rgba(255, 255, 255, 0.05)' }}>
              {step > 1 && (
                <button
                  onClick={() => setStep(step - 1)}
                  className="px-5 py-2.5 text-sm font-medium transition-colors"
                  style={{ color: colors?.textSecondary || '#71717a' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = colors?.textPrimary || '#f4f4f5';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = colors?.textSecondary || '#71717a';
                  }}
                >
                  Back
                </button>
              )}
              {step === 1 ? null : (
                <button
                  onClick={handleFinish}
                  disabled={!selectedTable && selectedType !== 'lowStock' && selectedType !== 'transfers' && (selectedType !== 'latestOperations' || !selectedOperationType)}
                  className="px-8 py-2.5 rounded-xl font-bold font-display shadow-lg flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                  style={{
                    backgroundColor: colors?.action || '#4facfe',
                    color: '#ffffff',
                    background: mode === 'dark' 
                      ? `linear-gradient(to right, ${colors?.action || '#4facfe'}, #06b6d4)`
                      : `linear-gradient(to right, ${colors?.action || '#4facfe'}, #06b6d4)`,
                  }}
                  onMouseEnter={(e) => {
                    if (!e.currentTarget.disabled) {
                      e.currentTarget.style.opacity = '0.9';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!e.currentTarget.disabled) {
                      e.currentTarget.style.opacity = '1';
                    }
                  }}
                >
                  Create Widget <Check size={16} strokeWidth={3} />
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
