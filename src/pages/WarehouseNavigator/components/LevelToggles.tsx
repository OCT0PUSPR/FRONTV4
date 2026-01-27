// Level Toggles Component - Checkboxes for filtering by shelf level

import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../../context/theme';
import { LEVEL_CODES } from '../types';

interface LevelTogglesProps {
  visibleLevels: Set<string>;
  onToggle: (level: string) => void;
}

export function LevelToggles({ visibleLevels, onToggle }: LevelTogglesProps) {
  const { t } = useTranslation();
  const { colors, mode } = useTheme();
  const isDark = mode === 'dark';

  // Check if all levels are visible (or none selected = all visible)
  const allVisible = visibleLevels.size === 0 || visibleLevels.size === LEVEL_CODES.length;

  // Toggle all levels
  const handleToggleAll = useCallback(() => {
    if (allVisible) {
      // Hide all - but this doesn't make sense, so we'll just clear
      LEVEL_CODES.forEach(level => {
        if (visibleLevels.has(level)) {
          onToggle(level);
        }
      });
    } else {
      // Show all
      LEVEL_CODES.forEach(level => {
        if (!visibleLevels.has(level)) {
          onToggle(level);
        }
      });
    }
  }, [allVisible, visibleLevels, onToggle]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: colors.textSecondary }}
        >
          {t('warehouse_navigator.level_filter', 'Level Filter')}
        </h3>
        <button
          onClick={handleToggleAll}
          className="text-xs text-blue-500 hover:text-blue-600 transition-colors"
        >
          {allVisible
            ? t('warehouse_navigator.hide_all', 'Hide all')
            : t('warehouse_navigator.show_all', 'Show all')
          }
        </button>
      </div>

      <div className="grid grid-cols-4 gap-1">
        {LEVEL_CODES.map((level) => {
          // When visibleLevels is empty, all are visible
          const isVisible = visibleLevels.size === 0 || visibleLevels.has(level);

          return (
            <label
              key={level}
              className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-md cursor-pointer transition-all duration-150"
              style={{
                backgroundColor: isVisible
                  ? (isDark ? 'rgba(59, 130, 246, 0.2)' : '#dbeafe')
                  : colors.mutedBg,
                color: isVisible
                  ? (isDark ? '#60a5fa' : '#1d4ed8')
                  : colors.textSecondary,
              }}
            >
              <input
                type="checkbox"
                checked={isVisible}
                onChange={() => onToggle(level)}
                className="sr-only"
              />
              <span className="text-xs font-medium">{level}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
