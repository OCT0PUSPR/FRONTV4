import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { FileText, FileEdit, FilePlus, FileCheck, FileX } from "lucide-react";
import { useTheme } from "../../context/theme";
import { useTranslation } from "react-i18next";

const DocumentNode = memo(({ data }: { data: any }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const borderColor = data.color || "#06b6d4";

  // Get icon based on document action
  const getDocumentIcon = () => {
    switch(data.documentAction) {
      case 'create': return FilePlus;
      case 'update': return FileEdit;
      case 'review': return FileCheck;
      case 'delete': return FileX;
      default: return FileText;
    }
  };

  const IconComponent = getDocumentIcon();

  return (
    <div style={{
      padding: "12px 16px",
      boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
      borderRadius: "8px",
      border: `2px solid ${borderColor}`,
      backgroundColor: colors.card,
      minWidth: "200px"
    }}>
      <Handle type="target" position={Position.Top} style={{ background: "#6366f1", width: "12px", height: "12px", border: `2px solid ${colors.card}` }} />
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
        <IconComponent style={{ height: "16px", width: "16px", color: "#06b6d4" }} />
        <div style={{ fontWeight: 600, fontSize: "14px", color: colors.textPrimary }}>{t('Document')}</div>
      </div>
      <div style={{ fontSize: "12px", color: colors.textPrimary }}>{data.label}</div>
      {data.documentAction && (
        <div style={{ 
          fontSize: "11px", 
          color: "#ffffff", 
          backgroundColor: "#06b6d4",
          padding: "2px 8px",
          borderRadius: "4px",
          marginTop: "4px",
          display: "inline-block",
          textTransform: "capitalize"
        }}>
          {t(data.documentAction)}
        </div>
      )}
      {data.documentType && (
        <div style={{ fontSize: "11px", color: colors.textSecondary, marginTop: "4px" }}>
          {t('Type: {{type}}', { type: data.documentType })}
        </div>
      )}
      {data.templateId && (
        <div style={{ fontSize: "11px", color: colors.textSecondary, marginTop: "2px" }}>
          {t('Template: {{id}}', { id: data.templateId })}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} style={{ background: "#6366f1", width: "12px", height: "12px", border: `2px solid ${colors.card}` }} />
    </div>
  );
});

DocumentNode.displayName = "DocumentNode";

export default DocumentNode;