/**
 * Type definitions for Smart Reports Builder
 *
 * This file contains all TypeScript interfaces and types used throughout
 * the Smart Reports Builder component system.
 */

// =============================================================================
// SECTION TYPES
// =============================================================================

/** All available section types that can be added to a report template */
export type SectionType =
  | "header"
  | "company"
  | "title"
  | "text"
  | "table"
  | "products"
  | "logo"
  | "signature"
  | "footer"
  | "spacer"
  | "line"

/** Column formatting options for table data */
export type ColumnFormat = "text" | "number" | "currency" | "date" | "image"

/** Column alignment options */
export type ColumnAlign = "left" | "center" | "right"

// =============================================================================
// SECTION INTERFACES
// =============================================================================

/** Field configuration for header section left column (document info) */
export interface HeaderLeftField {
  field: string
  label: string
  enabled: boolean
}

/** Field configuration for header section right column (company info) */
export interface HeaderRightField {
  field: string
  label: string
  enabled: boolean
}

/**
 * Header Section - combines title and company info in left/right layout
 * Displays document information on the left and company details on the right
 */
export interface HeaderSection {
  id: string
  type: "header"
  enabled: boolean
  // Left column - Document info
  documentTitle: string
  leftFields: HeaderLeftField[]
  // Right column - Company info
  showLogo: boolean
  rightFields: HeaderRightField[]
}

/** Field configuration for company section */
export interface CompanyField {
  field: string
  label: string
  enabled: boolean
}

/**
 * Company Section - displays company information
 * Supports left, center, or right alignment
 */
export interface CompanySection {
  id: string
  type: "company"
  enabled: boolean
  showLogo: boolean
  fields: CompanyField[]
  layout: "left" | "center" | "right"
}

/**
 * Title Section - displays document title with optional metadata
 */
export interface TitleSection {
  id: string
  type: "title"
  enabled: boolean
  title: string
  titleField?: string
  showReference: boolean
  showDate: boolean
  showPartner: boolean
  partnerField: string
}

/**
 * Text Section - displays custom text content
 */
export interface TextSection {
  id: string
  type: "text"
  enabled: boolean
  content: string
  fontSize: number
  fontWeight: "normal" | "bold"
  align: "left" | "center" | "right"
}

/** Column configuration for table sections */
export interface TableColumn {
  id: string
  field: string
  label: string
  width: number
  align: ColumnAlign
  format: ColumnFormat
}

/**
 * Table Section - displays data table with dynamic columns
 * Supports various themes and formatting options
 */
export interface TableSection {
  id: string
  type: "table"
  enabled: boolean
  title?: string
  odooModel: string
  theme: string
  columns: TableColumn[]
  showRowNumbers: boolean
  alternateColors: boolean
  showHeader: boolean
}

/**
 * Products Section - displays product listing with totals
 * Auto-detects line field from the template's Odoo model
 */
export interface ProductsSection {
  id: string
  type: "products"
  enabled: boolean
  title: string
  // Uses template.odooModel as base model, auto-detects line field
  showImages: boolean
  showSKU: boolean
  showQuantity: boolean
  showPrice: boolean
  showRFID: boolean
  showTotal: boolean
  columns: TableColumn[]
  showSectionTotal: boolean
  showRowNumbers: boolean
}

/** Signature block configuration */
export interface SignatureBlock {
  id: string
  label: string
  required: boolean
  showDate: boolean
  showPrintedName: boolean
}

/**
 * Signature Section - displays signature blocks
 */
export interface SignatureSection {
  id: string
  type: "signature"
  enabled: boolean
  title?: string
  signatures: SignatureBlock[]
  layout: "horizontal" | "vertical"
}

/**
 * Footer Section - displays page numbers and footer information
 */
export interface FooterSection {
  id: string
  type: "footer"
  enabled: boolean
  showPageNumbers: boolean
  showTimestamp: boolean
  showPrintedBy: boolean
  customText?: string
}

/**
 * Spacer Section - adds vertical spacing
 */
export interface SpacerSection {
  id: string
  type: "spacer"
  enabled: boolean
  height: number
}

/**
 * Line Section - adds horizontal divider
 */
export interface LineSection {
  id: string
  type: "line"
  enabled: boolean
  style: "solid" | "dashed" | "double"
  thickness: number
}

/**
 * Logo Section - displays image or icon logo
 */
export interface LogoSection {
  id: string
  type: "logo"
  enabled: boolean
  logoType: "image" | "icon"
  imageData?: string // base64
  iconName?: string
  iconSize: number
  align: "left" | "center" | "right"
}

/** Union type for all section types */
export type ReportSection =
  | HeaderSection
  | CompanySection
  | TitleSection
  | TextSection
  | TableSection
  | ProductsSection
  | LogoSection
  | SignatureSection
  | FooterSection
  | SpacerSection
  | LineSection

// =============================================================================
// REPORT TEMPLATE
// =============================================================================

/**
 * Main report template configuration
 * Defines the structure and styling of a complete report
 */
export interface ReportTemplate {
  id?: number
  name: string
  description: string
  odooModel?: string // Main model binding for this template
  sections: ReportSection[]
  primaryColor: string
  borderColor: string
  headerBgColor: string
  fontFamily: string
  fontSize: number
  pageFormat: "A4" | "Letter"
  marginTop: number
  marginBottom: number
  marginLeft: number
  marginRight: number
  status: "draft" | "published"
}

// =============================================================================
// ODOO MODELS & FIELDS
// =============================================================================

/** Field metadata from Odoo model */
export interface ModelField {
  name: string
  label: string
  type: string
  isRelation?: boolean
  relation?: string
  isLineField?: boolean
}

/** Odoo model information */
export interface OdooModel {
  model: string
  name: string
  table: string
  fields: ModelField[]
}
