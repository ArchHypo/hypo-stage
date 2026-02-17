/**
 * E2E: Delete hypothesis
 *
 * Domain: Hypothesis deletion with confirmation. Covers two entry points:
 * (1) From the hypothesis detail page: Delete button in the action bar opens
 *     a dialog requiring the user to type the full hypothesis statement to
 *     confirm; on confirm the hypothesis is deleted and the user is redirected
 *     to the list.
 * (2) From the list: each row has a "Delete hypothesis" icon that opens the
 *     same confirmation dialog; on confirm the hypothesis is removed and the
 *     list refreshes.
 *
 * Both flows create a dedicated hypothesis first, then delete only that one,
 * so seed data is never removed. Requires app running and mock catalog.
 */

import { test, expect } from '@playwright/test';

/** Creates a single hypothesis via the UI and returns its statement. Leaves the list page open. */
async function createHypothesisForDeletion(page) {
  const uniqueStatement = `E2E delete test hypothesis ${Date.now()}-${Math.random().toString(36).slice(2, 10)}. This statement is long enough to pass validation.`;
  await page.getByRole('button', { name: /Create New Hypothesis/i }).click();
  await expect(page).toHaveURL(/\/hypo-stage\/create-hypothesis/);

  await page.getByLabel(/Entity References/i).scrollIntoViewIfNeeded();
  await page.getByLabel(/Entity References/i).click();
  await page.getByLabel(/Entity References/i).fill('user-service');
  await page.waitForTimeout(1500); // eslint-disable-line playwright/no-wait-for-timeout -- autocomplete fetch
  await expect(page.getByRole('option').first()).toBeVisible({ timeout: 15000 });
  await page.getByRole('option').first().click();

  const statementField = page.getByPlaceholder(/current access control library|e\.g\./i);
  await statementField.scrollIntoViewIfNeeded();
  await statementField.click();
  await statementField.fill(uniqueStatement);
  await page.getByText('Source Type').first().scrollIntoViewIfNeeded();
  const sourceTypeFormControl = page.getByText('Source Type').first().locator('..');
  await sourceTypeFormControl.getByRole('button').first().click();
  await expect(page.getByRole('option', { name: 'Other' })).toBeVisible({ timeout: 10000 });
  await page.getByRole('option', { name: 'Other' }).click();
  await page.getByRole('button', { name: '3' }).first().click();
  await page.getByRole('button', { name: '3' }).nth(1).click();
  await page.getByLabel(/Quality Attributes \(select one or more\)/i).click();
  await expect(page.getByRole('listbox')).toBeVisible({ timeout: 5000 });
  await page.getByRole('option', { name: /^Performance/ }).click();

  const submitBtn = page.getByRole('button', { name: /^Create New Hypothesis$/ });
  await submitBtn.scrollIntoViewIfNeeded();
  await submitBtn.click();
  await expect(page).toHaveURL(/\/hypo-stage$/, { timeout: 15000 });
  await expect(page.getByText(uniqueStatement).first()).toBeVisible({ timeout: 10000 });
  return uniqueStatement;
}

test.describe('Delete hypothesis', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/hypo-stage');
  });

  test.describe('delete from detail page', () => {
    test('can delete hypothesis from detail page with confirmation and hypothesis is removed from list', async ({ page }) => {
      const statement = await createHypothesisForDeletion(page);

      const tableWrapper = page.getByTestId('hypothesis-table-wrapper');
      await tableWrapper.scrollIntoViewIfNeeded();
      const row = page.getByRole('row').filter({ hasText: statement });
      await row.getByRole('link').first().click();
      await expect(page).toHaveURL(/\/hypo-stage\/hypothesis\/[^/]+/, { timeout: 15000 });
      await expect(page.getByRole('heading', { name: /Hypothesis Dashboard/i })).toBeVisible({ timeout: 10000 });

      await page.getByText('Hypothesis Statement').scrollIntoViewIfNeeded();
      await page.getByTestId('hypothesis-action-bar').getByRole('button', { name: /^Delete$/ }).scrollIntoViewIfNeeded();
      await page.getByTestId('hypothesis-action-bar').getByRole('button', { name: /^Delete$/ }).click();
      await expect(page.getByText('Delete hypothesis?')).toBeVisible();
      await page.getByTestId('delete-hypothesis-confirm-input').fill(statement);
      await page.getByRole('dialog').getByRole('button', { name: /^Delete$/ }).click();

      await expect(page).toHaveURL(/\/hypo-stage$/, { timeout: 15000 });
      await expect(page.getByText('Hypotheses')).toBeVisible();
      // eslint-disable-next-line playwright/no-useless-not -- element may be removed from DOM
      await expect(page.getByText(statement)).not.toBeVisible();
    });
  });

  test.describe('delete from list', () => {
    test('can delete hypothesis from list with confirmation and hypothesis is removed from list', async ({ page }) => {
      const statement = await createHypothesisForDeletion(page);

      const tableWrapper = page.getByTestId('hypothesis-table-wrapper');
      await tableWrapper.scrollIntoViewIfNeeded();
      const row = page.getByRole('row').filter({ hasText: statement });
      await expect(row).toBeVisible({ timeout: 5000 });
      const deleteBtn = row.getByRole('button', { name: 'Delete hypothesis' });
      await deleteBtn.click();

      await expect(page.getByText('Delete hypothesis?')).toBeVisible();
      await page.getByTestId('delete-hypothesis-confirm-input').fill(statement);
      await page.getByRole('dialog').getByRole('button', { name: /^Delete$/ }).click();

      await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });
      await expect(page).toHaveURL(/\/hypo-stage$/, { timeout: 15000 });
      // eslint-disable-next-line playwright/no-useless-not -- element may be removed from DOM
      await expect(page.getByTestId('hypothesis-table-wrapper').getByText(statement)).not.toBeVisible();
    });
  });
});
