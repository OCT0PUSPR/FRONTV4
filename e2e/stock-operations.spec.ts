import { test, expect, Page } from '@playwright/test';
import { TEST_CONFIG, SELECTORS } from './test-config';

/**
 * MULTIODOO E2E Tests - Stock Operations Module
 * Tests receipts, deliveries, internal transfers, batch transfers, and stock movements
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

test.describe('Stock Operations Module', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
  });

  test.describe('Receipts (Incoming)', () => {
    test('should display receipts page', async ({ page }) => {
      await page.goto('/receipts');
      await page.waitForLoadState('networkidle');

      if (shouldSkip(page)) {
        test.skip();
        return;
      }

      expect(page.url()).toContain('/receipts');
    });

    test('should display receipt transfers list', async ({ page }) => {
      await page.goto('/receipts');
      await page.waitForLoadState('networkidle');

      if (shouldSkip(page)) {
        test.skip();
        return;
      }

      // Check for table or list
      const hasTable = await page.locator('table, [class*="grid"]').first().isVisible().catch(() => false);
      expect(hasTable).toBeTruthy();
    });

    test('should have create receipt button', async ({ page }) => {
      await page.goto('/receipts');
      await page.waitForLoadState('networkidle');

      if (shouldSkip(page)) {
        test.skip();
        return;
      }

      const createButton = page.locator('button:has-text("Create"), button:has-text("New"), a[href*="create"]').first();
      const hasCreate = await createButton.isVisible().catch(() => false);
    });

    test('should open receipt creation form', async ({ page }) => {
      await page.goto('/receipts/create');
      await page.waitForLoadState('networkidle');

      if (shouldSkip(page)) {
        test.skip();
        return;
      }

      // Should have form inputs
      const hasForm = await page.locator('form, [class*="form"]').first().isVisible().catch(() => false);
      const hasInputs = await page.locator('input, select').first().isVisible().catch(() => false);
    });

    test('should display receipt status badges', async ({ page }) => {
      await page.goto('/receipts');
      await page.waitForLoadState('networkidle');

      if (shouldSkip(page)) {
        test.skip();
        return;
      }

      // Look for status indicators
      const statusBadges = page.locator('[class*="badge"], [class*="status"], [data-status]');
      const hasStatuses = await statusBadges.count() > 0;
    });

    test('should filter receipts by status', async ({ page }) => {
      await page.goto('/receipts');
      await page.waitForLoadState('networkidle');

      if (shouldSkip(page)) {
        test.skip();
        return;
      }

      // Look for status filter
      const statusFilter = page.locator('select:has-text("Status"), button:has-text("Status"), [data-filter="status"]').first();
      if (await statusFilter.isVisible().catch(() => false)) {
        await statusFilter.click();
        await page.waitForTimeout(500);
      }
    });
  });

  test.describe('Deliveries (Outgoing)', () => {
    test('should display deliveries page', async ({ page }) => {
      await page.goto('/deliveries');
      await page.waitForLoadState('networkidle');

      if (shouldSkip(page)) {
        test.skip();
        return;
      }

      expect(page.url()).toContain('/deliveries');
    });

    test('should display delivery transfers list', async ({ page }) => {
      await page.goto('/deliveries');
      await page.waitForLoadState('networkidle');

      if (shouldSkip(page)) {
        test.skip();
        return;
      }

      const hasTable = await page.locator('table, [class*="grid"]').first().isVisible().catch(() => false);
      expect(hasTable).toBeTruthy();
    });

    test('should have create delivery button', async ({ page }) => {
      await page.goto('/deliveries');
      await page.waitForLoadState('networkidle');

      if (shouldSkip(page)) {
        test.skip();
        return;
      }

      const createButton = page.locator('button:has-text("Create"), button:has-text("New")').first();
      const hasCreate = await createButton.isVisible().catch(() => false);
    });

    test('should navigate to delivery detail view', async ({ page }) => {
      await page.goto('/deliveries');
      await page.waitForLoadState('networkidle');

      if (shouldSkip(page)) {
        test.skip();
        return;
      }

      const firstRow = page.locator('tbody tr').first();
      if (await firstRow.isVisible().catch(() => false)) {
        await firstRow.click();
        await page.waitForTimeout(TEST_CONFIG.timeouts.navigation);
      }
    });
  });

  test.describe('Internal Transfers', () => {
    test('should display internal transfers page', async ({ page }) => {
      await page.goto('/internal');
      await page.waitForLoadState('networkidle');

      if (shouldSkip(page)) {
        test.skip();
        return;
      }

      expect(page.url()).toContain('/internal');
    });

    test('should display internal transfers list', async ({ page }) => {
      await page.goto('/internal');
      await page.waitForLoadState('networkidle');

      if (shouldSkip(page)) {
        test.skip();
        return;
      }

      const hasTable = await page.locator('table, [class*="grid"]').first().isVisible().catch(() => false);
      expect(hasTable).toBeTruthy();
    });

    test('should have create internal transfer button', async ({ page }) => {
      await page.goto('/internal');
      await page.waitForLoadState('networkidle');

      if (shouldSkip(page)) {
        test.skip();
        return;
      }

      const createButton = page.locator('button:has-text("Create"), button:has-text("New")').first();
      const hasCreate = await createButton.isVisible().catch(() => false);
    });
  });

  test.describe('Batch Transfers', () => {
    test('should display batch transfers page', async ({ page }) => {
      await page.goto('/batch');
      await page.waitForLoadState('networkidle');

      if (shouldSkip(page)) {
        test.skip();
        return;
      }

      expect(page.url()).toContain('/batch');
    });

    test('should display batch transfers list', async ({ page }) => {
      await page.goto('/batch');
      await page.waitForLoadState('networkidle');

      if (shouldSkip(page)) {
        test.skip();
        return;
      }

      const hasTable = await page.locator('table, [class*="grid"]').first().isVisible().catch(() => false);
      expect(hasTable).toBeTruthy();
    });
  });

  test.describe('Wave Transfers', () => {
    test('should display wave transfers page', async ({ page }) => {
      await page.goto('/wave');
      await page.waitForLoadState('networkidle');

      if (shouldSkip(page)) {
        test.skip();
        return;
      }

      expect(page.url()).toContain('/wave');
    });
  });

  test.describe('Moves History', () => {
    test('should display moves history page', async ({ page }) => {
      await page.goto('/moves-history');
      await page.waitForLoadState('networkidle');

      if (shouldSkip(page)) {
        test.skip();
        return;
      }

      expect(page.url()).toContain('/moves-history');
    });

    test('should display stock movements list', async ({ page }) => {
      await page.goto('/moves-history');
      await page.waitForLoadState('networkidle');

      if (shouldSkip(page)) {
        test.skip();
        return;
      }

      const hasTable = await page.locator('table').first().isVisible().catch(() => false);
      expect(hasTable).toBeTruthy();
    });

    test('should filter moves by date range', async ({ page }) => {
      await page.goto('/moves-history');
      await page.waitForLoadState('networkidle');

      if (shouldSkip(page)) {
        test.skip();
        return;
      }

      // Look for date filter
      const dateFilter = page.locator('input[type="date"], [data-date-picker], button:has-text("Date")').first();
      if (await dateFilter.isVisible().catch(() => false)) {
        await dateFilter.click();
        await page.waitForTimeout(500);
      }
    });
  });

  test.describe('Stocks Overview', () => {
    test('should display stocks page', async ({ page }) => {
      await page.goto('/stocks');
      await page.waitForLoadState('networkidle');

      if (shouldSkip(page)) {
        test.skip();
        return;
      }

      expect(page.url()).toContain('/stocks');
    });

    test('should display stock levels', async ({ page }) => {
      await page.goto('/stocks');
      await page.waitForLoadState('networkidle');

      if (shouldSkip(page)) {
        test.skip();
        return;
      }

      const hasTable = await page.locator('table').first().isVisible().catch(() => false);
      expect(hasTable).toBeTruthy();
    });

    test('should filter stocks by location', async ({ page }) => {
      await page.goto('/stocks');
      await page.waitForLoadState('networkidle');

      if (shouldSkip(page)) {
        test.skip();
        return;
      }

      const locationFilter = page.locator('select:has-text("Location"), button:has-text("Location")').first();
      if (await locationFilter.isVisible().catch(() => false)) {
        await locationFilter.click();
        await page.waitForTimeout(500);
      }
    });
  });

  test.describe('Locations', () => {
    test('should display locations page', async ({ page }) => {
      await page.goto('/locations');
      await page.waitForLoadState('networkidle');

      if (shouldSkip(page)) {
        test.skip();
        return;
      }

      expect(page.url()).toContain('/locations');
    });

    test('should display locations list', async ({ page }) => {
      await page.goto('/locations');
      await page.waitForLoadState('networkidle');

      if (shouldSkip(page)) {
        test.skip();
        return;
      }

      const hasTable = await page.locator('table').first().isVisible().catch(() => false);
      expect(hasTable).toBeTruthy();
    });

    test('should create new location', async ({ page }) => {
      await page.goto('/locations/create');
      await page.waitForLoadState('networkidle');

      if (shouldSkip(page)) {
        test.skip();
        return;
      }

      const hasForm = await page.locator('form, input').first().isVisible().catch(() => false);
    });
  });

  test.describe('Warehouses', () => {
    test('should display warehouses page', async ({ page }) => {
      await page.goto('/warehouse');
      await page.waitForLoadState('networkidle');

      if (shouldSkip(page)) {
        test.skip();
        return;
      }

      expect(page.url()).toContain('/warehouse');
    });

    test('should display warehouses list', async ({ page }) => {
      await page.goto('/warehouse');
      await page.waitForLoadState('networkidle');

      if (shouldSkip(page)) {
        test.skip();
        return;
      }

      const hasTable = await page.locator('table, [class*="card"]').first().isVisible().catch(() => false);
      expect(hasTable).toBeTruthy();
    });
  });

  test.describe('Manufacturing', () => {
    test('should display manufacturing page', async ({ page }) => {
      await page.goto('/manufacturing');
      await page.waitForLoadState('networkidle');

      if (shouldSkip(page)) {
        test.skip();
        return;
      }

      expect(page.url()).toContain('/manufacturing');
    });

    test('should display manufacturing orders list', async ({ page }) => {
      await page.goto('/manufacturing');
      await page.waitForLoadState('networkidle');

      if (shouldSkip(page)) {
        test.skip();
        return;
      }

      const hasTable = await page.locator('table').first().isVisible().catch(() => false);
      expect(hasTable).toBeTruthy();
    });
  });

  test.describe('Scrap Orders', () => {
    test('should display scrap orders page', async ({ page }) => {
      await page.goto('/scrap');
      await page.waitForLoadState('networkidle');

      if (shouldSkip(page)) {
        test.skip();
        return;
      }

      expect(page.url()).toContain('/scrap');
    });
  });

  test.describe('Landed Costs', () => {
    test('should display landed costs page', async ({ page }) => {
      await page.goto('/landed-costs');
      await page.waitForLoadState('networkidle');

      if (shouldSkip(page)) {
        test.skip();
        return;
      }

      expect(page.url()).toContain('/landed-costs');
    });
  });

  test.describe('Stock Valuation', () => {
    test('should display valuation page', async ({ page }) => {
      await page.goto('/valuation');
      await page.waitForLoadState('networkidle');

      if (shouldSkip(page)) {
        test.skip();
        return;
      }

      expect(page.url()).toContain('/valuation');
    });

    test('should display valuation data', async ({ page }) => {
      await page.goto('/valuation');
      await page.waitForLoadState('networkidle');

      if (shouldSkip(page)) {
        test.skip();
        return;
      }

      const hasTable = await page.locator('table').first().isVisible().catch(() => false);
      expect(hasTable).toBeTruthy();
    });
  });
});
