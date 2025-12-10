// API Configuration
export const API_CONFIG = {
  // OpenRouter API for chatbot
  OPENROUTER_API_KEY: import.meta.env.VITE_AAA_API_KEY,
  OPENROUTER_BASE_URL: 'https://openrouter.ai/api/v1',
  
  // Google Maps API for locations
  GOOGLE_MAPS_API_KEY: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  
  // Backend API
  BACKEND_BASE_URL: import.meta.env.VITE_API_BASE_URL,
}

/**
 * Helper function to build API URLs correctly
 * Since BACKEND_BASE_URL already includes /api, we just append the path
 */
export const buildApiUrl = (path: string): string => {
  const baseUrl = API_CONFIG.BACKEND_BASE_URL?.replace(/\/$/, '') || '';
  return `${baseUrl}${path}`;
}

/**
 * Get the current tenant ID from localStorage
 */
export const getCurrentTenantId = (): string | null => {
  return localStorage.getItem('current_tenant_id');
}

/**
 * Get headers with tenant ID included
 */
export const getTenantHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  const tenantId = getCurrentTenantId();
  if (tenantId) {
    headers['X-Tenant-ID'] = tenantId;
  }
  
  return headers;
}

/**
 * Tenant-aware fetch wrapper
 * Automatically includes X-Tenant-ID header from localStorage
 */
export const tenantFetch = async (
  url: string,
  options: RequestInit = {}
): Promise<Response> => {
  const tenantId = getCurrentTenantId();
  
  const headers = new Headers(options.headers);
  
  // Set content type if not already set
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  
  // Add tenant ID header if available
  if (tenantId) {
    headers.set('X-Tenant-ID', tenantId);
  }
  
  return fetch(url, {
    ...options,
    headers,
  });
}

/**
 * Tenant-aware API call helper
 * Combines buildApiUrl with tenantFetch
 */
export const apiCall = async (
  path: string,
  options: RequestInit = {}
): Promise<Response> => {
  const url = buildApiUrl(path);
  return tenantFetch(url, options);
}

// OpenRouter model configuration
export const OPENROUTER_CONFIG = {
  model: 'tngtech/deepseek-r1t2-chimera:free',
  maxTokens: 40000,
  temperature: 0.7,
  headers: {
    'HTTP-Referer': window.location.origin,
    'X-Title': 'Warehouse Management Assistant'
  }
}
