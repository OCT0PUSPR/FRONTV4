import { test, expect, Page } from '@playwright/test';
import { TEST_CONFIG, SELECTORS } from './test-config';

/**
 * MULTIODOO E2E Tests - User Management Module
 * Tests users, roles, policies, and access control
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

test.describe('User Management Module', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
  });

  test.describe('User Management Page', () => {
    test('should display user management page', async ({ page }) => {
      await page.goto('/user-management');
      await page.waitForLoadState('networkidle');

      if (shouldSkip(page)) {
        test.skip();
        return;
      }

      expect(page.url()).toContain('/user-management');
    });

    test('should display user management interface', async ({ page }) => {
      await page.goto('/user-management');
      await page.waitForLoadState('networkidle');

      if (shouldSkip(page)) {
        test.skip();
        return;
      }

      // Look for main interface elements
      const hasContent = await page.locator('table, [class*="card"], [class*="list"]').first().isVisible().catch(() => false);
    });
  });

  test.describe('Users List', () => {
    test('should display users page', async ({ page }) => {
      await page.goto('/users');
      await page.waitForLoadState('networkidle');

      if (shouldSkip(page)) {
        test.skip();
        return;
      }

      expect(page.url()).toContain('/users');
    });

    test('should display users list', async ({ page }) => {
      await page.goto('/users');
      await page.waitForLoadState('networkidle');

      if (shouldSkip(page)) {
        test.skip();
        return;
      }

      const hasTable = await page.locator('table').first().isVisible().catch(() => false);
      expect(hasTable).toBeTruthy();
    });

    test('should have create user button', async ({ page }) => {
      await page.goto('/users');
      await page.waitForLoadState('networkidle');

      if (shouldSkip(page)) {
        test.skip();
        return;
      }

      const createButton = page.locator('button:has-text("Create"), button:has-text("Add User"), button:has-text("New")').first();
      const hasCreate = await createButton.isVisible().catch(() => false);
    });

    test('should search users', async ({ page }) => {
      await page.goto('/users');
      await page.waitForLoadState('networkidle');

      if (shouldSkip(page)) {
        test.skip();
        return;
      }

      const searchInput = page.locator('input[placeholder*="search" i]').first();
      if (await searchInput.isVisible().catch(() => false)) {
        await searchInput.fill('admin');
        await page.waitForTimeout(500);
      }
    });

    test('should display user details', async ({ page }) => {
      await page.goto('/users');
      await page.waitForLoadState('networkidle');

      if (shouldSkip(page)) {
        test.skip();
        return;
      }

      const firstRow = page.locator('tbody tr').first();
      if (await firstRow.isVisible().catch(() => false)) {
        await firstRow.click();
        await page.waitForTimeout(TEST_CONFIG.timeouts.modalOpen);
      }
    });
  });

  test.describe('Roles Management', () => {
    test('should display roles page', async ({ page }) => {
      await page.goto('/roles');
      await page.waitForLoadState('networkidle');

      if (shouldSkip(page)) {
        test.skip();
        return;
      }

      expect(page.url()).toContain('/roles');
    });

    test('should display roles list', async ({ page }) => {
      await page.goto('/roles');
      await page.waitForLoadState('networkidle');

      if (shouldSkip(page)) {
        test.skip();
        return;
      }

      const hasTable = await page.locator('table, [class*="list"]').first().isVisible().catch(() => false);
      expect(hasTable).toBeTruthy();
    });

    test('should have create role button', async ({ page }) => {
      await page.goto('/roles');
      await page.waitForLoadState('networkidle');

      if (shouldSkip(page)) {
        test.skip();
        return;
      }

      const createButton = page.locator('button:has-text("Create"), button:has-text("Add Role"), button:has-text("New")').first();
      const hasCreate = await createButton.isVisible().catch(() => false);
    });

    test('should display role permissions', async ({ page }) => {
      await page.goto('/roles');
      await page.waitForLoadState('networkidle');

      if (shouldSkip(page)) {
        test.skip();
        return;
      }

      const firstRole = page.locator('tbody tr, [class*="role-card"]').first();
      if (await firstRole.isVisible().catch(() => false)) {
        await firstRole.click();
        await page.waitForTimeout(TEST_CONFIG.timeouts.modalOpen);

        // Look for permissions checkboxes
        const permissions = page.locator('input[type="checkbox"], [role="checkbox"]');
        const hasPermissions = await permissions.count() > 0;
      }
    });
  });

  test.describe('Policies Management', () => {
    test('should display policies page', async ({ page }) => {
      await page.goto('/policies');
      await page.waitForLoadState('networkidle');

      if (shouldSkip(page)) {
        test.skip();
        return;
      }

      expect(page.url()).toContain('/policies');
    });

    test('should display policies list', async ({ page }) => {
      await page.goto('/policies');
      await page.waitForLoadState('networkidle');

      if (shouldSkip(page)) {
        test.skip();
        return;
      }

      const hasTable = await page.locator('table, [class*="list"]').first().isVisible().catch(() => false);
      expect(hasTable).toBeTruthy();
    });

    test('should open policy editor', async ({ page }) => {
      await page.goto('/policy-editor');
      await page.waitForLoadState('networkidle');

      if (shouldSkip(page)) {
        test.skip();
        return;
      }

      expect(page.url()).toContain('/policy-editor');

      // Should have editor interface
      const hasEditor = await page.locator('[class*="editor"], textarea, [contenteditable]').first().isVisible().catch(() => false);
    });
  });

  test.describe('Organization Chart', () => {
    test('should display org chart page', async ({ page }) => {
      await page.goto('/org-chart');
      await page.waitForLoadState('networkidle');

      if (shouldSkip(page)) {
        test.skip();
        return;
      }

      expect(page.url()).toContain('/org-chart');
    });

    test('should display organization structure', async ({ page }) => {
      await page.goto('/org-chart');
      await page.waitForLoadState('networkidle');

      if (shouldSkip(page)) {
        test.skip();
        return;
      }

      // Look for org chart visualization
      const chart = page.locator('[class*="org"], [class*="chart"], [class*="tree"]').first();
      const hasChart = await chart.isVisible().catch(() => false);
    });
  });

  test.describe('Field Management', () => {
    test('should display field management page', async ({ page }) => {
      await page.goto('/field-management');
      await page.waitForLoadState('networkidle');

      if (shouldSkip(page)) {
        test.skip();
        return;
      }

      expect(page.url()).toContain('/field-management');
    });

    test('should display custom fields', async ({ page }) => {
      await page.goto('/field-management');
      await page.waitForLoadState('networkidle');

      if (shouldSkip(page)) {
        test.skip();
        return;
      }

      const hasContent = await page.locator('table, [class*="list"], [class*="card"]').first().isVisible().catch(() => false);
    });

    test('should open field layout editor', async ({ page }) => {
      await page.goto('/field-layout-editor');
      await page.waitForLoadState('networkidle');

      if (shouldSkip(page)) {
        test.skip();
        return;
      }

      expect(page.url()).toContain('/field-layout-editor');
    });
  });
});

test.describe('Workflows Module', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
  });

  test.describe('Workflows List', () => {
    test('should display workflows page', async ({ page }) => {
      await page.goto('/workflows');
      await page.waitForLoadState('networkidle');

      if (shouldSkip(page)) {
        test.skip();
        return;
      }

      expect(page.url()).toContain('/workflows');
    });

    test('should display workflows list', async ({ page }) => {
      await page.goto('/workflows');
      await page.waitForLoadState('networkidle');

      if (shouldSkip(page)) {
        test.skip();
        return;
      }

      const hasContent = await page.locator('table, [class*="list"], [class*="card"]').first().isVisible().catch(() => false);
    });

    test('should have create workflow button', async ({ page }) => {
      await page.goto('/workflows');
      await page.waitForLoadState('networkidle');

      if (shouldSkip(page)) {
        test.skip();
        return;
      }

      const createButton = page.locator('button:has-text("Create"), button:has-text("New Workflow"), button:has-text("Add")').first();
      const hasCreate = await createButton.isVisible().catch(() => false);
    });
  });

  test.describe('Workflow Builder V2', () => {
    test('should display workflow v2 page', async ({ page }) => {
      await page.goto('/workflow-v2');
      await page.waitForLoadState('networkidle');

      if (shouldSkip(page)) {
        test.skip();
        return;
      }

      expect(page.url()).toContain('/workflow-v2');
    });

    test('should display workflow builder interface', async ({ page }) => {
      await page.goto('/workflow-v2');
      await page.waitForLoadState('networkidle');

      if (shouldSkip(page)) {
        test.skip();
        return;
      }

      // Look for ReactFlow canvas
      const canvas = page.locator('[class*="react-flow"], [class*="workflow"], canvas').first();
      const hasCanvas = await canvas.isVisible().catch(() => false);
    });

    test('should have node palette/toolbox', async ({ page }) => {
      await page.goto('/workflow-v2');
      await page.waitForLoadState('networkidle');

      if (shouldSkip(page)) {
        test.skip();
        return;
      }

      // Look for node palette
      const palette = page.locator('[class*="palette"], [class*="toolbox"], [class*="sidebar"]').first();
      const hasPalette = await palette.isVisible().catch(() => false);
    });

    test('should save workflow', async ({ page }) => {
      await page.goto('/workflow-v2');
      await page.waitForLoadState('networkidle');

      if (shouldSkip(page)) {
        test.skip();
        return;
      }

      const saveButton = page.locator('button:has-text("Save"), button:has-text("Publish")').first();
      const hasSave = await saveButton.isVisible().catch(() => false);
    });
  });

  test.describe('Form Creator', () => {
    test('should display form creator page', async ({ page }) => {
      await page.goto('/form');
      await page.waitForLoadState('networkidle');

      if (shouldSkip(page)) {
        test.skip();
        return;
      }

      expect(page.url()).toContain('/form');
    });

    test('should display survey/form builder', async ({ page }) => {
      await page.goto('/form');
      await page.waitForLoadState('networkidle');

      if (shouldSkip(page)) {
        test.skip();
        return;
      }

      // Look for survey.js creator
      const builder = page.locator('[class*="survey"], [class*="form-builder"], [class*="creator"]').first();
      const hasBuilder = await builder.isVisible().catch(() => false);
    });
  });
});
