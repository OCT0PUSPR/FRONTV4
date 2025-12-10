import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { PlayCircle, Zap, Webhook, Clock, Hand, ShieldCheck } from "lucide-react";
import { useTheme } from "../../context/theme";
import { useTranslation } from "react-i18next";

const TriggerNode = memo(({ data }: { data: any }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const borderColor = data.color || "#10b981";
  
  // Get trigger type from config or data
  const config = data.config || {};
  const triggerType = config.triggerType || data.triggerType || 'event';
  const eventType = config.eventType || data.eventType || 'update';
  const sourceEntity = config.sourceEntity || data.sourceEntity || '';
  const exceptions = config.exceptions || data.exceptions || { enabled: false };
  
  // Get icon based on trigger type
  const getTriggerIcon = () => {
    switch (triggerType) {
      case 'manual': return <Hand style={{ height: "16px", width: "16px", color: "#10b981" }} />;
      case 'webhook': return <Webhook style={{ height: "16px", width: "16px", color: "#10b981" }} />;
      case 'scheduled': return <Clock style={{ height: "16px", width: "16px", color: "#10b981" }} />;
      default: return <Zap style={{ height: "16px", width: "16px", color: "#10b981" }} />;
    }
  };
  
  // Get trigger type label
  const getTriggerLabel = () => {
    switch (triggerType) {
      case 'manual': return t('Manual');
      case 'webhook': return t('Webhook');
      case 'scheduled': {
        const schedule = config.schedule || {};
        if (schedule.repeatType === 'daily') return t('Daily');
        if (schedule.repeatType === 'weekly') return t('Weekly');
        if (schedule.repeatType === 'monthly') return t('Monthly');
        return t('Scheduled');
      }
      case 'event': return `${eventType.charAt(0).toUpperCase() + eventType.slice(1)}`;
      default: return triggerType;
    }
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
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
        {getTriggerIcon()}
        <div style={{ fontWeight: 600, fontSize: "14px", color: colors.textPrimary }}>{t('Trigger')}</div>
        {exceptions.enabled && (
          <span title={t('Exception list enabled')}>
            <ShieldCheck style={{ height: "14px", width: "14px", color: "#f59e0b", marginLeft: "auto" }} />
          </span>
        )}
      </div>
      <div style={{ fontSize: "12px", color: colors.textPrimary }}>{data.label}</div>
      <div style={{ fontSize: "11px", color: colors.textSecondary, marginTop: "4px" }}>
        {getTriggerLabel()}
        {triggerType === 'event' && sourceEntity && (
          <span> • {sourceEntity.split('.').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</span>
        )}
      </div>
      {exceptions.enabled && (
        <div style={{ 
          fontSize: "10px", 
          color: "#f59e0b", 
          marginTop: "4px",
          display: "flex",
          alignItems: "center",
          gap: "4px"
        }}>
          <ShieldCheck style={{ height: "10px", width: "10px" }} />
          {t('Exceptions enabled')}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} style={{ background: "#6366f1", width: "12px", height: "12px", border: `2px solid ${colors.card}` }} />
    </div>
  );
});

TriggerNode.displayName = "TriggerNode";

export default TriggerNode;
