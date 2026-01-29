/**
 * Builder Canvas
 * Visual document preview with live rendering of template components
 */

import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  GripVertical,
  Image as ImageIcon,
  LucideIcon
} from 'lucide-react';
import { useTheme } from '../../../context/theme';
import {
  TemplateComponent,
  SectionType,
  PaletteItem,
  ComponentType,
  HEADER_COMPONENTS,
  BODY_COMPONENTS,
  FOOTER_COMPONENTS
} from '../../types/templateBuilder.types';

// Mock data for preview
const MOCK_DATA = {
  company: {
    name: 'Octopus Warehouse Co.',
    address: '123 Industrial District\nRiyadh, Saudi Arabia 12345',
    phone: '+966 11 123 4567',
    email: 'info@octopus.sa',
    vat: 'VAT: 123456789012345'
  },
  recipient: {
    name: 'ABC Trading Company',
    address: '456 Commercial Street\nJeddah, Saudi Arabia 54321',
    phone: '+966 12 987 6543',
    contact: 'Ahmed Mohammed'
  },
  document: {
    number: 'DN-2026-00142',
    date: '28/01/2026',
    reference: 'SO-2026-00089',
    origin: 'PO-2026-00234'
  },
  items: [
    { name: 'Widget A', sku: 'WGT-001', qty: 100, uom: 'Pcs', price: 25.00, total: 2500.00 },
    { name: 'Widget B', sku: 'WGT-002', qty: 50, uom: 'Pcs', price: 45.00, total: 2250.00 },
    { name: 'Gadget Pro', sku: 'GDG-001', qty: 25, uom: 'Box', price: 120.00, total: 3000.00 },
  ]
};

const MOCK_DATA_AR = {
  company: {
    name: 'شركة أوكتوبوس للمستودعات',
    address: '123 المنطقة الصناعية\nالرياض، المملكة العربية السعودية 12345',
    phone: '+966 11 123 4567',
    email: 'info@octopus.sa',
    vat: 'الرقم الضريبي: 123456789012345'
  },
  recipient: {
    name: 'شركة ABC للتجارة',
    address: '456 شارع التجاري\nجدة، المملكة العربية السعودية 54321',
    phone: '+966 12 987 6543',
    contact: 'أحمد محمد'
  },
  document: {
    number: 'DN-2026-00142',
    date: '28/01/2026',
    reference: 'SO-2026-00089',
    origin: 'PO-2026-00234'
  },
  items: [
    { name: 'قطعة أ', sku: 'WGT-001', qty: 100, uom: 'قطعة', price: 25.00, total: 2500.00 },
    { name: 'قطعة ب', sku: 'WGT-002', qty: 50, uom: 'قطعة', price: 45.00, total: 2250.00 },
    { name: 'جهاز برو', sku: 'GDG-001', qty: 25, uom: 'صندوق', price: 120.00, total: 3000.00 },
  ]
};

interface BuilderCanvasProps {
  components: {
    header: TemplateComponent[];
    body: TemplateComponent[];
    footer: TemplateComponent[];
  };
  selectedComponentId: string | null;
  activeSection: SectionType;
  previewLanguage: 'en' | 'ar';
  zoom: number;
  onSelectComponent: (id: string | null) => void;
  onSelectSection: (section: SectionType) => void;
  onAddComponent: (section: SectionType, component: PaletteItem, index?: number) => void;
  onRemoveComponent: (section: SectionType, componentId: string) => void;
  onMoveComponent: (section: SectionType, componentId: string, direction: 'up' | 'down') => void;
  onReorderComponent: (section: SectionType, fromIndex: number, toIndex: number) => void;
}

