import { default as React } from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import { ThemeProvider } from '@material-ui/core/styles';
import { createTheme } from '@material-ui/core/styles';
import { HypothesisForm } from './HypothesisForm';

const theme = createTheme();

// Mock EntityReferencesAutocomplete - it requires catalog API
jest.mock('./forms/EntityReferencesAutocomplete', () => ({
  EntityReferencesAutocomplete: ({ label, value, onChange }: any) => (
    <div data-testid="entity-refs-autocomplete">
      <label>{label}</label>
      <input
        data-testid="entity-refs-input"
        value={value?.join(',') ?? ''}
        onChange={(e) => onChange(e.target.value ? e.target.value.split(',') : [])}
      />
    </div>
  ),
}));

const renderWithTheme = (ui: React.ReactElement) => {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
};

const createFormData = (overrides = {}) => ({
  statement: '',
  entityRefs: [],
  status: 'Open',
  sourceType: 'Requirements',
  uncertainty: 'Medium',
  impact: 'Medium',
  qualityAttributes: [],
  relatedArtefacts: [],
  notes: '',
  ...overrides,
});

describe('HypothesisForm', () => {
  describe('create mode', () => {
    it('should render form with create title and full-width grid layout', () => {
      const formData = createFormData();
      renderWithTheme(
        <HypothesisForm
          mode="create"
          formData={formData}
          onFieldChange={jest.fn()}
          isFormValid={false}
          loading={false}
        />,
      );

      expect(screen.getAllByText('Create New Hypothesis').length).toBeGreaterThan(0);
      expect(screen.getByTestId('entity-refs-autocomplete')).toBeInTheDocument();
    });

    it('should render submit button with create label', () => {
      const formData = createFormData({ entityRefs: ['component:default/foo'] });
      renderWithTheme(
        <HypothesisForm
          mode="create"
          formData={formData}
          onFieldChange={jest.fn()}
          isFormValid
          loading={false}
        />,
      );

      expect(screen.getByRole('button', { name: /Create New Hypothesis/i })).toBeInTheDocument();
    });

    it('should call onSubmit when submit button is clicked', async () => {
      const user = userEvent.setup();
      const onSubmit = jest.fn();
      const formData = createFormData({ entityRefs: ['component:default/foo'] });
      renderWithTheme(
        <HypothesisForm
          mode="create"
          formData={formData}
          onFieldChange={jest.fn()}
          isFormValid
          loading={false}
          onSubmit={onSubmit}
        />,
      );

      await user.click(screen.getByRole('button', { name: /Create New Hypothesis/i }));
      expect(onSubmit).toHaveBeenCalled();
    });
  });

  describe('edit mode', () => {
    const mockHypothesis = {
      id: 'hyp-1',
      statement: 'Existing statement',
      status: 'Open' as const,
      sourceType: 'Requirements' as const,
      entityRefs: ['component:default/foo'],
      relatedArtefacts: [],
      qualityAttributes: [],
      uncertainty: 'Medium' as const,
      impact: 'High' as const,
      technicalPlannings: [],
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should render form with update title', () => {
      const formData = createFormData();
      renderWithTheme(
        <HypothesisForm
          mode="edit"
          hypothesis={mockHypothesis}
          formData={formData}
          onFieldChange={jest.fn()}
          isFormValid={false}
          loading={false}
        />,
      );

      expect(screen.getAllByText('Update Hypothesis').length).toBeGreaterThan(0);
    });

    it('should render submit button with update label', () => {
      const formData = createFormData();
      renderWithTheme(
        <HypothesisForm
          mode="edit"
          hypothesis={mockHypothesis}
          formData={formData}
          onFieldChange={jest.fn()}
          isFormValid
          loading={false}
        />,
      );

      expect(screen.getByRole('button', { name: /Update Hypothesis/i })).toBeInTheDocument();
    });
  });
});
