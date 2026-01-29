/**
 * Component Palette
 * Left panel with draggable components for the template builder
 */

import React, { useState } from 'react';
import {
  Image,
  Type,
  Hash,
  Calendar,
  Building2,
  User,
  FileText,
  Variable,
  Table,
  Minus,
  Space,
  QrCode,
  Columns,
  Square,
  PenLine,
  Clock,
  ChevronDown,
  ChevronRight,
  Search,
  GripVertical
} from 'lucide-react';
import { useTheme } from '../../../context/theme';
import {
  PaletteItem,
  HEADER_COMPONENTS,
  BODY_COMPONENTS,
  FOOTER_COMPONENTS,
  SectionType,
  ComponentType
} from '../../types/templateBuilder.types';
import { LucideIcon } from 'lucide-react';

// Icon mapping
const iconMap: Record<string, LucideIcon> = {
  Image,
  Type,
  Hash,
  Calendar,
  Building2,
  User,
  FileText,
  Variable,
  Table,
  Minus,
  Space,
  Barcode: Hash,
  QrCode,
  FileBreak: Minus,
  Columns,
  Square,
  PenLine,
  Clock
};

interface ComponentPaletteProps {
  onDragStart: (item: PaletteItem) => void;
  activeSection: SectionType;
}

export const ComponentPalette: React.FC<ComponentPaletteProps> = ({
  onDragStart,
  activeSection
}) => {
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    header: true,
    body: true,
    footer: true
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const filterComponents = (components: PaletteItem[]) => {
    if (!searchQuery) return components;
    const query = searchQuery.toLowerCase();
    return components.filter(
      c => c.label.toLowerCase().includes(query) ||
           c.labelAr.includes(query) ||
           c.description.toLowerCase().includes(query)
    );
  };

  const renderComponentItem = (item: PaletteItem, disabled: boolean) => {
    const IconComponent: LucideIcon = iconMap[item.icon] || FileText;

    return (
      <div
        key={item.type}
        draggable={!disabled}
        onDragStart={(e) => {
          if (disabled) {
            e.preventDefault();
            return;
          }
          e.dataTransfer.setData('componentType', item.type);
          e.dataTransfer.setData('componentSection', item.section);
          onDragStart(item);
        }}
        className={`
          group flex items-center gap-3 p-3 rounded-xl cursor-grab
          transition-all duration-200 border
          ${disabled
            ? 'opacity-40 cursor-not-allowed'
            : 'hover:shadow-lg active:cursor-grabbing'
          }
        `}
        style={{
          background: disabled ? colors.card : colors.background,
          borderColor: disabled ? colors.border : 'transparent'
        }}
      >
        <div
          className={`
            w-10 h-10 rounded-lg flex items-center justify-center
            transition-transform duration-200
            ${!disabled && 'group-hover:scale-110'}
          `}
          style={{ background: `${colors.action}15` }}
        >
          <IconComponent
            size={20}
            style={{ color: disabled ? colors.textSecondary : colors.action }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <p
            className="text-sm font-medium truncate"
            style={{ color: disabled ? colors.textSecondary : colors.textPrimary }}
          >
            {item.label}
          </p>
          <p
            className="text-xs truncate mt-0.5"
            style={{ color: colors.textSecondary }}
          >
            {item.description}
          </p>
        </div>
        {!disabled && (
          <GripVertical
            size={16}
            className="opacity-0 group-hover:opacity-50 transition-opacity"
            style={{ color: colors.textSecondary }}
          />
        )}
      </div>
    );
  };

  const renderSection = (
    title: string,
    titleAr: string,
    section: SectionType,
    components: PaletteItem[]
  ) => {
    const filteredComponents = filterComponents(components);
    const isExpanded = expandedSections[section];
    const isActiveSection = activeSection === section;

    if (filteredComponents.length === 0 && searchQuery) return null;

    return (
      <div className="mb-4">
        <button
          onClick={() => toggleSection(section)}
          className="w-full flex items-center justify-between p-2 rounded-lg transition-colors"
          style={{
            background: isActiveSection ? `${colors.action}10` : 'transparent'
          }}
        >
          <div className="flex items-center gap-2">
            {isExpanded ? (
              <ChevronDown size={16} style={{ color: colors.textSecondary }} />
            ) : (
              <ChevronRight size={16} style={{ color: colors.textSecondary }} />
            )}
            <span
              className="text-sm font-semibold uppercase tracking-wide"
              style={{ color: isActiveSection ? colors.action : colors.textPrimary }}
            >
              {title}
            </span>
            <span
              className="text-xs"
              style={{ color: colors.textSecondary }}
            >
              ({filteredComponents.length})
            </span>
          </div>
          {isActiveSection && (
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: `${colors.action}20`, color: colors.action }}
            >
              Active
            </span>
          )}
        </button>

        {isExpanded && (
          <div className="mt-2 space-y-2 pl-2">
            {filteredComponents.map(item =>
              renderComponentItem(item, item.section !== 'any' && item.section !== activeSection)
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className="h-full flex flex-col overflow-hidden"
      style={{ background: colors.card }}
    >
      {/* Header */}
      <div className="p-4 border-b" style={{ borderColor: colors.border }}>
        <h2
          className="text-lg font-bold mb-3"
          style={{ color: colors.textPrimary }}
        >
          Components
        </h2>

        {/* Search */}
        <div
          className="relative"
        >
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: colors.textSecondary }}
          />
          <input
            type="text"
            placeholder="Search components..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg text-sm outline-none transition-all"
            style={{
              background: colors.background,
              color: colors.textPrimary,
              border: `1px solid ${colors.border}`
            }}
          />
        </div>
      </div>

      {/* Components List */}
      <div className="flex-1 overflow-y-auto p-4">
        {renderSection('Header', 'الرأس', 'header', HEADER_COMPONENTS)}
        {renderSection('Body', 'المحتوى', 'body', BODY_COMPONENTS)}
        {renderSection('Footer', 'التذييل', 'footer', FOOTER_COMPONENTS)}

        {searchQuery && filterComponents([...HEADER_COMPONENTS, ...BODY_COMPONENTS, ...FOOTER_COMPONENTS]).length === 0 && (
          <div
            className="text-center py-8"
            style={{ color: colors.textSecondary }}
          >
            <p>No components found</p>
            <p className="text-sm mt-1">Try a different search term</p>
          </div>
        )}
      </div>

      {/* Help Text */}
      <div
        className="p-4 border-t"
        style={{ borderColor: colors.border }}
      >
        <p
          className="text-xs text-center"
          style={{ color: colors.textSecondary }}
        >
          Drag components to the canvas to add them to your template
        </p>
      </div>
    </div>
  );
};

export default ComponentPalette;
