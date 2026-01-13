// Mock for @sentry/node
export const init = jest.fn();
export const captureException = jest.fn();
export const setTag = jest.fn();
export const setExtra = jest.fn();
export const addBreadcrumb = jest.fn();
export const configureScope = jest.fn((callback) =>
    callback({
        setTag: jest.fn(),
        setExtra: jest.fn(),
        addBreadcrumb: jest.fn(),
    }),
);
export const Integrations = {
    Http: jest.fn(),
    Console: jest.fn(),
    // Add other integrations if needed
};
export const Handlers = {
    requestHandler: jest.fn(),
    tracingHandler: jest.fn(),
    errorHandler: jest.fn(),
};
export const close = jest.fn();
