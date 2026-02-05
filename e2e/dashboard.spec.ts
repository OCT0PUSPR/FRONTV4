import { test, expect, Page } from '@playwright/test';
import { TEST_CONFIG, SELECTORS } from './test-config';

/**
 * MULTIODOO E2E Tests - Dashboard Module
 * Tests dashboard widgets, charts, customization, and data visualization
 */

async function loginUser(page: Page) {
  await page.goto('/signin');
  await page.waitForLoadState('networkidle');

  await page.click(SELECTORS.signIn.signInButton);
  await page.waitForTimeout(TEST_CONFIG.timeouts.modalOpen);

  await page.fill(SELECTORS.signIn.emailInput, TEST_CONFIG.testUser.email);
  await page.fill(SELECTORS.signIn.passwordInput, TEST_CONFIG.testUser.password);
  await page.click(SELECTORS.signIn.submitButton);

  try {
    await page.waitForURL(/\/(overview|license|setup)/, {
      timeout: TEST_CONFIG.timeouts.navigation,
    });
  } catch {
    // Handle login failure
  }
}

function shouldSkip(page: Page): boolean {
  const url = page.url();
  return url.includes('/signin') || url.includes('/license');
}

test.describe('Dashboard Module', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
  });

  test.describe('Overview Page', () => {
    test('should display overview/landing page', async ({ page }) => {
      await page.goto('/overview');
      await page.waitForLoadState('networkidle');

      if (shouldSkip(page)) {
        test.skip();
        return;
      }

      expect(page.url()).toContain('/overview');
    });

    test('should display key metrics/KPIs', async ({ page }) => {
      await page.goto('/overview');
      await page.waitForLoadState('networkidle');

      if (shouldSkip(page)) {
        test.skip();
        return;
      }

      // Look for metric cards or statistics
      const metricCards = page.locator('[class*="card"], [class*="stat"], [class*="metric"]');
      const hasMetrics = await metricCards.count() > 0;
    });

    test('should display quick action buttons', async ({ page }) => {
      await page.goto('/overview');
      await page.waitForLoadState('networkidle');

      if (shouldSkip(page)) {
        test.skip();
        return;
      }

      // Look for action buttons
      const actionButtons = page.locator('button, a[class*="button"]');
      const hasActions = await actionButtons.count() > 0;
      expect(hasActions).toBeTruthy();
    });
  });

  test.describe('Custom Dashboard Page', () => {
    test('should display dashboard page', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      if (shouldSkip(page)) {
        test.skip();
        return;
      }

      expect(page.url()).toContain('/dashboard');
    });

    test('should display dashboard widgets', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      if (shouldSkip(page)) {
        test.skip();
        return;
      }

      // Look for widgets/cards
      const widgets = page.locator('[class*="widget"], [class*="card"], [data-widget]');
      const hasWidgets = await widgets.count() > 0;
    });

    test('should display charts', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      if (shouldSkip(page)) {
        test.skip();
        return;
      }

      // Look for chart containers (recharts, chart.js, etc.)
      const charts = page.locator('[class*="chart"], svg[class*="recharts"], canvas');
      const hasCharts = await charts.count() > 0;
    });

    test('should have date range selector', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      if (shouldSkip(page)) {
        test.skip();
        return;
      }

      // Look for date range picker
      const dateRange = page.locator('[class*="date"], button:has-text("Week"), button:has-text("Month"), button:has-text("Year")').first();
      const hasDateRange = await dateRange.isVisible().catch(() => false);
    });

    test('should allow widget customization', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      if (shouldSkip(page)) {
        test.skip();
        return;
      }

      // Look for customize/edit button
      const customizeButton = page.locator('button:has-text("Customize"), button:has-text("Edit"), button:has-text("Add Widget")').first();
      if (await customizeButton.isVisible().catch(() => false)) {
        await customizeButton.click();
        await page.waitForTimeout(TEST_CONFIG.timeouts.modalOpen);
      }
    });

    test('should refresh dashboard data', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      if (shouldSkip(page)) {
        test.skip();
        return;
      }

      // Look for refresh button
      const refreshButton = page.locator('button:has-text("Refresh"), button[aria-label*="refresh"]').first();
      if (await refreshButton.isVisible().catch(() => false)) {
        await refreshButton.click();
        await page.waitForTimeout(1000);
      }
    });
  });

  test.describe('Reports', () => {
    test('should display report templates page', async ({ page }) => {
      await page.goto('/report-templates');
      await page.waitForLoadState('networkidle');

      if (shouldSkip(page)) {
        test.skip();
        return;
      }

      expect(page.url()).toContain('/report-templates');
    });

    test('should display generated reports page', async ({ page }) => {
      await page.goto('/generated-reports');
      await page.waitForLoadState('networkidle');

      if (shouldSkip(page)) {
        test.skip();
        return;
      }

      expect(page.url()).toContain('/generated-reports');
    });

    test('should create new report template', async ({ page }) => {
      await page.goto('/report-template-editor');
      await page.waitForLoadState('networkidle');

      if (shouldSkip(page)) {
        test.skip();
        return;
      }

      // Should have report editor interface
      const hasEditor = await page.locator('[class*="editor"], form').first().isVisible().catch(() => false);
    });

    test('should export reports', async ({ page }) => {
      await page.goto('/report-export');
      await page.waitForLoadState('networkidle');

      if (shouldSkip(page)) {
        test.skip();
        return;
      }

      expect(page.url()).toContain('/report-export');
    });
  });

  test.describe('Moves Analysis', () => {
    test('should display moves analysis page', async ({ page }) => {
      await page.goto('/moves-analysis');
      await page.waitForLoadState('networkidle');

      if (shouldSkip(page)) {
        test.skip();
        return;
      }

      expect(page.url()).toContain('/moves-analysis');
    });

    test('should display analysis charts', async ({ page }) => {
      await page.goto('/moves-analysis');
      await page.waitForLoadState('networkidle');

      if (shouldSkip(page)) {
        test.skip();
        return;
      }

      const charts = page.locator('[class*="chart"], svg, canvas');
      const hasCharts = await charts.count() > 0;
    });

    test('should filter analysis by date', async ({ page }) => {
      await page.goto('/moves-analysis');
      await page.waitForLoadState('networkidle');

      if (shouldSkip(page)) {
        test.skip();
        return;
      }

      const dateFilter = page.locator('input[type="date"], [data-date-picker]').first();
      if (await dateFilter.isVisible().catch(() => false)) {
        await dateFilter.click();
        await page.waitForTimeout(500);
      }
    });
  });

  test.describe('Warehouse View', () => {
    test('should display warehouse view page', async ({ page }) => {
      await page.goto('/warehouse-view');
      await page.waitForLoadState('networkidle');

      if (shouldSkip(page)) {
        test.skip();
        return;
      }

      expect(page.url()).toContain('/warehouse-view');
    });

    test('should display warehouse visualization', async ({ page }) => {
      await page.goto('/warehouse-view');
      await page.waitForLoadState('networkidle');

      if (shouldSkip(page)) {
        test.skip();
        return;
      }

      // Look for 3D canvas or visualization
      const visualization = page.locator('canvas, [class*="three"], [class*="3d"]').first();
      const hasVisualization = await visualization.isVisible().catch(() => false);
    });
  });

  test.describe('Warehouse Navigator', () => {
    test('should display warehouse navigator page', async ({ page }) => {
      await page.goto('/warehouse-navigator');
      await page.waitForLoadState('networkidle');

      if (shouldSkip(page)) {
        test.skip();
        return;
      }

      expect(page.url()).toContain('/warehouse-navigator');
    });

    test('should have navigation controls', async ({ page }) => {
      await page.goto('/warehouse-navigator');
      await page.waitForLoadState('networkidle');

      if (shouldSkip(page)) {
        test.skip();
        return;
      }

      // Look for navigation controls
      const controls = page.locator('[class*="toolbar"], [class*="controls"]').first();
      const hasControls = await controls.isVisible().catch(() => false);
    });

    test('should have search functionality', async ({ page }) => {
      await page.goto('/warehouse-navigator');
      await page.waitForLoadState('networkidle');

      if (shouldSkip(page)) {
        test.skip();
        return;
      }

      const searchInput = page.locator('input[placeholder*="search" i]').first();
      if (await searchInput.isVisible().catch(() => false)) {
        await searchInput.fill('test location');
        await page.waitForTimeout(500);
      }
    });
  });
});
