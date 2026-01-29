/**
 * Template Builder
 * Main three-panel template builder component
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Save,
  Undo,
  Redo,
  ZoomIn,
  ZoomOut,
  Eye,
  Languages,
  Settings,
  MoreVertical,
  Download,
  Upload,
  ChevronLeft
} from 'lucide-react';
import { useTheme } from '../../../context/theme';
import { ComponentPalette } from './ComponentPalette';
import { BuilderCanvas } from './BuilderCanvas';
import { PropertiesPanel } from './PropertiesPanel';
import {
  XmlTemplate,
  TemplateComponent,
  SectionType,
  PaletteItem,
  BuilderState,
  HistoryEntry
} from '../../types/templateBuilder.types';
import * as templateBuilderService from '../../services/templateBuilder.service';

interface TemplateBuilderProps {
  template: XmlTemplate | null;
  onSave: (xmlContent: string) => Promise<void>;
  onBack: () => void;
  isNew?: boolean;
}

const MAX_HISTORY = 50;
const AUTOSAVE_INTERVAL = 30000; // 30 seconds

// Simple unique ID generator
const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const TemplateBuilder: React.FC<TemplateBuilderProps> = ({
  template,
  onSave,
  onBack,
  isNew = false
}) => {
  const { colors } = useTheme();
  const autosaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Builder State
  const [components, setComponents] = useState<BuilderState['components']>({
    header: [],
    body: [],
    footer: []
  });
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<SectionType>('body');
  const [previewLanguage, setPreviewLanguage] = useState<'en' | 'ar'>('en');
  const [zoom, setZoom] = useState(1);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // History for undo/redo
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Menu states
  const [showMenu, setShowMenu] = useState(false);

  // Parse XML content on load
  useEffect(() => {
    if (template?.xml_content) {
      try {
        // Parse XML and convert to components
        // For now, start with empty components
        // In production, parse the XML content
        parseXmlToComponents(template.xml_content);
      } catch (error) {
        console.error('Failed to parse template XML:', error);
      }
    }

    // Add initial history entry
    addToHistory('Initial state');
  }, [template]);

  // Setup autosave
  useEffect(() => {
    if (isDirty) {
      autosaveTimerRef.current = setInterval(() => {
        handleAutosave();
      }, AUTOSAVE_INTERVAL);
    }

    return () => {
      if (autosaveTimerRef.current) {
        clearInterval(autosaveTimerRef.current);
      }
    };
  }, [isDirty, components]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 's':
            e.preventDefault();
            handleSave();
            break;
          case 'z':
            e.preventDefault();
            if (e.shiftKey) {
              handleRedo();
            } else {
              handleUndo();
            }
            break;
          case 'y':
            e.preventDefault();
            handleRedo();
            break;
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedComponentId && activeSection) {
          handleRemoveComponent(activeSection, selectedComponentId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedComponentId, activeSection, historyIndex]);

  // Parse XML to component structure
  const parseXmlToComponents = (xmlContent: string) => {
    // Simplified XML parsing - in production use xml2js or similar
    // For now, initialize empty sections
    const newComponents: BuilderState['components'] = {
      header: [],
      body: [],
      footer: []
    };

    setComponents(newComponents);
  };

  // Convert components back to XML
  const componentsToXml = useCallback((): string => {
    const sections = ['header', 'body', 'footer'] as const;

    const buildComponentXml = (comp: TemplateComponent): string => {
      const props = comp.props;
      const type = comp.type;

      switch (type) {
        case 'title':
        case 'textBlock':
        case 'staticText':
          const text = props.text as { en?: string; ar?: string };
          const style = props.style as Record<string, unknown>;
          return `
    <${type}>
      <text lang="en">${text?.en || ''}</text>
      <text lang="ar">${text?.ar || ''}</text>
      ${style ? `<style${style.bold ? ' bold="true"' : ''}${style.italic ? ' italic="true"' : ''}${style.fontSize ? ` fontSize="${style.fontSize}"` : ''}${style.color ? ` color="${style.color}"` : ''} />` : ''}
    </${type}>`;

        case 'field':
        case 'documentNumber':
          return `<${type} field="${props.path || props.field || ''}"${props.type ? ` type="${props.type}"` : ''}${props.precision ? ` precision="${props.precision}"` : ''} />`;

        case 'date':
          return `<date field="${props.field || ''}" format="${props.format || 'DD/MM/YYYY'}" />`;

        case 'logo':
          return `<logo libraryRef="${props.libraryRef || ''}" />`;

        case 'spacer':
          return `<spacer size="${props.size || 'medium'}" />`;

        case 'line':
          return `<line width="${props.width || 1}" color="${props.color || '#e5e5e5'}" />`;

        case 'pageBreak':
          return '<pageBreak />';

        case 'pageNumber':
          return `<pageNumber format="${props.format || 'Page {current} of {total}'}" />`;

        case 'generatedDate':
          return '<generatedDate />';

        case 'signatureBox':
          const label = props.label as { en?: string; ar?: string };
          const stamp = props.stamp as { libraryRef?: string };
          return `
    <signatureBox>
      <label lang="en">${label?.en || ''}</label>
      <label lang="ar">${label?.ar || ''}</label>
      ${stamp?.libraryRef ? `<stamp libraryRef="${stamp.libraryRef}" />` : ''}
    </signatureBox>`;

        case 'table':
          const columns = (props.columns || []) as Array<{
            field: string;
            type?: string;
            precision?: number;
            header?: { en?: string; ar?: string };
          }>;
          return `
    <table source="${props.source || ''}" emptyMessage="${props.emptyMessage || 'No items'}">
      ${columns.map(col => `
      <column field="${col.field}"${col.type ? ` type="${col.type}"` : ''}${col.precision ? ` precision="${col.precision}"` : ''}>
        <header lang="en">${col.header?.en || ''}</header>
        <header lang="ar">${col.header?.ar || ''}</header>
      </column>`).join('')}
    </table>`;

        default:
          return `<${type} />`;
      }
    };

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<template version="1.0" documentType="${template?.document_type || 'delivery_note'}">
  <meta>
    <name>${template?.template_name || 'Untitled'}</name>
    <description>${template?.description || ''}</description>
    <dateFormat>${template?.date_format || 'DD/MM/YYYY'}</dateFormat>
    <currencySymbol>${template?.currency_symbol || 'SAR'}</currencySymbol>
    <decimalPrecision>${template?.default_decimal_precision || 2}</decimalPrecision>
  </meta>
`;

    for (const section of sections) {
      xml += `\n  <${section}>`;
      for (const comp of components[section]) {
        xml += buildComponentXml(comp);
      }
      xml += `\n  </${section}>`;
    }

    xml += '\n</template>';

    return xml;
  }, [components, template]);

  // History management
  const addToHistory = (description: string) => {
    const entry: HistoryEntry = {
      timestamp: Date.now(),
      components: JSON.parse(JSON.stringify(components)),
      description
    };

    // Remove any redo history
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(entry);

    // Limit history size
    if (newHistory.length > MAX_HISTORY) {
      newHistory.shift();
    }

    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      setComponents(JSON.parse(JSON.stringify(prevState.components)));
      setHistoryIndex(historyIndex - 1);
      setIsDirty(true);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setComponents(JSON.parse(JSON.stringify(nextState.components)));
      setHistoryIndex(historyIndex + 1);
      setIsDirty(true);
    }
  };

  // Component manipulation
  const handleAddComponent = (section: SectionType, item: PaletteItem, index?: number) => {
    const newComponent: TemplateComponent = {
      id: generateId(),
      type: item.type,
      section,
      props: { ...item.defaultProps },
      order: index ?? components[section].length
    };

    setComponents(prev => {
      const sectionComponents = [...prev[section]];
      if (index !== undefined) {
        sectionComponents.splice(index, 0, newComponent);
      } else {
        sectionComponents.push(newComponent);
      }
      return { ...prev, [section]: sectionComponents };
    });

    setSelectedComponentId(newComponent.id);
    setActiveSection(section);
    setIsDirty(true);
    addToHistory(`Added ${item.label}`);
  };

  const handleRemoveComponent = (section: SectionType, componentId: string) => {
    setComponents(prev => ({
      ...prev,
      [section]: prev[section].filter(c => c.id !== componentId)
    }));

    if (selectedComponentId === componentId) {
      setSelectedComponentId(null);
    }

    setIsDirty(true);
    addToHistory('Removed component');
  };

  const handleUpdateComponent = (
    section: SectionType,
    componentId: string,
    props: Record<string, unknown>
  ) => {
    setComponents(prev => ({
      ...prev,
      [section]: prev[section].map(c =>
        c.id === componentId ? { ...c, props } : c
      )
    }));

    setIsDirty(true);
  };

  const handleMoveComponent = (
    section: SectionType,
    componentId: string,
    direction: 'up' | 'down'
  ) => {
    setComponents(prev => {
      const sectionComponents = [...prev[section]];
      const index = sectionComponents.findIndex(c => c.id === componentId);

      if (index === -1) return prev;

      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= sectionComponents.length) return prev;

      [sectionComponents[index], sectionComponents[newIndex]] =
        [sectionComponents[newIndex], sectionComponents[index]];

      return { ...prev, [section]: sectionComponents };
    });

    setIsDirty(true);
    addToHistory('Moved component');
  };

  const handleReorderComponent = (
    section: SectionType,
    fromIndex: number,
    toIndex: number
  ) => {
    if (fromIndex === toIndex) return;

    setComponents(prev => {
      const sectionComponents = [...prev[section]];
      const [moved] = sectionComponents.splice(fromIndex, 1);
      sectionComponents.splice(toIndex, 0, moved);

      return { ...prev, [section]: sectionComponents };
    });

    setIsDirty(true);
    addToHistory('Reordered component');
  };

  // Save operations
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const xmlContent = componentsToXml();
      await onSave(xmlContent);
      setIsDirty(false);
    } catch (error) {
      console.error('Failed to save template:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAutosave = async () => {
    if (!isDirty) return;

    try {
      const xmlContent = componentsToXml();
      await templateBuilderService.saveAutosave({
        template_id: template?.id,
        xml_content: xmlContent,
        template_name: template?.template_name,
        document_type: template?.document_type
      });
    } catch (error) {
      console.error('Autosave failed:', error);
    }
  };

  // Export template
  const handleExport = async () => {
    if (!template?.id) return;

    try {
      const blob = await templateBuilderService.exportTemplate(template.id);
      templateBuilderService.downloadBlob(blob, `${template.template_key}.xml`);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  // Get selected component
  const getSelectedComponent = (): TemplateComponent | null => {
    if (!selectedComponentId) return null;

    for (const section of ['header', 'body', 'footer'] as const) {
      const found = components[section].find(c => c.id === selectedComponentId);
      if (found) return found;
    }

    return null;
  };

  // Get section of selected component
  const getSelectedSection = (): SectionType => {
    if (!selectedComponentId) return activeSection;

    for (const section of ['header', 'body', 'footer'] as const) {
      const found = components[section].find(c => c.id === selectedComponentId);
      if (found) return section;
    }

    return activeSection;
  };

  return (
    <div
      className="h-full flex flex-col overflow-hidden"
      style={{ background: colors.background }}
    >
      {/* Toolbar */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b shrink-0"
        style={{
          background: colors.card,
          borderColor: colors.border
        }}
      >
        {/* Left */}
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-lg transition-all"
            style={{ color: colors.textPrimary }}
            onMouseEnter={(e) => e.currentTarget.style.background = `${colors.action}15`}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <ChevronLeft size={20} />
          </button>

          <div>
            <h1
              className="font-bold text-lg"
              style={{ color: colors.textPrimary }}
            >
              {template?.template_name || 'New Template'}
            </h1>
            <p className="text-xs" style={{ color: colors.textSecondary }}>
              {isDirty ? 'Unsaved changes' : 'All changes saved'}
            </p>
          </div>
        </div>

        {/* Center - Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            className="p-2 rounded-lg transition-colors disabled:opacity-30"
            style={{ background: colors.background, color: colors.textPrimary }}
            title="Undo (Ctrl+Z)"
          >
            <Undo size={18} />
          </button>
          <button
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            className="p-2 rounded-lg transition-colors disabled:opacity-30"
            style={{ background: colors.background, color: colors.textPrimary }}
            title="Redo (Ctrl+Y)"
          >
            <Redo size={18} />
          </button>

          <div className="w-px h-6 mx-2" style={{ background: colors.border }} />

          <button
            onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
            className="p-2 rounded-lg transition-colors"
            style={{ background: colors.background, color: colors.textPrimary }}
            title="Zoom Out"
          >
            <ZoomOut size={18} />
          </button>
          <span
            className="text-sm font-medium w-16 text-center"
            style={{ color: colors.textPrimary }}
          >
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom(Math.min(1.5, zoom + 0.1))}
            className="p-2 rounded-lg transition-colors"
            style={{ background: colors.background, color: colors.textPrimary }}
            title="Zoom In"
          >
            <ZoomIn size={18} />
          </button>

          <div className="w-px h-6 mx-2" style={{ background: colors.border }} />

          <button
            onClick={() => setPreviewLanguage(previewLanguage === 'en' ? 'ar' : 'en')}
            className="px-3 py-2 rounded-lg transition-colors flex items-center gap-2"
            style={{ background: colors.background, color: colors.textPrimary }}
            title="Toggle Language"
          >
            <Languages size={18} />
            <span className="text-sm font-medium uppercase">
              {previewLanguage}
            </span>
          </button>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 rounded-lg transition-colors"
              style={{ background: colors.background, color: colors.textPrimary }}
            >
              <MoreVertical size={18} />
            </button>

            {showMenu && (
              <div
                className="absolute right-0 top-full mt-2 w-48 rounded-xl shadow-xl overflow-hidden z-50"
                style={{ background: colors.card, border: `1px solid ${colors.border}` }}
              >
                <button
                  onClick={() => {
                    handleExport();
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-3 text-left text-sm flex items-center gap-3 transition-all"
                  style={{ color: colors.textPrimary }}
                  onMouseEnter={(e) => e.currentTarget.style.background = `${colors.action}15`}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <Download size={16} />
                  Export as XML
                </button>
                <button
                  onClick={() => setShowMenu(false)}
                  className="w-full px-4 py-3 text-left text-sm flex items-center gap-3 transition-all"
                  style={{ color: colors.textPrimary }}
                  onMouseEnter={(e) => e.currentTarget.style.background = `${colors.action}15`}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <Settings size={16} />
                  Template Settings
                </button>
              </div>
            )}
          </div>

          <button
            onClick={handleSave}
            disabled={isSaving || !isDirty}
            className="px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
            style={{
              background: colors.action,
              color: '#fff'
            }}
          >
            <Save size={18} />
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Component Palette */}
        <div className="w-72 shrink-0 border-r" style={{ borderColor: colors.border }}>
          <ComponentPalette
            onDragStart={() => {}}
            activeSection={activeSection}
          />
        </div>

        {/* Center - Canvas */}
        <div className="flex-1 overflow-hidden">
          <BuilderCanvas
            components={components}
            selectedComponentId={selectedComponentId}
            activeSection={activeSection}
            previewLanguage={previewLanguage}
            zoom={zoom}
            onSelectComponent={setSelectedComponentId}
            onSelectSection={setActiveSection}
            onAddComponent={handleAddComponent}
            onRemoveComponent={handleRemoveComponent}
            onMoveComponent={handleMoveComponent}
            onReorderComponent={handleReorderComponent}
          />
        </div>

        {/* Right Panel - Properties */}
        <div className="w-80 shrink-0 border-l" style={{ borderColor: colors.border }}>
          <PropertiesPanel
            component={getSelectedComponent()}
            section={getSelectedSection()}
            onUpdateComponent={handleUpdateComponent}
            onClose={() => setSelectedComponentId(null)}
          />
        </div>
      </div>
    </div>
  );
};

export default TemplateBuilder;
