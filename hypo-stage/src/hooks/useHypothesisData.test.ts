import { createElement, ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { TestApiProvider } from '@backstage/test-utils';
import { HypoStageApiRef } from '../api/HypoStageApi';
import { useHypothesisData } from './useHypothesisData';

const mockHypoStageApi = {
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
    apis: [[HypoStageApiRef, mockHypoStageApi]],
    children,
  });

describe('useHypothesisData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sets loading to false and error when hypothesisId is undefined', async () => {
    const { result } = renderHook(() => useHypothesisData(undefined), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.hypothesis).toBeNull();
    expect(result.current.error).toEqual(new Error('Hypothesis not found'));
    expect(mockHypoStageApi.getHypotheses).not.toHaveBeenCalled();
  });

  it('fetches hypothesis and events when hypothesisId is provided', async () => {
    const mockHypothesis = {
      id: 'hyp-1',
      statement: 'Test',
      status: 'Open' as const,
      sourceType: 'Other' as const,
      entityRefs: [],
      relatedArtefacts: [],
      qualityAttributes: [],
      uncertainty: 'Medium' as const,
      impact: 'Medium' as const,
      technicalPlannings: [],
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockHypoStageApi.getHypotheses.mockResolvedValue([mockHypothesis]);
    mockHypoStageApi.getEvents.mockResolvedValue([]);

    const { result } = renderHook(() => useHypothesisData('hyp-1'), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.hypothesis).toEqual(mockHypothesis);
    expect(result.current.error).toBeNull();
    expect(mockHypoStageApi.getHypotheses).toHaveBeenCalled();
    expect(mockHypoStageApi.getEvents).toHaveBeenCalledWith('hyp-1');
  });

  it('sets error when hypothesis is not found', async () => {
    mockHypoStageApi.getHypotheses.mockResolvedValue([]);

    const { result } = renderHook(() => useHypothesisData('missing-id'), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.hypothesis).toBeNull();
    expect(result.current.error).toEqual(new Error('Hypothesis not found'));
  });
});
