// =============================================
// 1. UPDATED ConditionNode.tsx
// =============================================
import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { GitBranch } from "lucide-react";
import { useTheme } from "../../context/theme";
import { useTranslation } from "react-i18next";

const ConditionNode = memo(({ data }: { data: any }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const borderColor = data.color || "#f97316";

  return (
    <div style={{ position: "relative" }}>
      <Handle type="target" position={Position.Top} style={{ background: "#6366f1", width: "12px", height: "12px", border: `2px solid ${colors.card}` }} />
      <div style={{
        padding: "12px 16px",
        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
        borderRadius: "8px",
        border: `2px solid ${borderColor}`,
        backgroundColor: colors.card,
        minWidth: "200px"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
          <GitBranch style={{ height: "16px", width: "16px", color: "#f97316" }} />
          <div style={{ fontWeight: "600", fontSize: "14px", color: colors.textPrimary }}>{t('Condition')}</div>
        </div>
        <div style={{ fontSize: "12px", color: colors.textPrimary }}>{data.label}</div>
        
        {/* Display expression OR conditionType */}
        {data.expression && (
          <div style={{ fontSize: "11px", color: colors.textSecondary, marginTop: "4px", fontFamily: "monospace", backgroundColor: colors.mutedBg, padding: "4px 8px", borderRadius: "4px" }}>
            {data.expression}
          </div>
        )}
        
        {/* Show condition type if no expression */}
        {!data.expression && data.conditionType && (
          <div style={{ fontSize: "11px", color: colors.textSecondary, marginTop: "4px" }}>
            Type: {data.conditionType}
          </div>
        )}

        {/* Show Yes/No labels */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px", fontSize: "10px", color: colors.textSecondary }}>
          <span style={{ marginLeft: "10%" }}>✓ {t('Yes')}</span>
          <span style={{ marginRight: "10%" }}>✗ {t('No')}</span>
        </div>
      </div>
      
      {/* Source handles with labels */}
      <Handle 
        type="source" 
        position={Position.Bottom} 
        id="true" 
        style={{ 
          background: "#10b981", 
          left: "25%",
          width: "12px",
          height: "12px",
          border: `2px solid ${colors.card}`
        }} 
      />
      <Handle 
        type="source" 
        position={Position.Bottom} 
        id="false" 
        style={{ 
          background: "#ef4444", 
          left: "75%",
          width: "12px",
          height: "12px",
          border: `2px solid ${colors.card}`
        }} 
      />
    </div>
  );
});

ConditionNode.displayName = "ConditionNode";

export default ConditionNode;

/**
 * Evaluate condition - UPDATED VERSION
 */


/**
 * Evaluate expression - HELPER METHOD
 */


/**
 * Get nested value from object - HELPER METHOD
 */


// =============================================
// 5. WORKFLOW EDGE CREATION
// When creating edges from condition nodes in React Flow
// =============================================

// In your React Flow onConnect handler, detect condition nodes:


// =============================================
// 6. EXAMPLE USAGE IN WORKFLOW
// =============================================

/*
WORKFLOW EXAMPLE WITH CONDITION NODE:

1. Start Node
   ↓
2. Trigger: Product Edit
   ↓
3. Condition: price > 1000
   ↓ (true)              ↓ (false)
4a. Approval Node     4b. Auto-Approve
   ↓                      ↓
5. End                  5. End

CONTEXT DATA EXAMPLE:
{
  "price": 1500,
  "category": "Electronics",
  "lastApprovalResult": "approved",
  "amount": 2000
}

CONDITION EXPRESSIONS:
- Simple: "price > 1000"
- With quotes: "category == 'Electronics'"
- Multiple: "price > 1000 && category == 'Electronics'"
- Or logic: "status == 'pending' || status == 'draft'"
- Approval: "lastApprovalResult == 'approved'"
*/