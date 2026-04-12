import { createElement, ReactNode } from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { TestApiProvider } from '@backstage/test-utils';
import { HypoStageApiRef } from '../../api/HypoStageApi';
import { useEditHypothesis } from './useEditHypothesis';

const notificationMocks = {
  showSuccess: jest.fn(),
  showError: jest.fn(),
};

jest.mock('../../providers/NotificationProvider', () => ({
  useNotifications: () => notificationMocks,
}));

const LONG_STATEMENT =
  'Initial hypothesis statement used for edit hook tests; must be at least twenty characters.';

const baseHypothesis = {
  id: 'hyp-1',
  statement: LONG_STATEMENT,
  entityRefs: ['component:default/foo'],
  status: 'Open' as const,
  sourceType: 'Requirements' as const,
  relatedArtefacts: [] as string[],
  qualityAttributes: ['Performance' as const],
  uncertainty: 'Medium' as const,
  impact: 'High' as const,
  technicalPlannings: [],
  notes: null as string | null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockApi = {
  getHypotheses: jest.fn(),
  updateHypothesis: jest.fn().mockResolvedValue(baseHypothesis),
  getEntityRefs: jest.fn(),
  createHypothesis: jest.fn(),
  updateTechnicalPlanning: jest.fn(),
  deleteTechnicalPlanning: jest.fn(),
  createTechnicalPlanning: jest.fn(),
  deleteHypothesis: jest.fn(),
  getEvents: jest.fn(),
};

const wrapper = ({ children }: { children: ReactNode }) =>
  createElement(TestApiProvider, {
    apis: [[HypoStageApiRef, mockApi]],
    children,
  });

describe('useEditHypothesis', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    notificationMocks.showSuccess.mockClear();
    notificationMocks.showError.mockClear();
    mockApi.getHypotheses.mockResolvedValue([baseHypothesis]);
  });

  it('loads hypothesis and exposes statement in form data', async () => {
    const { result } = renderHook(() => useEditHypothesis('hyp-1'), { wrapper });

    await waitFor(() => {
      expect(result.current.hypothesis?.id).toBe('hyp-1');
    });
    expect(result.current.formData.statement).toBe(LONG_STATEMENT);
    expect(result.current.isFormValid).toBe(true);
  });

  it('is invalid when statement is shortened below minimum length', async () => {
    const { result } = renderHook(() => useEditHypothesis('hyp-1'), { wrapper });

    await waitFor(() => {
      expect(result.current.formData.statement).toBe(LONG_STATEMENT);
    });

    act(() => {
      result.current.updateField('statement', 'Too short');
    });

    expect(result.current.isFormValid).toBe(false);
  });

  it('submits trimmed statement with other fields on update', async () => {
    const { result } = renderHook(() => useEditHypothesis('hyp-1'), { wrapper });

    await waitFor(() => {
      expect(result.current.formData.statement).toBe(LONG_STATEMENT);
    });

    const updated =
      'Revised hypothesis statement text that reflects new understanding and is long enough.';

    act(() => {
      result.current.updateField('statement', `  ${updated}  `);
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockApi.updateHypothesis).toHaveBeenCalledWith(
      'hyp-1',
      expect.objectContaining({
        statement: updated,
        entityRefs: baseHypothesis.entityRefs,
        status: baseHypothesis.status,
        sourceType: baseHypothesis.sourceType,
      }),
    );
  });
});
