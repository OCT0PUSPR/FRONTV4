// =============================================
// ProtectedRoute.tsx
// Route protection using CASL permissions
// =============================================

"use client"

import React, { useMemo } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useCasl } from '../../context/casl';
import { useTranslation } from 'react-i18next';
import { ShieldAlert, ArrowLeft, Home, Mail } from 'lucide-react';
import { useTheme } from '../../context/theme';
import { ROUTE_TO_PAGE_ID, getRouteFromPageId } from '../config/pageRoutes';

interface ProtectedRouteProps {
  children: React.ReactNode;
  pageId: string;
}

// Menu items structure for finding accessible routes
const MENU_ITEMS = [
  { url: '/overview', pageId: 'overview' },
  { url: '/dashboard', pageId: 'dashboard' },
  { url: '/receipts', pageId: 'receipts' },
  { url: '/deliveries', pageId: 'deliveries' },
  { url: '/internal', pageId: 'internal' },
  { url: '/manufacturing', pageId: 'manufacturing' },
  { url: '/dropships', pageId: 'dropship' },
  { url: '/batch', pageId: 'batch' },
  { url: '/wave', pageId: 'wave' },
  { url: '/physical-inventory', pageId: 'physical-inventory' },
  { url: '/scrap', pageId: 'scrap' },
  { url: '/landed-costs', pageId: 'landed-costs' },
  { url: '/products', pageId: 'products' },
  { url: '/product-variants', pageId: 'product-variants' },
  { url: '/lots-serial', pageId: 'lots-serial' },
  { url: '/product-packages', pageId: 'product-packages' },
  { url: '/categories', pageId: 'categories' },
  { url: '/stocks', pageId: 'stocks' },
  { url: '/reporting-location', pageId: 'reporting-location' },
  { url: '/moves-history', pageId: 'moves-history' },
  { url: '/valuation', pageId: 'valuation' },
  { url: '/warehouse-management', pageId: 'warehouse-management' },
  { url: '/locations', pageId: 'locations' },
  { url: '/routes', pageId: 'routes' },
  { url: '/rules', pageId: 'rules' },
  { url: '/storage', pageId: 'storage' },
  { url: '/putaway', pageId: 'putaway' },
  { url: '/uom-categories', pageId: 'uom-categories' },
  { url: '/delivery-methods', pageId: 'delivery-methods' },
  { url: '/package-types', pageId: 'package-types' },
  { url: '/attributes', pageId: 'attributes' },
  { url: '/product-packagings', pageId: 'product-packagings' },
  { url: '/workflow-v2', pageId: 'workflow-v2' },
  { url: '/users', pageId: 'users' },
  { url: '/roles', pageId: 'roles' },
  { url: '/policies', pageId: 'policies' },
  { url: '/org-chart', pageId: 'org-chart' },
  { url: '/fleet-management', pageId: 'fleet-management' },
  { url: '/all-vehicles', pageId: 'all-vehicles' },
  { url: '/warehouse-navigator', pageId: 'warehouse-navigator' },
  { url: '/report-templates', pageId: 'report-templates' },
  { url: '/generated-reports', pageId: 'generated-reports' },
  { url: '/report-rules', pageId: 'report-rules' },
  { url: '/report-headers', pageId: 'report-headers' },
  { url: '/report-footers', pageId: 'report-footers' },
  { url: '/report-export', pageId: 'report-export' },
  { url: '/report-transfer', pageId: 'report-transfer' },
  { url: '/integrations', pageId: 'integrations' },
];

/**
 * ProtectedRoute Component
 * 
 * Protects routes based on CASL permissions.
 * If user doesn't have 'view' permission for the page, shows access denied message.
 * 
 * @example
 * <ProtectedRoute pageId="attributes">
 *   <AttributesPage />
 * </ProtectedRoute>
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, pageId }) => {
  const { canViewPage, isLoading, pagePermissions } = useCasl();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const location = useLocation();

  // Find first accessible route - must be before any conditional returns (React hooks rules)
  const accessibleRoute = useMemo(() => {
    // If still loading, return a default
    if (isLoading) {
      return '/overview';
    }
    
    // Priority order: check menu items first (in order of importance)
    for (const item of MENU_ITEMS) {
      if (item.pageId && canViewPage(item.pageId)) {
        return item.url;
      }
    }
    
    // Fallback: try to find from pagePermissions (pages user has access to)
    for (const [routePageId, hasAccess] of Object.entries(pagePermissions)) {
      if (hasAccess && canViewPage(routePageId)) {
        const route = getRouteFromPageId(routePageId);
        if (route) {
          return route;
        }
      }
    }
    
    // Default fallback - try overview first, then any accessible page
    if (canViewPage('overview')) {
      return '/overview';
    }
    
    // Last resort: return overview anyway (will be handled by ProtectedRoute)
    return '/overview';
  }, [isLoading, pagePermissions, canViewPage]);

  // While loading, render children with permissive access
  // All permission functions return true during loading, so UI works normally
  if (isLoading) {
    return <>{children}</>;
  }

  const hasAccess = canViewPage(pageId);

  if (!hasAccess) {
    // Redirect to first accessible page instead of showing access denied
    return <Navigate to={accessibleRoute} replace />;
  }

  return <>{children}</>;
};