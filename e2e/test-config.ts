/**
 * MULTIODOO E2E Test Configuration
 * Test credentials and URLs
 */

export const TEST_CONFIG = {
  // Test user credentials - update these for your environment
  testUser: {
    email: 'admin@test.com',
    password: 'admin123',
  },

  // Alternative test user for permission tests
  limitedUser: {
    email: 'user@test.com',
    password: 'user123',
  },

  // API endpoints
  apiBaseUrl: 'http://localhost:3029/api',

  // Timeouts
  timeouts: {
    navigation: 30000,
    animation: 1000,
    modalOpen: 2000,
    apiResponse: 10000,
  },

  // Test data
  testProduct: {
    name: 'Test Product ' + Date.now(),
    description: 'Automated test product',
    price: '99.99',
    quantity: '100',
  },

  testWarehouse: {
    name: 'Test Warehouse ' + Date.now(),
    code: 'TWH',
  },
};

/**
 * Common test selectors used across tests
 */
export const SELECTORS = {
  // Sign In page
  signIn: {
    signInButton: 'button:has-text("Sign In to Platform")',
    emailInput: 'input#email',
    passwordInput: 'input#password',
    submitButton: 'button[type="submit"]',
    errorToast: '[data-state="open"]',
    forgotPassword: 'button:has-text("Forgot password?")',
    tenantDropdown: '.tenant-dropdown-container',
  },

  // Navigation
  nav: {
    sidebar: '[data-slot="sidebar"]',
    menuItem: (text: string) => `[data-slot="sidebar"] a:has-text("${text}")`,
    headerNavbar: 'header',
  },

  // Common UI elements
  common: {
    loadingSpinner: '.animate-spin',
    modal: '[data-slot="dialog-content"]',
    modalClose: '[data-slot="dialog-close"]',
    dataTable: 'table',
    tableRow: 'tbody tr',
    createButton: 'button:has-text("Create"), button:has-text("Add"), button:has-text("New")',
    saveButton: 'button:has-text("Save")',
    deleteButton: 'button:has-text("Delete")',
    cancelButton: 'button:has-text("Cancel")',
    searchInput: 'input[placeholder*="Search"]',
    pagination: '[data-slot="pagination"]',
    toast: '[data-sonner-toast]',
  },

  // Products page
  products: {
    productCard: '[data-product-id]',
    productName: '[data-product-name]',
    productModal: '[data-slot="dialog-content"]',
  },

  // Stock operations
  stock: {
    transferRow: 'tbody tr',
    statusBadge: '[data-status]',
    validateButton: 'button:has-text("Validate")',
    confirmButton: 'button:has-text("Confirm")',
  },
};

/**
 * Test result interface for report generation
 */
export interface TestResult {
  name: string;
  module: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
  screenshot?: string;
}
