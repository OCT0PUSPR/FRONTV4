// Empty State Component - Shown when no locations are configured

import { Warehouse, ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../../context/theme';

interface EmptyStateProps {
  onConfigureClick?: () => void;
}

export function EmptyState({ onConfigureClick }: EmptyStateProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      {/* Illustration */}
      <div
        className="
          w-32 h-32 mb-6 rounded-full flex items-center justify-center
          bg-gray-100 dark:bg-zinc-800
        "
      >
        <Warehouse className="h-16 w-16 text-gray-300 dark:text-zinc-600" />
      </div>

      {/* Title */}
      <h2
        className="text-xl font-semibold mb-2"
        style={{ color: colors.textPrimary }}
      >
        {t('warehouse_navigator.empty_warehouse', 'No locations configured')}
      </h2>

      {/* Description */}
      <p
        className="text-sm max-w-md mb-6"
        style={{ color: colors.textSecondary }}
      >
        {t(
          'warehouse_navigator.empty_warehouse_desc',
          'Configure storage locations to visualize your warehouse.'
        )}
      </p>

      {/* Action button */}
      {onConfigureClick && (
        <button
          onClick={onConfigureClick}
          className="
            flex items-center gap-2 px-4 py-2 rounded-md
            bg-blue-500 text-white
            hover:bg-blue-600 transition-colors
          "
        >
          {t('warehouse_navigator.configure', 'Go to Inventory Settings')}
          <ExternalLink className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
