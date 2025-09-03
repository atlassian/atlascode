// Suppress Emotion React SSR warnings in development
// These warnings are from third-party Atlaskit components and don't affect functionality

if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    const originalWarn = console.warn;
    const originalError = console.error;

    // Patterns to suppress
    const suppressPatterns = [
        /The pseudo class ":first-child" is potentially unsafe when doing server-side rendering/,
        /The pseudo class ":nth-child" is potentially unsafe when doing server-side rendering/,
        /The pseudo class ":last-child" is potentially unsafe when doing server-side rendering/,
        /Try changing it to ":first-of-type"/,
        /Try changing it to ":nth-of-type"/,
        /Try changing it to ":last-of-type"/,
    ];

    console.warn = function (...args) {
        const message = args.join(' ');
        const shouldSuppress = suppressPatterns.some((pattern) => pattern.test(message));

        if (!shouldSuppress) {
            originalWarn.apply(console, args);
        }
    };

    console.error = function (...args) {
        const message = args.join(' ');
        const shouldSuppress = suppressPatterns.some((pattern) => pattern.test(message));

        if (!shouldSuppress) {
            originalError.apply(console, args);
        }
    };
}
