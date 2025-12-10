// =============================================
// usePermissions.ts
// Hook for checking permissions on sections and pages
// =============================================

import { useCallback, useEffect, useState } from 'react';
import { useSecurity } from '../../context/security.tsx';

interface UsePermissionsOptions {
  pageId?: string;
  sectionId?: string;
  autoCheck?: boolean;
}

interface UsePermissionsReturn {
  canView: boolean;
  canEdit: boolean;
  canExecute: boolean;
  isLoading: boolean;
  checkAccess: () => Promise<void>;
}

/**
 * Hook to check permissions for a page or section
 */
export const usePermissions = (
  options: UsePermissionsOptions
): UsePermissionsReturn => {
  const { canViewPage, canEditPage, canViewSection, canEditSection, canExecuteSection } =
    useSecurity();
  const [canView, setCanView] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [canExecute, setCanExecute] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const { pageId, sectionId, autoCheck = true } = options;

  const checkAccess = useCallback(async () => {
    setIsLoading(true);

    if (sectionId) {
      // Check section permissions
      const view = canViewSection(sectionId);
      const edit = canEditSection(sectionId);
      const execute = canExecuteSection(sectionId);

      setCanView(view);
      setCanEdit(edit);
      setCanExecute(execute);
    } else if (pageId) {
      // Check page permissions
      const view = canViewPage(pageId);
      const edit = canEditPage(pageId);

      setCanView(view);
      setCanEdit(edit);
      setCanExecute(false); // Pages don't have execute permission
    }

    setIsLoading(false);
  }, [pageId, sectionId, canViewPage, canEditPage, canViewSection, canEditSection, canExecuteSection]);

  useEffect(() => {
    if (autoCheck && (pageId || sectionId)) {
      checkAccess();
    }
  }, [autoCheck, pageId, sectionId, checkAccess]);

  return {
    canView,
    canEdit,
    canExecute,
    isLoading,
    checkAccess,
  };
};

