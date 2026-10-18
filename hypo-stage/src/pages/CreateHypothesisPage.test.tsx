import { default as React } from 'react';
import { screen } from '@testing-library/react';
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
});
