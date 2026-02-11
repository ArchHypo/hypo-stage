import { renderHook } from '@testing-library/react';
import { useApiHolder } from '@backstage/core-plugin-api';
import { useHypoStageTabEnabled } from './useHypoStageTabEnabled';

jest.mock('@backstage/core-plugin-api', () => ({
  useApiHolder: jest.fn(),
}));

const mockUseApiHolder = useApiHolder as jest.MockedFunction<typeof useApiHolder>;

describe('useHypoStageTabEnabled', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return true when feature flags API is not registered (generic Backstage)', () => {
    mockUseApiHolder.mockReturnValue({ get: jest.fn().mockReturnValue(undefined) } as any);

    const { result } = renderHook(() => useHypoStageTabEnabled());

    expect(result.current).toBe(true);
  });

  it('should return true when hypo-stage flag is active', () => {
    mockUseApiHolder.mockReturnValue({
      get: jest.fn().mockReturnValue({ isActive: jest.fn().mockReturnValue(true) }),
    } as any);

    const { result } = renderHook(() => useHypoStageTabEnabled());

    expect(result.current).toBe(true);
  });

  it('should return false when hypo-stage flag is not active', () => {
    mockUseApiHolder.mockReturnValue({
      get: jest.fn().mockReturnValue({ isActive: jest.fn().mockReturnValue(false) }),
    } as any);

    const { result } = renderHook(() => useHypoStageTabEnabled());

    expect(result.current).toBe(false);
  });
});
