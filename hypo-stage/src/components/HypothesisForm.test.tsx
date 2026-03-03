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

const createFormData = (overrides = {}): any => ({
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

const editFormData = (overrides = {}): any => ({
  entityRefs: [],
  status: 'Open',
  sourceType: 'Requirements',
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

    it('should render uncertainty and impact fields in create mode', () => {
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

      expect(screen.getByText('Uncertainty Level')).toBeInTheDocument();
      expect(screen.getByText('Impact Level')).toBeInTheDocument();
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
      const formData = editFormData();
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
      const formData = editFormData();
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

    it('should NOT render uncertainty and impact fields in edit mode', () => {
      const formData = editFormData();
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

      expect(screen.queryByText('Uncertainty Level')).not.toBeInTheDocument();
      expect(screen.queryByText('Impact Level')).not.toBeInTheDocument();
    });
  });
});
