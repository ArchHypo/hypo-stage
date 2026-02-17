/**
 * E2E: View hypothesis detail
 *
 * Domain: Hypothesis detail page. Covers opening a hypothesis from the list,
 * presence of the main sections (Statement, Assessment, Technical Planning),
 * action bar (Back to List, Edit Hypothesis, Delete), and optional sections
 * (Quality Attributes, Related Artefacts) when the hypothesis has that data.
 *
 * Corresponds to: Real usage walkthrough § 3. View hypothesis detail
 * (README.md). Requires app running and at least one hypothesis (seed data
 * recommended).
 */

import { test, expect } from '@playwright/test';

test.describe('View hypothesis detail', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/hypo-stage');
  });

  test.describe('detail page content and actions', () => {
    test('opening a hypothesis shows Statement, status, assessment, and technical planning after scrolling through page', async ({ page }) => {
      const tableWrapper = page.getByTestId('hypothesis-table-wrapper');
      await tableWrapper.scrollIntoViewIfNeeded();
      await expect(tableWrapper).toBeVisible();
      const firstLink = tableWrapper.getByRole('link').first();
      await expect(firstLink).toBeVisible({ timeout: 15000 });
      await firstLink.click();

      await expect(page).toHaveURL(/\/hypo-stage\/hypothesis\/.+/);
      await expect(page.getByRole('heading', { name: /Hypothesis Dashboard/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /Back to List/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /Edit Hypothesis/i })).toBeVisible();
      await expect(page.getByTestId('hypothesis-action-bar').getByRole('button', { name: /Delete/i })).toBeVisible();

      await page.getByRole('heading', { name: /Hypothesis Statement/i }).scrollIntoViewIfNeeded();
      await expect(page.getByRole('heading', { name: /Hypothesis Statement/i })).toBeVisible();
      await page.getByRole('heading', { name: 'Assessment' }).scrollIntoViewIfNeeded();
      await expect(page.getByRole('heading', { name: 'Assessment' })).toBeVisible();
      await page.getByRole('heading', { name: 'Technical Planning', exact: true }).scrollIntoViewIfNeeded();
      await expect(page.getByRole('heading', { name: 'Technical Planning', exact: true })).toBeVisible();
    });
  });

  test.describe('optional sections', () => {
    test('detail page shows Quality Attributes and/or Related Artefacts when present', async ({ page }) => {
      const tableWrapper = page.getByTestId('hypothesis-table-wrapper');
      await tableWrapper.scrollIntoViewIfNeeded();
      const firstLink = tableWrapper.getByRole('link').first();
      await expect(firstLink).toBeVisible({ timeout: 15000 });
      await firstLink.click();
      await expect(page.getByRole('heading', { name: /Hypothesis Dashboard/i })).toBeVisible();

      await page.getByRole('heading', { name: 'Technical Planning', exact: true }).scrollIntoViewIfNeeded();
      await expect(
        page.getByRole('heading', { name: 'Quality Attributes' }).or(page.getByRole('heading', { name: 'Related Artefacts' })).first(),
      ).toBeVisible({ timeout: 5000 });
    });
  });
});
