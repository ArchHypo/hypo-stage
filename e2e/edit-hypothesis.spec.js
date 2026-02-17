/**
 * E2E: Edit a hypothesis
 *
 * Domain: Hypothesis edit flow. Covers navigating from the detail page to the
 * edit page, changing an editable field (e.g. Status to Validated), submitting
 * with "Update Hypothesis", and returning to the detail page with the
 * hypothesis updated (evolution chart and detail reflect the change).
 *
 * Corresponds to: Real usage walkthrough § 4. Edit a hypothesis (README.md).
 * Requires app running and at least one hypothesis (seed data recommended).
 */

import { test, expect } from '@playwright/test';

test.describe('Edit a hypothesis', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/hypo-stage');
  });

  test.describe('edit flow', () => {
    test('can open Edit, change Status to Validated, submit and return to detail with update applied', async ({ page }) => {
      const tableWrapper = page.getByTestId('hypothesis-table-wrapper');
      await tableWrapper.scrollIntoViewIfNeeded();
      const firstLink = tableWrapper.getByRole('link').first();
      await expect(firstLink).toBeVisible({ timeout: 15000 });
      await firstLink.click();
      await expect(page).toHaveURL(/\/hypo-stage\/hypothesis\/.+/);

      await page.getByRole('heading', { name: /Hypothesis Statement/i }).scrollIntoViewIfNeeded();
      await page.getByRole('heading', { name: 'Assessment' }).scrollIntoViewIfNeeded();
      await page.getByRole('heading', { name: 'Technical Planning', exact: true }).scrollIntoViewIfNeeded();
      await page.getByRole('button', { name: /Edit Hypothesis/i }).scrollIntoViewIfNeeded();
      await page.getByRole('button', { name: /Edit Hypothesis/i }).click();
      await expect(page).toHaveURL(/\/hypo-stage\/hypothesis\/.+\/edit/);
      await expect(page.getByRole('heading', { name: /Edit Hypothesis/i })).toBeVisible();
      await expect(page.getByText(/Hypothesis Statement/i).first()).toBeVisible({ timeout: 5000 });
      await expect(page.getByRole('button', { name: /Update Hypothesis/i })).toBeVisible({ timeout: 10000 });

      await expect(page.getByText('Status').first()).toBeVisible({ timeout: 10000 });
      await page.getByText('Status').first().scrollIntoViewIfNeeded();
      const statusFormControl = page.getByText('Status').first().locator('..');
      await statusFormControl.getByRole('button').first().click();
      await expect(page.getByRole('listbox')).toBeVisible({ timeout: 5000 });
      await page.getByRole('option', { name: 'Validated' }).click();

      const updateBtn = page.getByRole('button', { name: /Update Hypothesis/i });
      await updateBtn.scrollIntoViewIfNeeded();
      await updateBtn.click();

      await expect(page).toHaveURL(/\/hypo-stage\/hypothesis\/[^/]+$/, { timeout: 15000 });
      await expect(page.getByRole('heading', { name: /Hypothesis Dashboard/i })).toBeVisible();
      await expect(page.getByText('Validated').first()).toBeVisible();
    });
  });
});
