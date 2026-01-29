/**
 * XML Template Builder Types
 * TypeScript interfaces for the template builder feature
 */

// ============================================================
// Document Types
// ============================================================

export type DocumentType =
  | 'delivery_note'
  | 'goods_receipt'
  | 'internal_transfer'
  | 'pick_list'
  | 'stock_summary'
  | 'stock_card'
  | 'physical_count_sheet'
  | 'stock_adjustments'
  | 'transfers_list'
  | 'scrap_document';

export interface DocumentTypeInfo {
  key: DocumentType;
  name: string;
  model: string;
}

// ============================================================
// Template
// ============================================================

export interface XmlTemplate {
  id: number;
  template_key: string;
  template_name: string;
  description?: string;
  document_type: DocumentType;
  xml_content: string;
  date_format: string;
  currency_symbol: string;
  default_decimal_precision: number;
  is_favorite: boolean;
  last_used_at?: string;
  last_used_record_id?: number;
  locked_by?: number;
  locked_at?: string;
  created_by: number;
  created_at: string;
  updated_by?: number;
  updated_at: string;
  translations?: Record<string, { en: string; ar: string }>;
}

export interface XmlTemplateListItem {
  id: number;
  template_key: string;
  template_name: string;
  description?: string;
  document_type: DocumentType;
  is_favorite: boolean;
  last_used_at?: string;
  locked_by?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateTemplateInput {
  template_key: string;
  template_name: string;
  description?: string;
  document_type: DocumentType;
  xml_content?: string;
  date_format?: string;
  currency_symbol?: string;
  default_decimal_precision?: number;
  translations?: Record<string, { en: string; ar: string }>;
}

export interface UpdateTemplateInput {
  template_name?: string;
  description?: string;
  xml_content?: string;
  date_format?: string;
  currency_symbol?: string;
  default_decimal_precision?: number;
  translations?: Record<string, { en: string; ar: string }>;
}

// ============================================================
// Template Components
// ============================================================

export type ComponentType =
  | 'logo'
  | 'title'
  | 'documentNumber'
  | 'date'
  | 'companyInfo'
  | 'recipientInfo'
  | 'textBlock'
  | 'field'
  | 'table'
  | 'image'
  | 'line'
  | 'spacer'
  | 'barcode'
  | 'qrcode'
  | 'pageBreak'
  | 'twoColumn'
  | 'infoBox'
  | 'signatureBox'
  | 'pageNumber'
  | 'generatedDate'
  | 'staticText';

export type SectionType = 'header' | 'body' | 'footer';

export interface TemplateComponent {
  id: string;
  type: ComponentType;
  section: SectionType;
  props: Record<string, unknown>;
  order: number;
}

export interface BilingualText {
  en: string;
  ar: string;
}

export interface TextStyle {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  fontSize?: number;
  color?: string;
}

export interface TableColumn {
  field: string;
  type?: 'text' | 'number' | 'date';
  precision?: number;
  header: BilingualText;
}

export interface SignatureConfig {
  label: BilingualText;
  stamp?: {
    libraryRef: string;
  };
}

// Component Props Types
export interface LogoProps {
  libraryRef: string;
}

export interface TitleProps {
  text: BilingualText;
  style?: TextStyle;
}

export interface TextBlockProps {
  text: BilingualText;
  style?: TextStyle;
}

export interface FieldProps {
  path: string;
  type?: 'text' | 'number' | 'date';
  precision?: number;
}

export interface DateFieldProps {
  field: string;
  format?: string;
}

export interface TableProps {
  source: string;
  columns: TableColumn[];
  emptyMessage?: string;
}

export interface LineProps {
  width?: number;
  color?: string;
  style?: 'solid' | 'dashed' | 'dotted';
}

export interface SpacerProps {
  size: 'small' | 'medium' | 'large';
}

export interface TwoColumnProps {
  ratio: string;
  left: TemplateComponent[];
  right: TemplateComponent[];
}

export interface InfoBoxProps {
  border?: string;
  background?: string;
  padding?: string;
  children: TemplateComponent[];
}

export interface SignatureBoxProps {
  label: BilingualText;
  stamp?: {
    libraryRef: string;
  };
}

// ============================================================
// Assets
// ============================================================

export interface Logo {
  id: number;
  name: string;
  image_type: string;
  image_size: number;
  created_by: number;
  created_at: string;
  dataUrl?: string;
}

export interface Stamp {
  id: number;
  name: string;
  image_type: string;
  image_size: number;
  created_by: number;
  created_at: string;
  dataUrl?: string;
}

export interface UploadAssetInput {
  name: string;
  image_data: string; // base64
  image_type: string;
  image_size?: number;
}

// ============================================================
// Blocks
// ============================================================

export interface TemplateBlock {
  id: number;
  block_name: string;
  block_type: string;
  xml_content: string;
  is_shared: boolean;
  created_by: number;
  created_at: string;
}

export interface CreateBlockInput {
  block_name: string;
  block_type: string;
  xml_content: string;
  is_shared?: boolean;
}

// ============================================================
// Roles & Permissions
// ============================================================

export interface TemplateRole {
  id: number;
  role_name: string;
  role_key: string;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_generate: boolean;
  can_view: boolean;
  created_at: string;
}

export interface UserPermissions {
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_generate: boolean;
  can_view: boolean;
  roles: Array<{
    id: number;
    name: string;
    key: string;
  }>;
}

export interface CreateRoleInput {
  role_name: string;
  role_key: string;
  can_create?: boolean;
  can_edit?: boolean;
  can_delete?: boolean;
  can_generate?: boolean;
  can_view?: boolean;
}

// ============================================================
// Autosave
// ============================================================

export interface Autosave {
  id: number;
  template_id?: number;
  user_id: number;
  xml_content: string;
  template_name?: string;
  document_type?: DocumentType;
  saved_at: string;
}

export interface AutosaveInput {
  template_id?: number;
  xml_content: string;
  template_name?: string;
  document_type?: DocumentType;
}

// ============================================================
// Builder State
// ============================================================

export interface BuilderState {
  template: XmlTemplate | null;
  components: {
    header: TemplateComponent[];
    body: TemplateComponent[];
    footer: TemplateComponent[];
  };
  selectedComponentId: string | null;
  isDirty: boolean;
  isLocked: boolean;
  previewLanguage: 'en' | 'ar';
  zoom: number;
  history: HistoryEntry[];
  historyIndex: number;
}

export interface HistoryEntry {
  timestamp: number;
  components: BuilderState['components'];
  description: string;
}

// ============================================================
// Field Picker
// ============================================================

export interface FieldDefinition {
  path: string;
  name: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'many2one' | 'one2many' | 'many2many';
  relation?: string;
  children?: FieldDefinition[];
}

export interface FieldTree {
  model: string;
  fields: FieldDefinition[];
}

// ============================================================
// API Responses
// ============================================================

export interface ApiResponse<T> {
  success: boolean;
  error?: string;
  data?: T;
}

export interface ListResponse<T> {
  success: boolean;
  templates?: T[];
  logos?: T[];
  stamps?: T[];
  blocks?: T[];
  roles?: T[];
}

export interface CreateResponse {
  success: boolean;
  templateId?: number;
  logoId?: number;
  stampId?: number;
  blockId?: number;
  roleId?: number;
  message?: string;
  error?: string;
}

// ============================================================
// Filter & Sort Options
// ============================================================

export interface TemplateFilters {
  documentType?: DocumentType;
  search?: string;
  createdBy?: number;
}

export interface TemplateSortOptions {
  sortBy: 'template_name' | 'created_at' | 'updated_at' | 'last_used_at';
  sortOrder: 'ASC' | 'DESC';
}

// ============================================================
// Wizard Steps
// ============================================================

export interface WizardStep1Data {
  template_name: string;
  description?: string;
  document_type: DocumentType;
}

export interface WizardStep2Data {
  date_format: string;
  currency_symbol: string;
  default_decimal_precision: number;
}

export type WizardData = WizardStep1Data & WizardStep2Data;

// ============================================================
// Component Palette
// ============================================================

export interface PaletteItem {
  type: ComponentType;
  label: string;
  labelAr: string;
  icon: string;
  section: SectionType | 'any';
  description: string;
  defaultProps: Record<string, unknown>;
}

export const HEADER_COMPONENTS: PaletteItem[] = [
  {
    type: 'logo',
    label: 'Logo',
    labelAr: 'شعار',
    icon: 'Image',
    section: 'header',
    description: 'Company logo from library',
    defaultProps: { libraryRef: '' }
  },
  {
    type: 'title',
    label: 'Document Title',
    labelAr: 'عنوان المستند',
    icon: 'Type',
    section: 'header',
    description: 'Main document title',
    defaultProps: { text: { en: '', ar: '' }, style: { bold: true, fontSize: 24 } }
  },
  {
    type: 'documentNumber',
    label: 'Document Number',
    labelAr: 'رقم المستند',
    icon: 'Hash',
    section: 'header',
    description: 'Auto-filled document reference',
    defaultProps: { field: 'name' }
  },
  {
    type: 'date',
    label: 'Date Field',
    labelAr: 'حقل التاريخ',
    icon: 'Calendar',
    section: 'header',
    description: 'Date display',
    defaultProps: { field: 'scheduled_date' }
  },
  {
    type: 'companyInfo',
    label: 'Company Address',
    labelAr: 'عنوان الشركة',
    icon: 'Building2',
    section: 'header',
    description: 'Company information block',
    defaultProps: { fields: [] }
  },
  {
    type: 'recipientInfo',
    label: 'Recipient Address',
    labelAr: 'عنوان المستلم',
    icon: 'User',
    section: 'header',
    description: 'Customer/Partner information',
    defaultProps: { fields: [] }
  }
];

export const BODY_COMPONENTS: PaletteItem[] = [
  {
    type: 'textBlock',
    label: 'Text Block',
    labelAr: 'نص',
    icon: 'FileText',
    section: 'body',
    description: 'Static or formatted text',
    defaultProps: { text: { en: '', ar: '' }, style: {} }
  },
  {
    type: 'field',
    label: 'Data Field',
    labelAr: 'حقل بيانات',
    icon: 'Variable',
    section: 'body',
    description: 'Single data value',
    defaultProps: { path: '' }
  },
  {
    type: 'table',
    label: 'Table',
    labelAr: 'جدول',
    icon: 'Table',
    section: 'body',
    description: 'Data table with columns',
    defaultProps: { source: '', columns: [], emptyMessage: 'No items' }
  },
  {
    type: 'image',
    label: 'Image',
    labelAr: 'صورة',
    icon: 'Image',
    section: 'body',
    description: 'Static image',
    defaultProps: { src: '' }
  },
  {
    type: 'line',
    label: 'Horizontal Line',
    labelAr: 'خط أفقي',
    icon: 'Minus',
    section: 'body',
    description: 'Separator line',
    defaultProps: { color: '#e5e5e5', width: 1 }
  },
  {
    type: 'spacer',
    label: 'Spacer',
    labelAr: 'مسافة',
    icon: 'Space',
    section: 'body',
    description: 'Vertical spacing',
    defaultProps: { size: 'medium' }
  },
  {
    type: 'barcode',
    label: 'Barcode',
    labelAr: 'باركود',
    icon: 'Barcode',
    section: 'body',
    description: '1D barcode',
    defaultProps: { field: '', type: 'code128' }
  },
  {
    type: 'qrcode',
    label: 'QR Code',
    labelAr: 'رمز QR',
    icon: 'QrCode',
    section: 'body',
    description: '2D QR code',
    defaultProps: { field: '' }
  },
  {
    type: 'pageBreak',
    label: 'Page Break',
    labelAr: 'فاصل صفحات',
    icon: 'FileBreak',
    section: 'body',
    description: 'Force new page',
    defaultProps: {}
  },
  {
    type: 'twoColumn',
    label: 'Two Columns',
    labelAr: 'عمودان',
    icon: 'Columns',
    section: 'body',
    description: 'Side-by-side layout',
    defaultProps: { ratio: '50/50', left: [], right: [] }
  },
  {
    type: 'infoBox',
    label: 'Info Box',
    labelAr: 'صندوق معلومات',
    icon: 'Square',
    section: 'body',
    description: 'Styled container',
    defaultProps: { border: '1px solid #e5e5e5', padding: '15px', children: [] }
  },
  {
    type: 'signatureBox',
    label: 'Signature Box',
    labelAr: 'مربع التوقيع',
    icon: 'PenLine',
    section: 'body',
    description: 'Signature area with label',
    defaultProps: { label: { en: '', ar: '' } }
  }
];

export const FOOTER_COMPONENTS: PaletteItem[] = [
  {
    type: 'pageNumber',
    label: 'Page Number',
    labelAr: 'رقم الصفحة',
    icon: 'Hash',
    section: 'footer',
    description: 'Page X of Y',
    defaultProps: { format: 'Page {current} of {total}' }
  },
  {
    type: 'generatedDate',
    label: 'Generated Date',
    labelAr: 'تاريخ الإنشاء',
    icon: 'Clock',
    section: 'footer',
    description: 'Report generation timestamp',
    defaultProps: {}
  },
  {
    type: 'staticText',
    label: 'Static Text',
    labelAr: 'نص ثابت',
    icon: 'Type',
    section: 'footer',
    description: 'Fixed footer text',
    defaultProps: { text: { en: '', ar: '' } }
  }
];
