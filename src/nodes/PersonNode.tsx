// ========================================
// PersonNode.tsx - NEW NODE
// ========================================
import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { User } from "lucide-react";
import { useTheme } from "../../context/theme";
import { useTranslation } from "react-i18next";

const PersonNode = memo(({ data }: { data: any }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const borderColor = data.color || "#8b5cf6";

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
        <User style={{ height: "16px", width: "16px", color: "#8b5cf6" }} />
        <div style={{ fontWeight: 600, fontSize: "14px", color: colors.textPrimary }}>{t('Assign to Person')}</div>
      </div>
      <div style={{ fontSize: "12px", color: colors.textPrimary }}>{data.label}</div>
      {data.assignedTo && (
        <div style={{ fontSize: "12px", color: colors.textSecondary, marginTop: "4px" }}>
          {data.assignedTo}
        </div>
      )}
      {data.dueInHours && (
        <div style={{ fontSize: "11px", color: colors.textSecondary, marginTop: "2px" }}>
          {t('Due in {{hours}} hours', { hours: data.dueInHours })}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} style={{ background: "#6366f1", width: "12px", height: "12px", border: `2px solid ${colors.card}` }} />
    </div>
  );
});

PersonNode.displayName = "PersonNode";

export default PersonNode;