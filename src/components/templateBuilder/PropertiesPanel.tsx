/**
 * Properties Panel
 * Right panel for editing selected component properties
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Settings,
  Bold,
  Italic,
  Underline,
  Plus,
  Trash2
} from 'lucide-react';
import { useTheme } from '../../../context/theme';
import {
  TemplateComponent,
  BilingualText,
  TextStyle,
  TableColumn,
  SectionType
} from '../../types/templateBuilder.types';

interface PropertiesPanelProps {
  component: TemplateComponent | null;
  section: SectionType;
  onUpdateComponent: (section: SectionType, componentId: string, props: Record<string, unknown>) => void;
  onClose: () => void;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  component,
  section,
  onUpdateComponent,
  onClose
}) => {
  const { colors } = useTheme();
  const [localProps, setLocalProps] = useState<Record<string, unknown>>({});

  useEffect(() => {
    if (component) {
      setLocalProps({ ...component.props });
    }
  }, [component]);

  const updateProp = (key: string, value: unknown) => {
    const newProps = { ...localProps, [key]: value };
    setLocalProps(newProps);
    if (component) {
      onUpdateComponent(section, component.id, newProps);
    }
  };

  const updateNestedProp = (parentKey: string, childKey: string, value: unknown) => {
    const parent = (localProps[parentKey] as Record<string, unknown>) || {};
    const newParent = { ...parent, [childKey]: value };
    updateProp(parentKey, newParent);
  };

  if (!component) {
    return (
      <div
        className="h-full flex flex-col items-center justify-center p-6"
        style={{ background: colors.card }}
      >
        <Settings
          size={48}
          style={{ color: colors.textSecondary }}
          className="opacity-30 mb-4"
        />
        <p
          className="text-center"
          style={{ color: colors.textSecondary }}
        >
          Select a component to edit its properties
        </p>
      </div>
    );
  }

  // Helper to render bilingual text input
  const renderBilingualInput = (
    label: string,
    propKey: string,
    multiline = false
  ) => {
    const value = (localProps[propKey] as BilingualText) || { en: '', ar: '' };

    return (
      <div className="space-y-3">
        <label
          className="text-xs font-semibold uppercase tracking-wide"
          style={{ color: colors.textSecondary }}
        >
          {label}
        </label>

        <div className="space-y-2">
          <div>
            <span className="text-xs mb-1 block" style={{ color: colors.textSecondary }}>
              English
            </span>
            {multiline ? (
              <textarea
                value={value.en || ''}
                onChange={(e) => updateNestedProp(propKey, 'en', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
                style={{
                  background: colors.background,
                  color: colors.textPrimary,
                  border: `1px solid ${colors.border}`
                }}
              />
            ) : (
              <input
                type="text"
                value={value.en || ''}
                onChange={(e) => updateNestedProp(propKey, 'en', e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{
                  background: colors.background,
                  color: colors.textPrimary,
                  border: `1px solid ${colors.border}`
                }}
              />
            )}
          </div>

          <div>
            <span className="text-xs mb-1 block" style={{ color: colors.textSecondary }}>
              Arabic (العربية)
            </span>
            {multiline ? (
              <textarea
                value={value.ar || ''}
                onChange={(e) => updateNestedProp(propKey, 'ar', e.target.value)}
                rows={3}
                dir="rtl"
                className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
                style={{
                  background: colors.background,
                  color: colors.textPrimary,
                  border: `1px solid ${colors.border}`
                }}
              />
            ) : (
              <input
                type="text"
                value={value.ar || ''}
                onChange={(e) => updateNestedProp(propKey, 'ar', e.target.value)}
                dir="rtl"
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{
                  background: colors.background,
                  color: colors.textPrimary,
                  border: `1px solid ${colors.border}`
                }}
              />
            )}
          </div>
        </div>
      </div>
    );
  };

  // Helper to render text style controls
  const renderStyleControls = (propKey: string = 'style') => {
    const style = (localProps[propKey] as TextStyle) || {};

    return (
      <div className="space-y-3">
        <label
          className="text-xs font-semibold uppercase tracking-wide"
          style={{ color: colors.textSecondary }}
        >
          Style
        </label>

        {/* Text formatting buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => updateNestedProp(propKey, 'bold', !style.bold)}
            className={`p-2 rounded-lg transition-colors ${style.bold ? 'ring-2' : ''}`}
            style={{
              background: style.bold ? `${colors.action}15` : colors.background,
              color: style.bold ? colors.action : colors.textPrimary,
              border: `1px solid ${colors.border}`
            }}
          >
            <Bold size={16} />
          </button>
          <button
            onClick={() => updateNestedProp(propKey, 'italic', !style.italic)}
            className={`p-2 rounded-lg transition-colors ${style.italic ? 'ring-2' : ''}`}
            style={{
              background: style.italic ? `${colors.action}15` : colors.background,
              color: style.italic ? colors.action : colors.textPrimary,
              border: `1px solid ${colors.border}`
            }}
          >
            <Italic size={16} />
          </button>
          <button
            onClick={() => updateNestedProp(propKey, 'underline', !style.underline)}
            className={`p-2 rounded-lg transition-colors ${style.underline ? 'ring-2' : ''}`}
            style={{
              background: style.underline ? `${colors.action}15` : colors.background,
              color: style.underline ? colors.action : colors.textPrimary,
              border: `1px solid ${colors.border}`
            }}
          >
            <Underline size={16} />
          </button>
        </div>

        {/* Font size */}
        <div>
          <span className="text-xs mb-1 block" style={{ color: colors.textSecondary }}>
            Font Size
          </span>
          <select
            value={style.fontSize || 14}
            onChange={(e) => updateNestedProp(propKey, 'fontSize', Number(e.target.value))}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style={{
              background: colors.background,
              color: colors.textPrimary,
              border: `1px solid ${colors.border}`
            }}
          >
            <option value={10}>10px</option>
            <option value={12}>12px</option>
            <option value={14}>14px (Default)</option>
            <option value={16}>16px</option>
            <option value={18}>18px</option>
            <option value={20}>20px</option>
            <option value={24}>24px</option>
            <option value={28}>28px</option>
            <option value={32}>32px</option>
          </select>
        </div>

        {/* Color */}
        <div>
          <span className="text-xs mb-1 block" style={{ color: colors.textSecondary }}>
            Color
          </span>
          <div className="flex gap-2 items-center">
            <input
              type="color"
              value={style.color || '#000000'}
              onChange={(e) => updateNestedProp(propKey, 'color', e.target.value)}
              className="w-10 h-10 rounded-lg cursor-pointer"
            />
            <input
              type="text"
              value={style.color || '#000000'}
              onChange={(e) => updateNestedProp(propKey, 'color', e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
              style={{
                background: colors.background,
                color: colors.textPrimary,
                border: `1px solid ${colors.border}`
              }}
            />
          </div>
        </div>
      </div>
    );
  };

  // Helper to render field path input
  const renderFieldInput = (label: string, propKey: string) => {
    return (
      <div className="space-y-2">
        <label
          className="text-xs font-semibold uppercase tracking-wide"
          style={{ color: colors.textSecondary }}
        >
          {label}
        </label>
        <input
          type="text"
          value={(localProps[propKey] as string) || ''}
          onChange={(e) => updateProp(propKey, e.target.value)}
          placeholder="e.g., partner_id.name"
          className="w-full px-3 py-2 rounded-lg text-sm outline-none font-mono"
          style={{
            background: colors.background,
            color: colors.textPrimary,
            border: `1px solid ${colors.border}`
          }}
        />
        <p className="text-xs" style={{ color: colors.textSecondary }}>
          Use dot notation for nested fields
        </p>
      </div>
    );
  };

  // Render different editors based on component type
  const renderEditor = () => {
    switch (component.type) {
      case 'title':
      case 'textBlock':
      case 'staticText':
        return (
          <div className="space-y-6">
            {renderBilingualInput('Text Content', 'text', component.type === 'textBlock')}
            {renderStyleControls()}
          </div>
        );

      case 'field':
      case 'documentNumber':
        return (
          <div className="space-y-6">
            {renderFieldInput('Field Path', component.type === 'field' ? 'path' : 'field')}

            <div className="space-y-2">
              <label
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: colors.textSecondary }}
              >
                Field Type
              </label>
              <select
                value={(localProps.type as string) || 'text'}
                onChange={(e) => updateProp('type', e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{
                  background: colors.background,
                  color: colors.textPrimary,
                  border: `1px solid ${colors.border}`
                }}
              >
                <option value="text">Text</option>
                <option value="number">Number</option>
                <option value="date">Date</option>
              </select>
            </div>

            {localProps.type === 'number' && (
              <div className="space-y-2">
                <label
                  className="text-xs font-semibold uppercase tracking-wide"
                  style={{ color: colors.textSecondary }}
                >
                  Decimal Precision
                </label>
                <select
                  value={(localProps.precision as number) || 2}
                  onChange={(e) => updateProp('precision', Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={{
                    background: colors.background,
                    color: colors.textPrimary,
                    border: `1px solid ${colors.border}`
                  }}
                >
                  <option value={0}>0 decimals</option>
                  <option value={1}>1 decimal</option>
                  <option value={2}>2 decimals</option>
                  <option value={3}>3 decimals</option>
                  <option value={4}>4 decimals</option>
                </select>
              </div>
            )}
          </div>
        );

      case 'date':
        return (
          <div className="space-y-6">
            {renderFieldInput('Date Field', 'field')}

            <div className="space-y-2">
              <label
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: colors.textSecondary }}
              >
                Date Format
              </label>
              <select
                value={(localProps.format as string) || 'DD/MM/YYYY'}
                onChange={(e) => updateProp('format', e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{
                  background: colors.background,
                  color: colors.textPrimary,
                  border: `1px solid ${colors.border}`
                }}
              >
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                <option value="DD-MM-YYYY">DD-MM-YYYY</option>
              </select>
            </div>
          </div>
        );

      case 'logo':
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <label
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: colors.textSecondary }}
              >
                Logo Name
              </label>
              <input
                type="text"
                value={(localProps.libraryRef as string) || ''}
                onChange={(e) => updateProp('libraryRef', e.target.value)}
                placeholder="Logo name from library"
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{
                  background: colors.background,
                  color: colors.textPrimary,
                  border: `1px solid ${colors.border}`
                }}
              />
              <p className="text-xs" style={{ color: colors.textSecondary }}>
                Enter the exact name of the logo from your asset library
              </p>
            </div>
          </div>
        );

      case 'spacer':
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <label
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: colors.textSecondary }}
              >
                Spacer Size
              </label>
              <div className="grid grid-cols-3 gap-2">
                {['small', 'medium', 'large'].map((size) => (
                  <button
                    key={size}
                    onClick={() => updateProp('size', size)}
                    className={`px-3 py-2 rounded-lg text-sm capitalize transition-colors`}
                    style={{
                      background: localProps.size === size ? `${colors.action}15` : colors.background,
                      color: localProps.size === size ? colors.action : colors.textPrimary,
                      border: `1px solid ${localProps.size === size ? colors.action : colors.border}`
                    }}
                  >
                    {size}
                  </button>
                ))}
              </div>
              <p className="text-xs" style={{ color: colors.textSecondary }}>
                Small: 10px, Medium: 20px, Large: 40px
              </p>
            </div>
          </div>
        );

      case 'line':
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <label
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: colors.textSecondary }}
              >
                Line Color
              </label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={(localProps.color as string) || '#e5e5e5'}
                  onChange={(e) => updateProp('color', e.target.value)}
                  className="w-10 h-10 rounded-lg cursor-pointer"
                />
                <input
                  type="text"
                  value={(localProps.color as string) || '#e5e5e5'}
                  onChange={(e) => updateProp('color', e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
                  style={{
                    background: colors.background,
                    color: colors.textPrimary,
                    border: `1px solid ${colors.border}`
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: colors.textSecondary }}
              >
                Line Width (px)
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={(localProps.width as number) || 1}
                onChange={(e) => updateProp('width', Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{
                  background: colors.background,
                  color: colors.textPrimary,
                  border: `1px solid ${colors.border}`
                }}
              />
            </div>
          </div>
        );

      case 'signatureBox':
        return (
          <div className="space-y-6">
            {renderBilingualInput('Signature Label', 'label')}

            <div className="space-y-2">
              <label
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: colors.textSecondary }}
              >
                Stamp (Optional)
              </label>
              <input
                type="text"
                value={((localProps.stamp as { libraryRef?: string })?.libraryRef) || ''}
                onChange={(e) => updateProp('stamp', e.target.value ? { libraryRef: e.target.value } : null)}
                placeholder="Stamp name from library"
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{
                  background: colors.background,
                  color: colors.textPrimary,
                  border: `1px solid ${colors.border}`
                }}
              />
            </div>
          </div>
        );

      case 'pageNumber':
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <label
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: colors.textSecondary }}
              >
                Page Number Format
              </label>
              <input
                type="text"
                value={(localProps.format as string) || 'Page {current} of {total}'}
                onChange={(e) => updateProp('format', e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{
                  background: colors.background,
                  color: colors.textPrimary,
                  border: `1px solid ${colors.border}`
                }}
              />
              <p className="text-xs" style={{ color: colors.textSecondary }}>
                Use {'{current}'} for current page and {'{total}'} for total pages
              </p>
            </div>
          </div>
        );

      case 'table':
        return (
          <div className="space-y-6">
            {renderFieldInput('Data Source', 'source')}

            <div className="space-y-2">
              <label
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: colors.textSecondary }}
              >
                Empty Message
              </label>
              <input
                type="text"
                value={(localProps.emptyMessage as string) || 'No items to display'}
                onChange={(e) => updateProp('emptyMessage', e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{
                  background: colors.background,
                  color: colors.textPrimary,
                  border: `1px solid ${colors.border}`
                }}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label
                  className="text-xs font-semibold uppercase tracking-wide"
                  style={{ color: colors.textSecondary }}
                >
                  Columns
                </label>
                <button
                  onClick={() => {
                    const columns = (localProps.columns as TableColumn[]) || [];
                    updateProp('columns', [
                      ...columns,
                      { field: '', header: { en: '', ar: '' } }
                    ]);
                  }}
                  className="text-xs px-2 py-1 rounded flex items-center gap-1"
                  style={{
                    background: `${colors.action}15`,
                    color: colors.action
                  }}
                >
                  <Plus size={12} /> Add
                </button>
              </div>

              <div className="space-y-3">
                {((localProps.columns as TableColumn[]) || []).map((col, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg"
                    style={{ background: colors.background, border: `1px solid ${colors.border}` }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium" style={{ color: colors.textSecondary }}>
                        Column {idx + 1}
                      </span>
                      <button
                        onClick={() => {
                          const columns = [...(localProps.columns as TableColumn[])];
                          columns.splice(idx, 1);
                          updateProp('columns', columns);
                        }}
                        className="p-1 rounded text-red-500 hover:bg-red-500/10"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <input
                      type="text"
                      value={col.field || ''}
                      onChange={(e) => {
                        const columns = [...(localProps.columns as TableColumn[])];
                        columns[idx] = { ...columns[idx], field: e.target.value };
                        updateProp('columns', columns);
                      }}
                      placeholder="Field path"
                      className="w-full px-2 py-1 rounded text-sm mb-2 outline-none font-mono"
                      style={{
                        background: colors.card,
                        color: colors.textPrimary,
                        border: `1px solid ${colors.border}`
                      }}
                    />

                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={col.header?.en || ''}
                        onChange={(e) => {
                          const columns = [...(localProps.columns as TableColumn[])];
                          columns[idx] = {
                            ...columns[idx],
                            header: { ...columns[idx].header, en: e.target.value }
                          };
                          updateProp('columns', columns);
                        }}
                        placeholder="Header (EN)"
                        className="px-2 py-1 rounded text-sm outline-none"
                        style={{
                          background: colors.card,
                          color: colors.textPrimary,
                          border: `1px solid ${colors.border}`
                        }}
                      />
                      <input
                        type="text"
                        value={col.header?.ar || ''}
                        onChange={(e) => {
                          const columns = [...(localProps.columns as TableColumn[])];
                          columns[idx] = {
                            ...columns[idx],
                            header: { ...columns[idx].header, ar: e.target.value }
                          };
                          updateProp('columns', columns);
                        }}
                        placeholder="Header (AR)"
                        dir="rtl"
                        className="px-2 py-1 rounded text-sm outline-none"
                        style={{
                          background: colors.card,
                          color: colors.textPrimary,
                          border: `1px solid ${colors.border}`
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div
            className="text-center py-8"
            style={{ color: colors.textSecondary }}
          >
            <p>No properties available for this component</p>
          </div>
        );
    }
  };

  return (
    <div
      className="h-full flex flex-col overflow-hidden"
      style={{ background: colors.card }}
    >
      {/* Header */}
      <div
        className="p-4 border-b flex items-center justify-between"
        style={{ borderColor: colors.border }}
      >
        <div>
          <h2
            className="font-bold capitalize"
            style={{ color: colors.textPrimary }}
          >
            {component.type.replace(/([A-Z])/g, ' $1').trim()}
          </h2>
          <p className="text-xs capitalize" style={{ color: colors.textSecondary }}>
            {section} Component
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg transition-all"
          style={{ color: colors.textSecondary }}
          onMouseEnter={(e) => e.currentTarget.style.background = `${colors.action}15`}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >
          <X size={18} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {renderEditor()}
      </div>
    </div>
  );
};

export default PropertiesPanel;
