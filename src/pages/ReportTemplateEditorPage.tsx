"use client"

import React, { useState, useEffect, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { useTheme } from "../../context/theme"
import { API_CONFIG, getTenantHeaders } from "../config/api"
import {
  Save, ArrowLeft, Eye, Plus, Trash2, ChevronDown, ChevronRight, ChevronUp,
  Layout, Type, Image as ImageIcon, Table as TableIcon,
  AlignLeft, AlignCenter, AlignRight, AlignJustify, Bold, Italic, Underline,
  Layers, Undo, Redo, Box, Code, Copy, Settings, Columns,
  SeparatorHorizontal, MoveVertical, List, Heading1, Barcode, QrCode
} from "lucide-react"
import Toast from "../components/Toast"
import { useNavigate, useParams } from "react-router-dom"

// Types
type BlockType = 'section' | 'row' | 'column' | 'text' | 'heading' | 'field' | 'image' | 'table' | 'divider' | 'spacer' | 'list' | 'barcode' | 'qrcode'

interface BlockStyles {
  paddingTop: number; paddingRight: number; paddingBottom: number; paddingLeft: number
  marginTop: number; marginRight: number; marginBottom: number; marginLeft: number
  gap: number; fontFamily: string; fontSize: number; fontWeight: number
  fontStyle: 'normal' | 'italic'; textDecoration: 'none' | 'underline' | 'line-through'
  textAlign: 'left' | 'center' | 'right' | 'justify'; lineHeight: number
  color: string; backgroundColor: string
  borderWidth: number; borderStyle: 'none' | 'solid' | 'dashed' | 'dotted'; borderColor: string; borderRadius: number
  width: string; height: string; minHeight: string; flex: string
  display: string; flexDirection: 'row' | 'column'
  justifyContent: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around'
  alignItems: 'flex-start' | 'center' | 'flex-end' | 'stretch'
}

interface Block {
  id: string; type: BlockType; name: string; content: string; styles: BlockStyles; children: Block[]
  fieldKey: string; fieldModel: string; loopVariable: string
  tableColumns: { key: string; label: string; width: string }[]
  imageUrl: string; headingLevel: 1 | 2 | 3 | 4 | 5 | 6; listType: 'bullet' | 'number'; listItems: string[]
}

interface ModelField { id: number; field_name: string; field_label: string; field_type: string; model_name: string }

interface TemplateData {
  template_key: string; template_name: string; description: string; category_id: number | null
  report_type: string; source_model: string; template_html: string
  page_size: string; page_orientation: string
  margin_top: number; margin_right: number; margin_bottom: number; margin_left: number
  is_default: boolean; blocks: Block[]
}

// Constants
const FONT_FAMILIES = [
  { value: 'Arial, sans-serif', label: 'Arial' },
  { value: 'Helvetica, sans-serif', label: 'Helvetica' },
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: 'Times New Roman, serif', label: 'Times New Roman' },
  { value: 'Courier New, monospace', label: 'Courier New' },
  { value: 'Verdana, sans-serif', label: 'Verdana' },
]

const FONT_WEIGHTS = [
  { value: 300, label: 'Light' }, { value: 400, label: 'Normal' },
  { value: 500, label: 'Medium' }, { value: 600, label: 'Semi Bold' },
  { value: 700, label: 'Bold' }, { value: 800, label: 'Extra Bold' },
]

const SOURCE_MODELS = [
  { value: 'stock.picking', label: 'Stock Picking' },
  { value: 'sale.order', label: 'Sale Order' },
  { value: 'purchase.order', label: 'Purchase Order' },
  { value: 'account.move', label: 'Invoice/Bill' },
  { value: 'mrp.production', label: 'Manufacturing Order' },
  { value: 'product.template', label: 'Product Template' },
  { value: 'res.partner', label: 'Partner' },
]

const REPORT_TYPES = [
  { value: 'receipt', label: 'Receipt' }, { value: 'delivery', label: 'Delivery Note' },
  { value: 'quotation', label: 'Quotation' }, { value: 'invoice', label: 'Invoice' },
  { value: 'picking', label: 'Picking Slip' }, { value: 'custom', label: 'Custom' },
]

