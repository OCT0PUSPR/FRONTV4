// Help Tour Component - Onboarding tooltips

import { useState, useCallback } from 'react';
import { X, ChevronLeft, Mouse, Hand, ZoomIn, MousePointerClick, Map } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../../context/theme';

interface HelpTourProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TourStep {
  icon: React.ReactNode;
  titleKey: string;
  descriptionKey: string;
}

export function HelpTour({ isOpen, onClose }: HelpTourProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [currentStep, setCurrentStep] = useState(0);

  const steps: TourStep[] = [
    {
      icon: <Mouse className="h-8 w-8 text-orange-500" />,
      titleKey: 'warehouse_navigator.rotate',
      descriptionKey: 'warehouse_navigator.rotate_desc',
    },
    {
      icon: <Hand className="h-8 w-8 text-orange-500" />,
      titleKey: 'warehouse_navigator.pan',
      descriptionKey: 'warehouse_navigator.pan_desc',
    },
    {
      icon: <ZoomIn className="h-8 w-8 text-orange-500" />,
      titleKey: 'warehouse_navigator.zoom',
      descriptionKey: 'warehouse_navigator.zoom_desc',
    },
    {
      icon: <MousePointerClick className="h-8 w-8 text-orange-500" />,
      titleKey: 'warehouse_navigator.click_to_select',
      descriptionKey: 'warehouse_navigator.click_to_select_desc',
    },
    {
      icon: <Map className="h-8 w-8 text-orange-500" />,
      titleKey: 'warehouse_navigator.minimap',
      descriptionKey: 'warehouse_navigator.minimap_desc',
    },
  ];

  const handleNext = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onClose();
      setCurrentStep(0);
    }
  }, [currentStep, steps.length, onClose]);

  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const handleClose = useCallback(() => {
    onClose();
    setCurrentStep(0);
  }, [onClose]);

  if (!isOpen) return null;

  const step = steps[currentStep];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={handleClose}
    >
      <div
        className="
          w-full max-w-sm mx-4 rounded-lg shadow-xl
          bg-white dark:bg-zinc-900
          border border-gray-200 dark:border-zinc-700
        "
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: colors.border }}>
          <h3 className="text-lg font-semibold" style={{ color: colors.textPrimary }}>
            {t('warehouse_navigator.controls_help', 'Controls')}
          </h3>
          <button
            onClick={handleClose}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-zinc-800"
          >
            <X className="h-5 w-5" style={{ color: colors.textSecondary }} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 text-center">
          <div className="mb-4">
            {step.icon}
          </div>
          <h4
            className="text-lg font-medium mb-2"
            style={{ color: colors.textPrimary }}
          >
            {t(step.titleKey, step.titleKey.split('.').pop())}
          </h4>
          <p
            className="text-sm"
            style={{ color: colors.textSecondary }}
          >
            {t(step.descriptionKey, getDefaultDescription(step.titleKey))}
          </p>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-4 py-3 border-t"
          style={{ borderColor: colors.border }}
        >
          {/* Step indicator */}
          <div className="flex items-center gap-1.5">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`
                  w-2 h-2 rounded-full transition-colors
                  ${index === currentStep ? 'bg-orange-500' : 'bg-gray-200 dark:bg-zinc-700'}
                `}
              />
            ))}
          </div>

          {/* Navigation buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrev}
              disabled={currentStep === 0}
              className={`
                p-2 rounded-md transition-colors
                ${currentStep === 0
                  ? 'text-gray-300 dark:text-zinc-700 cursor-not-allowed'
                  : 'hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-600 dark:text-zinc-400'
                }
              `}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={handleNext}
              className="
                px-4 py-2 rounded-md bg-orange-500 text-white
                hover:bg-orange-600 transition-colors
              "
            >
              {currentStep === steps.length - 1
                ? t('warehouse_navigator.done', 'Done')
                : t('warehouse_navigator.next', 'Next')
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Default descriptions for tour steps
function getDefaultDescription(key: string): string {
  switch (key) {
    case 'warehouse_navigator.rotate':
      return 'Left-click and drag to rotate the 3D view';
    case 'warehouse_navigator.pan':
      return 'Right-click and drag (or Shift + left-click) to pan the view';
    case 'warehouse_navigator.zoom':
      return 'Use the scroll wheel to zoom in and out';
    case 'warehouse_navigator.click_to_select':
      return 'Click on any bin or location in the 3D view or sidebar to select it';
    case 'warehouse_navigator.minimap':
      return 'Click on the minimap to quickly navigate to different areas';
    default:
      return '';
  }
}
