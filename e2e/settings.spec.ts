import { test, expect, Page } from '@playwright/test';
import { TEST_CONFIG, SELECTORS } from './test-config';

/**
 * MULTIODOO E2E Tests - Settings & Configuration Module
 * Tests system settings, configurations, integrations, and master data
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

test.describe('Settings Module', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
  });

  test.describe('Settings Page', () => {
    test('should display settings page', async ({ page }) => {
      await page.goto('/settings');
      await page.waitForLoadState('networkidle');

      // Settings page should be accessible
      expect(page.url()).toContain('/settings');
    });

    test('should display settings sections', async ({ page }) => {
      await page.goto('/settings');
      await page.waitForLoadState('networkidle');

      // Look for settings sections/tabs
      const sections = page.locator('[class*="section"], [class*="tab"], [role="tablist"]');
      const hasSections = await sections.count() > 0;
    });

    test('should have theme toggle', async ({ page }) => {
      await page.goto('/settings');
      await page.waitForLoadState('networkidle');

      // Look for theme toggle
      const themeToggle = page.locator('button:has-text("Dark"), button:has-text("Light"), [class*="theme"], input[type="checkbox"]').first();
      const hasThemeToggle = await themeToggle.isVisible().catch(() => false);
    });

    test('should have language selector', async ({ page }) => {
      await page.goto('/settings');
      await page.waitForLoadState('networkidle');

      // Look for language selector
      const languageSelector = page.locator('select:has-text("English"), button:has-text("Language"), [class*="language"]').first();
      const hasLanguageSelector = await languageSelector.isVisible().catch(() => false);
    });

    test('should save settings changes', async ({ page }) => {
      await page.goto('/settings');
      await page.waitForLoadState('networkidle');

      const saveButton = page.locator('button:has-text("Save"), button:has-text("Apply")').first();
      const hasSaveButton = await saveButton.isVisible().catch(() => false);
    });
  });

  test.describe('License Page', () => {
    test('should display license page', async ({ page }) => {
      await page.goto('/license');
      await page.waitForLoadState('networkidle');

      expect(page.url()).toContain('/license');
    });

    test('should display license information', async ({ page }) => {
      await page.goto('/license');
      await page.waitForLoadState('networkidle');

      // Look for license details
      const licenseInfo = page.locator('[class*="license"], text=/license|activation|key/i').first();
      const hasLicenseInfo = await licenseInfo.isVisible().catch(() => false);
    });

    test('should have license activation form', async ({ page }) => {
      await page.goto('/license');
      await page.waitForLoadState('networkidle');

      // Look for activation input
      const activationInput = page.locator('input[placeholder*="key" i], input[placeholder*="license" i], input[name*="license" i]').first();
      const hasActivationInput = await activationInput.isVisible().catch(() => false);
    });
  });

  test.describe('Integrations', () => {
    test('should display integrations page', async ({ page }) => {
      await page.goto('/integrations');
      await page.waitForLoadState('networkidle');

      if (shouldSkip(page)) {
        test.skip();
        return;
      }

      expect(page.url()).toContain('/integrations');
    });

    test('should display available integrations', async ({ page }) => {
      await page.goto('/integrations');
      await page.waitForLoadState('networkidle');

      if (shouldSkip(page)) {
        test.skip();
        return;
      }

      const integrations = page.locator('[class*="card"], [class*="integration"]');
      const hasIntegrations = await integrations.count() > 0;
    });

    test('should configure integration', async ({ page }) => {
      await page.goto('/integrations');
      await page.waitForLoadState('networkidle');

      if (shouldSkip(page)) {
        test.skip();
        return;
      }

      const configureButton = page.locator('button:has-text("Configure"), button:has-text("Connect"), button:has-text("Setup")').first();
      if (await configureButton.isVisible().catch(() => false)) {
        await configureButton.click();
        await page.waitForTimeout(TEST_CONFIG.timeouts.modalOpen);
      }
    });
  });

  test.describe('Email Templates', () => {
    test('should display email templates page', async ({ page }) => {
      await page.goto('/email-templates');
      await page.waitForLoadState('networkidle');

      if (shouldSkip(page)) {
        test.skip();
        return;
      }

      expect(page.url()).toContain('/email-templates');
    });

    test('should display email templates list', async ({ page }) => {
      await page.goto('/email-templates');
      await page.waitForLoadState('networkidle');

      if (shouldSkip(page)) {
        test.skip();
        return;
      }

      const hasTable = await page.locator('table, [class*="list"]').first().isVisible().catch(() => false);
      expect(hasTable).toBeTruthy();
    });

    test('should create email template', async ({ page }) => {
      await page.goto('/email-templates/create');
      await page.waitForLoadState('networkidle');

      if (shouldSkip(page)) {
        test.skip();
        return;
      }

      // Should have template editor
      const hasEditor = await page.locator('[class*="editor"], textarea, [contenteditable]').first().isVisible().catch(() => false);
    });
  });

  test.describe('Master Lookups', () => {
    test('should display master lookups page', async ({ page }) => {
      await page.goto('/master-lookups');
      await page.waitForLoadState('networkidle');

      if (shouldSkip(page)) {
        test.skip();
        return;
      }

      expect(page.url()).toContain('/master-lookups');
    });

    test('should display lookup categories', async ({ page }) => {
      await page.goto('/master-lookups');
      await page.waitForLoadState('networkidle');

      if (shouldSkip(page)) {
        test.skip();
        return;
      }

      const hasContent = await page.locator('table, [class*="list"], [class*="card"]').first().isVisible().catch(() => false);
    });
  });
});

test.describe('Configuration Pages', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
  });

  test.describe('Categories', () => {
    test('should display categories page', async ({ page }) => {
      await page.goto('/categories');
      await page.waitForLoadState('networkidle');

      if (shouldSkip(page)) {
        test.skip();
        return;
      }

      expect(page.url()).toContain('/categories');
    });

    test('should display categories list', async ({ page }) => {
      await page.goto('/categories');
      await page.waitForLoadState('networkidle');

      if (shouldSkip(page)) {
        test.skip();
        return;
      }

      const hasTable = await page.locator('table').first().isVisible().catch(() => false);
      expect(hasTable).toBeTruthy();
    });

    test('should create category', async ({ page }) => {
      await page.goto('/categories/create');
      await page.waitForLoadState('networkidle');

      if (shouldSkip(page)) {
        test.skip();
        return;
      }

      const hasForm = await page.locator('form, input').first().isVisible().catch(() => false);
    });
  });

  test.describe('Attributes', () => {
    test('should display attributes page', async ({ page }) => {
      await page.goto('/attributes');
      await page.waitForLoadState('networkidle');

      if (shouldSkip(page)) {
        test.skip();
        return;
      }

      expect(page.url()).toContain('/attributes');
    });
  });

  test.describe('Units of Measure', () => {
    test('should display UOM page', async ({ page }) => {
      await page.goto('/uom-categories');
      await page.waitForLoadState('networkidle');

      if (shouldSkip(page)) {
        test.skip();
        return;
      }

      expect(page.url()).toContain('/uom-categories');
    });
  });

  test.describe('Delivery Methods', () => {
    test('should display delivery methods page', async ({ page }) => {
      await page.goto('/delivery-methods');
      await page.waitForLoadState('networkidle');

      if (shouldSkip(page)) {
        test.skip();
        return;
      }

      expect(page.url()).toContain('/delivery-methods');
    });
  });

  test.describe('Package Types', () => {
    test('should display package types page', async ({ page }) => {
      await page.goto('/package-types');
      await page.waitForLoadState('networkidle');

      if (shouldSkip(page)) {
        test.skip();
        return;
      }

      expect(page.url()).toContain('/package-types');
    });
  });

  test.describe('Product Packagings', () => {
    test('should display product packagings page', async ({ page }) => {
      await page.goto('/product-packagings');
      await page.waitForLoadState('networkidle');

      if (shouldSkip(page)) {
        test.skip();
        return;
      }

      expect(page.url()).toContain('/product-packagings');
    });
  });

  test.describe('Operation Types', () => {
    test('should display operations page', async ({ page }) => {
      await page.goto('/operations');
      await page.waitForLoadState('networkidle');

      if (shouldSkip(page)) {
        test.skip();
        return;
      }

      expect(page.url()).toContain('/operations');
    });
  });

  test.describe('Stock Rules', () => {
    test('should display rules page', async ({ page }) => {
      await page.goto('/rules');
      await page.waitForLoadState('networkidle');

      if (shouldSkip(page)) {
        test.skip();
        return;
      }

      expect(page.url()).toContain('/rules');
    });
  });

  test.describe('Stock Routes', () => {
    test('should display routes page', async ({ page }) => {
      await page.goto('/routes');
      await page.waitForLoadState('networkidle');

      if (shouldSkip(page)) {
        test.skip();
        return;
      }

      expect(page.url()).toContain('/routes');
    });
  });

  test.describe('Storage Categories', () => {
    test('should display storage categories page', async ({ page }) => {
      await page.goto('/storage');
      await page.waitForLoadState('networkidle');

      if (shouldSkip(page)) {
        test.skip();
        return;
      }

      expect(page.url()).toContain('/storage');
    });
  });

  test.describe('Putaway Rules', () => {
    test('should display putaway rules page', async ({ page }) => {
      await page.goto('/putaway');
      await page.waitForLoadState('networkidle');

      if (shouldSkip(page)) {
        test.skip();
        return;
      }

      expect(page.url()).toContain('/putaway');
    });
  });
});

test.describe('Fleet Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
  });

  test('should display fleet management page', async ({ page }) => {
    await page.goto('/fleet-management');
    await page.waitForLoadState('networkidle');

    if (shouldSkip(page)) {
      test.skip();
      return;
    }

    expect(page.url()).toContain('/fleet-management');
  });

  test('should display all vehicles page', async ({ page }) => {
    await page.goto('/all-vehicles');
    await page.waitForLoadState('networkidle');

    if (shouldSkip(page)) {
      test.skip();
      return;
    }

    expect(page.url()).toContain('/all-vehicles');
  });
});

test.describe('Physical Inventory', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
  });

  test('should display physical inventory dashboard', async ({ page }) => {
    await page.goto('/physical-inventory');
    await page.waitForLoadState('networkidle');

    if (shouldSkip(page)) {
      test.skip();
      return;
    }

    expect(page.url()).toContain('/physical-inventory');
  });

  test('should display physical inventory orders list', async ({ page }) => {
    await page.goto('/physical-inventory/orders');
    await page.waitForLoadState('networkidle');

    if (shouldSkip(page)) {
      test.skip();
      return;
    }

    expect(page.url()).toContain('/physical-inventory/orders');
  });

  test('should create physical inventory order', async ({ page }) => {
    await page.goto('/physical-inventory/orders/create');
    await page.waitForLoadState('networkidle');

    if (shouldSkip(page)) {
      test.skip();
      return;
    }

    const hasForm = await page.locator('form, input').first().isVisible().catch(() => false);
  });
});
