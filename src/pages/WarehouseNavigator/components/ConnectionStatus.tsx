// Connection Status Component - WebSocket connection indicator

import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../../context/theme';
import { ConnectionStatus as ConnectionStatusType } from '../types';

interface ConnectionStatusProps {
  status: ConnectionStatusType;
}

export function ConnectionStatus({ status }: ConnectionStatusProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          color: '#22C55E', // green
          label: t('warehouse_navigator.connected', 'Connected'),
          animate: false,
        };
      case 'reconnecting':
        return {
          color: '#F59E0B', // yellow
          label: t('warehouse_navigator.reconnecting', 'Reconnecting...'),
          animate: true,
        };
      case 'disconnected':
        return {
          color: '#EF4444', // red
          label: t('warehouse_navigator.disconnected', 'Disconnected'),
          animate: false,
        };
      default:
        return {
          color: colors.textSecondary,
          label: status,
          animate: false,
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className="flex items-center gap-2 text-xs">
      <div
        className={`
          w-2 h-2 rounded-full
          ${config.animate ? 'animate-pulse' : ''}
        `}
        style={{ backgroundColor: config.color }}
      />
      <span style={{ color: colors.textSecondary }}>
        {config.label}
      </span>
    </div>
  );
}
