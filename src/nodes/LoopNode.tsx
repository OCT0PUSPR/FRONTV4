import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { Repeat } from "lucide-react";
import { useTheme } from "../../context/theme";
import { useTranslation } from "react-i18next";

const LoopNode = memo(({ data }: { data: any }) => {
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
        <Repeat style={{ height: "16px", width: "16px", color: "#8b5cf6" }} />
        <div style={{ fontWeight: 600, fontSize: "14px", color: colors.textPrimary }}>{t('Loop')}</div>
      </div>
      <div style={{ fontSize: "12px", color: colors.textPrimary }}>{data.label}</div>
      {data.loopType && (
        <div style={{ 
          fontSize: "11px", 
          color: "#ffffff", 
          backgroundColor: "#8b5cf6",
          padding: "2px 8px",
          borderRadius: "4px",
          marginTop: "4px",
          display: "inline-block",
          textTransform: "capitalize"
        }}>
          {data.loopType === 'forEach' ? t('For Each') : 
           data.loopType === 'while' ? t('While') :
           data.loopType === 'count' ? t('Count') : data.loopType}
        </div>
      )}
      {data.loopType === 'count' && data.iterations && (
        <div style={{ fontSize: "12px", color: colors.textSecondary, marginTop: "4px" }}>
          {t('{{count}} iterations', { count: data.iterations })}
        </div>
      )}
      {data.loopType === 'forEach' && data.collection && (
        <div style={{ fontSize: "12px", color: colors.textSecondary, marginTop: "4px" }}>
          {t('Collection: {{collection}}', { collection: data.collection })}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} id="next" style={{ background: "#6366f1", left: "75%", width: "12px", height: "12px", border: `2px solid ${colors.card}` }} />
      <Handle type="source" position={Position.Bottom} id="loop" style={{ background: "#8b5cf6", left: "25%", width: "12px", height: "12px", border: `2px solid ${colors.card}` }} />
    </div>
  );
});

LoopNode.displayName = "LoopNode";

export default LoopNode;

