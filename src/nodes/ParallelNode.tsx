import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { GitFork } from "lucide-react";
import { useTheme } from "../../context/theme";
import { useTranslation } from "react-i18next";

interface ParallelNodeData extends Record<string, unknown> {
  branchCount?: number;
  label?: string;
  color?: string;
}

const ParallelNode = memo(({ data, id }: { data: any; id: string }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const nodeData = (data || {}) as ParallelNodeData;
  const borderColor = nodeData.color || "#8b5cf6"; // Purple for parallel

  // Get branch count from data, default to 2, max 10 (matching PropertiesBar)
  const branchCount = Math.min(Math.max(nodeData.branchCount || 2, 1), 10);

  return (
    <div 
      key={`parallel-${id}-${branchCount}`}
      style={{
        padding: "12px 16px",
        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
        borderRadius: "8px",
        border: `2px solid ${borderColor}`,
        backgroundColor: colors.card,
        minWidth: "180px",
        position: "relative"
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: "#6366f1", width: "12px", height: "12px", border: `2px solid ${colors.card}` }} />
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
        <GitFork style={{ height: "16px", width: "16px", color: "#8b5cf6" }} />
        <div style={{ fontWeight: 600, fontSize: "14px", color: colors.textPrimary }}>{t('Parallel')}</div>
      </div>
      <div style={{ fontSize: "12px", color: colors.textPrimary }}>{nodeData.label}</div>
      <div style={{ 
        fontSize: "11px", 
        color: colors.textSecondary, 
        marginTop: "4px",
        display: "flex",
        alignItems: "center",
        gap: "4px",
        marginBottom: "8px"
      }}>
        <span style={{ 
          padding: "2px 6px", 
          backgroundColor: "rgba(139, 92, 246, 0.1)", 
          borderRadius: "4px",
          color: "#8b5cf6"
        }}>
          {branchCount} {t('branches')}
        </span>
      </div>
      {/* Single output handle that allows multiple connections */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="output"
        style={{ 
          background: "#8b5cf6",
          width: "12px",
          height: "12px",
          border: `2px solid ${colors.card}`
        }}
      />
    </div>
  );
});

ParallelNode.displayName = "ParallelNode";

export default ParallelNode;
