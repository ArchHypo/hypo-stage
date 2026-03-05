import { createElement, ReactNode } from 'react';
import { renderHook, act } from '@testing-library/react';
import { TestApiProvider } from '@backstage/test-utils';
import { HypoStageApiRef } from '../../api/HypoStageApi';
import { useEditTechnicalPlanning } from './useEditTechnicalPlanning';
import { TechnicalPlanning } from '@archhypo/plugin-hypo-stage-backend';

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
  updateTechnicalPlanning: jest.fn(),
  deleteTechnicalPlanning: jest.fn(),
};

const wrapper = ({ children }: { children: ReactNode }) =>
  createElement(TestApiProvider, {
    apis: [[HypoStageApiRef, mockApi]],
    children,
  });

const basePlanning: TechnicalPlanning = {
  id: 'tp-1',
  entityRef: 'component:default/svc',
  actionType: 'Spike',
  description: 'Test planning',
  expectedOutcome: 'Test outcome',
  documentations: ['https://example.com'],
  targetDate: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
};

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

  it('syncs form when hypothesis uncertainty/impact change externally', () => {
    let uncertainty = 'High' as any;
    let impact = 'Medium' as any;

    const { result, rerender } = renderHook(
      () => useEditTechnicalPlanning(basePlanning, uncertainty, impact),
      { wrapper },
    );

    expect(result.current.formData.uncertainty).toBe('High');
    expect(result.current.formData.impact).toBe('Medium');

    uncertainty = 'Very High';
    impact = 'High';
    rerender();

    expect(result.current.formData.uncertainty).toBe('Very High');
    expect(result.current.formData.impact).toBe('High');
  });

  it('syncs only the changed value when one dimension changes', () => {
    let uncertainty = 'High' as any;
    const impact = 'Medium' as any;

    const { result, rerender } = renderHook(
      () => useEditTechnicalPlanning(basePlanning, uncertainty, impact),
      { wrapper },
    );

    uncertainty = 'Low';
    rerender();

    expect(result.current.formData.uncertainty).toBe('Low');
    expect(result.current.formData.impact).toBe('Medium');
  });

  it('does not lose manual edits to non-assessment fields on sync', () => {
    let uncertainty = 'High' as any;
    let impact = 'Medium' as any;

    const { result, rerender } = renderHook(
      () => useEditTechnicalPlanning(basePlanning, uncertainty, impact),
      { wrapper },
    );

    act(() => {
      result.current.updateField('expectedOutcome', 'My updated outcome');
    });

    expect(result.current.formData.expectedOutcome).toBe('My updated outcome');

    uncertainty = 'Very High';
    impact = 'High';
    rerender();

    expect(result.current.formData.uncertainty).toBe('Very High');
    expect(result.current.formData.impact).toBe('High');
    expect(result.current.formData.expectedOutcome).toBe('My updated outcome');
  });
});
