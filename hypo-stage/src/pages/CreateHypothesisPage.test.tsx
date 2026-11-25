import { default as React } from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { TestApiProvider, renderInTestApp } from '@backstage/test-utils';
import { AGENTS_UNAVAILABLE, HypoStageApiRef } from '../api/HypoStageApi';
import { CreateHypothesisPage } from './CreateHypothesisPage';

jest.mock('../components/forms/EntityReferencesAutocomplete', () => ({
  EntityReferencesAutocomplete: ({ value }: { value: string[] }) => (
    <div data-testid="entity-refs">{value.join(',')}</div>
  ),
}));

describe('CreateHypothesisPage', () => {
  it('pre-fills the form from query parameters (e.g. a coverage finding)', async () => {
    const api = { getAgentsStatus: jest.fn().mockResolvedValue(AGENTS_UNAVAILABLE) };
    const params = new URLSearchParams();
    params.set('statement', 'The checkout keeps p95 under 300 ms at peak load');
    params.append('entityRef', 'component:default/checkout');
    params.append('qualityAttribute', 'Performance');
    params.append('qualityAttribute', 'NotAnAttribute');
    params.set('notes', 'Drafted from recurring issues');

    await renderInTestApp(
      <TestApiProvider apis={[[HypoStageApiRef, api]]}>
        <CreateHypothesisPage />
      </TestApiProvider>,
      { routeEntries: [`/?${params.toString()}`] },
    );

    expect(await screen.findByDisplayValue('The checkout keeps p95 under 300 ms at peak load')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Drafted from recurring issues')).toBeInTheDocument();
    expect(screen.getByTestId('entity-refs')).toHaveTextContent('component:default/checkout');
  });

  it('marks a coverage finding created only after the hypothesis is saved', async () => {
    const user = userEvent.setup();
    const api = {
      getAgentsStatus: jest.fn().mockResolvedValue(AGENTS_UNAVAILABLE),
      createHypothesis: jest.fn().mockResolvedValue({ id: 'h-new' }),
      updateCoverageFinding: jest.fn().mockResolvedValue(undefined),
    };
    const params = new URLSearchParams();
    params.set('coverageFinding', 'f1');
    params.set('statement', 'The checkout keeps p95 under 300 ms at peak load');
    params.append('entityRef', 'component:default/checkout');
    params.append('qualityAttribute', 'Performance');

    await renderInTestApp(
      <TestApiProvider apis={[[HypoStageApiRef, api]]}>
        <CreateHypothesisPage />
      </TestApiProvider>,
      { routeEntries: [`/?${params.toString()}`] },
    );

    expect(api.updateCoverageFinding).not.toHaveBeenCalled();
    const sourceLabel = screen.getByText('Source Type', { selector: 'label' });
    const sourceSelect = sourceLabel.parentElement?.querySelector('[role="button"]');
    if (!sourceSelect) {
      throw new Error(`Source Type select was not rendered: ${sourceLabel.parentElement?.innerHTML.slice(0, 400)}`);
    }
    await user.click(sourceSelect);
    await user.click(await screen.findByRole('option', { name: /Requirements/ }));
    const threes = screen.getAllByRole('button', { name: '3' });
    await user.click(threes[0]);
    await user.click(threes[1]);
    await user.click(screen.getByRole('button', { name: 'Create New Hypothesis' }));

    await waitFor(() => expect(api.createHypothesis).toHaveBeenCalled());
    expect(api.updateCoverageFinding).toHaveBeenCalledWith('f1', 'created');
  });
});
