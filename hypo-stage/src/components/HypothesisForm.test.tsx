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

const EDIT_MODE_STATEMENT =
  'Existing hypothesis statement used in HypothesisForm edit mode unit tests.';

const editFormData = (overrides = {}): any => ({
  entityRefs: [],
  statement: EDIT_MODE_STATEMENT,
  status: 'Open',
  sourceType: 'Requirements',
  qualityAttributes: ['Performance'],
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

    it('should explain that related artefact links are optional and can be added later', () => {
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

      expect(screen.getByText(/related artefacts \(optional\)/i)).toBeInTheDocument();
      expect(
        screen.getByText(/Links to specs, ADRs, tickets, or other evidence are optional/i),
      ).toBeInTheDocument();
    });
  });

  describe('edit mode', () => {
    const mockHypothesis = {
      id: 'hyp-1',
      statement: EDIT_MODE_STATEMENT,
      status: 'Open' as const,
      sourceType: 'Requirements' as const,
      entityRefs: ['component:default/foo'],
      relatedArtefacts: [],
      qualityAttributes: ['Performance' as const],
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
      expect(screen.getByText(/related artefacts \(optional\)/i)).toBeInTheDocument();
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

    it('should keep hypothesis statement editable in edit mode', () => {
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

      const statementField = screen.getByDisplayValue(EDIT_MODE_STATEMENT);
      expect(statementField).not.toBeDisabled();
      expect((statementField as HTMLTextAreaElement).value).toContain('Existing hypothesis statement');
    });

    it('should call onFieldChange for statement when user edits text in edit mode', async () => {
      const user = userEvent.setup();
      const onFieldChange = jest.fn();
      const formData = editFormData();
      renderWithTheme(
        <HypothesisForm
          mode="edit"
          hypothesis={mockHypothesis}
          formData={formData}
          onFieldChange={onFieldChange}
          isFormValid
          loading={false}
        />,
      );

      const statementField = screen.getByDisplayValue(EDIT_MODE_STATEMENT);
      await user.clear(statementField);
      await user.type(statementField, 'x');
      expect(onFieldChange).toHaveBeenCalledWith('statement', expect.any(String));
    });

    it('should show statement validation error in edit mode when text is too short', () => {
      const formData = editFormData({ statement: 'short' });
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

      expect(screen.getByText(/at least 20 characters/i)).toBeInTheDocument();
    });
  });

  describe('with the hypothesis coach', () => {
    const needsWork = {
      reviewId: 'r1',
      verdict: 'needs_work' as const,
      classification: 'requirement' as const,
      classificationReason: 'It states a target the system must meet.',
      falsifiable: false,
      refutingEvidence: null,
      issues: [{ type: 'not_a_hypothesis' as const, severity: 'warning' as const, message: 'Target, not a belief', concept: 'c' }],
      rewrites: [],
      splitInto: [],
      suggestedSourceType: null,
      suggestedQualityAttributes: [],
    };

    const coach = (checkBeforeSave: jest.Mock) => ({
      enabled: true,
      checkOnSave: true,
      review: null,
      loading: false,
      error: null,
      isStale: () => true,
      requestReview: jest.fn(),
      checkBeforeSave,
    });

    const renderForm = (checkBeforeSave: jest.Mock, onSubmit = jest.fn()) => {
      renderWithTheme(
        <HypothesisForm
          mode="create"
          formData={createFormData({ statement: 'The system must process 1000 requests per second' })}
          onFieldChange={jest.fn()}
          isFormValid
          loading={false}
          onSubmit={onSubmit}
          coach={coach(checkBeforeSave)}
        />,
      );
      return onSubmit;
    };

    it('shows the review button', () => {
      renderForm(jest.fn());
      expect(screen.getByRole('button', { name: /Review with AI/ })).toBeInTheDocument();
    });

    it('submits directly when the save check proceeds', async () => {
      const onSubmit = renderForm(jest.fn().mockResolvedValue({ action: 'proceed' }));
      await userEvent.click(screen.getByRole('button', { name: /Create New Hypothesis/i }));
      expect(onSubmit).toHaveBeenCalled();
    });

    it('asks for confirmation when the statement needs work, and "Save anyway" submits', async () => {
      const onSubmit = renderForm(jest.fn().mockResolvedValue({ action: 'confirm', review: needsWork }));
      await userEvent.click(screen.getByRole('button', { name: /Create New Hypothesis/i }));

      expect(await screen.findByText('The coach found issues in this statement')).toBeInTheDocument();
      expect(screen.getByText(/Target, not a belief/)).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();

      await userEvent.click(screen.getByRole('button', { name: 'Save anyway' }));
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    it('"Back to edit" keeps the form open without submitting', async () => {
      const onSubmit = renderForm(jest.fn().mockResolvedValue({ action: 'confirm', review: needsWork }));
      await userEvent.click(screen.getByRole('button', { name: /Create New Hypothesis/i }));
      await userEvent.click(await screen.findByRole('button', { name: 'Back to edit' }));
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });
});
