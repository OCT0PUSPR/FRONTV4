import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronDown, Check, Loader2 } from 'lucide-react';
import { WidgetConfig } from './types';

const API_CONFIG = {
  BACKEND_BASE_URL: import.meta.env.VITE_BACKEND_BASE_URL || 'http://localhost:3006',
};

const getTenantId = () => localStorage.getItem('current_tenant_id');

interface TableInfo {
  table_name: string;
  display_name: string;
  description?: string;
}

interface ColumnInfo {
  column_name: string;
  display_name: string;
  data_type: string;
  is_numeric: boolean;
  is_foreign_key: boolean;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (widget: WidgetConfig) => void;
  widget: WidgetConfig | null;
  colors: any;
  mode: string;
}

const ModernDropdown = ({ 
  label, 
  value, 
  options, 
  onChange, 
  placeholder = "Select option", 
  colors, 
  loading = false,
  disabled = false 
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  placeholder?: string;
  colors: any;
  loading?: boolean;
  disabled?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: any) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  const selectedOption = options.find(o => o.value === value);

  return (
    <div className="space-y-2 relative" ref={dropdownRef}>
      <label className="text-xs font-bold uppercase tracking-wider ml-1 font-display" style={{ color: colors?.textSecondary }}>
        {label}
      </label>
      <div 
        onClick={() => !disabled && !loading && setIsOpen(!isOpen)}
        className={`min-h-[48px] w-full rounded-xl px-3 py-2 text-sm cursor-pointer transition-all flex items-center justify-between ${disabled || loading ? 'opacity-50 cursor-not-allowed' : ''}`}
        style={{
          backgroundColor: colors?.card,
          border: `1px solid ${isOpen ? colors?.action : colors?.border}`,
          color: colors?.textPrimary,
        }}
      >
        <span className={!selectedOption ? 'opacity-50' : ''}>
          {loading ? 'Loading...' : (selectedOption?.label || placeholder)}
        </span>
        {loading ? (
          <Loader2 size={16} className="animate-spin" style={{ color: colors?.textSecondary }} />
        ) : (
          <ChevronDown 
            size={16} 
            style={{ 
              color: colors?.textSecondary,
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s'
            }} 
          />
        )}
      </div>
      
      <AnimatePresence>
        {isOpen && !loading && !disabled && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-50 w-full mt-1 rounded-xl overflow-hidden shadow-lg max-h-60 overflow-y-auto"
            style={{
              backgroundColor: colors?.card,
              border: `1px solid ${colors?.border}`,
            }}
          >
            {options.length === 0 ? (
              <div className="px-4 py-3 text-sm" style={{ color: colors?.textSecondary }}>
                No options available
              </div>
            ) : (
              options.map((option) => (
                <div
                  key={option.value}
                  onClick={() => handleSelect(option.value)}
                  className="px-4 py-3 text-sm cursor-pointer transition-colors flex items-center justify-between"
                  style={{
                    backgroundColor: value === option.value ? colors?.mutedBg : 'transparent',
                    color: colors?.textPrimary,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = colors?.mutedBg;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = value === option.value ? colors?.mutedBg : 'transparent';
                  }}
                >
                  <span>{option.label}</span>
                  {value === option.value && <Check size={16} style={{ color: colors?.action }} />}
                </div>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ModernInput = ({ label, value, onChange, placeholder, colors }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  colors: any;
}) => (
  <div className="space-y-2">
    <label className="text-xs font-bold uppercase tracking-wider ml-1 font-display" style={{ color: colors?.textSecondary }}>
      {label}
    </label>
    <input 
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 transition-all placeholder:opacity-50 font-sans"
      style={{
        backgroundColor: colors?.card,
        border: `1px solid ${colors?.border}`,
        color: colors?.textPrimary,
      }}
    />
  </div>
);

export const StatCardEditModal: React.FC<Props> = ({ isOpen, onClose, onSave, widget, colors, mode }) => {
  const [title, setTitle] = useState('');
  const [selectedTable, setSelectedTable] = useState('');
  const [selectedField, setSelectedField] = useState('');
  const [calculationType, setCalculationType] = useState<'count' | 'sum' | 'average' | 'min' | 'max'>('count');
  
  const [availableTables, setAvailableTables] = useState<TableInfo[]>([]);
  const [tableColumns, setTableColumns] = useState<ColumnInfo[]>([]);
  const [loadingTables, setLoadingTables] = useState(false);
  const [loadingColumns, setLoadingColumns] = useState(false);
  const [saving, setSaving] = useState(false);

  // Initialize form with widget data
  useEffect(() => {
    if (widget && isOpen) {
      setTitle(widget.title || '');
      setSelectedTable(widget.dataSource || '');
      setSelectedField(widget.settings?.yAxisKey || '');
      setCalculationType(widget.settings?.calculationType || 'count');
    }
  }, [widget, isOpen]);

  // Fetch tables on open
  useEffect(() => {
    if (isOpen && availableTables.length === 0) {
      fetchAvailableTables();
    }
  }, [isOpen]);

  // Fetch columns when table changes
  useEffect(() => {
    if (selectedTable) {
      fetchTableColumns(selectedTable);
    } else {
      setTableColumns([]);
    }
  }, [selectedTable]);

  const fetchAvailableTables = async () => {
    setLoadingTables(true);
    try {
      const tenantId = getTenantId();
      const response = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/api/v1/smart-widgets/tables`, {
        headers: {
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
      const response = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/api/v1/smart-widgets/tables/${tableName}/columns`, {
        headers: {
          ...(tenantId && { 'X-Tenant-ID': tenantId }),
        },
      });
      const data = await response.json();
      if (data.success) {
        setTableColumns(data.data);
      }
    } catch (error) {
      console.error('Error fetching columns:', error);
    } finally {
      setLoadingColumns(false);
    }
  };

  const handleSave = async () => {
    if (!widget) return;
    
    setSaving(true);
    try {
      const updatedWidget: WidgetConfig = {
        ...widget,
        title: title || generateTitle(),
        dataSource: selectedTable,
        settings: {
          ...widget.settings,
          yAxisKey: calculationType !== 'count' ? selectedField : undefined,
          calculationType,
        },
      };
      
      onSave(updatedWidget);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const generateTitle = () => {
    const tableDisplayName = availableTables.find(t => t.table_name === selectedTable)?.display_name || selectedTable;
    if (calculationType === 'count') {
      return `Total ${tableDisplayName}`;
    }
    const calcLabels: Record<string, string> = {
      sum: 'Sum',
      average: 'Average',
      min: 'Minimum',
      max: 'Maximum'
    };
    return `${calcLabels[calculationType]} of ${selectedField}`;
  };

  const numericColumns = tableColumns.filter(c => c.is_numeric);

  const tableOptions = availableTables.map(t => ({
    value: t.table_name,
    label: t.display_name || t.table_name,
  }));

  const fieldOptions = numericColumns.map(c => ({
    value: c.column_name,
    label: c.display_name || c.column_name,
  }));

  const calculationOptions = [
    { value: 'count', label: 'Count Records' },
    { value: 'sum', label: 'Sum' },
    { value: 'average', label: 'Average' },
    { value: 'min', label: 'Minimum' },
    { value: 'max', label: 'Maximum' },
  ];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
          style={{ backgroundColor: colors?.background }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div 
            className="px-6 py-4 flex items-center justify-between"
            style={{ borderBottom: `1px solid ${colors?.border}` }}
          >
            <h2 className="text-lg font-semibold font-display" style={{ color: colors?.textPrimary }}>
              Edit Stat Card
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg transition-colors"
              style={{ color: colors?.textSecondary }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = colors?.mutedBg;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-5">
            <ModernInput
              label="Title"
              value={title}
              onChange={setTitle}
              placeholder="Enter a custom title (optional)"
              colors={colors}
            />

            <ModernDropdown
              label="Data Source (Table)"
              value={selectedTable}
              options={tableOptions}
              onChange={(value) => {
                setSelectedTable(value);
                setSelectedField('');
              }}
              placeholder="Select a table"
              colors={colors}
              loading={loadingTables}
            />

            <ModernDropdown
              label="Calculation Type"
              value={calculationType}
              options={calculationOptions}
              onChange={(value) => setCalculationType(value as any)}
              colors={colors}
            />

            {calculationType !== 'count' && (
              <ModernDropdown
                label="Field to Calculate"
                value={selectedField}
                options={fieldOptions}
                onChange={setSelectedField}
                placeholder="Select a numeric field"
                colors={colors}
                loading={loadingColumns}
                disabled={!selectedTable}
              />
            )}
          </div>

          {/* Footer */}
          <div 
            className="px-6 py-4 flex justify-end gap-3"
            style={{ borderTop: `1px solid ${colors?.border}` }}
          >
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-colors"
              style={{ 
                color: colors?.textSecondary,
                backgroundColor: colors?.mutedBg,
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!selectedTable || (calculationType !== 'count' && !selectedField) || saving}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ 
                color: 'white',
                backgroundColor: colors?.action || '#3b82f6',
              }}
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  Saving...
                </span>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default StatCardEditModal;
