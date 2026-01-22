// =============================================
// pageRoutes.ts
// Mapping between routes and page_ids from database
// =============================================

/**
 * Maps frontend routes to page_ids from the pages table
 * This is used for CASL permission checking
 */
export const ROUTE_TO_PAGE_ID: Record<string, string> = {
  '/overview': 'overview',
  '/receipts': 'receipts',
  '/deliveries': 'deliveries',
  '/internal': 'internal',
  '/manufacturing': 'manufacturing',
  '/dropships': 'dropship', // Note: route is /dropships but page_id is 'dropship'
  '/batch': 'batch',
  '/wave': 'wave',
  '/physical-inventory': 'physical-inventory',
  '/scrap': 'scrap',
  '/landed-costs': 'landed-costs',
  '/products': 'products',
  '/product-variants': 'product-variants',
  '/lots-serial': 'lots-serial',
  '/product-packages': 'product-packages',
  '/categories': 'categories',
  '/stocks': 'stocks',
  '/reporting-location': 'reporting-location',
  '/moves-history': 'moves-history',
  '/valuation': 'valuation',
  '/warehouse-management': 'warehouse-management',
  '/locations': 'locations',
  '/routes': 'routes',
  '/rules': 'rules',
  '/storage': 'storage',
  '/putaway': 'putaway',
  '/warehouse-navigator': 'warehouse-navigator',
  '/uom-categories': 'uom-categories',
  '/delivery-methods': 'delivery-methods',
  '/package-types': 'package-types',
  '/attributes': 'attributes',
  '/product-packagings': 'product-packagings',
  '/workflow-v2': 'workflow-v2',
  '/users': 'users',
  '/roles': 'roles',
  '/policies': 'policies',
  '/policy-editor': 'policy-editor',
  '/org-chart': 'org-chart',
  '/dashboard': 'dashboard',
  '/inventory': 'inventory',
  '/fleet-management': 'fleet-management',
  '/all-vehicles': 'all-vehicles',
  // Smart Reports pages
  '/smart-reports': 'smart-reports',
  '/smart-reports/builder': 'smart-reports-builder',
  '/smart-reports/data-sources': 'smart-reports-data-sources',
  '/smart-reports/history': 'smart-reports-history',
  '/smart-reports/scheduled': 'smart-reports-scheduled',
  // Reports pages
  '/report-templates': 'report-templates',
  '/report-template-editor': 'report-template-editor',
  '/generated-reports': 'generated-reports',
  // Integrations
  '/integrations': 'integrations',
  // Email
  '/send-email': 'send-email',
};

/**
 * Get page_id from route path
 */
export const getPageIdFromRoute = (route: string): string | null => {
  // Remove leading slash and normalize
  const normalizedRoute = route.startsWith('/') ? route : `/${route}`;
  return ROUTE_TO_PAGE_ID[normalizedRoute] || null;
};

/**
 * Get route from page_id
 */
export const getRouteFromPageId = (pageId: string): string | null => {
  const entry = Object.entries(ROUTE_TO_PAGE_ID).find(([_, id]) => id === pageId);
  return entry ? entry[0] : null;
};

