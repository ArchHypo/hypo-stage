import { createElement, ReactNode } from 'react';
import { renderHook, act } from '@testing-library/react';
import { TestApiProvider } from '@backstage/test-utils';
import { HypoStageApiRef } from '../../api/HypoStageApi';
import { useCreateTechnicalPlanning } from './useCreateTechnicalPlanning';

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
  createTechnicalPlanning: jest.fn().mockResolvedValue({ id: 'tp-new' }),
  updateTechnicalPlanning: jest.fn(),
  deleteTechnicalPlanning: jest.fn(),
};

const wrapper = ({ children }: { children: ReactNode }) =>
  createElement(TestApiProvider, {
    apis: [[HypoStageApiRef, mockApi]],
    children,
  });

describe('useCreateTechnicalPlanning', () => {
  beforeEach(() => jest.clearAllMocks());

  it('initializes form with current hypothesis uncertainty and impact', () => {
    const { result } = renderHook(
      () => useCreateTechnicalPlanning('hyp-1', 'High', 'Medium'),
      { wrapper },
    );

    expect(result.current.formData.uncertainty).toBe('High');
    expect(result.current.formData.impact).toBe('Medium');
  });

  it('syncs untouched fields when hypothesis values change externally', () => {
    let uncertainty = 'High' as any;
    let impact = 'Medium' as any;

    const { result, rerender } = renderHook(
      () => useCreateTechnicalPlanning('hyp-1', uncertainty, impact),
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
      () => useCreateTechnicalPlanning('hyp-1', uncertainty, impact),
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

  it('is valid and submits without documentation links', async () => {
    const { result } = renderHook(
      () => useCreateTechnicalPlanning('hyp-1', 'High', 'Medium'),
      { wrapper },
    );

    act(() => {
      result.current.updateField('entityRef', 'component:default/svc');
      result.current.updateField('actionType', 'Spike');
      result.current.updateField('description', 'Test description');
      result.current.updateField('expectedOutcome', 'Test outcome');
      result.current.updateField('targetDate', '2026-06-01');
    });

    expect(result.current.isFormValid).toBe(true);

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockApi.createTechnicalPlanning).toHaveBeenCalledWith(
      'hyp-1',
      expect.objectContaining({ documentations: [] }),
    );
  });

  it('compares against latest hypothesis values at submit time', async () => {
    let uncertainty = 'High' as any;
    const impact = 'Medium' as any;

    const { result, rerender } = renderHook(
      () => useCreateTechnicalPlanning('hyp-1', uncertainty, impact),
      { wrapper },
    );

    act(() => {
      result.current.updateField('entityRef', 'component:default/svc');
      result.current.updateField('actionType', 'Spike');
      result.current.updateField('description', 'Test description');
      result.current.updateField('expectedOutcome', 'Test outcome');
      result.current.updateField('documentations', ['https://example.com']);
      result.current.updateField('targetDate', '2026-06-01');
      result.current.updateField('uncertainty', 'Low');
    });

    uncertainty = 'Very High';
    rerender();

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockApi.createTechnicalPlanning).toHaveBeenCalledWith(
      'hyp-1',
      expect.objectContaining({ uncertainty: 'Low' }),
    );
  });

  it('omits uncertainty when form value matches latest hypothesis value', async () => {
    let uncertainty = 'High' as any;
    const impact = 'Medium' as any;

    const { result, rerender } = renderHook(
      () => useCreateTechnicalPlanning('hyp-1', uncertainty, impact),
      { wrapper },
    );

    act(() => {
      result.current.updateField('entityRef', 'component:default/svc');
      result.current.updateField('actionType', 'Spike');
      result.current.updateField('description', 'Test description');
      result.current.updateField('expectedOutcome', 'Test outcome');
      result.current.updateField('documentations', ['https://example.com']);
      result.current.updateField('targetDate', '2026-06-01');
      result.current.updateField('uncertainty', 'Very High');
    });

    uncertainty = 'Very High';
    rerender();

    await act(async () => {
      await result.current.handleSubmit();
    });

    const call = mockApi.createTechnicalPlanning.mock.calls[0][1];
    expect(call.uncertainty).toBeUndefined();
  });
});
