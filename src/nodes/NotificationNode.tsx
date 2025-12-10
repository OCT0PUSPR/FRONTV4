import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { Bell } from "lucide-react";
import { useTheme } from "../../context/theme";
import { useTranslation } from "react-i18next";

const NotificationNode = memo(({ data }: { data: any }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const borderColor = data.color || "#14b8a6";

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
        <Bell style={{ height: "16px", width: "16px", color: "#14b8a6" }} />
        <div style={{ fontWeight: 600, fontSize: "14px", color: colors.textPrimary }}>{t('Notification')}</div>
      </div>
      <div style={{ fontSize: "12px", color: colors.textPrimary }}>{data.label}</div>
      {data.recipients && (
        <div style={{ fontSize: "12px", color: colors.textSecondary, marginTop: "4px" }}>
          To: {Array.isArray(data.recipients) ? data.recipients.join(", ") : data.recipients}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} style={{ background: "#6366f1", width: "12px", height: "12px", border: `2px solid ${colors.card}` }} />
    </div>
  );
});

NotificationNode.displayName = "NotificationNode";

export default NotificationNode;
