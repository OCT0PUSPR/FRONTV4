// Toolbar Component - Top navigation bar with back, home, help, fullscreen

import { ArrowLeft, Home, HelpCircle, Maximize, Minimize } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../../context/theme';

interface ToolbarProps {
  onBack?: () => void;
  onHome?: () => void;
  onHelp?: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  canGoBack?: boolean;
}

export function Toolbar({
  onBack,
  onHome,
  onHelp,
  isFullscreen,
  onToggleFullscreen,
  canGoBack = true,
}: ToolbarProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <div
      className="flex items-center gap-2 px-2 py-1 border-b"
      style={{ borderColor: colors.border }}
    >
      {/* Back button */}
      <button
        onClick={onBack}
        disabled={!canGoBack}
        className={`
          p-2 rounded-md transition-colors
          ${canGoBack
            ? 'hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-600 dark:text-zinc-400'
            : 'text-gray-300 dark:text-zinc-700 cursor-not-allowed'
          }
        `}
        title={t('warehouse_navigator.back', 'Back')}
        aria-label={t('warehouse_navigator.back', 'Back')}
      >
        <ArrowLeft className="h-5 w-5" />
      </button>

      {/* Home button */}
      <button
        onClick={onHome}
        className="
          p-2 rounded-md transition-colors
          hover:bg-gray-100 dark:hover:bg-zinc-800
          text-gray-600 dark:text-zinc-400
        "
        title={t('warehouse_navigator.home', 'Home')}
        aria-label={t('warehouse_navigator.home', 'Home')}
      >
        <Home className="h-5 w-5" />
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Help button */}
      <button
        onClick={onHelp}
        className="
          p-2 rounded-md transition-colors
          hover:bg-gray-100 dark:hover:bg-zinc-800
          text-gray-600 dark:text-zinc-400
        "
        title={t('warehouse_navigator.controls_help', 'Controls')}
        aria-label={t('warehouse_navigator.controls_help', 'Controls')}
      >
        <HelpCircle className="h-5 w-5" />
      </button>

      {/* Fullscreen button */}
      <button
        onClick={onToggleFullscreen}
        className="
          p-2 rounded-md transition-colors
          hover:bg-gray-100 dark:hover:bg-zinc-800
          text-gray-600 dark:text-zinc-400
        "
        title={isFullscreen
          ? t('warehouse_navigator.exit_fullscreen', 'Exit Fullscreen')
          : t('warehouse_navigator.fullscreen', 'Fullscreen')
        }
        aria-label={isFullscreen
          ? t('warehouse_navigator.exit_fullscreen', 'Exit Fullscreen')
          : t('warehouse_navigator.fullscreen', 'Fullscreen')
        }
      >
        {isFullscreen ? (
          <Minimize className="h-5 w-5" />
        ) : (
          <Maximize className="h-5 w-5" />
        )}
      </button>
    </div>
  );
}
