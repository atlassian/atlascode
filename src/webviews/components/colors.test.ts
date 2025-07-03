import { colorToLozengeAppearanceMap, darken, lighten, opacity } from './colors';

describe('colors.ts', () => {
    describe('colorToLozengeAppearanceMap', () => {
        it('should have correct mappings for color to lozenge appearance', () => {
            expect(colorToLozengeAppearanceMap).toEqual({
                neutral: 'default',
                'blue-gray': 'default',
                'medium-gray': 'default',
                purple: 'new',
                brown: 'new',
                blue: 'inprogress',
                red: 'removed',
                'warm-red': 'removed',
                yellow: 'inprogress',
                green: 'success',
            });
        });
    });

    describe('darken', () => {
        it('should darken a hex color by the specified percentage', () => {
            const result = darken('#ff0000', 20);
            expect(result).toBe('rgba(204, 0, 0, 1)');
        });

        it('should darken an rgb color by the specified percentage', () => {
            const result = darken('rgb(255, 255, 255)', 10);
            expect(result).toBe('rgba(230, 230, 230, 1)');
        });

        it('should darken an rgba color by the specified percentage', () => {
            const result = darken('rgba(100, 100, 100, 0.5)', 20);
            expect(result).toBe('rgba(49, 49, 49, 0.5)');
        });

        it('should return original color if color format is invalid', () => {
            const invalidColor = 'invalid-color';
            const result = darken(invalidColor, 20);
            expect(result).toBe(invalidColor);
        });

        it('should handle zero percentage', () => {
            const result = darken('#808080', 0);
            expect(result).toBe('rgba(128, 128, 128, 1)');
        });
    });

    describe('lighten', () => {
        it('should lighten a hex color by the specified percentage', () => {
            const result = lighten('#000000', 20);
            expect(result).toBe('rgba(51, 51, 51, 1)');
        });

        it('should lighten an rgb color by the specified percentage', () => {
            const result = lighten('rgb(100, 100, 100)', 20);
            expect(result).toBe('rgba(151, 151, 151, 1)');
        });

        it('should lighten an rgba color by the specified percentage', () => {
            const result = lighten('rgba(50, 50, 50, 0.8)', 10);
            expect(result).toBe('rgba(76, 76, 76, 0.8)');
        });

        it('should return original color if color format is invalid', () => {
            const invalidColor = 'not-a-color';
            const result = lighten(invalidColor, 30);
            expect(result).toBe(invalidColor);
        });

        it('should handle zero percentage', () => {
            const result = lighten('#ff00ff', 0);
            expect(result).toBe('rgba(255, 0, 255, 1)');
        });

        it('should cap values at 255 when lightening', () => {
            const result = lighten('#ffffff', 50);
            expect(result).toBe('rgba(255, 255, 255, 1)');
        });

        it('should handle 3-character hex colors', () => {
            const result = lighten('#abc', 10);
            expect(result).toBe('rgba(196, 213, 230, 1)');
        });

        it('should handle 6-character hex colors', () => {
            const result = lighten('#aabbcc', 10);
            expect(result).toBe('rgba(196, 213, 230, 1)');
        });

        it('should handle negative percentage (same as darken)', () => {
            const result = lighten('#ff0000', -20);
            expect(result).toBe('rgba(204, 0, 0, 1)');
        });

        it('should handle rgb colors with spaces', () => {
            const result = lighten('rgb(100, 150, 200)', 5);
            expect(result).toBe('rgba(113, 163, 213, 1)');
        });

        it('should handle colors with whitespace', () => {
            const result = lighten('  #ff0000  ', 10);
            expect(result).toBe('rgba(255, 26, 26, 1)');
        });
    });

    describe('opacity', () => {
        it('should adjust opacity of an rgba color', () => {
            const result = opacity('rgba(255, 0, 0, 1)', 50);
            expect(result).toBe('rgba(255, 0, 0, 0.5)');
        });

        it('should adjust opacity of an rgb color', () => {
            const result = opacity('rgb(0, 255, 0)', 75);
            expect(result).toBe('rgba(0, 255, 0, 0.75)');
        });

        it('should adjust opacity of a hex color', () => {
            const result = opacity('#0000ff', 25);
            expect(result).toBe('rgba(0, 0, 255, 0.25)');
        });

        it('should adjust opacity of a 3-character hex color', () => {
            const result = opacity('#f0f', 60);
            expect(result).toBe('rgba(255, 0, 255, 0.6)');
        });

        it('should return original color if color format is invalid', () => {
            const invalidColor = 'purple';
            const result = opacity(invalidColor, 50);
            expect(result).toBe(invalidColor);
        });

        it('should handle 100% opacity', () => {
            const result = opacity('rgb(128, 128, 128)', 100);
            expect(result).toBe('rgba(128, 128, 128, 1)');
        });

        it('should handle 0% opacity', () => {
            const result = opacity('#ffffff', 0);
            expect(result).toBe('rgba(255, 255, 255, 0)');
        });

        it('should preserve existing alpha when adjusting opacity', () => {
            const result = opacity('rgba(100, 100, 100, 0.8)', 50);
            expect(result).toBe('rgba(100, 100, 100, 0.4)');
        });

        it('should handle colors with whitespace', () => {
            const result = opacity('  rgba(255, 255, 255, 0.5)  ', 80);
            expect(result).toBe('rgba(255, 255, 255, 0.4)');
        });
    });

    describe('edge cases and error handling', () => {
        it('should handle empty string', () => {
            expect(lighten('', 10)).toBe('');
            expect(darken('', 10)).toBe('');
            expect(opacity('', 50)).toBe('');
        });

        it('should handle malformed hex colors', () => {
            const malformedColors = ['#gg0000', '#12345', '#1234567'];
            malformedColors.forEach((color) => {
                expect(lighten(color, 10)).toBe(color);
                expect(darken(color, 10)).toBe(color);
                expect(opacity(color, 50)).toBe(color);
            });
        });

        it('should handle malformed rgb/rgba colors', () => {
            const malformedColors = ['rgb(a, b, c)', 'rgb()', 'rgba(1,2)', 'rgb(1,2,3,4,5)'];
            malformedColors.forEach((color) => {
                expect(lighten(color, 10)).toBe(color);
                expect(darken(color, 10)).toBe(color);
                expect(opacity(color, 50)).toBe(color);
            });
        });

        it('should handle hsl colors (not supported, should return original)', () => {
            const hslColor = 'hsl(0, 100%, 50%)';
            expect(lighten(hslColor, 10)).toBe(hslColor);
            expect(darken(hslColor, 10)).toBe(hslColor);
            expect(opacity(hslColor, 50)).toBe(hslColor);
        });

        it('should handle extreme percentage values', () => {
            const color = '#808080';
            expect(lighten(color, 1000)).toBe('rgba(255, 255, 255, 1)');
            expect(darken(color, 1000)).toBe('rgba(0, 0, 0, 1)');
        });

        it('should handle negative opacity percentage', () => {
            const result = opacity('#ffffff', -10);
            expect(result).toBe('rgba(255, 255, 255, -0.1)');
        });

        it('should handle percentage values over 100 for opacity', () => {
            const result = opacity('#000000', 150);
            expect(result).toBe('rgba(0, 0, 0, 1.5)');
        });
    });

    describe('consistency between darken and lighten', () => {
        it('should be consistent when using positive percentage on darken vs negative on lighten', () => {
            const color = '#808080';
            const percentage = 20;

            const darkenResult = darken(color, percentage);
            const lightenResult = lighten(color, -percentage);

            expect(darkenResult).toBe(lightenResult);
        });

        it('should handle boundary values correctly', () => {
            // Test that lightening white doesn't exceed 255
            const whiteResult = lighten('#ffffff', 50);
            expect(whiteResult).toBe('rgba(255, 255, 255, 1)');

            // Test that darkening black doesn't go below 0
            const blackResult = darken('#000000', 50);
            expect(blackResult).toBe('rgba(0, 0, 0, 1)');
        });
    });
});
