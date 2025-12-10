// =============================================
// security.tsx
// Security Context for managing permissions based on user role
// =============================================

"use client"

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './auth';
import { API_CONFIG } from '../src/config/api';

interface PermissionCache {
  [key: string]: {
    canView: boolean;
    canEdit: boolean;
    timestamp: number;
  };
}

interface SectionPermissionCache {
  [key: string]: {
    permissions: {
      [action: string]: boolean;
    };
    timestamp: number;
  };
}

interface SecurityContextType {
  // User role
  userRole: string | null;
  isLoadingRole: boolean;
  
  // Permission checking functions
  canViewPage: (pageId: string) => boolean;
  canEditPage: (pageId: string) => boolean;
  canViewSection: (sectionId: string) => boolean;
  canEditSection: (sectionId: string) => boolean;
  canExecuteSection: (sectionId: string) => boolean;
  
  // Page configuration
  getPageConfig: (pageId: string) => any | null;
  
  // Loading states
  isLoading: boolean;
  
  // Refresh permissions
  refreshPermissions: (pageId?: string) => Promise<void>;
  refreshRole: () => Promise<void>;
  
  // Cache management
  clearCache: () => void;
}

const SecurityContext = createContext<SecurityContextType | null>(null);

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const SecurityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { partnerId, sessionId, isAuthenticated } = useAuth();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoadingRole, setIsLoadingRole] = useState(false);
  const [pagePermissions, setPagePermissions] = useState<PermissionCache>({});
  const [sectionPermissions, setSectionPermissions] = useState<SectionPermissionCache>({});
  const [pageConfigs, setPageConfigs] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [loadingPages, setLoadingPages] = useState<Set<string>>(new Set());

  const userId = useMemo(() => partnerId, [partnerId]);

  /**
   * Load user role from MariaDB
   */
  const loadUserRole = useCallback(async () => {
    if (!userId || !isAuthenticated) {
      setUserRole(null);
      return;
    }

    try {
      setIsLoadingRole(true);
      const response = await fetch(
        `${API_CONFIG.BACKEND_BASE_URL}/v1/security/user/${userId}/role`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-Session-ID': sessionId || '',
          },
        }
      );

      const data = await response.json();
      if (data.success) {
        setUserRole(data.role);
      } else {
        setUserRole(null);
      }
    } catch (error) {
      console.error('Error loading user role:', error);
      setUserRole(null);
    } finally {
      setIsLoadingRole(false);
    }
  }, [userId, isAuthenticated, sessionId]);

  // Load user role when authenticated
  useEffect(() => {
    if (isAuthenticated && userId) {
      loadUserRole();
    } else {
      setUserRole(null);
    }
  }, [isAuthenticated, userId, loadUserRole]);

  /**
   * Check if cache entry is still valid
   */
  const isCacheValid = useCallback((timestamp: number): boolean => {
    return Date.now() - timestamp < CACHE_DURATION;
  }, []);

  /**
   * Check page access with caching
   */
  const checkPageAccess = useCallback(
    async (pageId: string): Promise<{ canView: boolean; canEdit: boolean }> => {
      // Check cache first
      const cached = pagePermissions[pageId];
      if (cached && isCacheValid(cached.timestamp)) {
        return { canView: cached.canView, canEdit: cached.canEdit };
      }

      // Prevent duplicate requests
      if (loadingPages.has(pageId)) {
        return { canView: false, canEdit: false };
      }

      if (!userId || !isAuthenticated) {
        return { canView: false, canEdit: false };
      }

      setLoadingPages((prev) => new Set(prev).add(pageId));

      try {
        const response = await fetch(
          `${API_CONFIG.BACKEND_BASE_URL}/api/v1/security/user/check-access`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Session-ID': sessionId || '',
            },
            body: JSON.stringify({
              user_id: userId,
              page_id: pageId,
            }),
          }
        );

        const data = await response.json();
        if (data.success) {
          const canView = data.has_access || false;
          const canEdit = false; // Can be extended later

          // Cache the result
          setPagePermissions((prev) => ({
            ...prev,
            [pageId]: {
              canView,
              canEdit,
              timestamp: Date.now(),
            },
          }));

          return { canView, canEdit };
        }

        return { canView: false, canEdit: false };
      } catch (error) {
        console.error('Error checking page access:', error);
        return { canView: false, canEdit: false };
      } finally {
        setLoadingPages((prev) => {
          const next = new Set(prev);
          next.delete(pageId);
          return next;
        });
      }
    },
    [userId, isAuthenticated, sessionId, pagePermissions, isCacheValid, loadingPages]
  );

  /**
   * Check section access with caching
   */
  const checkSectionAccess = useCallback(
    async (sectionId: string, action: string = 'view'): Promise<boolean> => {
      const cacheKey = `${sectionId}_${action}`;
      const cached = sectionPermissions[cacheKey];
      
      if (cached && isCacheValid(cached.timestamp)) {
        return cached.permissions[action] || false;
      }

      if (!userId || !isAuthenticated) {
        return false;
      }

      try {
        const response = await fetch(
          `${API_CONFIG.BACKEND_BASE_URL}/api/v1/security/user/check-access`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Session-ID': sessionId || '',
            },
            body: JSON.stringify({
              user_id: userId,
              section_id: sectionId,
              action: action,
            }),
          }
        );

        const data = await response.json();
        if (data.success) {
          const hasAccess = data.has_access || false;

          // Cache the result
          setSectionPermissions((prev) => ({
            ...prev,
            [cacheKey]: {
              permissions: {
                [action]: hasAccess,
              },
              timestamp: Date.now(),
            },
          }));

          return hasAccess;
        }

        return false;
      } catch (error) {
        console.error('Error checking section access:', error);
        return false;
      }
    },
    [userId, isAuthenticated, sessionId, sectionPermissions, isCacheValid]
  );

  /**
   * Check if user can view a page (synchronous, uses cache)
   */
  const canViewPage = useCallback(
    (pageId: string): boolean => {
      const cached = pagePermissions[pageId];
      if (cached && isCacheValid(cached.timestamp)) {
        return cached.canView;
      }
      // If not cached, trigger async check but return false for now
      checkPageAccess(pageId);
      return false;
    },
    [pagePermissions, isCacheValid, checkPageAccess]
  );

  /**
   * Check if user can edit a page (synchronous, uses cache)
   */
  const canEditPage = useCallback(
    (pageId: string): boolean => {
      const cached = pagePermissions[pageId];
      if (cached && isCacheValid(cached.timestamp)) {
        return cached.canEdit;
      }
      return false;
    },
    [pagePermissions, isCacheValid]
  );

  /**
   * Check if user can view a section (synchronous, uses cache)
   */
  const canViewSection = useCallback(
    (sectionId: string): boolean => {
      const cacheKey = `${sectionId}_view`;
      const cached = sectionPermissions[cacheKey];
      if (cached && isCacheValid(cached.timestamp)) {
        return cached.permissions.view || false;
      }
      // If not cached, trigger async check but return false for now
      checkSectionAccess(sectionId, 'view');
      return false;
    },
    [sectionPermissions, isCacheValid, checkSectionAccess]
  );

  /**
   * Check if user can edit a section (synchronous, uses cache)
   */
  const canEditSection = useCallback(
    (sectionId: string): boolean => {
      const cacheKey = `${sectionId}_edit`;
      const cached = sectionPermissions[cacheKey];
      if (cached && isCacheValid(cached.timestamp)) {
        return cached.permissions.edit || false;
      }
      // If not cached, trigger async check but return false for now
      checkSectionAccess(sectionId, 'edit');
      return false;
    },
    [sectionPermissions, isCacheValid, checkSectionAccess]
  );

  /**
   * Check if user can execute a section (synchronous, uses cache)
   */
  const canExecuteSection = useCallback(
    (sectionId: string): boolean => {
      const cacheKey = `${sectionId}_execute`;
      const cached = sectionPermissions[cacheKey];
      if (cached && isCacheValid(cached.timestamp)) {
        return cached.permissions.execute || false;
      }
      // If not cached, trigger async check but return false for now
      checkSectionAccess(sectionId, 'execute');
      return false;
    },
    [sectionPermissions, isCacheValid, checkSectionAccess]
  );

  /**
   * Get page configuration
   */
  const getPageConfig = useCallback(
    (pageId: string): any | null => {
      return pageConfigs[pageId] || null;
    },
    [pageConfigs]
  );

  /**
   * Refresh permissions for a specific page or all pages
   */
  const refreshPermissions = useCallback(
    async (pageId?: string) => {
      if (pageId) {
        // Clear cache for specific page
        setPagePermissions((prev) => {
          const next = { ...prev };
          delete next[pageId];
          return next;
        });
        // Re-check access
        await checkPageAccess(pageId);
      } else {
        // Clear all caches
        setPagePermissions({});
        setSectionPermissions({});
        setPageConfigs({});
      }
    },
    [checkPageAccess]
  );

  /**
   * Clear all caches
   */
  const clearCache = useCallback(() => {
    setPagePermissions({});
    setSectionPermissions({});
    setPageConfigs({});
  }, []);

  const value: SecurityContextType = useMemo(
    () => ({
      userRole,
      isLoadingRole,
      canViewPage,
      canEditPage,
      canViewSection,
      canEditSection,
      canExecuteSection,
      getPageConfig,
      isLoading,
      refreshPermissions,
      refreshRole: loadUserRole,
      clearCache,
    }),
    [
      userRole,
      isLoadingRole,
      canViewPage,
      canEditPage,
      canViewSection,
      canEditSection,
      canExecuteSection,
      getPageConfig,
      isLoading,
      refreshPermissions,
      loadUserRole,
      clearCache,
    ]
  );

  return <SecurityContext.Provider value={value}>{children}</SecurityContext.Provider>;
};

export const useSecurity = () => {
  const context = useContext(SecurityContext);
  if (!context) {
    throw new Error('useSecurity must be used within a SecurityProvider');
  }
  return context;
};

