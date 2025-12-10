// =============================================
// useSectionStyles.ts
// Hook for applying styles to sections
// =============================================

import { useCallback, useEffect, useState, CSSProperties } from 'react';
import { usePersonalization } from '../../context/personalization.tsx';

interface UseSectionStylesOptions {
  sectionId: string;
  defaultStyles?: CSSProperties;
  autoLoad?: boolean;
}

interface UseSectionStylesReturn {
  styles: CSSProperties;
  customStyles: any | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

/**
 * Hook to get and apply styles for a section
 */
export const useSectionStyles = (
  options: UseSectionStylesOptions
): UseSectionStylesReturn => {
  const { sectionId, defaultStyles = {}, autoLoad = true } = options;
  const { getSectionStyles, applyStyles, refreshStyles } = usePersonalization();
  const [styles, setStyles] = useState<CSSProperties>(defaultStyles);
  const [customStyles, setCustomStyles] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadStyles = useCallback(async () => {
    setIsLoading(true);

    const custom = getSectionStyles(sectionId);
    setCustomStyles(custom);

    const mergedStyles = applyStyles(sectionId, defaultStyles);
    setStyles(mergedStyles);

    setIsLoading(false);
  }, [sectionId, defaultStyles, getSectionStyles, applyStyles]);

  useEffect(() => {
    if (autoLoad) {
      loadStyles();
    }
  }, [autoLoad, loadStyles]);

  const refresh = useCallback(async () => {
    await refreshStyles(undefined, sectionId);
    await loadStyles();
  }, [sectionId, refreshStyles, loadStyles]);

  return {
    styles,
    customStyles,
    isLoading,
    refresh,
  };
};

