/**
 * Section Editor Component
 *
 * Switch component that renders the appropriate editor component
 * based on the section type.
 */

import { ReportSection, ReportTemplate, ModelField, OdooModel } from "./types"
import {
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

interface SectionEditorProps {
  section: ReportSection
  template: ReportTemplate
  colors: any
  t: any
  getModelFields: (model: string) => ModelField[]
  onUpdate: (updates: Partial<ReportSection>) => void
  onOpenIconPicker: () => void
  selectedIconFor: string | null
  setSelectedIconFor: (id: string | null) => void
  setShowIconPicker: (show: boolean) => void
  companies: any[]
  modelFields: ModelField[]
  odooModels: OdooModel[]
  fetchModelFields: (modelName: string) => Promise<void>
  fetchPreviewData: (modelName: string, relationField?: string) => Promise<void>
}

export function SectionEditor({
  section,
  template,
  colors,
  t,
  getModelFields,
  onUpdate,
  onOpenIconPicker,
  selectedIconFor,
  setSelectedIconFor,
  setShowIconPicker,
  companies,
  modelFields,
  odooModels,
  fetchModelFields,
  fetchPreviewData,
}: SectionEditorProps) {
  switch (section.type) {
    case "header":
      return (
        <HeaderEditor
          section={section}
          colors={colors}
          t={t}
          onUpdate={onUpdate}
          companies={companies}
          odooModels={odooModels}
          fetchModelFields={fetchModelFields}
        />
      )
    case "company":
      return (
        <CompanyEditor
          section={section}
          template={template}
          colors={colors}
          t={t}
          onUpdate={onUpdate}
          companies={companies}
          odooModels={odooModels}
          fetchModelFields={fetchModelFields}
        />
      )
    case "title":
      return (
        <TitleEditor
          section={section}
          colors={colors}
          t={t}
          onUpdate={onUpdate}
          modelFields={modelFields}
        />
      )
    case "text":
      return (
        <TextEditor section={section} colors={colors} t={t} onUpdate={onUpdate} />
      )
    case "table":
      return (
        <TableEditor
          section={section}
          colors={colors}
          t={t}
          getModelFields={getModelFields}
          onUpdate={onUpdate}
          template={template}
          modelFields={modelFields}
          odooModels={odooModels}
          fetchModelFields={fetchModelFields}
          fetchPreviewData={fetchPreviewData}
        />
      )
    case "products":
      return (
        <ProductsEditor
          section={section}
          colors={colors}
          t={t}
          getModelFields={getModelFields}
          onUpdate={onUpdate}
          template={template}
          odooModels={odooModels}
          fetchPreviewData={fetchPreviewData}
        />
      )
    case "logo":
      return (
        <LogoEditor
          section={section}
          template={template}
          colors={colors}
          t={t}
          onUpdate={onUpdate}
          onOpenIconPicker={onOpenIconPicker}
          selectedIconFor={selectedIconFor}
          setSelectedIconFor={setSelectedIconFor}
          setShowIconPicker={setShowIconPicker}
        />
      )
    case "signature":
      return (
        <SignatureEditor section={section} colors={colors} t={t} onUpdate={onUpdate} />
      )
    case "footer":
      return (
        <FooterEditor section={section} colors={colors} t={t} onUpdate={onUpdate} />
      )
    case "spacer":
      return (
        <SpacerEditor section={section} colors={colors} t={t} onUpdate={onUpdate} />
      )
    case "line":
      return <LineEditor section={section} colors={colors} t={t} onUpdate={onUpdate} />
    default:
      return null
  }
}
