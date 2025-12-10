import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { X, Loader2, Warehouse } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { API_CONFIG } from '../../config/api';
import { useAuth } from '../../../context/auth';
import { CustomInput } from '../CusotmInput';
import { CustomDropdown } from '../NewCustomDropdown';
import { PremiumDatePicker } from '../ui/PremiumDatePicker';
import { IOSCheckbox } from '../IOSCheckbox';
import '../../pages/DynamicRecordPage.css';

interface AddWarehouseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (warehouse: any) => void;
  colors: any;
}

interface FieldConfig {
  name: string;
  label: string;
  type: string;
  widget?: string;
  required: boolean;
  readonly: boolean;
  options?: { value: string; label: string }[];
  relation?: { model: string; field?: string; domain?: string };
}

interface WarehouseFormData {
  [key: string]: any;
}

export const AddWarehouseModal: React.FC<AddWarehouseModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  colors
}) => {
  const { t } = useTranslation();
  const { sessionId, uid } = useAuth();
  
  const [fields, setFields] = useState<FieldConfig[]>([]);
  const [formData, setFormData] = useState<WarehouseFormData>({});
  const [loading, setLoading] = useState(false);
  const [loadingFields, setLoadingFields] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [relationOptions, setRelationOptions] = useState<Record<string, { id: number; name: string }[]>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const getTenantId = () => localStorage.getItem('current_tenant_id');

  const getHeaders = (): Record<string, string> => {
    const tenantId = getTenantId();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (tenantId) headers['X-Tenant-ID'] = tenantId;
    if (sessionId) headers['X-Odoo-Session'] = sessionId;

    const odooBase = localStorage.getItem('odooBase');
    const odooDb = localStorage.getItem('odooDb');
    if (odooBase) headers['x-odoo-base'] = odooBase;
    if (odooDb) headers['x-odoo-db'] = odooDb;

    return headers;
  };

  // Fetch form fields from backend (same as DynamicRecordPage)
  const fetchFormFields = useCallback(async () => {
    if (!sessionId) return;

    const tenantId = getTenantId();
    if (!tenantId) {
      setError('Tenant ID is required.');
      setLoadingFields(false);
      return;
    }

    setLoadingFields(true);
    try {
      let url = `${API_CONFIG.BACKEND_BASE_URL}/smart-fields/data/stock.warehouse/form`;
      if (uid) {
        url += `?userId=${uid}`;
      }

      const response = await fetch(url, { method: 'GET', headers: getHeaders() });
      const data = await response.json();

      if (data.success) {
        // Get fields from either fields.fields (flat array) or flatten from groups
        let rawFieldList: any[] = [];
        
        if (data.fields?.fields && Array.isArray(data.fields.fields)) {
          // Use flat fields array if available
          rawFieldList = data.fields.fields;
        } else if (data.fields?.groups && typeof data.fields.groups === 'object') {
          // Flatten groups into a single array
          rawFieldList = Object.values(data.fields.groups).flat();
        }
        
        // Debug: Log what we're getting from backend
        console.log('[AddWarehouseModal] Raw fields from backend:', rawFieldList);
        console.log('[AddWarehouseModal] Fields structure:', { 
          hasFields: !!data.fields?.fields, 
          hasGroups: !!data.fields?.groups,
          fieldsCount: rawFieldList.length 
        });
        if (rawFieldList.length > 0) {
          console.log('[AddWarehouseModal] Sample field:', rawFieldList[0]);
        }
        
        // Filter to only show required fields and normalize field properties
        const fieldList = rawFieldList
          .map((f: any) => ({
            ...f,
            name: f.name || f.field_name,
            label: f.label || f.field_label || f.string,
            type: f.type || f.field_type,
            // required comes from formatFieldForUI as field.is_required (boolean)
            required: f.required === true || f.required === 1 || f.is_required === true || f.is_required === 1,
            readonly: f.readonly === true || f.readonly === 1 || f.is_readonly === true || f.is_readonly === 1 || f.can_edit === false,
          }))
          .filter((f: any) => {
            // Show fields where required is true
            const isRequired = f.required === true || f.required === 1;
            const canView = f.can_view !== false;
            const isNotReadonly = !f.readonly;
            
            console.log(`[AddWarehouseModal] Field ${f.name}: required=${f.required} (type: ${typeof f.required}), canView=${canView}, readonly=${f.readonly}, willShow=${isRequired && canView && isNotReadonly}`);
            
            return isRequired && canView && isNotReadonly;
          });
        
        console.log('[AddWarehouseModal] Filtered required fields:', fieldList);

        setFields(fieldList);

        // Initialize form data with default values
        const initialData: Record<string, any> = {};
        fieldList.forEach((f: FieldConfig) => {
          if (f.type === 'boolean') initialData[f.name] = false;
          else if (f.type === 'integer' || f.type === 'float' || f.type === 'monetary') initialData[f.name] = 0;
          else if (f.type === 'many2many' || f.type === 'one2many') initialData[f.name] = [];
          else initialData[f.name] = null;
        });
        setFormData(initialData);
      } else {
        setError(data.error || t('Failed to load form fields'));
      }
    } catch (error) {
      console.error('Error fetching form fields:', error);
      setError(t('Failed to load form fields'));
    } finally {
      setLoadingFields(false);
    }
  }, [sessionId, uid, t]);

  // Fetch relation options for many2one and many2many fields
  const fetchRelationOptions = useCallback(async (fieldName: string, relationModel: string, search = '') => {
    if (!sessionId) return;
    const tenantId = getTenantId();
    if (!tenantId) return;

    try {
      const url = `${API_CONFIG.BACKEND_BASE_URL}/smart-fields/data/stock.warehouse/${fieldName}/relation-options?search=${encodeURIComponent(search)}&limit=100`;
      const response = await fetch(url, { method: 'GET', headers: getHeaders() });
      const data = await response.json();

      if (data.success && data.options) {
        setRelationOptions(prev => ({
          ...prev,
          [fieldName]: data.options.map((opt: any) => ({
            id: opt.value,
            name: opt.label
          }))
        }));
      }
    } catch (error) {
      console.error(`Error fetching options for ${fieldName}:`, error);
    }
  }, [sessionId]);

  // Fetch form fields when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchFormFields();
    } else {
      // Reset form when modal closes
      setFormData({});
      setFields([]);
      setErrors({});
      setError(null);
    }
  }, [isOpen, fetchFormFields]);

  // Fetch relation options for relation fields
  useEffect(() => {
    if (fields.length > 0 && formData) {
      fields.forEach(field => {
        if ((field.type === 'many2one' || field.type === 'many2many') && field.relation?.model) {
          fetchRelationOptions(field.name, field.relation.model, '');
        }
      });
    }
  }, [fields, fetchRelationOptions]);

  const handleChange = (fieldName: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
    if (errors[fieldName]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  // Format relation fields for Odoo API
  const formatRelationField = (field: FieldConfig, value: any): any => {
    if (field.type === 'many2one') {
      if (Array.isArray(value) && value.length >= 1) return value[0] || false;
      if (value === null || value === undefined || value === '') return false;
      if (typeof value === 'string') {
        const parsed = parseInt(value);
        return isNaN(parsed) ? false : parsed;
      }
      return typeof value === 'number' ? value : false;
    } else if (field.type === 'many2many') {
      if (!Array.isArray(value) || value.length === 0) return [[6, 0, []]];
      const ids = value.map((v: any) => {
        if (Array.isArray(v) && v.length >= 1) return v[0];
        if (typeof v === 'number') return v;
        if (typeof v === 'string') {
          const parsed = parseInt(v);
          return isNaN(parsed) ? null : parsed;
        }
        return null;
      }).filter((id: any) => id !== null);
      return [[6, 0, ids]];
    }
    return value;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    let hasError = false;
    const newErrors: Record<string, string> = {};

    fields.forEach(f => {
      if (f.required && !f.readonly) {
        const val = formData[f.name];
        if (val === null || val === undefined || val === '' || (Array.isArray(val) && val.length === 0)) {
          newErrors[f.name] = t('Required');
          hasError = true;
        }
      }
    });

    if (hasError) {
      setErrors(newErrors);
      setError(t('Please fill all required fields'));
      return;
    }

    setLoading(true);
    setError(null);
    setErrors({});

    try {
      // Prepare data payload - format fields correctly
      const warehouseData: Record<string, any> = {};
      
      fields.forEach(field => {
        if (field.readonly) return;
        
        const value = formData[field.name];
        if (field.type === 'many2one' || field.type === 'many2many' || field.type === 'one2many') {
          warehouseData[field.name] = formatRelationField(field, value);
        } else {
          warehouseData[field.name] = value;
        }
      });

      // Create warehouse in Odoo
      const response = await fetch(
        `${API_CONFIG.BACKEND_BASE_URL}/smart-fields/data/stock.warehouse`,
        {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({
            data: warehouseData,
            validate: true
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        // Log the full error for debugging
        console.error('[AddWarehouseModal] Error response:', {
          status: response.status,
          statusText: response.statusText,
          data
        });
        setError(data.error || data.message || `Failed to create warehouse (${response.status})`);
        return;
      }

      if (data.success) {
        // Also create warehouse config in our system
        const configResponse = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/warehouse-config`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({
            warehouse_id: data.data?.id || data.id,
            warehouse_name: formData.name,
            warehouse_code: formData.code,
          }),
        });

        if (!configResponse.ok) {
          console.warn('[AddWarehouseModal] Warehouse created but config creation failed');
        }

        onSuccess?.(data.data || { id: data.id, ...formData });
        onClose();
        setFormData({});
      } else {
        setError(data.error || data.message || 'Failed to create warehouse');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create warehouse');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div 
        className="w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-2xl animate-fade-in overflow-hidden flex flex-col"
        style={{ background: colors.card }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div 
          className="flex items-center justify-between p-6"
          style={{ borderBottom: `1px solid ${colors.border}` }}
        >
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}
            >
              <Warehouse size={20} style={{ color: 'white' }} />
            </div>
            <div>
              <h2 className="text-lg font-bold" style={{ color: colors.textPrimary }}>
                {t("Add Warehouse")}
              </h2>
              <p className="text-xs" style={{ color: colors.textSecondary }}>
                {t("Create a new warehouse in Odoo")}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl transition-colors"
            style={{ color: colors.textSecondary }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = colors.mutedBg;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div 
              className="p-3 rounded-xl text-sm"
              style={{ background: '#ef444420', color: '#ef4444' }}
            >
              {error}
            </div>
          )}

          {loadingFields ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={24} className="animate-spin" style={{ color: colors.textSecondary }} />
            </div>
          ) : fields.length === 0 ? (
            <div className="text-center py-8" style={{ color: colors.textSecondary }}>
              {t("No required fields found")}
            </div>
          ) : (
            fields.map((field) => {
              const value = formData[field.name];
              const fieldError = errors[field.name];

              return (
                <div key={field.name} className={fieldError ? 'has-error' : ''}>
                  {field.type === 'boolean' ? (
                    <div className="flex items-center h-full pt-1">
                      <IOSCheckbox
                        label={field.label}
                        checked={!!value}
                        onChange={(v) => handleChange(field.name, v)}
                      />
                    </div>
                  ) : field.type === 'selection' ? (
                    <CustomDropdown
                      label={field.label}
                      values={(field.options || []).map(o => `${o.value}::${o.label}`)}
                      type="single"
                      defaultValue={value ? `${value}::${(field.options || []).find(o => o.value === value)?.label || value}` : undefined}
                      onChange={(v) => handleChange(field.name, typeof v === 'string' ? v.split('::')[0] : null)}
                    />
                  ) : field.type === 'many2one' ? (
                    <CustomDropdown
                      label={field.label}
                      values={(relationOptions[field.name] || []).map(o => `${o.id}::${o.name}`)}
                      type="single"
                      defaultValue={
                        value
                          ? (typeof value === 'object' && value !== null ? `${value[0]}::${value[1]}` : `${value}::${(relationOptions[field.name] || []).find(o => o.id === value)?.name || value}`)
                          : undefined
                      }
                      onChange={(v) => handleChange(field.name, typeof v === 'string' ? parseInt(v.split('::')[0]) : null)}
                    />
                  ) : field.type === 'many2many' ? (
                    <CustomDropdown
                      label={field.label}
                      values={(relationOptions[field.name] || []).map(o => `${o.id}::${o.name}`)}
                      type="multi"
                      defaultValue={Array.isArray(value) ? value.map((id: any) => {
                        const found = (relationOptions[field.name] || []).find(o => o.id === id);
                        return `${id}::${found?.name || id}`;
                      }) : []}
                      onChange={(v) => {
                        const ids = Array.isArray(v) ? v.map(val => parseInt(val.split('::')[0])) : [];
                        handleChange(field.name, ids);
                      }}
                    />
                  ) : field.type === 'date' || field.type === 'datetime' ? (
                    <PremiumDatePicker
                      label={field.label}
                      value={value || ''}
                      onChange={(d) => handleChange(field.name, d)}
                      picker={field.type === 'datetime' ? 'date' : 'date'}
                    />
                  ) : field.type === 'text' || field.type === 'html' ? (
                    <div className="flex flex-col gap-1.5 h-full">
                      <label 
                        style={{
                          display: "block",
                          fontSize: "12px",
                          fontWeight: "600",
                          color: colors.textPrimary,
                          marginBottom: "0.5rem",
                        }}
                      >
                        {field.label}
                      </label>
                      <textarea
                        className="premium-input min-h-[120px]"
                        rows={4}
                        value={value || ''}
                        onChange={(e) => handleChange(field.name, e.target.value)}
                        style={{
                          color: colors.textPrimary,
                          background: colors.mutedBg,
                          border: `1px solid ${fieldError ? '#ef4444' : colors.border}`,
                          borderRadius: '0.75rem',
                          padding: '0.625rem',
                          fontSize: '14px',
                        }}
                      />
                      {fieldError && (
                        <span className="text-xs" style={{ color: '#ef4444' }}>
                          {fieldError}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div>
                      <CustomInput
                        label={field.label}
                        type={field.type === 'integer' || field.type === 'float' || field.type === 'monetary' ? 'number' : 'text'}
                        value={value || ''}
                        onChange={(v) => handleChange(field.name, field.type === 'integer' ? parseInt(v) : field.type === 'float' ? parseFloat(v) : v)}
                      />
                      {fieldError && (
                        <span className="text-xs mt-1 block" style={{ color: '#ef4444' }}>
                          {fieldError}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
              style={{ 
                background: colors.mutedBg, 
                color: colors.textPrimary 
              }}
            >
              {t("Cancel")}
            </button>
            <button
              type="submit"
              disabled={loading || loadingFields || fields.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50 transition-colors"
              style={{ background: '#4FACFE', color: 'white' }}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Warehouse size={16} />}
              {t("Create Warehouse")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddWarehouseModal;
