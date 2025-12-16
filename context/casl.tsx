// =============================================
// casl.tsx
// CASL Ability Context for RBAC
// =============================================

"use client"

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Ability, AbilityBuilder, ForcedSubject } from '@casl/ability';
import { useAuth } from './auth';
import { API_CONFIG, buildApiUrl, getCurrentTenantId } from '../src/config/api';

// Define CASL actions
export type Actions = 'view' | 'edit' | 'execute' | 'manage';
export type Subjects = string | 'all'; // page_id or section_id

// Define ability type
export type AppAbility = Ability<[Actions, Subjects]>;

interface CaslContextType {
  ability: AppAbility;
  isLoading: boolean;
  pagePermissions: Record<string, boolean>;
  pageCreatePermissions: Record<string, boolean>;
  pageEditPermissions: Record<string, boolean>;
  pageExportPermissions: Record<string, boolean>;
  pageDeletePermissions: Record<string, boolean>;
  refreshAbility: () => Promise<void>;
  loadPageSectionPermissions: (pageId: string) => Promise<void>;
  canViewPage: (pageId: string) => boolean;
  canCreatePage: (pageId: string) => boolean;
  canEditPage: (pageId: string) => boolean;
  canExportPage: (pageId: string) => boolean;
  canDeletePage: (pageId: string) => boolean;
  canViewSection: (sectionId: string) => boolean;
  canEditSection: (sectionId: string) => boolean;
  canExecuteSection: (sectionId: string) => boolean;
}

const CaslContext = createContext<CaslContextType | null>(null);

function useCasl() {
  const context = useContext(CaslContext);
  if (!context) {
    throw new Error('useCasl must be used within CaslProvider');
  }
  return context;
}

export { useCasl };

