import { renderHook } from '@testing-library/react';
import { useApi } from '@backstage/core-plugin-api';
import { useHypoStageTabEnabled } from './useHypoStageTabEnabled';

jest.mock('@backstage/core-plugin-api', () => ({
  useApi: jest.fn(),
}));

const mockUseApi = useApi as jest.MockedFunction<typeof useApi>;

describe('useHypoStageTabEnabled', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return true when hypo-stage flag is active', () => {
    mockUseApi.mockReturnValue({ isActive: jest.fn().mockReturnValue(true) } as any);

    const { result } = renderHook(() => useHypoStageTabEnabled());

    expect(result.current).toBe(true);
    expect(mockUseApi).toHaveBeenCalled();
  });

  it('should return false when hypo-stage flag is not active', () => {
    mockUseApi.mockReturnValue({ isActive: jest.fn().mockReturnValue(false) } as any);

    const { result } = renderHook(() => useHypoStageTabEnabled());

    expect(result.current).toBe(false);
  });
});
