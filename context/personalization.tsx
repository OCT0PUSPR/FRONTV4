// =============================================
// personalization.tsx
// Personalization Context for managing styles
// =============================================

"use client"

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './auth';
import { useTheme } from './theme';
import { API_CONFIG } from '../src/config/api';

interface StyleCache {
  [sectionId: string]: {
    styles: any;
    timestamp: number;
  };
}

interface PersonalizationContextType {
  // Get styles for a section
  getSectionStyles: (sectionId: string) => any | null;
  
  // Get all styles for current page
  getPageStyles: (pageId: string) => Record<string, any>;
  
  // Apply styles to an element
  applyStyles: (sectionId: string, defaultStyles?: React.CSSProperties) => React.CSSProperties;
  
  // Loading states
  isLoading: boolean;
  
  // Refresh styles
  refreshStyles: (pageId?: string, sectionId?: string) => Promise<void>;
  
  // Clear cache
  clearCache: () => void;
}

const PersonalizationContext = createContext<PersonalizationContextType | null>(null);

const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes (styles change less frequently)

export const PersonalizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { sessionId, isAuthenticated } = useAuth();
  const { mode } = useTheme();
  const [styleCache, setStyleCache] = useState<StyleCache>({});
  const [pageStylesCache, setPageStylesCache] = useState<Record<string, Record<string, any>>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [loadingSections, setLoadingSections] = useState<Set<string>>(new Set());

  /**
   * Check if cache entry is still valid
   */
  const isCacheValid = useCallback((timestamp: number): boolean => {
    return Date.now() - timestamp < CACHE_DURATION;
  }, []);

  /**
   * Load styles for a section
   */
  const loadSectionStyles = useCallback(
    async (sectionId: string, theme: string = mode): Promise<any | null> => {
      const cacheKey = `${sectionId}_${theme}`;
      const cached = styleCache[cacheKey];
      
      if (cached && isCacheValid(cached.timestamp)) {
        return cached.styles;
      }

      // Prevent duplicate requests
      if (loadingSections.has(cacheKey)) {
        return null;
      }

      if (!isAuthenticated) {
        return null;
      }

      setLoadingSections((prev) => new Set(prev).add(cacheKey));

      try {
        const response = await fetch(
          `${API_CONFIG.BACKEND_BASE_URL}/v1/personalization/styles/${sectionId}?theme=${theme}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'X-Session-ID': sessionId || '',
            },
          }
        );

        const data = await response.json();
        if (data.success && data.styles) {
          // Cache the result
          setStyleCache((prev) => ({
            ...prev,
            [cacheKey]: {
              styles: data.styles,
              timestamp: Date.now(),
            },
          }));

          return data.styles;
        }

        return null;
      } catch (error) {
        console.error('Error loading section styles:', error);
        return null;
      } finally {
        setLoadingSections((prev) => {
          const next = new Set(prev);
          next.delete(cacheKey);
          return next;
        });
      }
    },
    [isAuthenticated, sessionId, mode, styleCache, isCacheValid, loadingSections]
  );

  /**
   * Load all styles for a page
   */
  const loadPageStyles = useCallback(
    async (pageId: string, theme: string = mode): Promise<Record<string, any>> => {
      const cacheKey = `${pageId}_${theme}`;
      const cached = pageStylesCache[cacheKey];
      
      if (cached && isCacheValid(Object.values(cached)[0]?.timestamp || 0)) {
        return cached;
      }

      if (!isAuthenticated) {
        return {};
      }

      try {
        setIsLoading(true);
        const response = await fetch(
          `${API_CONFIG.BACKEND_BASE_URL}/v1/personalization/styles/page/${pageId}?theme=${theme}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'X-Session-ID': sessionId || '',
            },
          }
        );

        const data = await response.json();
        if (data.success && data.styles) {
          // Cache the result
          setPageStylesCache((prev) => ({
            ...prev,
            [cacheKey]: data.styles,
          }));

          return data.styles;
        }

        return {};
      } catch (error) {
        console.error('Error loading page styles:', error);
        return {};
      } finally {
        setIsLoading(false);
      }
    },
    [isAuthenticated, sessionId, mode, pageStylesCache, isCacheValid]
  );

  /**
   * Get styles for a section (synchronous, uses cache)
   */
  const getSectionStyles = useCallback(
    (sectionId: string): any | null => {
      const cacheKey = `${sectionId}_${mode}`;
      const cached = styleCache[cacheKey];
      
      if (cached && isCacheValid(cached.timestamp)) {
        return cached.styles;
      }
      
      // If not cached, trigger async load
      loadSectionStyles(sectionId, mode);
      return null;
    },
    [mode, styleCache, isCacheValid, loadSectionStyles]
  );

  /**
   * Get all styles for a page (synchronous, uses cache)
   */
  const getPageStyles = useCallback(
    (pageId: string): Record<string, any> => {
      const cacheKey = `${pageId}_${mode}`;
      const cached = pageStylesCache[cacheKey];
      
      if (cached) {
        return cached;
      }
      
      // If not cached, trigger async load
      loadPageStyles(pageId, mode);
      return {};
    },
    [mode, pageStylesCache, loadPageStyles]
  );

  /**
   * Apply styles to an element, merging with default styles
   */
  const applyStyles = useCallback(
    (sectionId: string, defaultStyles: React.CSSProperties = {}): React.CSSProperties => {
      const styles = getSectionStyles(sectionId);
      
      if (!styles) {
        return defaultStyles;
      }

      // Convert database styles to CSS properties
      const appliedStyles: React.CSSProperties = {
        ...defaultStyles,
      };

      if (styles.background_color) {
        appliedStyles.backgroundColor = styles.background_color;
      }

      if (styles.text_color) {
        appliedStyles.color = styles.text_color;
      }

      if (styles.border_color) {
        appliedStyles.borderColor = styles.border_color;
      }

      if (styles.border_width !== undefined) {
        appliedStyles.borderWidth = `${styles.border_width}px`;
      }

      if (styles.border_radius !== undefined) {
        appliedStyles.borderRadius = `${styles.border_radius}px`;
      }

      if (styles.padding !== undefined) {
        appliedStyles.padding = `${styles.padding}px`;
      }

      if (styles.margin !== undefined) {
        appliedStyles.margin = `${styles.margin}px`;
      }

      if (styles.font_size !== undefined) {
        appliedStyles.fontSize = `${styles.font_size}px`;
      }

      if (styles.font_weight) {
        appliedStyles.fontWeight = styles.font_weight;
      }

      // Apply custom CSS if available
      if (styles.custom_css) {
        // Custom CSS would need to be injected separately
        // For now, we'll just return the styles object
      }

      return appliedStyles;
    },
    [getSectionStyles]
  );

  /**
   * Refresh styles for a specific section/page or all
   */
  const refreshStyles = useCallback(
    async (pageId?: string, sectionId?: string) => {
      if (sectionId) {
        // Clear cache for specific section
        setStyleCache((prev) => {
          const next = { ...prev };
          Object.keys(next).forEach((key) => {
            if (key.startsWith(`${sectionId}_`)) {
              delete next[key];
            }
          });
          return next;
        });
        // Re-load styles
        await loadSectionStyles(sectionId, mode);
      } else if (pageId) {
        // Clear cache for specific page
        setPageStylesCache((prev) => {
          const next = { ...prev };
          Object.keys(next).forEach((key) => {
            if (key.startsWith(`${pageId}_`)) {
              delete next[key];
            }
          });
          return next;
        });
        // Re-load styles
        await loadPageStyles(pageId, mode);
      } else {
        // Clear all caches
        setStyleCache({});
        setPageStylesCache({});
      }
    },
    [mode, loadSectionStyles, loadPageStyles]
  );

  /**
   * Clear all caches
   */
  const clearCache = useCallback(() => {
    setStyleCache({});
    setPageStylesCache({});
  }, []);

  // Reload styles when theme changes
  useEffect(() => {
    // Clear cache when theme changes to force reload
    setStyleCache({});
    setPageStylesCache({});
  }, [mode]);

  const value: PersonalizationContextType = useMemo(
    () => ({
      getSectionStyles,
      getPageStyles,
      applyStyles,
      isLoading,
      refreshStyles,
      clearCache,
    }),
    [getSectionStyles, getPageStyles, applyStyles, isLoading, refreshStyles, clearCache]
  );

  return <PersonalizationContext.Provider value={value}>{children}</PersonalizationContext.Provider>;
};

export const usePersonalization = () => {
  const context = useContext(PersonalizationContext);
  if (!context) {
    throw new Error('usePersonalization must be used within a PersonalizationProvider');
  }
  return context;
};