export const BuilderCanvas: React.FC<BuilderCanvasProps> = ({
  components,
  selectedComponentId,
  activeSection,
  previewLanguage,
  zoom,
  onSelectComponent,
  onSelectSection,
  onAddComponent,
  onRemoveComponent,
  onMoveComponent,
  onReorderComponent
}) => {
  const { colors } = useTheme();
  const [dragOverSection, setDragOverSection] = useState<SectionType | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const isRtl = previewLanguage === 'ar';
  const mockData = isRtl ? MOCK_DATA_AR : MOCK_DATA;

  const handleDragOver = (e: React.DragEvent, section: SectionType, index?: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverSection(section);
    setDragOverIndex(index ?? null);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverSection(null);
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, section: SectionType, index?: number) => {
    e.preventDefault();
    e.stopPropagation();

    const componentType = e.dataTransfer.getData('componentType') as ComponentType;
    const componentSection = e.dataTransfer.getData('componentSection') as SectionType | 'any';

    if (!componentType) {
      setDragOverSection(null);
      setDragOverIndex(null);
      return;
    }

    // Only allow dropping in appropriate section
    if (componentSection !== 'any' && componentSection !== section) {
      setDragOverSection(null);
      setDragOverIndex(null);
      return;
    }

    const allComponents = [
      ...HEADER_COMPONENTS,
      ...BODY_COMPONENTS,
      ...FOOTER_COMPONENTS
    ];

    const paletteItem = allComponents.find((c) => c.type === componentType);
    if (paletteItem) {
      onAddComponent(section, paletteItem, index);
    }

    setDragOverSection(null);
    setDragOverIndex(null);
  };

  // Render individual component as visual preview
  const renderComponentVisual = (component: TemplateComponent, section: SectionType) => {
    const props = component.props;
    const isSelected = selectedComponentId === component.id;

    const wrapperStyle: React.CSSProperties = {
      position: 'relative',
      cursor: 'pointer',
      outline: isSelected ? `2px solid ${colors.action}` : '2px solid transparent',
      outlineOffset: '2px',
      borderRadius: '4px',
      transition: 'outline-color 0.2s'
    };

    const renderContent = () => {
      switch (component.type) {
        case 'logo':
          return (
            <div
              className="flex items-center justify-center bg-gray-100 rounded"
              style={{
                width: (props.width as number) || 120,
                height: (props.height as number) || 60,
                border: '1px dashed #ccc'
              }}
            >
              <ImageIcon size={24} className="text-gray-400" />
              <span className="ml-2 text-xs text-gray-500">Logo</span>
            </div>
          );

        case 'title':
          const titleText = props.text as { en?: string; ar?: string } | undefined;
          const titleStyle = props.style as { fontSize?: number; fontWeight?: string; color?: string } | undefined;
          return (
            <h1
              style={{
                fontSize: titleStyle?.fontSize || 24,
                fontWeight: titleStyle?.fontWeight || 'bold',
                color: titleStyle?.color || '#000',
                margin: 0,
                textAlign: isRtl ? 'right' : 'left'
              }}
            >
              {titleText?.[previewLanguage] || titleText?.en || 'Document Title'}
            </h1>
          );

        case 'documentNumber':
          return (
            <div className="text-sm" style={{ textAlign: isRtl ? 'right' : 'left' }}>
              <span className="text-gray-500">{isRtl ? 'رقم المستند:' : 'Document #:'}</span>
              <span className="font-semibold ml-2">{mockData.document.number}</span>
            </div>
          );

        case 'date':
          const dateLabel = (props.label as { en?: string; ar?: string }) || {};
          return (
            <div className="text-sm" style={{ textAlign: isRtl ? 'right' : 'left' }}>
              <span className="text-gray-500">{dateLabel[previewLanguage] || (isRtl ? 'التاريخ:' : 'Date:')}</span>
              <span className="font-semibold ml-2">{mockData.document.date}</span>
            </div>
          );

        case 'companyInfo':
          return (
            <div className="text-sm space-y-1" style={{ textAlign: isRtl ? 'right' : 'left' }}>
              <div className="font-bold text-base">{mockData.company.name}</div>
              <div className="text-gray-600 whitespace-pre-line">{mockData.company.address}</div>
              <div className="text-gray-600">{mockData.company.phone}</div>
              <div className="text-gray-600">{mockData.company.vat}</div>
            </div>
          );

        case 'recipientInfo':
          return (
            <div className="text-sm space-y-1 p-3 bg-gray-50 rounded" style={{ textAlign: isRtl ? 'right' : 'left' }}>
              <div className="text-xs text-gray-500 uppercase">{isRtl ? 'المستلم' : 'Ship To'}</div>
              <div className="font-bold">{mockData.recipient.name}</div>
              <div className="text-gray-600 whitespace-pre-line">{mockData.recipient.address}</div>
              <div className="text-gray-600">{mockData.recipient.contact}</div>
            </div>
          );

        case 'textBlock':
        case 'staticText':
          const textContent = props.text as { en?: string; ar?: string } | undefined;
          const textStyle = props.style as { fontSize?: number; color?: string } | undefined;
          return (
            <p
              style={{
                fontSize: textStyle?.fontSize || 14,
                color: textStyle?.color || '#333',
                margin: 0,
                textAlign: isRtl ? 'right' : 'left'
              }}
            >
              {textContent?.[previewLanguage] || textContent?.en || 'Sample text content goes here...'}
            </p>
          );

        case 'field':
          const fieldPath = (props.path as string) || 'field_name';
          return (
            <div className="text-sm" style={{ textAlign: isRtl ? 'right' : 'left' }}>
              <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-mono">
                {`{{${fieldPath}}}`}
              </span>
            </div>
          );

        case 'table':
          const columns = (props.columns as Array<{ key: string; label: { en: string; ar: string }; width?: number }>) || [
            { key: 'name', label: { en: 'Item', ar: 'الصنف' }, width: 200 },
            { key: 'qty', label: { en: 'Qty', ar: 'الكمية' }, width: 80 },
            { key: 'uom', label: { en: 'UoM', ar: 'الوحدة' }, width: 80 },
            { key: 'price', label: { en: 'Price', ar: 'السعر' }, width: 100 },
            { key: 'total', label: { en: 'Total', ar: 'المجموع' }, width: 100 },
          ];
          return (
            <table className="w-full border-collapse text-sm" style={{ direction: isRtl ? 'rtl' : 'ltr' }}>
              <thead>
                <tr className="bg-gray-100">
                  {columns.map((col, i) => (
                    <th
                      key={i}
                      className="border border-gray-300 px-3 py-2 text-left font-semibold"
                      style={{
                        width: col.width,
                        textAlign: isRtl ? 'right' : 'left'
                      }}
                    >
                      {col.label[previewLanguage] || col.label.en}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mockData.items.map((item, rowIndex) => (
                  <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    {columns.map((col, colIndex) => (
                      <td
                        key={colIndex}
                        className="border border-gray-300 px-3 py-2"
                        style={{ textAlign: isRtl ? 'right' : 'left' }}
                      >
                        {col.key === 'price' || col.key === 'total'
                          ? `${(item as any)[col.key]?.toFixed(2)} SAR`
                          : (item as any)[col.key]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          );

        case 'line':
          const lineStyle = props.style as { thickness?: number; color?: string; style?: string } | undefined;
          return (
            <hr
              style={{
                borderTop: `${lineStyle?.thickness || 1}px ${lineStyle?.style || 'solid'} ${lineStyle?.color || '#ccc'}`,
                margin: '8px 0'
              }}
            />
          );

        case 'spacer':
          const spacerSize = props.size as string || 'medium';
          const spacerHeight = spacerSize === 'small' ? 8 : spacerSize === 'large' ? 32 : 16;
          return <div style={{ height: spacerHeight }} />;

        case 'qrcode':
          return (
            <div
              className="flex items-center justify-center bg-white border-2 border-gray-300"
              style={{ width: 80, height: 80 }}
            >
              <div className="text-xs text-gray-400 text-center">QR Code</div>
            </div>
          );

        case 'barcode':
          return (
            <div
              className="flex items-center justify-center bg-white border border-gray-300 rounded"
              style={{ width: 150, height: 50 }}
            >
              <div className="text-xs text-gray-400">||||| BARCODE |||||</div>
            </div>
          );

        case 'signatureBox':
          const sigLabel = props.label as { en?: string; ar?: string } | undefined;
          return (
            <div className="border-t-2 border-gray-400 pt-2 mt-8" style={{ width: 200 }}>
              <div className="text-xs text-gray-500 text-center">
                {sigLabel?.[previewLanguage] || sigLabel?.en || (isRtl ? 'التوقيع' : 'Signature')}
              </div>
            </div>
          );

        case 'pageNumber':
          const format = (props.format as string) || 'Page {current} of {total}';
          return (
            <div className="text-xs text-gray-500 text-center">
              {format.replace('{current}', '1').replace('{total}', '1')}
            </div>
          );

        case 'generatedDate':
          return (
            <div className="text-xs text-gray-500" style={{ textAlign: isRtl ? 'right' : 'left' }}>
              {isRtl ? 'تم الإنشاء: 28/01/2026 14:30' : 'Generated: 28/01/2026 14:30'}
            </div>
          );

        case 'twoColumn':
          return (
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded border border-dashed border-gray-300 min-h-[60px] flex items-center justify-center text-gray-400 text-sm">
                {isRtl ? 'العمود الأيسر' : 'Left Column'}
              </div>
              <div className="bg-gray-50 p-4 rounded border border-dashed border-gray-300 min-h-[60px] flex items-center justify-center text-gray-400 text-sm">
                {isRtl ? 'العمود الأيمن' : 'Right Column'}
              </div>
            </div>
          );

        case 'infoBox':
          const boxTitle = props.title as { en?: string; ar?: string } | undefined;
          return (
            <div className="border rounded p-3 bg-blue-50 border-blue-200">
              <div className="font-semibold text-blue-800 text-sm mb-1">
                {boxTitle?.[previewLanguage] || boxTitle?.en || (isRtl ? 'معلومات' : 'Information')}
              </div>
              <div className="text-sm text-blue-700">
                {isRtl ? 'محتوى صندوق المعلومات...' : 'Info box content goes here...'}
              </div>
            </div>
          );

        case 'image':
          return (
            <div
              className="flex items-center justify-center bg-gray-100 rounded border border-dashed border-gray-300"
              style={{ width: (props.width as number) || 200, height: (props.height as number) || 150 }}
            >
              <ImageIcon size={32} className="text-gray-400" />
            </div>
          );

        case 'pageBreak':
          return (
            <div className="border-t-2 border-dashed border-red-300 my-4 relative">
              <span className="absolute left-1/2 -translate-x-1/2 -top-3 bg-white px-2 text-xs text-red-400">
                {isRtl ? '--- فاصل صفحة ---' : '--- Page Break ---'}
              </span>
            </div>
          );

        default:
          return (
            <div className="p-2 bg-gray-100 rounded text-sm text-gray-500">
              {component.type}
            </div>
          );
      }
    };

    return (
      <div
        key={component.id}
        onClick={(e) => {
          e.stopPropagation();
          onSelectComponent(component.id);
        }}
        style={wrapperStyle}
        className="group relative my-2"
      >
        {/* Selection Controls */}
        {isSelected && (
          <div
            className="absolute -right-10 top-1/2 -translate-y-1/2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ zIndex: 10 }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemoveComponent(section, component.id);
              }}
              className="p-1 rounded bg-red-500 text-white hover:bg-red-600"
              title="Delete"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}

        {renderContent()}
      </div>
    );
  };

  // Render a section (header, body, or footer)
  const renderSection = (section: SectionType, title: string) => {
    const sectionComponents = components[section];
    const isActive = activeSection === section;
    const isDragOver = dragOverSection === section;

    // Section-specific styles
    const sectionStyles: Record<SectionType, { bg: string; minHeight: number }> = {
      header: { bg: '#fafafa', minHeight: 120 },
      body: { bg: '#ffffff', minHeight: 300 },
      footer: { bg: '#fafafa', minHeight: 60 }
    };

    return (
      <div
        className={`relative transition-all ${isActive ? 'ring-2 ring-offset-2' : ''}`}
        style={{
          background: sectionStyles[section].bg,
          minHeight: sectionStyles[section].minHeight,
          borderTop: section !== 'header' ? `1px dashed ${colors.border}` : 'none',
          padding: '16px 24px',
          boxShadow: isActive ? `0 0 0 2px ${colors.action}` : 'none'
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onSelectSection(section);
            onSelectComponent(null);
          }
        }}
        onDragOver={(e) => handleDragOver(e, section)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, section)}
      >
        {/* Section Label */}
        <div
          className="absolute -left-1 top-2 text-xs font-medium uppercase tracking-wider px-2 py-0.5 rounded-r"
          style={{
            background: isActive ? colors.action : colors.border,
            color: isActive ? '#fff' : colors.textSecondary,
            writingMode: 'vertical-rl',
            transform: 'rotate(180deg)'
          }}
        >
          {title}
        </div>

        {/* Drop Zone Indicator */}
        {isDragOver && (
          <div
            className="absolute inset-0 border-2 border-dashed rounded pointer-events-none flex items-center justify-center"
            style={{ borderColor: colors.action, background: `${colors.action}10` }}
          >
            <span style={{ color: colors.action }} className="font-medium">
              Drop component here
            </span>
          </div>
        )}

        {/* Components */}
        <div style={{ direction: isRtl ? 'rtl' : 'ltr' }}>
          {sectionComponents.length === 0 ? (
            <div
              className="flex items-center justify-center py-8 border-2 border-dashed rounded-lg"
              style={{ borderColor: colors.border, color: colors.textSecondary }}
            >
              <Plus size={20} className="mr-2" />
              <span className="text-sm">Drag components here to add to {title.toLowerCase()}</span>
            </div>
          ) : (
            sectionComponents.map((component, index) => (
              <div key={component.id}>
                {dragOverIndex === index && isDragOver && (
                  <div className="h-1 bg-blue-500 rounded my-1" />
                )}
                {renderComponentVisual(component, section)}
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      className="h-full overflow-auto p-8"
      style={{ background: colors.background }}
      onClick={() => onSelectComponent(null)}
    >
      {/* Paper Preview - A4 ratio */}
      <div
        className="mx-auto shadow-2xl overflow-hidden"
        style={{
          width: 595 * zoom, // A4 width in pixels at 72dpi
          minHeight: 842 * zoom, // A4 height
          background: '#fff',
          transform: `scale(${zoom})`,
          transformOrigin: 'top center',
          borderRadius: 4
        }}
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        {renderSection('header', 'Header')}
        {renderSection('body', 'Body')}
        {renderSection('footer', 'Footer')}
      </div>
    </div>
  );
};

export default BuilderCanvas;
