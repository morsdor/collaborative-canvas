import '@testing-library/jest-dom';

// Mock ResizeObserver for shadcn/ui components
global.ResizeObserver = class ResizeObserver {
  constructor(callback: ResizeObserverCallback) {
    // Mock implementation
  }
  observe() {
    // Mock implementation
  }
  unobserve() {
    // Mock implementation
  }
  disconnect() {
    // Mock implementation
  }
};

// Mock hasPointerCapture for radix-ui components
Object.defineProperty(HTMLElement.prototype, 'hasPointerCapture', {
  value: jest.fn(() => false),
  writable: true,
});

// Mock setPointerCapture for radix-ui components
Object.defineProperty(HTMLElement.prototype, 'setPointerCapture', {
  value: jest.fn(),
  writable: true,
});

// Mock releasePointerCapture for radix-ui components
Object.defineProperty(HTMLElement.prototype, 'releasePointerCapture', {
  value: jest.fn(),
  writable: true,
});
