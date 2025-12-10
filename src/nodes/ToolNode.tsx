import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { 
  Wrench, Database, Mail, Globe, CheckSquare, User, 
  Calculator, Calendar, FileText, Code, Zap 
} from "lucide-react";
import { useTheme } from "../../context/theme";
import { useTranslation } from "react-i18next";

interface ToolNodeData {
  label?: string;
  color?: string;
  toolId?: string;
  toolName?: string;
  toolType?: string;
  category?: string;
  description?: string;
  icon?: string;
  parameters?: Record<string, any>;
}

// Icon mapping for different tool types
const iconMap: Record<string, React.ComponentType<any>> = {
  database: Database,
  mail: Mail,
  globe: Globe,
  'check-square': CheckSquare,
  user: User,
  calculator: Calculator,
  calendar: Calendar,
  'file-text': FileText,
  code: Code,
  zap: Zap,
  wrench: Wrench
};

// Category colors
const categoryColors: Record<string, string> = {
  data: "#3b82f6",      // Blue
  communication: "#ec4899", // Pink
  integration: "#8b5cf6",   // Purple
  workflow: "#10b981",      // Green
  utility: "#f59e0b",       // Amber
  document: "#06b6d4",      // Cyan
  default: "#6b7280"        // Gray
};

const ToolNode = memo(({ data }: { data: ToolNodeData }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  
  const category = data.category || "default";
  const borderColor = data.color || categoryColors[category] || categoryColors.default;
  const IconComponent = iconMap[data.icon || "wrench"] || Wrench;

  return (
    <div style={{
      padding: "10px 14px",
      boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
      borderRadius: "8px",
      border: `2px solid ${borderColor}`,
      backgroundColor: colors.card,
      minWidth: "160px",
      maxWidth: "200px"
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "24px",
          height: "24px",
          borderRadius: "4px",
          backgroundColor: `${borderColor}15`
        }}>
          <IconComponent style={{ height: "14px", width: "14px", color: borderColor }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: "12px", color: colors.textPrimary }}>
            {data.label || data.toolName || t('Tool')}
          </div>
        </div>
      </div>
      
      {/* Category badge */}
      <div style={{ 
        display: "inline-block",
        padding: "2px 6px", 
        backgroundColor: `${borderColor}15`, 
        borderRadius: "4px",
        color: borderColor,
        fontSize: "10px",
        fontWeight: 500,
        textTransform: "capitalize"
      }}>
        {category}
      </div>
      
      {/* Description */}
      {data.description && (
        <div style={{
          marginTop: "6px",
          fontSize: "10px",
          color: colors.textSecondary,
          overflow: "hidden",
          textOverflow: "ellipsis",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          lineHeight: "1.3"
        }}>
          {data.description}
        </div>
      )}
      
      {/* Output handle - connects to AI Agent's tool input */}
      <Handle 
        type="source" 
        position={Position.Right} 
        id="tool-output"
        style={{ 
          background: borderColor,
          right: "-8px",
          width: "12px",
          height: "12px",
          border: `2px solid ${colors.card}`
        }} 
      />
    </div>
  );
});

ToolNode.displayName = "ToolNode";

export default ToolNode;
