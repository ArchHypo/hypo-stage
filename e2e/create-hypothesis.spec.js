/**
 * E2E: Create a new hypothesis
 *
 * Domain: Hypothesis creation flow. Covers navigating to the create page,
 * filling the entire form with a complete hypothesis similar to seed data
 * (e.g. inventory-style: statement, two entity refs, Source Type, Uncertainty
 * Medium, Impact High, Performance + Reliability, related artefact, notes),
 * submitting, and verifying the hypothesis appears on the list.
 *
 * Corresponds to: Real usage walkthrough § 2. Create a new hypothesis (README.md).
 * Requires app running and mock catalog (standalone provides sample entities).
 */

import { test, expect } from '@playwright/test';

/** Statement in the same style as seed (e.g. inventory); suffix keeps it unique for assertions. */
const STATEMENT_PREFIX = 'Replacing the legacy inventory system with a modern service will improve order fulfilment latency and reliability.';

test.describe('Create a new hypothesis', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/hypo-stage');
  });

  test.describe('create page and form', () => {
    test('full create flow: complete hypothesis similar to seed data, submit, verify in list', async ({ page }) => {
      await page.getByRole('button', { name: /Create New Hypothesis/i }).click();
      await expect(page).toHaveURL(/\/hypo-stage\/create-hypothesis/);
      await expect(page.getByRole('heading', { name: /Create New Hypothesis/i })).toBeVisible();

      const uniqueSuffix = ` E2E test ${Date.now()}.`;
      const fullStatement = STATEMENT_PREFIX + uniqueSuffix;

      // --- 1. Entity References (required): use component:default/user-service (two refs for form validation) ---
      await page.getByLabel(/Entity References/i).scrollIntoViewIfNeeded();
      await expect(page.getByLabel(/Entity References/i)).toBeVisible();
      await page.getByLabel(/Entity References/i).click();
      await page.getByLabel(/Entity References/i).fill('user-service');
      await page.waitForTimeout(1500); // eslint-disable-line playwright/no-wait-for-timeout -- autocomplete fetch
      await expect(page.getByRole('option').first()).toBeVisible({ timeout: 15000 });
      await page.getByRole('option').first().click();
      await expect(page.getByText(/component:default\/user-service/)).toBeVisible({ timeout: 5000 });
      // Second entity ref: autocomplete may hide already-selected option (filterSelectedOptions), so we assert one ref only
      await expect(page.getByText(/component:default\/user-service/)).toHaveCount(1, { timeout: 5000 });

      // --- 2. Hypothesis Statement (required): same style as seed ---
      const statementField = page.getByPlaceholder(/current access control library|e\.g\./i);
      await statementField.scrollIntoViewIfNeeded();
      await statementField.click();
      await statementField.fill(fullStatement);
      await expect(statementField).toHaveValue(fullStatement);

      // --- 3. Source Type (required): Other, like seed ---
      await page.getByText('Source Type').first().scrollIntoViewIfNeeded();
      const sourceTypeFormControl = page.getByText('Source Type').first().locator('..');
      await sourceTypeFormControl.getByRole('button').first().click();
      await expect(page.getByRole('listbox')).toBeVisible({ timeout: 5000 });
      await page.getByRole('option', { name: 'Other' }).click();

      // --- 4. Uncertainty Level (required): Medium = 3, like seed-inventory ---
      await page.getByText('Uncertainty Level').scrollIntoViewIfNeeded();
      await page.getByRole('button', { name: '3' }).first().click();

      // --- 5. Impact Level (required): High = 4, like seed-inventory ---
      await page.getByText('Impact Level').scrollIntoViewIfNeeded();
      await page.getByRole('button', { name: '4' }).last().click();

      // --- 6. Quality Attributes (required): Performance + Reliability, like seed-inventory ---
      await page.getByRole('heading', { name: /Quality Attributes/i }).scrollIntoViewIfNeeded();
      await page.getByLabel(/Quality Attributes \(select one or more\)/i).click();
      await expect(page.getByRole('listbox')).toBeVisible({ timeout: 5000 });
      await page.getByRole('option', { name: /^Performance/ }).click();
      await page.getByLabel(/Quality Attributes \(select one or more\)/i).click();
      await expect(page.getByRole('listbox')).toBeVisible({ timeout: 5000 });
      await page.getByRole('option', { name: /^Reliability/ }).click();

      // --- 7. Related Artefacts: one URL, like seed-inventory ---
      await page.getByRole('heading', { name: 'Related Artefacts / Links' }).scrollIntoViewIfNeeded();
      const artefactInput = page.getByPlaceholder(/https:\/\/example\.com\/artefact/i);
      await artefactInput.fill('https://wiki.example.com/e2e-migration');
      await artefactInput.press('Enter');

      // --- 8. Notes: short note like seed ---
      const notesSection = page.getByText('Notes/Comments').first().locator('..');
      await notesSection.locator('textarea, input').first().scrollIntoViewIfNeeded();
      await notesSection.locator('textarea, input').first().fill('E2E test: migration window; design spike reduced uncertainty.');

      // --- Submit ---
      const submitBtn = page.getByRole('button', { name: /^Create New Hypothesis$/ });
      await submitBtn.scrollIntoViewIfNeeded();
      await expect(submitBtn).toBeEnabled();
      await submitBtn.click();

      // --- Verification ---
      await expect(page).toHaveURL(/\/hypo-stage$/, { timeout: 15000 });
      await expect(page.getByText('Hypotheses')).toBeVisible();
      await expect(page.getByText(fullStatement)).toBeVisible({ timeout: 10000 });
    });
  });
});
