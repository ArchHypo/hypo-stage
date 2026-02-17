/**
 * E2E: Technical planning (add, edit, delete)
 *
 * Domain: Technical planning items attached to a hypothesis. Covers:
 * (1) Add: "Add Technical Planning" opens a form (Owner, Action type, Target date,
 *     Description, Expected outcome, Documentation links); submit creates the
 *     item and it appears in the Technical Planning section.
 * (2) Edit: On an existing item, "Edit" opens the form in edit mode; change
 *     a field (e.g. Description) and "Update Technical Planning" saves and
 *     shows the updated content.
 * (3) Delete: "Delete" on an item opens a confirmation dialog; confirm removes
 *     the item from the list.
 *
 * Tests are self-contained: they add a technical planning item when needed so
 * they do not depend on seed data containing technical planning. Requires app
 * running and at least one hypothesis (seed data recommended for list/detail
 * to be available).
 *
 * Corresponds to: Real usage walkthrough § 5. Add technical planning items
 * (README.md).
 */

import { test, expect } from '@playwright/test';

test.describe('Technical planning', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/hypo-stage');
  });

  test.describe('add technical planning', () => {
    test('can add technical planning from detail page with all required fields and item appears', async ({ page }) => {
      const tableWrapper = page.getByTestId('hypothesis-table-wrapper');
      await tableWrapper.scrollIntoViewIfNeeded();
      const firstLink = tableWrapper.getByRole('link').first();
      await expect(firstLink).toBeVisible({ timeout: 15000 });
      await firstLink.click();
      await expect(page.getByRole('heading', { name: /Hypothesis Dashboard/i })).toBeVisible();

      await page.getByRole('heading', { name: 'Technical Planning', exact: true }).scrollIntoViewIfNeeded();
      await page.getByRole('button', { name: /Add (Another )?Technical Planning/i }).first().click();
      await expect(page.getByText('Define technical actions and planning for this hypothesis')).toBeVisible({ timeout: 10000 });
      await page.getByText('Define technical actions and planning for this hypothesis').scrollIntoViewIfNeeded();
      const ownerFormControl = page.getByText('Owner').first().locator('..');
      await expect(ownerFormControl.getByRole('button').first()).toBeVisible({ timeout: 5000 });
      await ownerFormControl.getByRole('button').first().click();
      await page.getByRole('option', { name: /component:default\/user-service|user-service/ }).first().click();
      const targetDateSection = page.getByText('Target Date').first().locator('..');
      await targetDateSection.locator('input').scrollIntoViewIfNeeded();
      await targetDateSection.locator('input').fill(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
      const actionTypeSection = page.getByText('Action Type').first().locator('..');
      await actionTypeSection.getByRole('button').first().click();
      await page.getByRole('option', { name: 'Experiment' }).click();
      const descriptionSection = page.getByText('Description').first().locator('..');
      const expectedOutcomeSection = page.getByText('Expected Outcome').first().locator('..');
      await descriptionSection.locator('textarea, input').first().fill('E2E test technical planning description.');
      await expectedOutcomeSection.locator('textarea, input').first().fill('E2E test expected outcome.');

      const docInput = page.getByPlaceholder(/https:\/\/example\.com\/docs/);
      await docInput.scrollIntoViewIfNeeded();
      await docInput.fill('https://example.com/e2e-doc');
      await docInput.press('Enter');

      const submitBtn = page.getByRole('button', { name: /^Add Technical Planning$/ });
      await submitBtn.scrollIntoViewIfNeeded();
      await submitBtn.click();
      await expect(page.getByText(/Technical planning added successfully|added successfully/i)).toBeVisible({ timeout: 10000 });
      await expect(page.getByRole('heading', { name: 'Technical Planning', exact: true })).toBeVisible();
      await expect(page.getByText('E2E test technical planning description.')).toBeVisible();
    });
  });

  test.describe('edit technical planning', () => {
    test('can edit a technical planning item and see updated content', async ({ page }) => {
      const tableWrapper = page.getByTestId('hypothesis-table-wrapper');
      await tableWrapper.scrollIntoViewIfNeeded();
      const firstLink = tableWrapper.getByRole('link').first();
      await expect(firstLink).toBeVisible({ timeout: 15000 });
      await firstLink.click();
      await expect(page.getByRole('heading', { name: /Hypothesis Dashboard/i })).toBeVisible();

      const techPlanningSection = page.getByRole('heading', { name: 'Technical Planning', exact: true });
      await techPlanningSection.scrollIntoViewIfNeeded();
      const addTechPlanBtnEdit = techPlanningSection.locator('..').locator('..').getByRole('button', { name: /Add (Another )?Technical Planning/i });
      await expect(addTechPlanBtnEdit).toBeVisible({ timeout: 15000 });
      await addTechPlanBtnEdit.scrollIntoViewIfNeeded();
      await addTechPlanBtnEdit.click();
      await expect(page.getByText('Define technical actions and planning for this hypothesis')).toBeVisible({ timeout: 10000 });
      await page.getByText('Define technical actions and planning for this hypothesis').scrollIntoViewIfNeeded();
      const ownerFormControlEdit = page.getByText('Owner').first().locator('..');
      await ownerFormControlEdit.getByRole('button').first().click();
      await page.getByRole('option', { name: /component:default\/user-service|user-service/ }).first().click();
      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const targetDateSectionEdit = page.getByText('Target Date').first().locator('..');
      await targetDateSectionEdit.locator('input').fill(nextWeek);
      const actionTypeSectionEdit = page.getByText('Action Type').first().locator('..');
      await actionTypeSectionEdit.getByRole('button').first().click();
      await page.getByRole('option', { name: 'Spike' }).click();
      const descriptionSectionEdit = page.getByText('Description').first().locator('..');
      const expectedOutcomeSectionEdit = page.getByText('Expected Outcome').first().locator('..');
      await descriptionSectionEdit.locator('textarea, input').first().fill('E2E edit test description.');
      await expectedOutcomeSectionEdit.locator('textarea, input').first().fill('E2E edit test outcome.');
      await page.getByPlaceholder(/https:\/\/example\.com\/docs/).fill('https://example.com/edit-doc');
      await page.getByPlaceholder(/https:\/\/example\.com\/docs/).press('Enter');
      await page.getByRole('button', { name: /^Add Technical Planning$/ }).click();
      await expect(page.getByText(/Technical planning added successfully|added successfully/i)).toBeVisible({ timeout: 10000 });

      await expect(
        page.getByText('Technical Planning #1').or(page.getByText('Technical Planning #2')).first(),
      ).toBeVisible({ timeout: 5000 });
      await page.getByRole('button', { name: 'Edit' }).last().scrollIntoViewIfNeeded();
      await page.getByRole('button', { name: 'Edit' }).last().click();
      await expect(page.getByRole('button', { name: /Update Technical Planning/i })).toBeVisible();
      const updateFormContainer = page.getByRole('button', { name: /Update Technical Planning/i }).locator('../..');
      const expectedOutcomeEditForm = updateFormContainer.getByText('Expected Outcome').first().locator('..');
      await expectedOutcomeEditForm.locator('textarea, input').first().fill('E2E edited outcome.');
      await page.getByRole('button', { name: /Update Technical Planning/i }).click();
      await expect(page.getByText('E2E edited outcome.')).toBeVisible({ timeout: 15000 });
    });
  });

  test.describe('delete technical planning', () => {
    test('can delete a technical planning item with confirmation and item is removed', async ({ page }) => {
      const uniqueDesc = `E2E to-be-deleted description ${Date.now()}.`;
      const tableWrapper = page.getByTestId('hypothesis-table-wrapper');
      await tableWrapper.scrollIntoViewIfNeeded();
      const firstLink = tableWrapper.getByRole('link').first();
      await expect(firstLink).toBeVisible({ timeout: 15000 });
      await firstLink.click();
      await expect(page.getByRole('heading', { name: /Hypothesis Dashboard/i })).toBeVisible();

      await page.getByRole('heading', { name: 'Technical Planning', exact: true }).scrollIntoViewIfNeeded();
      const addTechPlanBtn = page.getByRole('button', { name: /Add (Another )?Technical Planning/i }).first();
      await expect(addTechPlanBtn).toBeVisible({ timeout: 10000 });
      await addTechPlanBtn.scrollIntoViewIfNeeded();
      await addTechPlanBtn.click();
      await expect(page.getByText('Define technical actions and planning for this hypothesis')).toBeVisible({ timeout: 10000 });
      await page.getByText('Define technical actions and planning for this hypothesis').scrollIntoViewIfNeeded();
      const addFormDel = page.getByText('Define technical actions and planning for this hypothesis').locator('..').locator('..');
      const ownerFormControlDel = addFormDel.getByText('Owner').first().locator('..');
      await expect(ownerFormControlDel.getByRole('button').first()).toBeVisible({ timeout: 10000 });
      await ownerFormControlDel.getByRole('button').first().click();
      await page.getByRole('option', { name: /component:default\/user-service|user-service/ }).first().click();
      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const targetDateSectionDel = addFormDel.getByText('Target Date').first().locator('..');
      await targetDateSectionDel.locator('input').fill(nextWeek);
      const actionTypeSectionDel = addFormDel.getByText('Action Type').first().locator('..');
      await actionTypeSectionDel.getByRole('button').first().click();
      await page.getByRole('option', { name: 'Guideline' }).click();
      const descriptionSectionDel = addFormDel.getByText('Description').first().locator('..');
      const expectedOutcomeSectionDel = addFormDel.getByText('Expected Outcome').first().locator('..');
      await descriptionSectionDel.locator('textarea, input').first().fill(uniqueDesc);
      await expectedOutcomeSectionDel.locator('textarea, input').first().fill('E2E to-be-deleted outcome.');
      const docPlaceholderDel = addFormDel.getByPlaceholder(/https:\/\/example\.com\/docs/);
      await docPlaceholderDel.fill('https://example.com/delete-doc');
      await docPlaceholderDel.press('Enter');
      await page.getByRole('button', { name: /^Add Technical Planning$/ }).click();
      await expect(page.getByText(uniqueDesc).first()).toBeVisible({ timeout: 15000 });
      const techSection = page.getByRole('heading', { name: 'Technical Planning', exact: true }).locator('..').locator('..');
      const itemCard = techSection.locator('[class*="Paper"], [class*="paperContainer"]').filter({ hasText: uniqueDesc }).first();
      await itemCard.getByRole('button', { name: 'Delete' }).scrollIntoViewIfNeeded();
      await itemCard.getByRole('button', { name: 'Delete' }).click();
      await expect(page.getByText('Delete Technical Planning')).toBeVisible();
      await page.getByRole('dialog').getByRole('button', { name: /^Delete$/ }).click();
      await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });
      const techPlanningSection = page.getByRole('heading', { name: 'Technical Planning', exact: true }).locator('..').locator('..');
      // eslint-disable-next-line playwright/no-useless-not -- element removed from DOM
      await expect(techPlanningSection.getByText(uniqueDesc)).not.toBeVisible();
    });
  });
});
