/**
 * Signature Content Component
 *
 * Renders the signature section in the preview panel.
 * Displays signature blocks with configurable layout.
 */

import { SignatureSection, ReportTemplate } from "../types"

interface SignatureContentProps {
  section: SignatureSection
  template: ReportTemplate
}

export function SignatureContent({
  section,
  template,
}: SignatureContentProps) {
  return (
    <div
      style={{
        marginTop: "2rem",
        paddingTop: "1rem",
        borderTop: `1px solid ${template.borderColor}`,
      }}
    >
      {section.title && (
        <h3
          style={{
            fontSize: "0.9rem",
            fontWeight: 600,
            marginBottom: "1rem",
            color: template.primaryColor,
          }}
        >
          {section.title}
        </h3>
      )}
      <div
        style={{
          display: "flex",
          justifyContent: section.layout === "vertical" ? "flex-start" : "space-around",
          gap: "2rem",
        }}
      >
        {section.signatures.map((sig) => (
          <div key={sig.id} style={{ textAlign: "center", flex: 1 }}>
            <p
              style={{
                margin: "0 0 0.5rem 0",
                fontSize: "0.85rem",
                fontWeight: 500,
                color: template.primaryColor,
              }}
            >
              {sig.label}
              {sig.required && <span style={{ color: "#ef4444" }}> *</span>}
            </p>
            <div
              style={{
                borderTop: `1px solid ${template.borderColor}`,
                height: "2rem",
              }}
            />
            <p
              style={{
                margin: "0.5rem 0 0 0",
                fontSize: "0.75rem",
                color: "#94a3b8",
              }}
            >
              Signature
            </p>
            {sig.showDate && (
              <p
                style={{
                  margin: "0.25rem 0 0 0",
                  fontSize: "0.7rem",
                  color: "#94a3b8",
                }}
              >
                Date: _____________
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
