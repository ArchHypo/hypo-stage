import { createElement, ReactNode } from 'react';
import { renderHook, act } from '@testing-library/react';
import { TestApiProvider } from '@backstage/test-utils';
import { HypoStageApiRef } from '../../api/HypoStageApi';
import { useEditTechnicalPlanning } from './useEditTechnicalPlanning';

jest.mock('../../providers/NotificationProvider', () => ({
  useNotifications: () => ({
    showSuccess: jest.fn(),
    showError: jest.fn(),
  }),
}));

const mockApi = {
  getEntityRefs: jest.fn(),
  createHypothesis: jest.fn(),
  getHypotheses: jest.fn(),
  updateHypothesis: jest.fn(),
  getEvents: jest.fn(),
  deleteHypothesis: jest.fn(),
  createTechnicalPlanning: jest.fn(),
  updateTechnicalPlanning: jest.fn().mockResolvedValue({ id: 'tp-1' }),
  deleteTechnicalPlanning: jest.fn(),
};

const basePlanning = {
  id: 'tp-1',
  hypothesisId: 'hyp-1',
  entityRef: 'component:default/svc',
  actionType: 'Spike',
  description: 'Some description',
  expectedOutcome: 'Outcome text',
  documentations: ['https://example.com'],
  targetDate: '2026-06-01',
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
} as any;

const wrapper = ({ children }: { children: ReactNode }) =>
  createElement(TestApiProvider, {
    apis: [[HypoStageApiRef, mockApi]],
    children,
  });

describe('useEditTechnicalPlanning', () => {
  beforeEach(() => jest.clearAllMocks());

  it('initializes form with current hypothesis uncertainty and impact', () => {
    const { result } = renderHook(
      () => useEditTechnicalPlanning(basePlanning, 'High', 'Medium'),
      { wrapper },
    );

    expect(result.current.formData.uncertainty).toBe('High');
    expect(result.current.formData.impact).toBe('Medium');
  });

  it('syncs untouched fields when hypothesis values change externally', () => {
    let uncertainty = 'High' as any;
    let impact = 'Medium' as any;

    const { result, rerender } = renderHook(
      () => useEditTechnicalPlanning(basePlanning, uncertainty, impact),
      { wrapper },
    );

    uncertainty = 'Very High';
    impact = 'High';
    rerender();

    expect(result.current.formData.uncertainty).toBe('Very High');
    expect(result.current.formData.impact).toBe('High');
  });

  it('preserves user-edited fields when hypothesis values change externally', () => {
    let uncertainty = 'High' as any;
    let impact = 'Medium' as any;

    const { result, rerender } = renderHook(
      () => useEditTechnicalPlanning(basePlanning, uncertainty, impact),
      { wrapper },
    );

    act(() => {
      result.current.updateField('uncertainty', 'Low');
    });

    expect(result.current.formData.uncertainty).toBe('Low');

    uncertainty = 'Very High';
    impact = 'High';
    rerender();

    expect(result.current.formData.uncertainty).toBe('Low');
    expect(result.current.formData.impact).toBe('High');
  });

  it('compares against latest hypothesis values at submit time', async () => {
    let uncertainty = 'High' as any;
    let impact = 'Medium' as any;

    const { result, rerender } = renderHook(
      () => useEditTechnicalPlanning(basePlanning, uncertainty, impact),
      { wrapper },
    );

    act(() => {
      result.current.updateField('uncertainty', 'Low');
    });

    uncertainty = 'Very High';
    impact = 'High';
    rerender();

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockApi.updateTechnicalPlanning).toHaveBeenCalledWith(
      'tp-1',
      expect.objectContaining({ uncertainty: 'Low' }),
    );
  });

  it('omits uncertainty when form value matches latest hypothesis value', async () => {
    let uncertainty = 'High' as any;
    const impact = 'Medium' as any;

    const { result, rerender } = renderHook(
      () => useEditTechnicalPlanning(basePlanning, uncertainty, impact),
      { wrapper },
    );

    act(() => {
      result.current.updateField('uncertainty', 'Very High');
    });

    uncertainty = 'Very High';
    rerender();

    await act(async () => {
      await result.current.handleSubmit();
    });

    const call = mockApi.updateTechnicalPlanning.mock.calls[0][1];
    expect(call.uncertainty).toBeUndefined();
  });

  it('sends correct technicalPlanning.id to the API', async () => {
    const { result } = renderHook(
      () => useEditTechnicalPlanning(basePlanning, 'High', 'Medium'),
      { wrapper },
    );

    act(() => {
      result.current.updateField('uncertainty', 'Low');
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockApi.updateTechnicalPlanning).toHaveBeenCalledWith(
      'tp-1',
      expect.anything(),
    );
  });
});
