import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { Bot, Wrench, Sparkles, Brain, MessageSquare, Plus } from "lucide-react";
import { useTheme } from "../../context/theme";
import { useTranslation } from "react-i18next";

interface AIAgentNodeData {
  label?: string;
  color?: string;
  provider?: string;
  model?: string;
  systemPrompt?: string;
  tools?: Array<{ id: string; name: string; enabled: boolean }>;
  temperature?: number;
}

const AIAgentNode = memo(({ data }: { data: AIAgentNodeData }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  
  // Design Constants
  const glowColor = "#a855f7"; // Purple glow
  const cardBg = colors.card;
  const borderColor = colors.border || "rgba(128,128,128,0.2)";
  const textColor = colors.textPrimary;
  const subTextColor = colors.textSecondary;
  const sectionBg = "var(--bg-secondary)";

  const model = data.model || "gpt-4";
  
  // Helper function to calculate tool handle position relative to node
  const toolHandleTop = "65%"; 

  return (
    <div style={{
      position: "relative",
      width: "280px",
      borderRadius: "16px",
      backgroundColor: cardBg,
      color: textColor,
      border: `1px solid ${glowColor}`,
      boxShadow: `0 0 15px -3px ${glowColor}80`,
      // Overflow visible to allow handles to show fully
      fontFamily: "'Inter', sans-serif",
      overflow: "visible"
    }}>
      {/* Connection Handles */}
      
      {/* Top Input */}
      <Handle 
        type="target" 
        position={Position.Top} 
        id="input"
        style={{ 
          background: glowColor,
          width: "12px",
          height: "12px",
          border: `2px solid ${cardBg}`,
          top: "-7px"
        }} 
      />
      
      {/* Left Tools Input */}
      <Handle
        type="target"
        position={Position.Left}
        id="tools"
        style={{ 
          background: "#a3e635", // Lime green
          width: "10px",
          height: "10px",
          border: `2px solid ${cardBg}`,
          left: "-6px",
          top: toolHandleTop,
          zIndex: 10
        }}
      />

      {/* Header */}
      <div style={{ 
        padding: "16px", 
        display: "flex", 
        alignItems: "center", 
        gap: "12px",
        borderBottom: `1px solid ${borderColor}`,
        borderTopLeftRadius: "16px",
        borderTopRightRadius: "16px"
      }}>
        {/* Gradient Icon Box */}
        <div style={{
          width: "40px",
          height: "40px",
          borderRadius: "10px",
          background: "linear-gradient(135deg, #c084fc 0%, #6366f1 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 6px rgba(0,0,0,0.2)"
        }}>
          <Sparkles style={{ color: "white", width: "20px", height: "20px" }} />
        </div>
        
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: "16px", lineHeight: "1.2", color: textColor }}>
            {t('AI Agent')}
          </div>
          <div style={{ fontSize: "11px", color: subTextColor, marginTop: "2px" }}>
            {t('AI Orchestration Node')}
          </div>
        </div>
      </div>

      {/* Body Content */}
      <div style={{ 
        padding: "16px", 
        display: "flex", 
        flexDirection: "column", 
        gap: "12px",
        borderBottomLeftRadius: "16px",
        borderBottomRightRadius: "16px" 
      }}>
        
        {/* Chat Model Section */}
        <div style={{
          border: `1px solid ${borderColor}`,
          borderRadius: "10px",
          padding: "10px",
          backgroundColor: sectionBg
        }}>
          <div style={{ fontSize: "12px", fontWeight: 600, marginBottom: "8px", color: subTextColor }}>
            {t('Chat Model')}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              width: "32px", 
              height: "32px", 
              borderRadius: "8px", 
              backgroundColor: textColor, 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center"
            }}>
              <MessageSquare style={{ width: "16px", height: "16px", color: cardBg }} />
            </div>
            <div style={{ fontWeight: 600, fontSize: "13px", color: textColor }}>
              {model}
            </div>
          </div>
        </div>
        
      </div>
      
      {/* Bottom Output */}
      <Handle 
        type="source" 
        position={Position.Bottom} 
        id="output"
        style={{ 
          background: glowColor,
          width: "12px",
          height: "12px",
          border: `2px solid ${cardBg}`,
          bottom: "-7px"
        }} 
      />
    </div>
  );
});

AIAgentNode.displayName = "AIAgentNode";

export default AIAgentNode;
