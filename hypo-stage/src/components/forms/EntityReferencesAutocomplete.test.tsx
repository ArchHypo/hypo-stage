import { default as React } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { TestApiProvider } from '@backstage/test-utils';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import { EntityReferencesAutocomplete } from './EntityReferencesAutocomplete';

const mockEntities = [
  {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'Component',
    metadata: { name: 'my-service', namespace: 'default' },
    spec: {},
  },
  {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'Component',
    metadata: { name: 'other-service', namespace: 'default' },
    spec: {},
  },
];

const mockCatalogApi = {
  queryEntities: jest.fn().mockResolvedValue({
    items: mockEntities,
    totalItems: 2,
  }),
};

const renderWithApis = (ui: React.ReactElement) =>
  render(
    <TestApiProvider apis={[[catalogApiRef, mockCatalogApi]]}>
      {ui}
    </TestApiProvider>,
  );

describe('EntityReferencesAutocomplete', () => {
  beforeEach(() => {
    mockCatalogApi.queryEntities.mockClear();
    mockCatalogApi.queryEntities.mockResolvedValue({
      items: mockEntities,
      totalItems: 2,
    });
  });

  it('renders label and placeholder', () => {
    renderWithApis(
      <EntityReferencesAutocomplete
        label="Entity References"
        value={[]}
        onChange={() => {}}
      />,
    );
    expect(screen.getByLabelText(/Entity References/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Search components/i)).toBeInTheDocument();
  });

  it('shows selected values as chips', () => {
    renderWithApis(
      <EntityReferencesAutocomplete
        label="Entity References"
        value={['component:default/my-service']}
        onChange={() => {}}
      />,
    );
    expect(screen.getByText('component:default/my-service')).toBeInTheDocument();
  });

  it('calls queryEntities when user types (after debounce)', async () => {
    const user = userEvent.setup();
    renderWithApis(
      <EntityReferencesAutocomplete
        label="Entity References"
        value={[]}
        onChange={() => {}}
      />,
    );
    const input = screen.getByPlaceholderText(/Search components/i);
    await user.type(input, 'my');
    await waitFor(
      () => {
        expect(mockCatalogApi.queryEntities).toHaveBeenCalledWith(
          expect.objectContaining({
            fullTextFilter: { term: 'my' },
            filter: [{ kind: 'component' }],
            limit: 50,
          }),
        );
      },
      { timeout: 1000 },
    );
  });

  it('calls onChange when selection changes', async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    renderWithApis(
      <EntityReferencesAutocomplete
        label="Entity References"
        value={[]}
        onChange={onChange}
      />,
    );
    const input = screen.getByPlaceholderText(/Search components/i);
    await user.type(input, 'my');
    await waitFor(() => {
      expect(mockCatalogApi.queryEntities).toHaveBeenCalled();
    });
    const option = await screen.findByText('component:default/my-service');
    await user.click(option);
    expect(onChange).toHaveBeenCalledWith(['component:default/my-service']);
  });
});
