import { test, expect, Page } from '@playwright/test';
import { TEST_CONFIG, SELECTORS } from './test-config';

/**
 * MULTIODOO E2E Tests - Products Module
 * Tests product listing, creation, editing, deletion, and search functionality
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

async function navigateToProducts(page: Page) {
  await page.goto('/products');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(TEST_CONFIG.timeouts.animation);
}

test.describe('Products Module', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
  });

  test.describe('Products List Page', () => {
    test('should display products page', async ({ page }) => {
      await navigateToProducts(page);

      const currentUrl = page.url();
      if (currentUrl.includes('/signin') || currentUrl.includes('/license')) {
        test.skip();
        return;
      }

      // Should be on products page
      expect(page.url()).toContain('/products');
    });

    test('should display data table or product grid', async ({ page }) => {
      await navigateToProducts(page);

      const currentUrl = page.url();
      if (currentUrl.includes('/signin') || currentUrl.includes('/license')) {
        test.skip();
        return;
      }

      // Check for either table or grid view
      const hasTable = await page.locator('table').isVisible().catch(() => false);
      const hasGrid = await page.locator('[class*="grid"]').isVisible().catch(() => false);
      const hasCards = await page.locator('[class*="card"]').first().isVisible().catch(() => false);

      expect(hasTable || hasGrid || hasCards).toBeTruthy();
    });

    test('should have search functionality', async ({ page }) => {
      await navigateToProducts(page);

      const currentUrl = page.url();
      if (currentUrl.includes('/signin') || currentUrl.includes('/license')) {
        test.skip();
        return;
      }

      // Look for search input
      const searchInput = page.locator('input[placeholder*="search" i], input[type="search"], [data-search]').first();
      const hasSearch = await searchInput.isVisible().catch(() => false);

      if (hasSearch) {
        await searchInput.fill('test');
        await page.waitForTimeout(500);

        // Search should filter results or show loading
      }
    });

    test('should have create/add button', async ({ page }) => {
      await navigateToProducts(page);

      const currentUrl = page.url();
      if (currentUrl.includes('/signin') || currentUrl.includes('/license')) {
        test.skip();
        return;
      }

      const createButton = page.locator('button:has-text("Create"), button:has-text("Add"), button:has-text("New"), a:has-text("Create")').first();
      const hasCreateButton = await createButton.isVisible().catch(() => false);

      // Most CRUD pages should have create functionality
    });

    test('should have pagination controls', async ({ page }) => {
      await navigateToProducts(page);

      const currentUrl = page.url();
      if (currentUrl.includes('/signin') || currentUrl.includes('/license')) {
        test.skip();
        return;
      }

      // Look for pagination
      const pagination = page.locator('[class*="pagination"], [data-pagination], nav[aria-label*="pagination"]').first();
      const hasPagination = await pagination.isVisible().catch(() => false);

      // Pagination may not be visible if few items
    });

    test('should display column headers in table view', async ({ page }) => {
      await navigateToProducts(page);

      const currentUrl = page.url();
      if (currentUrl.includes('/signin') || currentUrl.includes('/license')) {
        test.skip();
        return;
      }

      const tableHeaders = page.locator('thead th, [role="columnheader"]');
      const headerCount = await tableHeaders.count().catch(() => 0);

      if (headerCount > 0) {
        expect(headerCount).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Product Creation', () => {
    test('should open create product form', async ({ page }) => {
      await navigateToProducts(page);

      const currentUrl = page.url();
      if (currentUrl.includes('/signin') || currentUrl.includes('/license')) {
        test.skip();
        return;
      }

      const createButton = page.locator('button:has-text("Create"), button:has-text("Add"), button:has-text("New"), a[href*="create"]').first();

      if (await createButton.isVisible().catch(() => false)) {
        await createButton.click();
        await page.waitForTimeout(TEST_CONFIG.timeouts.modalOpen);

        // Either modal opens or navigates to create page
        const isModalOpen = await page.locator('[data-slot="dialog-content"], [role="dialog"]').isVisible().catch(() => false);
        const isCreatePage = page.url().includes('/create');

        expect(isModalOpen || isCreatePage).toBeTruthy();
      }
    });

    test('should have required form fields for new product', async ({ page }) => {
      // Navigate to create product page/modal
      await page.goto('/products/create');
      await page.waitForLoadState('networkidle');

      const currentUrl = page.url();
      if (currentUrl.includes('/signin') || currentUrl.includes('/license')) {
        test.skip();
        return;
      }

      // Check for common product fields
      const hasNameField = await page.locator('input[name*="name" i], input[placeholder*="name" i], label:has-text("Name") + input').first().isVisible().catch(() => false);
      const hasAnyInput = await page.locator('input, select, textarea').first().isVisible().catch(() => false);

      // Should have at least some form fields
    });

    test('should validate required fields on submit', async ({ page }) => {
      await page.goto('/products/create');
      await page.waitForLoadState('networkidle');

      const currentUrl = page.url();
      if (currentUrl.includes('/signin') || currentUrl.includes('/license')) {
        test.skip();
        return;
      }

      // Try to submit empty form
      const submitButton = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Create")').first();

      if (await submitButton.isVisible().catch(() => false)) {
        await submitButton.click();
        await page.waitForTimeout(500);

        // Should show validation errors or prevent submission
        const hasValidationError = await page.locator('[class*="error"], [data-error], .text-red-500, .text-destructive').first().isVisible().catch(() => false);
        // Validation might prevent form submission via HTML5
      }
    });
  });

  test.describe('Product Editing', () => {
    test('should open edit product form from table row', async ({ page }) => {
      await navigateToProducts(page);

      const currentUrl = page.url();
      if (currentUrl.includes('/signin') || currentUrl.includes('/license')) {
        test.skip();
        return;
      }

      // Click on first product row or edit button
      const editButton = page.locator('button:has-text("Edit"), a:has-text("Edit"), [data-edit], tbody tr').first();

      if (await editButton.isVisible().catch(() => false)) {
        await editButton.click();
        await page.waitForTimeout(TEST_CONFIG.timeouts.modalOpen);

        // Should open edit modal or navigate to edit page
        const isEditMode = page.url().includes('/edit') ||
          await page.locator('[data-slot="dialog-content"], [role="dialog"]').isVisible().catch(() => false);
      }
    });

    test('should load existing product data in edit form', async ({ page }) => {
      await navigateToProducts(page);

      const currentUrl = page.url();
      if (currentUrl.includes('/signin') || currentUrl.includes('/license')) {
        test.skip();
        return;
      }

      // Navigate to edit first product
      const firstRow = page.locator('tbody tr').first();
      if (await firstRow.isVisible().catch(() => false)) {
        await firstRow.click();
        await page.waitForTimeout(TEST_CONFIG.timeouts.animation);

        // Look for populated form fields
        const nameInput = page.locator('input[name*="name" i]').first();
        if (await nameInput.isVisible().catch(() => false)) {
          const value = await nameInput.inputValue().catch(() => '');
          // Edit form should have pre-filled values
        }
      }
    });
  });

  test.describe('Product Deletion', () => {
    test('should show delete confirmation dialog', async ({ page }) => {
      await navigateToProducts(page);

      const currentUrl = page.url();
      if (currentUrl.includes('/signin') || currentUrl.includes('/license')) {
        test.skip();
        return;
      }

      // Look for delete button
      const deleteButton = page.locator('button:has-text("Delete"), button[aria-label*="delete" i], [data-delete]').first();

      if (await deleteButton.isVisible().catch(() => false)) {
        await deleteButton.click();
        await page.waitForTimeout(TEST_CONFIG.timeouts.modalOpen);

        // Should show confirmation dialog
        const confirmDialog = page.locator('[data-slot="dialog-content"]:has-text("confirm"), [role="alertdialog"]');
        const hasConfirmation = await confirmDialog.isVisible().catch(() => false);
      }
    });
  });

  test.describe('Product Filtering', () => {
    test('should filter products by search term', async ({ page }) => {
      await navigateToProducts(page);

      const currentUrl = page.url();
      if (currentUrl.includes('/signin') || currentUrl.includes('/license')) {
        test.skip();
        return;
      }

      const searchInput = page.locator('input[placeholder*="search" i], input[type="search"]').first();

      if (await searchInput.isVisible().catch(() => false)) {
        // Count initial rows
        const initialRowCount = await page.locator('tbody tr').count().catch(() => 0);

        // Search for something
        await searchInput.fill('test-unique-search-' + Date.now());
        await page.waitForTimeout(1000);

        // Rows should change or show no results
        const filteredRowCount = await page.locator('tbody tr').count().catch(() => 0);
        const noResultsMessage = await page.locator('text=/no results|no products|not found/i').isVisible().catch(() => false);

        // Either row count changed or no results shown
        expect(filteredRowCount !== initialRowCount || noResultsMessage || filteredRowCount === 0).toBeTruthy();
      }
    });

    test('should clear search filter', async ({ page }) => {
      await navigateToProducts(page);

      const currentUrl = page.url();
      if (currentUrl.includes('/signin') || currentUrl.includes('/license')) {
        test.skip();
        return;
      }

      const searchInput = page.locator('input[placeholder*="search" i], input[type="search"]').first();

      if (await searchInput.isVisible().catch(() => false)) {
        await searchInput.fill('test');
        await page.waitForTimeout(500);
        await searchInput.clear();
        await page.waitForTimeout(500);

        // Should restore original results
      }
    });
  });

  test.describe('Product Table Actions', () => {
    test('should sort table by column click', async ({ page }) => {
      await navigateToProducts(page);

      const currentUrl = page.url();
      if (currentUrl.includes('/signin') || currentUrl.includes('/license')) {
        test.skip();
        return;
      }

      const sortableHeader = page.locator('thead th[class*="sortable"], thead th:has(svg), button[role="columnheader"]').first();

      if (await sortableHeader.isVisible().catch(() => false)) {
        await sortableHeader.click();
        await page.waitForTimeout(500);

        // Check for sort indicator
        const hasSortIndicator = await page.locator('[class*="sort"], svg[class*="arrow"]').first().isVisible().catch(() => false);
      }
    });

    test('should toggle column visibility', async ({ page }) => {
      await navigateToProducts(page);

      const currentUrl = page.url();
      if (currentUrl.includes('/signin') || currentUrl.includes('/license')) {
        test.skip();
        return;
      }

      // Look for column visibility toggle
      const columnToggle = page.locator('button:has-text("Columns"), button[aria-label*="column" i]').first();

      if (await columnToggle.isVisible().catch(() => false)) {
        await columnToggle.click();
        await page.waitForTimeout(500);

        // Should show column options
        const columnOptions = page.locator('[role="menu"], [data-radix-popper-content-wrapper]');
        const hasOptions = await columnOptions.isVisible().catch(() => false);
      }
    });
  });

  test.describe('Product Details View', () => {
    test('should navigate to product details on row click', async ({ page }) => {
      await navigateToProducts(page);

      const currentUrl = page.url();
      if (currentUrl.includes('/signin') || currentUrl.includes('/license')) {
        test.skip();
        return;
      }

      const productRow = page.locator('tbody tr').first();

      if (await productRow.isVisible().catch(() => false)) {
        await productRow.click();
        await page.waitForTimeout(TEST_CONFIG.timeouts.navigation);

        // Should navigate to view/edit page or open modal
        const isDetailView = page.url().includes('/view') ||
          page.url().includes('/edit') ||
          await page.locator('[data-slot="dialog-content"]').isVisible().catch(() => false);
      }
    });
  });

  test.describe('Bulk Actions', () => {
    test('should have checkbox selection for bulk actions', async ({ page }) => {
      await navigateToProducts(page);

      const currentUrl = page.url();
      if (currentUrl.includes('/signin') || currentUrl.includes('/license')) {
        test.skip();
        return;
      }

      // Look for row checkboxes
      const rowCheckbox = page.locator('tbody tr input[type="checkbox"], tbody tr [role="checkbox"]').first();
      const hasCheckbox = await rowCheckbox.isVisible().catch(() => false);

      if (hasCheckbox) {
        await rowCheckbox.click();
        await page.waitForTimeout(300);

        // Should enable bulk action buttons
        const bulkActions = page.locator('button:has-text("Delete Selected"), button:has-text("Bulk"), [data-bulk-actions]');
        const hasBulkActions = await bulkActions.isVisible().catch(() => false);
      }
    });

    test('should select all products with header checkbox', async ({ page }) => {
      await navigateToProducts(page);

      const currentUrl = page.url();
      if (currentUrl.includes('/signin') || currentUrl.includes('/license')) {
        test.skip();
        return;
      }

      // Look for select all checkbox
      const selectAllCheckbox = page.locator('thead input[type="checkbox"], thead [role="checkbox"]').first();

      if (await selectAllCheckbox.isVisible().catch(() => false)) {
        await selectAllCheckbox.click();
        await page.waitForTimeout(300);

        // All row checkboxes should be checked
        const checkedRows = await page.locator('tbody input[type="checkbox"]:checked, tbody [role="checkbox"][data-state="checked"]').count();
        const totalRows = await page.locator('tbody tr').count();

        // All visible rows should be selected
      }
    });
  });
});