const generateId = () => `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

const getDefaultStyles = (): BlockStyles => ({
  paddingTop: 0, paddingRight: 0, paddingBottom: 0, paddingLeft: 0,
  marginTop: 0, marginRight: 0, marginBottom: 0, marginLeft: 0, gap: 0,
  fontFamily: 'Arial, sans-serif', fontSize: 12, fontWeight: 400,
  fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', lineHeight: 1.5,
  color: '#000000', backgroundColor: 'transparent',
  borderWidth: 0, borderStyle: 'none', borderColor: '#000000', borderRadius: 0,
  width: 'auto', height: 'auto', minHeight: '0', flex: '1',
  display: 'block', flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'flex-start'
})

const createBlock = (type: BlockType, name?: string): Block => {
  const base: Block = {
    id: generateId(), type, name: name || type.charAt(0).toUpperCase() + type.slice(1),
    content: '', styles: getDefaultStyles(), children: [],
    fieldKey: '', fieldModel: '', loopVariable: 'lines', tableColumns: [],
    imageUrl: '', headingLevel: 1, listType: 'bullet', listItems: []
  }
  switch (type) {
    case 'section': base.styles = { ...base.styles, paddingTop: 16, paddingRight: 16, paddingBottom: 16, paddingLeft: 16, minHeight: '40px' }; break
    case 'row': base.styles = { ...base.styles, display: 'flex', flexDirection: 'row', gap: 16, alignItems: 'stretch' }; break
    case 'column': base.styles = { ...base.styles, flex: '1', display: 'flex', flexDirection: 'column' }; break
    case 'text': base.content = 'Enter your text here...'; break
    case 'heading': base.content = 'Heading'; base.styles.fontSize = 24; base.styles.fontWeight = 700; break
    case 'field': base.content = '{{field}}'; base.styles.display = 'inline'; break
    case 'divider': base.styles = { ...base.styles, borderWidth: 1, borderStyle: 'solid', borderColor: '#e5e7eb', marginTop: 16, marginBottom: 16 }; break
    case 'spacer': base.styles.height = '24px'; break
    case 'table': base.tableColumns = [{ key: 'name', label: 'Name', width: 'auto' }, { key: 'quantity', label: 'Qty', width: '80px' }]; break
    case 'list': base.listItems = ['Item 1', 'Item 2', 'Item 3']; break
  }
  return base
}

const DEFAULT_BLOCKS: Block[] = [{
  ...createBlock('section', 'Document'),
  styles: { ...getDefaultStyles(), paddingTop: 24, paddingRight: 24, paddingBottom: 24, paddingLeft: 24 },
  children: [{
    ...createBlock('row', 'Header'),
    styles: { ...getDefaultStyles(), display: 'flex', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
    children: [
      { ...createBlock('column', 'Company'), children: [{ ...createBlock('heading', 'Company Name'), content: '{{company.name}}', styles: { ...getDefaultStyles(), fontSize: 28, fontWeight: 700 } }] },
      { ...createBlock('column', 'Doc Info'), styles: { ...getDefaultStyles(), flex: '1', textAlign: 'right' }, children: [
        { ...createBlock('text', 'Title'), content: 'DOCUMENT', styles: { ...getDefaultStyles(), fontSize: 20, fontWeight: 600, color: '#6b7280', textAlign: 'right' } },
        { ...createBlock('field', 'Doc #'), fieldKey: 'record.name', content: '{{record.name}}', styles: { ...getDefaultStyles(), fontSize: 14, textAlign: 'right' } }
      ]}
    ]
  }, { ...createBlock('divider', 'Divider') }]
}]

export default function ReportTemplateEditorPage() {
  const { t } = useTranslation()
  const { colors, mode } = useTheme()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEditing = !!id

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'design' | 'preview' | 'settings'>('design')
  const [toast, setToast] = useState<{ text: string; state: "success" | "error" } | null>(null)
  const [blocks, setBlocks] = useState<Block[]>(DEFAULT_BLOCKS)
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)
  const [expandedLayers, setExpandedLayers] = useState<Set<string>>(new Set(['root']))
  const [history, setHistory] = useState<Block[][]>([DEFAULT_BLOCKS])
  const [historyIndex, setHistoryIndex] = useState(0)
  const [previewHtml, setPreviewHtml] = useState('')
  const [modelFields, setModelFields] = useState<ModelField[]>([])
  const [loadingFields, setLoadingFields] = useState(false)

  const [template, setTemplate] = useState<TemplateData>({
    template_key: '', template_name: '', description: '', category_id: null,
    report_type: 'custom', source_model: 'stock.picking', template_html: '',
    page_size: 'A4', page_orientation: 'portrait',
    margin_top: 20, margin_right: 15, margin_bottom: 20, margin_left: 15,
    is_default: false, blocks: DEFAULT_BLOCKS
  })

  useEffect(() => { if (isEditing) loadTemplate() }, [id])
  useEffect(() => { if (template.source_model) loadModelFields(template.source_model) }, [template.source_model])

  const getHeaders = () => getTenantHeaders()
  const showToast = (text: string, state: "success" | "error") => setToast({ text, state })

  const loadTemplate = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/reports/templates/${id}`, { headers: getHeaders() })
      const data = await res.json()
      if (data.success && data.template) {
        setTemplate(data.template)
        if (data.template.blocks) { setBlocks(data.template.blocks); setHistory([data.template.blocks]); setHistoryIndex(0) }
      } else { showToast("Template not found", "error"); navigate('/report-templates') }
    } catch { showToast("Failed to load template", "error") }
    finally { setLoading(false) }
  }

  const loadModelFields = async (modelName: string) => {
    setLoadingFields(true)
    try {
      const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/smart-fields/${encodeURIComponent(modelName)}/all`, { headers: getHeaders() })
      const data = await res.json()
      if (data.success && data.fields) setModelFields(data.fields)
    } catch { console.error("Failed to load fields") }
    finally { setLoadingFields(false) }
  }

  // HTML Generation
  const stylesToCss = (s: BlockStyles): string => {
    const css: string[] = []
    if (s.paddingTop || s.paddingRight || s.paddingBottom || s.paddingLeft) css.push(`padding: ${s.paddingTop}px ${s.paddingRight}px ${s.paddingBottom}px ${s.paddingLeft}px`)
    if (s.marginTop || s.marginRight || s.marginBottom || s.marginLeft) css.push(`margin: ${s.marginTop}px ${s.marginRight}px ${s.marginBottom}px ${s.marginLeft}px`)
    if (s.fontFamily) css.push(`font-family: ${s.fontFamily}`)
    if (s.fontSize) css.push(`font-size: ${s.fontSize}px`)
    if (s.fontWeight !== 400) css.push(`font-weight: ${s.fontWeight}`)
    if (s.fontStyle !== 'normal') css.push(`font-style: ${s.fontStyle}`)
    if (s.textDecoration !== 'none') css.push(`text-decoration: ${s.textDecoration}`)
    if (s.textAlign !== 'left') css.push(`text-align: ${s.textAlign}`)
    if (s.lineHeight !== 1.5) css.push(`line-height: ${s.lineHeight}`)
    if (s.color && s.color !== '#000000') css.push(`color: ${s.color}`)
    if (s.backgroundColor && s.backgroundColor !== 'transparent') css.push(`background-color: ${s.backgroundColor}`)
    if (s.borderWidth && s.borderStyle !== 'none') css.push(`border: ${s.borderWidth}px ${s.borderStyle} ${s.borderColor}`)
    if (s.borderRadius) css.push(`border-radius: ${s.borderRadius}px`)
    if (s.width !== 'auto') css.push(`width: ${s.width}`)
    if (s.height !== 'auto') css.push(`height: ${s.height}`)
    if (s.minHeight !== '0') css.push(`min-height: ${s.minHeight}`)
    if (s.display === 'flex') { css.push(`display: flex; flex-direction: ${s.flexDirection}`); if (s.justifyContent !== 'flex-start') css.push(`justify-content: ${s.justifyContent}`); if (s.alignItems !== 'flex-start') css.push(`align-items: ${s.alignItems}`); if (s.gap) css.push(`gap: ${s.gap}px`) }
    return css.join('; ')
  }

  const renderBlockHtml = (block: Block): string => {
    const style = stylesToCss(block.styles)
    const attr = style ? ` style="${style}"` : ''
    switch (block.type) {
      case 'section': case 'column': case 'row': return `<div${attr}>${block.children.map(renderBlockHtml).join('')}</div>`
      case 'text': return `<p${attr}>${block.content}</p>`
      case 'heading': return `<h${block.headingLevel}${attr}>${block.content}</h${block.headingLevel}>`
      case 'field': return `<span${attr}>{{${block.fieldKey || 'field'}}}</span>`
      case 'divider': return `<hr${attr} />`
      case 'spacer': return `<div${attr}></div>`
      case 'image': return `<img src="${block.imageUrl || '{{company.logo}}'}"${attr} />`
      case 'table': return `<table style="width:100%;border-collapse:collapse;${style}"><thead><tr>${block.tableColumns.map(c => `<th style="border:1px solid #ddd;padding:8px;background:#f5f5f5;">${c.label}</th>`).join('')}</tr></thead><tbody>{{#each ${block.loopVariable}}}<tr>${block.tableColumns.map(c => `<td style="border:1px solid #ddd;padding:8px;">{{${c.key}}}</td>`).join('')}</tr>{{/each}}</tbody></table>`
      case 'list': return `<${block.listType === 'number' ? 'ol' : 'ul'}${attr}>${block.listItems.map(i => `<li>${i}</li>`).join('')}</${block.listType === 'number' ? 'ol' : 'ul'}>`
      default: return `<div${attr}>${block.children.map(renderBlockHtml).join('')}</div>`
    }
  }

  const generateHtml = (blocks: Block[]): string => `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;font-size:12px;line-height:1.5}</style></head><body>${blocks.map(renderBlockHtml).join('')}</body></html>`

  // Block Operations
  const addToHistory = useCallback((newBlocks: Block[]) => {
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(JSON.parse(JSON.stringify(newBlocks)))
    setHistory(newHistory); setHistoryIndex(newHistory.length - 1); setBlocks(newBlocks)
  }, [history, historyIndex])

  const undo = () => { if (historyIndex > 0) { setHistoryIndex(historyIndex - 1); setBlocks(JSON.parse(JSON.stringify(history[historyIndex - 1]))) } }
  const redo = () => { if (historyIndex < history.length - 1) { setHistoryIndex(historyIndex + 1); setBlocks(JSON.parse(JSON.stringify(history[historyIndex + 1]))) } }

  const findBlock = (id: string, list: Block[]): Block | null => { for (const b of list) { if (b.id === id) return b; const f = findBlock(id, b.children); if (f) return f } return null }

  const updateBlockRecursive = (list: Block[], id: string, updates: Partial<Block>): Block[] => list.map(b => b.id === id ? { ...b, ...updates, styles: { ...b.styles, ...(updates.styles || {}) } } : { ...b, children: updateBlockRecursive(b.children, id, updates) })
  const updateBlock = (id: string, updates: Partial<Block>) => addToHistory(updateBlockRecursive(blocks, id, updates))
  const updateBlockStyles = (id: string, styleUpdates: Partial<BlockStyles>) => { const b = findBlock(id, blocks); if (b) updateBlock(id, { styles: { ...b.styles, ...styleUpdates } }) }

  const addBlock = (type: BlockType, parentId?: string | null) => {
    const newBlock = createBlock(type)
    if (!parentId) { addToHistory([...blocks, newBlock]) }
    else { const add = (list: Block[]): Block[] => list.map(b => b.id === parentId ? { ...b, children: [...b.children, newBlock] } : { ...b, children: add(b.children) }); addToHistory(add(blocks)) }
    setSelectedBlockId(newBlock.id); setExpandedLayers(prev => new Set([...prev, parentId || 'root']))
  }

  const deleteBlock = (id: string) => { const del = (list: Block[]): Block[] => list.filter(b => b.id !== id).map(b => ({ ...b, children: del(b.children) })); addToHistory(del(blocks)); if (selectedBlockId === id) setSelectedBlockId(null) }

  const moveBlock = (id: string, dir: 'up' | 'down') => {
    const move = (list: Block[]): Block[] => {
      const idx = list.findIndex(b => b.id === id)
      if (idx !== -1) { const newIdx = dir === 'up' ? idx - 1 : idx + 1; if (newIdx >= 0 && newIdx < list.length) { const n = [...list]; const [m] = n.splice(idx, 1); n.splice(newIdx, 0, m); return n } return list }
      return list.map(b => ({ ...b, children: move(b.children) }))
    }
    addToHistory(move(blocks))
  }

  const handleSave = async () => {
    if (!template.template_key || !template.template_name) { showToast("Template key and name are required", "error"); return }
    const html = generateHtml(blocks)
    setSaving(true)
    try {
      const url = isEditing ? `${API_CONFIG.BACKEND_BASE_URL}/reports/templates/${id}` : `${API_CONFIG.BACKEND_BASE_URL}/reports/templates`
      const res = await fetch(url, { method: isEditing ? 'PUT' : 'POST', headers: { ...getHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify({ ...template, template_html: html, blocks }) })
      const data = await res.json()
      if (data.success) { showToast(isEditing ? "Template updated" : "Template created", "success"); if (!isEditing && data.templateId) navigate(`/report-template-editor/${data.templateId}`) }
      else showToast(data.error || "Failed to save", "error")
    } catch { showToast("Failed to save template", "error") }
    finally { setSaving(false) }
  }

  const selectedBlock = selectedBlockId ? findBlock(selectedBlockId, blocks) : null

  const toolboxItems = [
    { type: 'section' as BlockType, icon: Box, label: 'Section' },
    { type: 'row' as BlockType, icon: Columns, label: 'Row' },
    { type: 'column' as BlockType, icon: Layout, label: 'Column' },
    { type: 'heading' as BlockType, icon: Heading1, label: 'Heading' },
    { type: 'text' as BlockType, icon: Type, label: 'Text' },
    { type: 'field' as BlockType, icon: Code, label: 'Field' },
    { type: 'image' as BlockType, icon: ImageIcon, label: 'Image' },
    { type: 'table' as BlockType, icon: TableIcon, label: 'Table' },
    { type: 'divider' as BlockType, icon: SeparatorHorizontal, label: 'Divider' },
    { type: 'spacer' as BlockType, icon: MoveVertical, label: 'Spacer' },
    { type: 'list' as BlockType, icon: List, label: 'List' },
    { type: 'barcode' as BlockType, icon: Barcode, label: 'Barcode' },
    { type: 'qrcode' as BlockType, icon: QrCode, label: 'QR Code' },
  ]

  const renderLayerItem = (block: Block, depth: number = 0): React.ReactElement => {
    const isSelected = selectedBlockId === block.id
    const isExpanded = expandedLayers.has(block.id)
    const Icon = toolboxItems.find(t => t.type === block.type)?.icon || Box
    return (
      <div key={block.id}>
        <div className={`flex items-center gap-1 px-2 py-1.5 rounded-lg cursor-pointer text-sm transition-all ${isSelected ? 'bg-blue-500 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`} style={{ paddingLeft: `${depth * 16 + 8}px` }} onClick={() => setSelectedBlockId(block.id)}>
          {block.children.length > 0 ? <button onClick={(e) => { e.stopPropagation(); setExpandedLayers(prev => { const n = new Set(prev); isExpanded ? n.delete(block.id) : n.add(block.id); return n }) }} className="p-0.5">{isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}</button> : <span className="w-4" />}
          <Icon className="w-3.5 h-3.5 opacity-60" />
          <span className="truncate flex-1 text-xs font-medium">{block.name}</span>
        </div>
        {block.children.length > 0 && isExpanded && block.children.map(c => renderLayerItem(c, depth + 1))}
      </div>
    )
  }

  const renderCanvasBlock = (block: Block): React.ReactElement => {
    const isSelected = selectedBlockId === block.id
    const canHaveChildren = ['section', 'row', 'column'].includes(block.type)
    const s = block.styles
    const blockStyle: React.CSSProperties = {
      padding: `${s.paddingTop}px ${s.paddingRight}px ${s.paddingBottom}px ${s.paddingLeft}px`,
      margin: `${s.marginTop}px ${s.marginRight}px ${s.marginBottom}px ${s.marginLeft}px`,
      fontFamily: s.fontFamily, fontSize: `${s.fontSize}px`, fontWeight: s.fontWeight, fontStyle: s.fontStyle,
      textDecoration: s.textDecoration, textAlign: s.textAlign, lineHeight: s.lineHeight, color: s.color,
      backgroundColor: s.backgroundColor === 'transparent' ? undefined : s.backgroundColor,
      border: s.borderWidth && s.borderStyle !== 'none' ? `${s.borderWidth}px ${s.borderStyle} ${s.borderColor}` : isSelected ? '2px solid #3b82f6' : '1px dashed transparent',
      borderRadius: `${s.borderRadius}px`, display: s.display as any, flexDirection: s.flexDirection as any,
      justifyContent: s.justifyContent as any, alignItems: s.alignItems as any, gap: `${s.gap}px`,
      width: s.width, height: s.height, minHeight: s.minHeight || (canHaveChildren ? '40px' : undefined),
      flex: s.flex, position: 'relative', cursor: 'pointer', transition: 'all 0.15s ease',
    }
    if (!isSelected && canHaveChildren) blockStyle.border = '1px dashed #d1d5db'

    return (
      <div key={block.id} style={blockStyle} className={`group ${isSelected ? 'ring-2 ring-blue-500 ring-offset-1' : 'hover:ring-1 hover:ring-blue-300'}`} onClick={(e) => { e.stopPropagation(); setSelectedBlockId(block.id) }}>
        {isSelected && <div className="absolute -top-6 left-0 bg-blue-500 text-white text-[10px] px-2 py-0.5 rounded-t font-bold uppercase tracking-wider z-10">{block.type}</div>}
        {block.type === 'text' && <span>{block.content}</span>}
        {block.type === 'heading' && <span>{block.content}</span>}
        {block.type === 'field' && <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-mono border border-blue-200">{block.fieldKey || '{{field}}'}</span>}
        {block.type === 'divider' && <hr style={{ border: 'none', borderTop: `${s.borderWidth}px ${s.borderStyle} ${s.borderColor}` }} />}
        {block.type === 'spacer' && <div style={{ height: s.height }} />}
        {block.type === 'image' && <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center p-4 text-gray-400"><ImageIcon className="w-8 h-8" /><span className="ml-2 text-sm">Image</span></div>}
        {block.type === 'table' && <div className="border rounded overflow-hidden"><table className="w-full text-xs"><thead className="bg-gray-100"><tr>{block.tableColumns.map((c, i) => <th key={i} className="border px-2 py-1 text-left font-medium">{c.label}</th>)}</tr></thead><tbody><tr className="text-gray-400 italic">{block.tableColumns.map((c, i) => <td key={i} className="border px-2 py-1">{`{{${c.key}}}`}</td>)}</tr></tbody></table></div>}
        {block.type === 'list' && <ul className="list-disc list-inside text-sm">{block.listItems.slice(0, 3).map((item, i) => <li key={i}>{item}</li>)}</ul>}
        {(block.type === 'barcode' || block.type === 'qrcode') && <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center p-4 text-gray-400">{block.type === 'barcode' ? <Barcode className="w-8 h-8" /> : <QrCode className="w-8 h-8" />}<span className="ml-2 text-sm">{block.type === 'barcode' ? 'Barcode' : 'QR Code'}</span></div>}
        {canHaveChildren && block.children.map(c => renderCanvasBlock(c))}
        {canHaveChildren && block.children.length === 0 && <div className="flex items-center justify-center h-full min-h-[32px] text-gray-400 text-xs opacity-0 group-hover:opacity-100 transition-opacity">Drop elements here</div>}
      </div>
    )
  }

  // Properties Panel - Part 2 in next edit
  const renderPropertiesPanel = () => {
    if (!selectedBlock) return <div className="flex flex-col items-center justify-center h-full text-center p-8 opacity-50"><Layers className="w-16 h-16 mb-4 opacity-30" /><p className="text-sm font-medium">Select an element</p></div>
    const s = selectedBlock.styles
    return (
      <div className="p-4 space-y-5 text-sm overflow-y-auto h-full">
        <div><label className="block text-xs font-bold uppercase tracking-wider mb-2 opacity-50">Name</label><input type="text" value={selectedBlock.name} onChange={(e) => updateBlock(selectedBlock.id, { name: e.target.value })} className="w-full px-3 py-2 rounded-lg text-sm" style={{ backgroundColor: colors.mutedBg, border: `1px solid ${colors.border}` }} /></div>
        
        {(selectedBlock.type === 'text' || selectedBlock.type === 'heading') && <div><label className="block text-xs font-bold uppercase tracking-wider mb-2 opacity-50">Content</label><textarea value={selectedBlock.content} onChange={(e) => updateBlock(selectedBlock.id, { content: e.target.value })} rows={3} className="w-full px-3 py-2 rounded-lg text-sm resize-none" style={{ backgroundColor: colors.mutedBg, border: `1px solid ${colors.border}` }} /></div>}
        
        {selectedBlock.type === 'heading' && <div><label className="block text-xs font-bold uppercase tracking-wider mb-2 opacity-50">Level</label><div className="flex gap-1">{[1, 2, 3, 4, 5, 6].map(l => <button key={l} onClick={() => updateBlock(selectedBlock.id, { headingLevel: l as any })} className={`flex-1 py-2 rounded-lg text-xs font-bold ${selectedBlock.headingLevel === l ? 'bg-blue-500 text-white' : ''}`} style={selectedBlock.headingLevel !== l ? { backgroundColor: colors.mutedBg } : {}}>H{l}</button>)}</div></div>}
        
        {selectedBlock.type === 'field' && <div className="space-y-3"><div><label className="block text-xs font-bold uppercase tracking-wider mb-2 opacity-50">Model</label><select value={selectedBlock.fieldModel || template.source_model} onChange={(e) => { updateBlock(selectedBlock.id, { fieldModel: e.target.value }); loadModelFields(e.target.value) }} className="w-full px-3 py-2 rounded-lg text-sm" style={{ backgroundColor: colors.mutedBg, border: `1px solid ${colors.border}` }}>{SOURCE_MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}</select></div><div><label className="block text-xs font-bold uppercase tracking-wider mb-2 opacity-50">Field</label>{loadingFields ? <div className="text-xs opacity-50 py-2">Loading...</div> : <select value={selectedBlock.fieldKey} onChange={(e) => updateBlock(selectedBlock.id, { fieldKey: e.target.value, content: `{{${e.target.value}}}` })} className="w-full px-3 py-2 rounded-lg text-sm" style={{ backgroundColor: colors.mutedBg, border: `1px solid ${colors.border}` }}><option value="">Select field...</option><optgroup label="Common"><option value="record.name">Record Name</option><option value="record.date">Record Date</option><option value="company.name">Company Name</option><option value="partner.name">Partner Name</option></optgroup>{modelFields.length > 0 && <optgroup label="Model Fields">{modelFields.map(f => <option key={f.id} value={`record.${f.field_name}`}>{f.field_label || f.field_name}</option>)}</optgroup>}</select>}</div></div>}
        
        {selectedBlock.type === 'table' && <div className="space-y-3"><div><label className="block text-xs font-bold uppercase tracking-wider mb-2 opacity-50">Loop Variable</label><input type="text" value={selectedBlock.loopVariable} onChange={(e) => updateBlock(selectedBlock.id, { loopVariable: e.target.value })} placeholder="e.g. lines" className="w-full px-3 py-2 rounded-lg text-sm" style={{ backgroundColor: colors.mutedBg, border: `1px solid ${colors.border}` }} /></div><div><label className="block text-xs font-bold uppercase tracking-wider mb-2 opacity-50">Columns</label>{selectedBlock.tableColumns.map((col, idx) => <div key={idx} className="flex gap-2 mb-2"><input type="text" value={col.key} onChange={(e) => { const cols = [...selectedBlock.tableColumns]; cols[idx] = { ...cols[idx], key: e.target.value }; updateBlock(selectedBlock.id, { tableColumns: cols }) }} placeholder="Key" className="flex-1 px-2 py-1.5 rounded text-xs" style={{ backgroundColor: colors.mutedBg, border: `1px solid ${colors.border}` }} /><input type="text" value={col.label} onChange={(e) => { const cols = [...selectedBlock.tableColumns]; cols[idx] = { ...cols[idx], label: e.target.value }; updateBlock(selectedBlock.id, { tableColumns: cols }) }} placeholder="Label" className="flex-1 px-2 py-1.5 rounded text-xs" style={{ backgroundColor: colors.mutedBg, border: `1px solid ${colors.border}` }} /><button onClick={() => updateBlock(selectedBlock.id, { tableColumns: selectedBlock.tableColumns.filter((_, i) => i !== idx) })} className="p-1.5 rounded text-red-500 hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></button></div>)}<button onClick={() => updateBlock(selectedBlock.id, { tableColumns: [...selectedBlock.tableColumns, { key: '', label: '', width: 'auto' }] })} className="w-full py-1.5 rounded text-xs font-medium text-blue-500 hover:bg-blue-50 border border-dashed border-blue-300">+ Add Column</button></div></div>}

        <div className="h-px" style={{ backgroundColor: colors.border }} />
        
        {['text', 'heading', 'field'].includes(selectedBlock.type) && <>
          <div><label className="block text-xs font-bold uppercase tracking-wider mb-3 opacity-50">Typography</label>
            <div className="grid grid-cols-2 gap-3 mb-3"><div><label className="block text-[10px] uppercase tracking-wider mb-1 opacity-50">Font</label><select value={s.fontFamily} onChange={(e) => updateBlockStyles(selectedBlock.id, { fontFamily: e.target.value })} className="w-full px-2 py-1.5 rounded text-xs" style={{ backgroundColor: colors.mutedBg, border: `1px solid ${colors.border}` }}>{FONT_FAMILIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}</select></div><div><label className="block text-[10px] uppercase tracking-wider mb-1 opacity-50">Size</label><input type="number" value={s.fontSize} onChange={(e) => updateBlockStyles(selectedBlock.id, { fontSize: Number(e.target.value) })} className="w-full px-2 py-1.5 rounded text-xs" style={{ backgroundColor: colors.mutedBg, border: `1px solid ${colors.border}` }} /></div></div>
            <div className="grid grid-cols-2 gap-3 mb-3"><div><label className="block text-[10px] uppercase tracking-wider mb-1 opacity-50">Weight</label><select value={s.fontWeight} onChange={(e) => updateBlockStyles(selectedBlock.id, { fontWeight: Number(e.target.value) })} className="w-full px-2 py-1.5 rounded text-xs" style={{ backgroundColor: colors.mutedBg, border: `1px solid ${colors.border}` }}>{FONT_WEIGHTS.map(w => <option key={w.value} value={w.value}>{w.label}</option>)}</select></div><div><label className="block text-[10px] uppercase tracking-wider mb-1 opacity-50">Line Height</label><input type="number" step="0.1" value={s.lineHeight} onChange={(e) => updateBlockStyles(selectedBlock.id, { lineHeight: Number(e.target.value) })} className="w-full px-2 py-1.5 rounded text-xs" style={{ backgroundColor: colors.mutedBg, border: `1px solid ${colors.border}` }} /></div></div>
            <div className="flex gap-1 mb-3"><button onClick={() => updateBlockStyles(selectedBlock.id, { fontWeight: s.fontWeight >= 700 ? 400 : 700 })} className={`flex-1 py-2 rounded-lg ${s.fontWeight >= 700 ? 'bg-blue-500 text-white' : ''}`} style={s.fontWeight < 700 ? { backgroundColor: colors.mutedBg } : {}}><Bold className="w-4 h-4 mx-auto" /></button><button onClick={() => updateBlockStyles(selectedBlock.id, { fontStyle: s.fontStyle === 'italic' ? 'normal' : 'italic' })} className={`flex-1 py-2 rounded-lg ${s.fontStyle === 'italic' ? 'bg-blue-500 text-white' : ''}`} style={s.fontStyle !== 'italic' ? { backgroundColor: colors.mutedBg } : {}}><Italic className="w-4 h-4 mx-auto" /></button><button onClick={() => updateBlockStyles(selectedBlock.id, { textDecoration: s.textDecoration === 'underline' ? 'none' : 'underline' })} className={`flex-1 py-2 rounded-lg ${s.textDecoration === 'underline' ? 'bg-blue-500 text-white' : ''}`} style={s.textDecoration !== 'underline' ? { backgroundColor: colors.mutedBg } : {}}><Underline className="w-4 h-4 mx-auto" /></button></div>
            <div className="flex gap-1">{(['left', 'center', 'right', 'justify'] as const).map(a => { const I = a === 'left' ? AlignLeft : a === 'center' ? AlignCenter : a === 'right' ? AlignRight : AlignJustify; return <button key={a} onClick={() => updateBlockStyles(selectedBlock.id, { textAlign: a })} className={`flex-1 py-2 rounded-lg ${s.textAlign === a ? 'bg-blue-500 text-white' : ''}`} style={s.textAlign !== a ? { backgroundColor: colors.mutedBg } : {}}><I className="w-4 h-4 mx-auto" /></button> })}</div>
          </div>
          <div className="h-px" style={{ backgroundColor: colors.border }} />
        </>}
        
        <div><label className="block text-xs font-bold uppercase tracking-wider mb-3 opacity-50">Colors</label><div className="grid grid-cols-2 gap-3"><div><label className="block text-[10px] uppercase tracking-wider mb-1 opacity-50">Text</label><input type="color" value={s.color} onChange={(e) => updateBlockStyles(selectedBlock.id, { color: e.target.value })} className="w-full h-10 rounded-lg cursor-pointer border-0" /></div><div><label className="block text-[10px] uppercase tracking-wider mb-1 opacity-50">Background</label><input type="color" value={s.backgroundColor === 'transparent' ? '#ffffff' : s.backgroundColor} onChange={(e) => updateBlockStyles(selectedBlock.id, { backgroundColor: e.target.value })} className="w-full h-10 rounded-lg cursor-pointer border-0" /></div></div></div>
        
        <div className="h-px" style={{ backgroundColor: colors.border }} />
        
        <div><label className="block text-xs font-bold uppercase tracking-wider mb-3 opacity-50">Spacing</label><div className="mb-3"><label className="block text-[10px] uppercase tracking-wider mb-1 opacity-50">Padding (T R B L)</label><div className="grid grid-cols-4 gap-1">{(['Top', 'Right', 'Bottom', 'Left'] as const).map(side => <input key={side} type="number" value={(s as any)[`padding${side}`]} onChange={(e) => updateBlockStyles(selectedBlock.id, { [`padding${side}`]: Number(e.target.value) } as any)} className="w-full px-2 py-1.5 rounded text-xs text-center" style={{ backgroundColor: colors.mutedBg, border: `1px solid ${colors.border}` }} />)}</div></div><div><label className="block text-[10px] uppercase tracking-wider mb-1 opacity-50">Margin (T R B L)</label><div className="grid grid-cols-4 gap-1">{(['Top', 'Right', 'Bottom', 'Left'] as const).map(side => <input key={side} type="number" value={(s as any)[`margin${side}`]} onChange={(e) => updateBlockStyles(selectedBlock.id, { [`margin${side}`]: Number(e.target.value) } as any)} className="w-full px-2 py-1.5 rounded text-xs text-center" style={{ backgroundColor: colors.mutedBg, border: `1px solid ${colors.border}` }} />)}</div></div></div>
        
        <div className="h-px" style={{ backgroundColor: colors.border }} />
        
        <div><label className="block text-xs font-bold uppercase tracking-wider mb-3 opacity-50">Border</label><div className="grid grid-cols-2 gap-3 mb-3"><div><label className="block text-[10px] uppercase tracking-wider mb-1 opacity-50">Width</label><input type="number" value={s.borderWidth} onChange={(e) => updateBlockStyles(selectedBlock.id, { borderWidth: Number(e.target.value) })} className="w-full px-2 py-1.5 rounded text-xs" style={{ backgroundColor: colors.mutedBg, border: `1px solid ${colors.border}` }} /></div><div><label className="block text-[10px] uppercase tracking-wider mb-1 opacity-50">Style</label><select value={s.borderStyle} onChange={(e) => updateBlockStyles(selectedBlock.id, { borderStyle: e.target.value as any })} className="w-full px-2 py-1.5 rounded text-xs" style={{ backgroundColor: colors.mutedBg, border: `1px solid ${colors.border}` }}><option value="none">None</option><option value="solid">Solid</option><option value="dashed">Dashed</option><option value="dotted">Dotted</option></select></div></div><div className="grid grid-cols-2 gap-3"><div><label className="block text-[10px] uppercase tracking-wider mb-1 opacity-50">Color</label><input type="color" value={s.borderColor} onChange={(e) => updateBlockStyles(selectedBlock.id, { borderColor: e.target.value })} className="w-full h-8 rounded cursor-pointer border-0" /></div><div><label className="block text-[10px] uppercase tracking-wider mb-1 opacity-50">Radius</label><input type="number" value={s.borderRadius} onChange={(e) => updateBlockStyles(selectedBlock.id, { borderRadius: Number(e.target.value) })} className="w-full px-2 py-1.5 rounded text-xs" style={{ backgroundColor: colors.mutedBg, border: `1px solid ${colors.border}` }} /></div></div></div>
        
        <div className="h-px" style={{ backgroundColor: colors.border }} />
        
        <div className="flex gap-2"><button onClick={() => moveBlock(selectedBlock.id, 'up')} className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-medium" style={{ backgroundColor: colors.mutedBg }}><ChevronUp className="w-4 h-4" />Up</button><button onClick={() => moveBlock(selectedBlock.id, 'down')} className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-medium" style={{ backgroundColor: colors.mutedBg }}><ChevronDown className="w-4 h-4" />Down</button></div>
        <button onClick={() => deleteBlock(selectedBlock.id)} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50"><Trash2 className="w-4 h-4" />Delete</button>
      </div>
    )
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: colors.background }}><div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: colors.action, borderTopColor: 'transparent' }} /></div>

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ backgroundColor: colors.background, color: colors.textPrimary }}>
      {/* Header */}
      <div className="h-14 border-b flex items-center justify-between px-4 shrink-0 z-20" style={{ borderColor: colors.border, backgroundColor: colors.card }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/report-templates')} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"><ArrowLeft className="w-5 h-5" /></button>
          <div><h1 className="text-sm font-bold">{isEditing ? 'Edit Template' : 'Create Template'}</h1>{template.template_name && <p className="text-xs opacity-50">{template.template_name}</p>}</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex p-1 rounded-lg mr-2" style={{ backgroundColor: colors.mutedBg }}>
            <button onClick={() => setActiveTab('design')} className={`px-3 py-1.5 rounded text-xs font-bold ${activeTab === 'design' ? 'bg-white dark:bg-gray-700 shadow-sm' : 'opacity-60'}`}>Design</button>
            <button onClick={() => { setPreviewHtml(generateHtml(blocks)); setActiveTab('preview') }} className={`px-3 py-1.5 rounded text-xs font-bold ${activeTab === 'preview' ? 'bg-white dark:bg-gray-700 shadow-sm' : 'opacity-60'}`}>Preview</button>
            <button onClick={() => setActiveTab('settings')} className={`px-3 py-1.5 rounded text-xs font-bold ${activeTab === 'settings' ? 'bg-white dark:bg-gray-700 shadow-sm' : 'opacity-60'}`}>Settings</button>
          </div>
          <button onClick={undo} disabled={historyIndex <= 0} className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30"><Undo className="w-4 h-4" /></button>
          <button onClick={redo} disabled={historyIndex >= history.length - 1} className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30"><Redo className="w-4 h-4" /></button>
          <div className="w-px h-6 mx-1" style={{ backgroundColor: colors.border }} />
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold text-white" style={{ backgroundColor: colors.action }}><Save className="w-4 h-4" />{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex overflow-hidden">
        {activeTab === 'design' && <>
          {/* Toolbox */}
          <div className="w-56 border-r flex flex-col shrink-0" style={{ borderColor: colors.border, backgroundColor: colors.card }}>
            <div className="p-3 border-b" style={{ borderColor: colors.border }}><h2 className="text-xs font-bold uppercase tracking-wider opacity-50">Toolbox</h2></div>
            <div className="p-2 grid grid-cols-2 gap-1.5 overflow-y-auto">
              {toolboxItems.map(item => <button key={item.type} onClick={() => addBlock(item.type, selectedBlockId)} className="flex flex-col items-center justify-center p-2.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-transparent hover:border-blue-200 transition-all gap-1" style={{ backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}><item.icon className="w-4 h-4 opacity-60" /><span className="text-[10px] font-medium">{item.label}</span></button>)}
            </div>
            <div className="flex-1 border-t overflow-y-auto p-2" style={{ borderColor: colors.border }}>
              <h2 className="text-xs font-bold uppercase tracking-wider opacity-50 mb-2 px-1">Layers</h2>
              {blocks.map(b => renderLayerItem(b))}
            </div>
          </div>

          {/* Canvas */}
          <div className="flex-1 bg-gray-100 dark:bg-gray-900 overflow-auto flex items-start justify-center p-6" onClick={() => setSelectedBlockId(null)}>
            <div className="bg-white shadow-xl" style={{ width: '210mm', minHeight: '297mm', padding: 0 }}>{blocks.map(b => renderCanvasBlock(b))}</div>
          </div>

          {/* Properties */}
          <div className="w-72 border-l flex flex-col shrink-0" style={{ borderColor: colors.border, backgroundColor: colors.card }}>
            <div className="p-3 border-b" style={{ borderColor: colors.border }}><h2 className="text-xs font-bold uppercase tracking-wider opacity-50">Properties</h2></div>
            {renderPropertiesPanel()}
          </div>
        </>}

        {activeTab === 'preview' && <div className="flex-1 bg-gray-100 dark:bg-gray-900 overflow-auto flex justify-center p-6"><div className="bg-white shadow-xl" style={{ width: '210mm', minHeight: '297mm' }}><iframe srcDoc={previewHtml} className="w-full h-full min-h-[297mm] border-none" title="Preview" /></div></div>}

        {activeTab === 'settings' && <div className="flex-1 overflow-y-auto p-6"><div className="max-w-xl mx-auto space-y-6">
          <div className="rounded-xl p-5" style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }}><h3 className="text-lg font-semibold mb-4">Basic Information</h3><div className="space-y-4"><div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium mb-1.5 opacity-70">Template Key *</label><input type="text" value={template.template_key} onChange={(e) => setTemplate({ ...template, template_key: e.target.value.toLowerCase().replace(/\s+/g, '_') })} className="w-full px-4 py-2.5 rounded-xl text-sm" style={{ backgroundColor: colors.mutedBg, border: `1px solid ${colors.border}` }} /></div><div><label className="block text-sm font-medium mb-1.5 opacity-70">Template Name *</label><input type="text" value={template.template_name} onChange={(e) => setTemplate({ ...template, template_name: e.target.value })} className="w-full px-4 py-2.5 rounded-xl text-sm" style={{ backgroundColor: colors.mutedBg, border: `1px solid ${colors.border}` }} /></div></div><div><label className="block text-sm font-medium mb-1.5 opacity-70">Description</label><textarea value={template.description} onChange={(e) => setTemplate({ ...template, description: e.target.value })} rows={2} className="w-full px-4 py-2.5 rounded-xl text-sm resize-none" style={{ backgroundColor: colors.mutedBg, border: `1px solid ${colors.border}` }} /></div><div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium mb-1.5 opacity-70">Source Model</label><select value={template.source_model} onChange={(e) => setTemplate({ ...template, source_model: e.target.value })} className="w-full px-4 py-2.5 rounded-xl text-sm" style={{ backgroundColor: colors.mutedBg, border: `1px solid ${colors.border}` }}>{SOURCE_MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}</select></div><div><label className="block text-sm font-medium mb-1.5 opacity-70">Report Type</label><select value={template.report_type} onChange={(e) => setTemplate({ ...template, report_type: e.target.value })} className="w-full px-4 py-2.5 rounded-xl text-sm" style={{ backgroundColor: colors.mutedBg, border: `1px solid ${colors.border}` }}>{REPORT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div></div></div></div>
          <div className="rounded-xl p-5" style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }}><h3 className="text-lg font-semibold mb-4">Page Settings</h3><div className="grid grid-cols-2 gap-4 mb-4"><div><label className="block text-sm font-medium mb-1.5 opacity-70">Page Size</label><select value={template.page_size} onChange={(e) => setTemplate({ ...template, page_size: e.target.value })} className="w-full px-4 py-2.5 rounded-xl text-sm" style={{ backgroundColor: colors.mutedBg, border: `1px solid ${colors.border}` }}>{['A4', 'A5', 'Letter', 'Legal'].map(s => <option key={s} value={s}>{s}</option>)}</select></div><div><label className="block text-sm font-medium mb-1.5 opacity-70">Orientation</label><select value={template.page_orientation} onChange={(e) => setTemplate({ ...template, page_orientation: e.target.value })} className="w-full px-4 py-2.5 rounded-xl text-sm" style={{ backgroundColor: colors.mutedBg, border: `1px solid ${colors.border}` }}><option value="portrait">Portrait</option><option value="landscape">Landscape</option></select></div></div><div className="grid grid-cols-4 gap-4"><div><label className="block text-sm font-medium mb-1.5 opacity-70">Top</label><input type="number" value={template.margin_top} onChange={(e) => setTemplate({ ...template, margin_top: Number(e.target.value) })} className="w-full px-4 py-2.5 rounded-xl text-sm" style={{ backgroundColor: colors.mutedBg, border: `1px solid ${colors.border}` }} /></div><div><label className="block text-sm font-medium mb-1.5 opacity-70">Right</label><input type="number" value={template.margin_right} onChange={(e) => setTemplate({ ...template, margin_right: Number(e.target.value) })} className="w-full px-4 py-2.5 rounded-xl text-sm" style={{ backgroundColor: colors.mutedBg, border: `1px solid ${colors.border}` }} /></div><div><label className="block text-sm font-medium mb-1.5 opacity-70">Bottom</label><input type="number" value={template.margin_bottom} onChange={(e) => setTemplate({ ...template, margin_bottom: Number(e.target.value) })} className="w-full px-4 py-2.5 rounded-xl text-sm" style={{ backgroundColor: colors.mutedBg, border: `1px solid ${colors.border}` }} /></div><div><label className="block text-sm font-medium mb-1.5 opacity-70">Left</label><input type="number" value={template.margin_left} onChange={(e) => setTemplate({ ...template, margin_left: Number(e.target.value) })} className="w-full px-4 py-2.5 rounded-xl text-sm" style={{ backgroundColor: colors.mutedBg, border: `1px solid ${colors.border}` }} /></div></div></div>
        </div></div>}
      </div>

      {toast && <Toast text={toast.text} state={toast.state} onClose={() => setToast(null)} />}
    </div>
  )
}
