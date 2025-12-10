import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { GitMerge, Clock } from "lucide-react";
import { useTheme } from "../../context/theme";
import { useTranslation } from "react-i18next";

const MergeNode = memo(({ data }: { data: any }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const borderColor = data.color || "#06b6d4"; // Cyan for merge

  const mergeCondition = data.mergeCondition || 'all';
  const timeout = data.timeout || { enabled: false };

  const getConditionLabel = () => {
    switch (mergeCondition) {
      case 'all': return t('Wait for all');
      case 'any': return t('Any one');
      case 'count': return `${data.requiredBranchCount || 1} ${t('branches')}`;
      case 'first_success': return t('First success');
      default: return mergeCondition;
    }
  };

  return (
    <div style={{
      padding: "12px 16px",
      boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
      borderRadius: "8px",
      border: `2px solid ${borderColor}`,
      backgroundColor: colors.card,
      minWidth: "180px"
    }}>
      {/* Multiple input handles */}
      <Handle type="target" position={Position.Top} style={{ background: "#6366f1", width: "12px", height: "12px", border: `2px solid ${colors.card}` }} />
      
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
        <GitMerge style={{ height: "16px", width: "16px", color: "#06b6d4" }} />
        <div style={{ fontWeight: 600, fontSize: "14px", color: colors.textPrimary }}>{t('Merge')}</div>
        {timeout.enabled && (
          <span title={`${t('Timeout')}: ${timeout.hours}h`}>
            <Clock style={{ height: "14px", width: "14px", color: "#f59e0b", marginLeft: "auto" }} />
          </span>
        )}
      </div>
      <div style={{ fontSize: "12px", color: colors.textPrimary }}>{data.label}</div>
      <div style={{ 
        fontSize: "11px", 
        color: colors.textSecondary, 
        marginTop: "4px",
        display: "flex",
        alignItems: "center",
        gap: "4px"
      }}>
        <span style={{ 
          padding: "2px 6px", 
          backgroundColor: "rgba(6, 182, 212, 0.1)", 
          borderRadius: "4px",
          color: "#06b6d4"
        }}>
          {getConditionLabel()}
        </span>
        {timeout.enabled && (
          <span style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: "2px",
            color: "#f59e0b",
            fontSize: "10px"
          }}>
            <Clock style={{ height: "10px", width: "10px" }} />
            {timeout.hours}h
          </span>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} style={{ background: "#6366f1", width: "12px", height: "12px", border: `2px solid ${colors.card}` }} />
    </div>
  );
});

MergeNode.displayName = "MergeNode";

export default MergeNode;
