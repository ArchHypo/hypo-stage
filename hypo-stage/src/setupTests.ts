import '@testing-library/jest-dom';

// ResizeObserver is not available in jsdom; required by recharts (ResponsiveContainer)
class ResizeObserverMock {
  observe = () => undefined;
  unobserve = () => undefined;
  disconnect = () => undefined;
}
global.ResizeObserver = ResizeObserverMock as any;