export const CaslProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { uid, partnerId, sessionId, isAuthenticated, isLoading: authLoading } = useAuth();
  
  const [ability, setAbility] = useState<AppAbility>(new Ability());
  const [isLoading, setIsLoading] = useState(true);
  
  const [userId, setUserId] = useState<number | null>(null);
  const [pagePermissions, setPagePermissions] = useState<Record<string, boolean>>({});
  const [pageCreatePermissions, setPageCreatePermissions] = useState<Record<string, boolean>>({});
  const [pageEditPermissions, setPageEditPermissions] = useState<Record<string, boolean>>({});
  const [pageExportPermissions, setPageExportPermissions] = useState<Record<string, boolean>>({});
  const [pageDeletePermissions, setPageDeletePermissions] = useState<Record<string, boolean>>({});
  const [sectionPermissions, setSectionPermissions] = useState<Record<string, { view: boolean; edit: boolean; execute: boolean }>>({});

  /**
   * Set user ID from auth context
   */
  const loadUserId = useCallback(async () => {
    if (!uid || !isAuthenticated) {
      setUserId(null);
      return;
    }

    try {
      const userIdNum = parseInt(uid);
      if (isNaN(userIdNum)) {
        console.error('Invalid user ID:', uid);
        setUserId(null);
        return;
      }
      setUserId(userIdNum);
    } catch (error) {
      console.error('Error loading user ID:', error);
      setUserId(null);
    }
  }, [uid, isAuthenticated]);

  /**
   * Load page permissions using ABAC policy_permissions table
   * Gets all page permissions for the user in one call
   */
  const loadPagePermissions = useCallback(async () => {
    if (!userId || !isAuthenticated) {
      setPagePermissions({});
      return;
    }

    try {
      const startTime = performance.now();
      
      // Use the bulk endpoint to get all page permissions at once
      const tenantId = getCurrentTenantId();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Session-ID': sessionId || '',
      };
      if (tenantId) {
        headers['X-Tenant-ID'] = tenantId;
      }
      
      const response = await fetch(
        buildApiUrl(`/v1/abac/permissions/pages/all?userId=${userId}`),
        {
          method: 'GET',
          headers,
        }
      );

      const data = await response.json();
      const endTime = performance.now();

      if (data.success && data.data) {
        // data.data is a map of page_key -> { view: boolean, edit: boolean, create: boolean, export: boolean, delete: boolean, ... }
        // Separate view, create, edit, export, and delete permissions
        const viewPermissions: Record<string, boolean> = {};
        const createPermissions: Record<string, boolean> = {};
        const editPermissions: Record<string, boolean> = {};
        const exportPermissions: Record<string, boolean> = {};
        const deletePermissions: Record<string, boolean> = {};
        
        Object.entries(data.data).forEach(([pageKey, perms]: [string, any]) => {
          viewPermissions[pageKey] = perms.view || false;
          createPermissions[pageKey] = perms.create || false;
          editPermissions[pageKey] = perms.edit || false;
          exportPermissions[pageKey] = perms.export || false;
          deletePermissions[pageKey] = perms.delete || false;
        });

        setPagePermissions(viewPermissions);
        setPageCreatePermissions(createPermissions);
        setPageEditPermissions(editPermissions);
        setPageExportPermissions(exportPermissions);
        setPageDeletePermissions(deletePermissions);
      } else {
        console.warn('Error loading page permissions, denying all by default');
        setPagePermissions({});
        setPageCreatePermissions({});
        setPageEditPermissions({});
        setPageExportPermissions({});
        setPageDeletePermissions({});
      }
    } catch (error) {
      console.error('Error loading page permissions:', error);
      // Default to denying all on error (strict security)
      setPagePermissions({});
      setPageCreatePermissions({});
      setPageEditPermissions({});
      setPageExportPermissions({});
      setPageDeletePermissions({});
    }
  }, [userId, sessionId, isAuthenticated]);

  /**
   * Load section permissions for the user's role
   * This loads all section permissions (called on initial load)
   */
  const loadSectionPermissions = useCallback(async () => {
    if (!userId || !isAuthenticated) {
      setSectionPermissions({});
      return;
    }

    // For now, we'll load section permissions on-demand per page
    // This function is kept for future bulk loading if needed
    setSectionPermissions({});
  }, [userId, isAuthenticated]);

  /**
   * Load all section permissions for a specific page
   * This is called when a page is accessed to preload all section permissions
   */
  const loadPageSectionPermissions = useCallback(async (pageId: string) => {
    if (!userId || !isAuthenticated || !pageId) {
      return;
    }

    try {
      
      // Use ABAC to get all sections for this page and evaluate permissions
      // For now, we'll use the registry to get sections, then evaluate each
      // TODO: Consider adding a bulk endpoint for section permissions
      
      // Get sections from registry (if available) or evaluate on-demand
      // For now, sections will be loaded on-demand via loadSectionPermission
    } catch (error) {
      console.error(`Error loading section permissions for page ${pageId}:`, error);
    }
  }, [userId, sessionId, isAuthenticated]);

  /**
   * Build CASL ability rules based on permissions
   * 
   * Strict by default when using ABAC:
   * - Only allow pages that are explicitly granted
   * - Deny all others
   */
  const buildAbility = useCallback(() => {
    const { can, cannot, build } = new AbilityBuilder<AppAbility>(Ability);

    if (!userId) {
      // No user ID = deny all (strict - require authentication)
      setAbility(build());
      return;
    }

    // Add page-level permissions
    // Only grant permission if explicitly allowed by ABAC
    Object.entries(pagePermissions).forEach(([pageId, canView]) => {
      if (canView) {
        can('view', pageId);
      } else {
        // Explicitly deny if ABAC evaluation returned false
        cannot('view', pageId);
      }
    });

    // Note: Pages not in pagePermissions are denied by default (strict security)
    // This means if a page wasn't evaluated or doesn't exist, access is denied

    // Add section permissions (will be loaded on-demand)
    Object.entries(sectionPermissions).forEach(([sectionId, perms]) => {
      if (perms.view) {
        can('view', sectionId);
      } else {
        cannot('view', sectionId);
      }
      if (perms.edit) {
        can('edit', sectionId);
      } else {
        cannot('edit', sectionId);
      }
      if (perms.execute) {
        can('execute', sectionId);
      } else {
        cannot('execute', sectionId);
      }
    });

    const builtAbility = build();
    setAbility(builtAbility);
  }, [userId, pagePermissions, sectionPermissions]);

  /**
   * Refresh ability by reloading permissions
   */
  const refreshAbility = useCallback(async () => {
    setIsLoading(true);
    await loadUserId();
    await loadPagePermissions();
    await loadSectionPermissions();
    setIsLoading(false);
  }, [loadUserId, loadPagePermissions, loadSectionPermissions]);

  /**
   * Load section permissions for a specific section using ABAC
   */
  const loadSectionPermission = useCallback(async (sectionId: string) => {
    if (!userId || !isAuthenticated || sectionPermissions[sectionId]) {
      return; // Already loaded or no user ID
    }

    try {
      // Use ABAC evaluation to check section permissions
      const actions = ['view', 'edit', 'execute'];
      const tenantId = getCurrentTenantId();
      const permissionPromises = actions.map(async (action) => {
        try {
          const reqHeaders: Record<string, string> = {
            'Content-Type': 'application/json',
            'X-Session-ID': sessionId || '',
          };
          if (tenantId) {
            reqHeaders['X-Tenant-ID'] = tenantId;
          }
          
          const response = await fetch(
            buildApiUrl(`/v1/abac/evaluate`),
            {
              method: 'POST',
              headers: reqHeaders,
              body: JSON.stringify({
                userId: userId,
                targetType: 'section',
                targetKey: sectionId,
                action: action
              })
            }
          );

          const data = await response.json();
          return { action, allowed: data.success && data.data?.allowed || false };
        } catch (error) {
          console.error(`Error evaluating ${action} permission for section ${sectionId}:`, error);
          return { action, allowed: false };
        }
      });

      const results = await Promise.all(permissionPromises);
      const permissions: { view: boolean; edit: boolean; execute: boolean } = {
        view: false,
        edit: false,
        execute: false
      };

      results.forEach(({ action, allowed }) => {
        if (action === 'view') permissions.view = allowed;
        if (action === 'edit') permissions.edit = allowed;
        if (action === 'execute') permissions.execute = allowed;
      });

      setSectionPermissions((prev) => ({
        ...prev,
        [sectionId]: permissions,
      }));

      // Rebuild ability with new section permission
      buildAbility();
    } catch (error) {
      console.error(`Error loading section permission for ${sectionId}:`, error);
      // Default deny on error (strict)
      setSectionPermissions((prev) => ({
        ...prev,
        [sectionId]: {
          view: false,
          edit: false,
          execute: false,
        },
      }));
      buildAbility();
    }
  }, [userId, sessionId, isAuthenticated, sectionPermissions, buildAbility]);

  // Track if we've already loaded permissions to prevent re-fetching
  const hasLoadedPermissions = useRef(false);
  const isLoadingRef = useRef(false);

  // Reset loaded flag when authentication state changes
  useEffect(() => {
    if (!isAuthenticated) {
      hasLoadedPermissions.current = false;
      isLoadingRef.current = false;
    }
  }, [isAuthenticated]);

  // Initial load - runs once when authenticated and auth has finished loading
  useEffect(() => {
    // Wait for auth to finish loading before initializing CASL
    if (authLoading) {
      setIsLoading(true);
      return;
    }

    if (!isAuthenticated || !uid) {
      setAbility(new Ability());
      setIsLoading(false);
      setUserId(null);
      setPagePermissions({});
      setPageCreatePermissions({});
      setPageEditPermissions({});
      setPageExportPermissions({});
      setPageDeletePermissions({});
      hasLoadedPermissions.current = false;
      isLoadingRef.current = false;
      return;
    }

    // Only load once per authentication, and don't start if already loading
    if (hasLoadedPermissions.current || isLoadingRef.current) {
      return;
    }

    isLoadingRef.current = true;
    setIsLoading(true);
    
    // Load permissions directly without using refreshAbility to avoid dependency issues
    const loadPermissions = async () => {
      try {
        // Load user ID first
        const userIdNum = parseInt(uid);
        if (isNaN(userIdNum)) {
          console.error('[CASL_PROVIDER] Invalid user ID:', uid);
          setIsLoading(false);
          isLoadingRef.current = false;
          return;
        }
        
        setUserId(userIdNum);

        // Load page permissions
        const tenantId = getCurrentTenantId();
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'X-Session-ID': sessionId || '',
        };
        if (tenantId) {
          headers['X-Tenant-ID'] = tenantId;
        }
        
        const response = await fetch(
          buildApiUrl(`/v1/abac/permissions/pages/all?userId=${userIdNum}`),
          { method: 'GET', headers }
        );

        const data = await response.json();

        if (data.success && data.data) {
          const viewPermissions: Record<string, boolean> = {};
          const createPermissions: Record<string, boolean> = {};
          const editPermissions: Record<string, boolean> = {};
          const exportPermissions: Record<string, boolean> = {};
          const deletePermissions: Record<string, boolean> = {};
          
          Object.entries(data.data).forEach(([pageKey, perms]: [string, any]) => {
            viewPermissions[pageKey] = perms.view || false;
            createPermissions[pageKey] = perms.create || false;
            editPermissions[pageKey] = perms.edit || false;
            exportPermissions[pageKey] = perms.export || false;
            deletePermissions[pageKey] = perms.delete || false;
          });

          setPagePermissions(viewPermissions);
          setPageCreatePermissions(createPermissions);
          setPageEditPermissions(editPermissions);
          setPageExportPermissions(exportPermissions);
          setPageDeletePermissions(deletePermissions);
        } else {
          console.warn('[CASL_PROVIDER] Failed to load permissions, denying all by default');
          setPagePermissions({});
          setPageCreatePermissions({});
          setPageEditPermissions({});
          setPageExportPermissions({});
          setPageDeletePermissions({});
        }
        
        hasLoadedPermissions.current = true;
      } catch (error) {
        console.error('[CASL_PROVIDER] Error loading permissions:', error);
        setPagePermissions({});
        setPageCreatePermissions({});
        setPageEditPermissions({});
        setPageExportPermissions({});
        setPageDeletePermissions({});
      } finally {
        setIsLoading(false);
        isLoadingRef.current = false;
      }
    };

    loadPermissions();
  }, [isAuthenticated, uid, sessionId, authLoading]);

  // Rebuild ability when permissions change (only after initial load completes)
  useEffect(() => {
    // Only build ability if we have a userId and permissions have been loaded
    // This prevents building with empty permissions on initial mount
    if (userId !== null && !isLoading && hasLoadedPermissions.current) {
      buildAbility();
    } else if (userId === null && !isAuthenticated) {
      // Clear ability if user is not authenticated
      setAbility(new Ability());
    }
  }, [userId, pagePermissions, sectionPermissions, buildAbility, isLoading, isAuthenticated]);

  // Helper functions
  const canViewPage = useCallback((pageId: string) => {
    // If still loading, allow access temporarily (UI is shown during loading)
    // This prevents components from breaking while permissions load
    if (isLoading) {
      return true;
    }
    
    // If no user ID, deny access (strict - require authentication)
    if (!userId) {
      return false;
    }
    
    // Check if page is in permissions
    if (!(pageId in pagePermissions)) {
      // Page not evaluated yet or doesn't exist - deny by default (strict security)
      // This means: if page wasn't evaluated, access is denied
      console.warn(`Page ${pageId} not in permissions map, denying access`);
      return false;
    }
    
    // Return the permission directly from pagePermissions (already evaluated by ABAC)
    return pagePermissions[pageId];
  }, [isLoading, userId, pagePermissions]);

  const canCreatePage = useCallback((pageId: string) => {
    // If still loading, allow access temporarily
    if (isLoading) {
      return true;
    }
    
    // If no user ID, deny access (strict - require authentication)
    if (!userId) {
      return false;
    }
    
    // Check if page is in create permissions
    if (!(pageId in pageCreatePermissions)) {
      // Page not evaluated yet or doesn't exist - deny by default (strict security)
      return false;
    }
    
    // Return the create permission directly from pageCreatePermissions
    return pageCreatePermissions[pageId];
  }, [isLoading, userId, pageCreatePermissions]);

  const canEditPage = useCallback((pageId: string) => {
    // If still loading, allow access temporarily (UI is shown during loading)
    if (isLoading) {
      return true;
    }
    
    // If no user ID, deny access (strict - require authentication)
    if (!userId) {
      return false;
    }
    
    // Check if page is in edit permissions
    if (!(pageId in pageEditPermissions)) {
      // Page not evaluated yet or doesn't exist - deny by default (strict security)
      return false;
    }
    
    // Return the edit permission directly from pageEditPermissions
    return pageEditPermissions[pageId];
  }, [isLoading, userId, pageEditPermissions]);

  const canExportPage = useCallback((pageId: string) => {
    // If still loading, allow access temporarily (UI is shown during loading)
    if (isLoading) {
      return true;
    }
    
    // If no user ID, deny access (strict - require authentication)
    if (!userId) {
      return false;
    }
    
    // Check if page is in export permissions
    if (!(pageId in pageExportPermissions)) {
      // Page not evaluated yet or doesn't exist - deny by default (strict security)
      return false;
    }
    
    // Return the export permission directly from pageExportPermissions
    return pageExportPermissions[pageId];
  }, [isLoading, userId, pageExportPermissions]);

  const canDeletePage = useCallback((pageId: string) => {
    // If still loading, allow access temporarily
    if (isLoading) {
      return true;
    }
    
    // If no user ID, deny access (strict - require authentication)
    if (!userId) {
      return false;
    }
    
    // Check if page is in delete permissions
    if (!(pageId in pageDeletePermissions)) {
      // Page not evaluated yet or doesn't exist - deny by default (strict security)
      return false;
    }
    
    // Return the delete permission directly from pageDeletePermissions
    return pageDeletePermissions[pageId];
  }, [isLoading, userId, pageDeletePermissions]);

  const canViewSection = useCallback((sectionId: string) => {
    // Load permission if not already loaded
    if (!sectionPermissions[sectionId]) {
      loadSectionPermission(sectionId);
      // Return true while loading (permissive - allow until we know)
      return true;
    }
    // If section has explicit permissions, check them
    // If no permissions set, CASL will return true (permissive)
    return ability.can('view', sectionId);
  }, [ability, sectionPermissions, loadSectionPermission]);

  const canEditSection = useCallback((sectionId: string) => {
    if (!sectionPermissions[sectionId]) {
      loadSectionPermission(sectionId);
      // Return true while loading (permissive - allow until we know)
      return true;
    }
    // If section has explicit permissions, check them
    // If no permissions set, CASL will return true (permissive)
    return ability.can('edit', sectionId);
  }, [ability, sectionPermissions, loadSectionPermission]);

  const canExecuteSection = useCallback((sectionId: string) => {
    if (!sectionPermissions[sectionId]) {
      loadSectionPermission(sectionId);
      // Return true while loading (permissive - allow until we know)
      return true;
    }
    // If section has explicit permissions, check them
    // If no permissions set, CASL will return true (permissive)
    return ability.can('execute', sectionId);
  }, [ability, sectionPermissions, loadSectionPermission]);

  const value = useMemo(() => ({
    ability,
    isLoading,
    pagePermissions,
    pageCreatePermissions,
    pageEditPermissions,
    pageExportPermissions,
    pageDeletePermissions,
    refreshAbility,
    loadPageSectionPermissions,
    canViewPage,
    canCreatePage,
    canEditPage,
    canExportPage,
    canDeletePage,
    canViewSection,
    canEditSection,
    canExecuteSection,
  }), [ability, isLoading, pagePermissions, pageCreatePermissions, pageEditPermissions, pageExportPermissions, pageDeletePermissions, refreshAbility, loadPageSectionPermissions, canViewPage, canCreatePage, canEditPage, canExportPage, canDeletePage, canViewSection, canEditSection, canExecuteSection]);

  return (
    <CaslContext.Provider value={value}>
      {children}
    </CaslContext.Provider>
  );
};

