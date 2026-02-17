import { test, expect } from '@playwright/test';

test.describe('HypoStage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/hypo-stage');
  });

  test('shows the HypoStage home page with header and hypotheses section', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Welcome to Hypo Stage/i })).toBeVisible();
    await expect(page.getByText('Hypotheses')).toBeVisible();
  });

  test('has Create New Hypothesis button that navigates to create page', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Create New Hypothesis/i })).toBeVisible();
    await page.getByRole('button', { name: /Create New Hypothesis/i }).click();
    await expect(page).toHaveURL(/\/hypo-stage\/create-hypothesis/);
  });

  test('create hypothesis page loads', async ({ page }) => {
    await page.getByRole('button', { name: /Create New Hypothesis/i }).click();
    await expect(page).toHaveURL(/\/hypo-stage\/create-hypothesis/);
    await expect(page.getByText(/Create|Hypothesis|Statement/i).first()).toBeVisible({ timeout: 10000 });
  });
});
