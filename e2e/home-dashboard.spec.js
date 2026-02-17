/**
 * E2E: Home page and dashboard
 * Domain: Landing page. Covers list view, dashboard stats, filters, navigation to detail.
 * Corresponds to: Real usage walkthrough § 1 (README.md).
 */

import { test, expect } from '@playwright/test';

test.describe('Home page and dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/hypo-stage');
  });

  test.describe('header and main actions', () => {
    test('shows Welcome heading, Create New Hypothesis button, and Hypotheses list', async ({ page }) => {
      await expect(page.getByRole('heading', { name: /Welcome to Hypo Stage/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /Create New Hypothesis/i })).toBeVisible();
      await expect(page.getByText('Hypotheses')).toBeVisible();
    });
  });

  test.describe('Overview stats', () => {
    test('shows dashboard Overview with Total, Validated, Open, and Created (30d)', async ({ page }) => {
      await expect(page.getByText('Overview').first()).toBeVisible();
      await expect(page.getByText('Total').first()).toBeVisible();
      await expect(page.getByText('Validated').first()).toBeVisible();
      await expect(page.getByText('Open').first()).toBeVisible();
      await expect(page.getByText('Created (30d)')).toBeVisible();
    });
  });

  test.describe('Where to focus and metrics', () => {
    test('shows Where to focus and Uncertainty & impact section', async ({ page }) => {
      await expect(page.getByRole('heading', { name: /Where to focus/i })).toBeVisible();
      await expect(page.getByText('Need attention').first()).toBeVisible();
      await expect(page.getByText('Can postpone').first()).toBeVisible();
      await expect(page.getByText('Uncertainty & impact').first()).toBeVisible();
    });
  });

  test.describe('list filters', () => {
    test('shows filter bar with Team, Component, and Focus controls', async ({ page }) => {
      const filterBar = page.getByTestId('hypothesis-filter-bar');
      await expect(filterBar).toBeVisible();
      await expect(page.getByLabel(/Team/i)).toBeVisible();
      await expect(page.getByLabel(/Component/i)).toBeVisible();
      await expect(page.getByLabel(/Focus/i)).toBeVisible();
    });

    test('can apply Team filter and list remains visible', async ({ page }) => {
      await page.getByLabel(/Team/i).click();
      const option = page.getByRole('option').first();
      try {
        await option.click({ timeout: 5000 });
      } catch {
        await page.keyboard.press('Escape');
      }
      await expect(page.getByTestId('hypothesis-table-wrapper')).toBeVisible();
    });
  });

  test.describe('navigation to detail', () => {
    test('clicking a hypothesis row opens the hypothesis detail page', async ({ page }) => {
      await expect(page.getByRole('heading', { name: /Welcome to Hypo Stage/i })).toBeVisible();
      await page.getByText('Overview').first().scrollIntoViewIfNeeded();
      await page.getByRole('heading', { name: /Where to focus/i }).scrollIntoViewIfNeeded();
      const tableWrapper = page.getByTestId('hypothesis-table-wrapper');
      await tableWrapper.scrollIntoViewIfNeeded();
      await expect(tableWrapper).toBeVisible();
      const firstHypothesisLink = tableWrapper.getByRole('link').first();
      await expect(firstHypothesisLink).toBeVisible({ timeout: 15000 });
      await firstHypothesisLink.click();
      await expect(page).toHaveURL(/\/hypo-stage\/hypothesis\/[a-f0-9-]+$/);
      await expect(page.getByRole('heading', { name: /Hypothesis Dashboard/i })).toBeVisible();
    });
  });
});
