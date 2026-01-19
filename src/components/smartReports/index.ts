/**
 * Smart Reports Components Index
 *
 * Main export file for all Smart Reports Builder components and utilities.
 */

// Types
export type {
  SectionType,
  ColumnFormat,
  ColumnAlign,
  HeaderLeftField,
  HeaderRightField,
  HeaderSection,
  CompanyField,
  CompanySection,
  TitleSection,
  TextSection,
  TableColumn,
  TableSection,
  ProductsSection,
  SignatureBlock,
  SignatureSection,
  FooterSection,
  SpacerSection,
  LineSection,
  LogoSection,
  ReportSection,
  ReportTemplate,
  ModelField,
  OdooModel,
} from "./types"

// Constants
export {
  A4_WIDTH,
  A4_HEIGHT,
  SECTION_TYPES,
  FONT_FAMILIES,
  FONT_SIZES,
  LUCIDE_ICONS,
  TABLE_THEMES,
} from "./constants"

// Components
export { SectionPreview } from "./SectionPreview"
export { SectionContent } from "./SectionContent"
export { SectionEditor } from "./SectionEditor"

// Editors
export {
  HeaderEditor,
  TableEditor,
  ProductsEditor,
  CompanyEditor,
  TitleEditor,
  TextEditor,
  SignatureEditor,
  FooterEditor,
  SpacerEditor,
  LineEditor,
  LogoEditor,
} from "./editors"

// Content Components
export {
  HeaderContent,
  TableContent,
  ProductsContent,
  CompanyContent,
  TitleContent,
  TextContent,
  SignatureContent,
  FooterContent,
  LogoContent,
} from "./contents"
