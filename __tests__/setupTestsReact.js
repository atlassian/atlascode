Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(), // deprecated
        removeListener: jest.fn(), // deprecated
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
    })),
});

const mockIntersectionObserver = jest.fn((callback, options) => {
    return {
        root: options?.root,
        rootMargin: options?.rootMargin,
        thresholds: options?.threshold,
        observe: jest.fn(),
        unobserve: jest.fn(),
        disconnect: jest.fn(),
        takeRecords: jest.fn(() => []),
        trigger: (entries) => {
            callback(entries, mockIntersectionObserver);
        },
    };
});
global.IntersectionObserver = mockIntersectionObserver;
const mockResizeObserver = jest.fn((callback) => {
    return {
        observe: jest.fn(),
        unobserve: jest.fn(),
        disconnect: jest.fn(),
        takeRecords: jest.fn(() => []),
        getClientRects: jest.fn(() => []),
        trigger: (entries) => {
            callback(entries, mockResizeObserver);
        },
    };
});
global.ResizeObserver = mockResizeObserver;
