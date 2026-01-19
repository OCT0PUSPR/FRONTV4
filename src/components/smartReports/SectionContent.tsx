/**
 * Section Content Component
 *
 * Switch component that renders the appropriate content component
 * based on the section type.
 */

import { ReportSection, ReportTemplate } from "./types"
import { HeaderContent } from "./contents/HeaderContent"
import { TableContent } from "./contents/TableContent"
import { ProductsContent } from "./contents/ProductsContent"
import { CompanyContent } from "./contents/CompanyContent"
import { TitleContent } from "./contents/TitleContent"
import { TextContent } from "./contents/TextContent"
import { SignatureContent } from "./contents/SignatureContent"
import { FooterContent } from "./contents/FooterContent"
import { LogoContent } from "./contents/LogoContent"

interface SectionContentProps {
  section: ReportSection
  template: ReportTemplate
  previewData: Record<string, any>
}

export function SectionContent({
  section,
  template,
  previewData,
}: SectionContentProps) {
  switch (section.type) {
    case "header":
      return (
        <HeaderContent section={section} template={template} previewData={previewData} />
      )
    case "company":
      return (
        <CompanyContent section={section} template={template} previewData={previewData} />
      )
    case "title":
      return <TitleContent section={section} template={template} />
    case "text":
      return <TextContent section={section} template={template} />
    case "table":
      return (
        <TableContent section={section} template={template} previewData={previewData} />
      )
    case "products":
      return (
        <ProductsContent
          section={section}
          template={template}
          previewData={previewData}
        />
      )
    case "logo":
      return <LogoContent section={section} template={template} />
    case "signature":
      return <SignatureContent section={section} template={template} />
    case "footer":
      return <FooterContent section={section} template={template} />
    case "spacer":
      return <div style={{ height: (section as any).height }} />
    case "line":
      const lineSec = section as any
      return (
        <div
          style={{
            borderTop: `${lineSec.thickness}px ${lineSec.style} ${template.borderColor}`,
            margin: "1rem 0",
          }}
        />
      )
    default:
      return null
  }
}
