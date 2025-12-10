import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { Clock } from "lucide-react";
import { useTheme } from "../../context/theme";
import { useTranslation } from "react-i18next";

const DelayNode = memo(({ data }: { data: any }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const borderColor = data.color || "#f59e0b";

  // Format delay display
  const getDelayText = () => {
    if (data.delayType === 'dynamic' && data.delayExpression) {
      return t('Dynamic: {{expr}}', { expr: data.delayExpression });
    }
    if (data.delayAmount && data.delayUnit) {
      return t('Wait {{amount}} {{unit}}', { amount: data.delayAmount, unit: data.delayUnit });
    }
    return t('Not configured');
  };

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
        <Clock style={{ height: "16px", width: "16px", color: "#f59e0b" }} />
        <div style={{ fontWeight: 600, fontSize: "14px", color: colors.textPrimary }}>{t('Delay')}</div>
      </div>
      <div style={{ fontSize: "12px", color: colors.textPrimary }}>{data.label}</div>
      <div style={{ fontSize: "12px", color: colors.textSecondary, marginTop: "4px" }}>
        {getDelayText()}
      </div>
      {data.delayUntil && (
        <div style={{ fontSize: "11px", color: colors.textSecondary, marginTop: "2px" }}>
          {t('Until: {{date}}', { date: new Date(data.delayUntil).toLocaleString() })}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} style={{ background: "#6366f1", width: "12px", height: "12px", border: `2px solid ${colors.card}` }} />
    </div>
  );
});

DelayNode.displayName = "DelayNode";

export default DelayNode;