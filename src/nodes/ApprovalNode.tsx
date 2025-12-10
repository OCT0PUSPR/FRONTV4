import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { Users, Clock, ArrowUpCircle } from "lucide-react";
import { useTheme } from "../../context/theme";
import { useTranslation } from "react-i18next";

const ApprovalNode = memo(({ data }: { data: any }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const borderColor = data.color || "#3b82f6";
  
  // Get deadline and escalation config
  const deadline = data.deadline || { enabled: false };
  const escalation = data.escalation || { enabled: false };
  const approvalType = data.approvalType || 'Sequential';

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
        <Users style={{ height: "16px", width: "16px", color: "#3b82f6" }} />
        <div style={{ fontWeight: 600, fontSize: "14px", color: colors.textPrimary }}>{t('Approval')}</div>
        <div style={{ marginLeft: "auto", display: "flex", gap: "4px" }}>
          {deadline.enabled && (
            <span title={`${t('Deadline')}: ${deadline.days} ${t('days')}`}>
              <Clock style={{ height: "14px", width: "14px", color: "#f59e0b" }} />
            </span>
          )}
          {escalation.enabled && (
            <span title={t('Escalation enabled')}>
              <ArrowUpCircle style={{ height: "14px", width: "14px", color: "#ef4444" }} />
            </span>
          )}
        </div>
      </div>
      <div style={{ fontSize: "12px", color: colors.textPrimary }}>{data.label}</div>
      {data.approvers && data.approvers.length > 0 && (
        <div style={{ fontSize: "11px", color: colors.textSecondary, marginTop: "4px" }}>
          {Array.isArray(data.approvers) ? data.approvers.slice(0, 2).join(", ") : data.approvers}
          {Array.isArray(data.approvers) && data.approvers.length > 2 && ` +${data.approvers.length - 2}`}
        </div>
      )}
      <div style={{ 
        fontSize: "10px", 
        color: colors.textSecondary, 
        marginTop: "4px",
        display: "flex",
        alignItems: "center",
        gap: "8px"
      }}>
        <span style={{ 
          padding: "2px 6px", 
          backgroundColor: "rgba(59, 130, 246, 0.1)", 
          borderRadius: "4px",
          color: "#3b82f6"
        }}>
          {approvalType}
        </span>
        {deadline.enabled && (
          <span style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: "2px",
            color: "#f59e0b"
          }}>
            <Clock style={{ height: "10px", width: "10px" }} />
            {deadline.days}d
          </span>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} style={{ background: "#6366f1", width: "12px", height: "12px", border: `2px solid ${colors.card}` }} />
    </div>
  );
});

ApprovalNode.displayName = "ApprovalNode";

export default ApprovalNode;
