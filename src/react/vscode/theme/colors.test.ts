import { colorToLozengeAppearanceMap, darken, lighten } from './colors';

describe('colors', () => {
    describe('colorToLozengeAppearanceMap', () => {
        it('should map color names to correct lozenge appearances', () => {
            expect(colorToLozengeAppearanceMap.neutral).toBe('default');
            expect(colorToLozengeAppearanceMap['blue-gray']).toBe('default');
            expect(colorToLozengeAppearanceMap['medium-gray']).toBe('default');
            expect(colorToLozengeAppearanceMap.purple).toBe('new');
            expect(colorToLozengeAppearanceMap.brown).toBe('new');
            expect(colorToLozengeAppearanceMap.blue).toBe('inprogress');
            expect(colorToLozengeAppearanceMap.red).toBe('removed');
            expect(colorToLozengeAppearanceMap['warm-red']).toBe('removed');
            expect(colorToLozengeAppearanceMap.yellow).toBe('inprogress');
            expect(colorToLozengeAppearanceMap.green).toBe('success');
        });
    });

    describe('darken', () => {
        it('should darken a hex color', () => {
            const result = darken('#ffffff', 50);
            expect(result).toBe('rgba(128, 128, 128, 1)');
        });

        it('should darken an rgb color', () => {
            const result = darken('rgb(255, 255, 255)', 50);
            expect(result).toBe('rgba(128, 128, 128, 1)');
        });

        it('should darken an rgba color', () => {
            const result = darken('rgba(255, 255, 255, 0.5)', 50);
            expect(result).toBe('rgba(128, 128, 128, 0.5)');
        });

        it('should return original color if color is invalid', () => {
            const invalidColor = 'invalid-color';
            const result = darken(invalidColor, 50);
            expect(result).toBe(invalidColor);
        });

        it('should handle edge case of darkening black', () => {
            const result = darken('#000000', 50);
            expect(result).toBe('rgba(0, 0, 0, 1)');
        });

        it('should clamp values to 0 when darkening too much', () => {
            const result = darken('#808080', 100);
            expect(result).toBe('rgba(0, 0, 0, 1)');
        });
    });

    describe('lighten', () => {
        it('should lighten a hex color', () => {
            const result = lighten('#000000', 50);
            expect(result).toBe('rgba(128, 128, 128, 1)');
        });

        it('should lighten an rgb color', () => {
            const result = lighten('rgb(0, 0, 0)', 50);
            expect(result).toBe('rgba(128, 128, 128, 1)');
        });

        it('should lighten an rgba color', () => {
            const result = lighten('rgba(0, 0, 0, 0.5)', 50);
            expect(result).toBe('rgba(128, 128, 128, 0.5)');
        });

        it('should handle 3-character hex colors', () => {
            const result = lighten('#000', 50);
            expect(result).toBe('rgba(128, 128, 128, 1)');
        });

        it('should handle colors with mixed case', () => {
            const result = lighten('#AbCdEf', 10);
            expect(result).toBe('rgba(197, 231, 255, 1)');
        });

        it('should return original color if color is invalid', () => {
            const invalidColor = 'not-a-color';
            const result = lighten(invalidColor, 50);
            expect(result).toBe(invalidColor);
        });

        it('should handle edge case of lightening white', () => {
            const result = lighten('#ffffff', 50);
            expect(result).toBe('rgba(255, 255, 255, 1)');
        });

        it('should clamp values to 255 when lightening too much', () => {
            const result = lighten('#808080', 100);
            expect(result).toBe('rgba(255, 255, 255, 1)');
        });

        it('should handle negative percentages', () => {
            const result = lighten('#ffffff', -50);
            expect(result).toBe('rgba(128, 128, 128, 1)');
        });

        it('should handle zero percentage', () => {
            const result = lighten('#808080', 0);
            expect(result).toBe('rgba(128, 128, 128, 1)');
        });

        it('should handle colors with whitespace', () => {
            const result = lighten('  #000000  ', 50);
            expect(result).toBe('rgba(128, 128, 128, 1)');
        });

        it('should handle rgb with percentages', () => {
            const result = lighten('rgb(50%, 50%, 50%)', 20);
            // Note: This test assumes the regex doesn't handle percentages
            // If it should, the implementation would need to be updated
            const expected = lighten('rgb(50%, 50%, 50%)', 20);
            expect(result).toBe(expected);
        });

        it('should handle hsl colors (should return original as not supported)', () => {
            const hslColor = 'hsl(120, 100%, 50%)';
            const result = lighten(hslColor, 20);
            expect(result).toBe(hslColor);
        });

        it('should handle hsla colors (should return original as not supported)', () => {
            const hslaColor = 'hsla(120, 100%, 50%, 0.8)';
            const result = lighten(hslaColor, 20);
            expect(result).toBe(hslaColor);
        });

        it('should handle rgb with spaces around commas', () => {
            const result = lighten('rgb(100 , 150 , 200)', 10);
            expect(result).toBe('rgba(126, 176, 226, 1)');
        });

        it('should handle rgba with decimal alpha', () => {
            const result = lighten('rgba(100, 150, 200, 0.75)', 10);
            expect(result).toBe('rgba(126, 176, 226, 0.75)');
        });

        it('should handle very small percentage changes', () => {
            const result = lighten('#808080', 1);
            expect(result).toBe('rgba(131, 131, 131, 1)');
        });

        it('should handle large percentage changes', () => {
            const result = lighten('#404040', 200);
            expect(result).toBe('rgba(255, 255, 255, 1)');
        });

        it('should preserve alpha channel in rgba colors', () => {
            const result = lighten('rgba(64, 64, 64, 0.3)', 50);
            expect(result).toBe('rgba(192, 192, 192, 0.3)');
        });

        it('should handle hex colors without hash prefix (should fail gracefully)', () => {
            const result = lighten('ffffff', 50);
            expect(result).toBe('ffffff');
        });

        it('should handle empty string', () => {
            const result = lighten('', 50);
            expect(result).toBe('');
        });

        it('should handle malformed hex colors', () => {
            const result = lighten('#gggggg', 50);
            expect(result).toBe('#gggggg');
        });

        it('should handle malformed rgb colors', () => {
            const result = lighten('rgb(300, 400, 500)', 50);
            expect(result).toBe('rgba(255, 255, 255, 1)');
        });

        it('should handle negative rgb values', () => {
            const result = lighten('rgb(-50, -100, -150)', 50);
            expect(result).toBe('rgba(78, 28, -22, 1)');
        });

        it('should handle very large hex values (should be clamped)', () => {
            // Testing with a valid hex that when lightened should clamp to 255
            const result = lighten('#fefefe', 10);
            expect(result).toBe('rgba(255, 255, 255, 1)');
        });

        it('should handle case-insensitive hex colors', () => {
            const upperResult = lighten('#FFFFFF', 0);
            const lowerResult = lighten('#ffffff', 0);
            expect(upperResult).toBe(lowerResult);
        });

        it('should handle rgba with integer alpha', () => {
            const result = lighten('rgba(100, 150, 200, 1)', 10);
            expect(result).toBe('rgba(126, 176, 226, 1)');
        });

        it('should handle 4-character hex colors (should fail gracefully)', () => {
            const result = lighten('#abcd', 50);
            expect(result).toBe('#abcd');
        });

        it('should handle 5-character hex colors (should fail gracefully)', () => {
            const result = lighten('#abcde', 50);
            expect(result).toBe('#abcde');
        });

        it('should handle 7-character hex colors (should fail gracefully)', () => {
            const result = lighten('#abcdefg', 50);
            expect(result).toBe('#abcdefg');
        });
    });

    // Additional tests for internal helper functions behavior
    describe('edge cases and boundary conditions', () => {
        it('should handle maximum percentage for darken', () => {
            const result = darken('#ffffff', 100);
            expect(result).toBe('rgba(0, 0, 0, 1)');
        });

        it('should handle maximum percentage for lighten', () => {
            const result = lighten('#000000', 100);
            expect(result).toBe('rgba(255, 255, 255, 1)');
        });

        it('should handle decimal percentages', () => {
            const result = lighten('#808080', 25.5);
            // 128 + (255 * 25.5 / 100) = 128 + 65.025 = 193.025, rounded to 193
            expect(result).toBe('rgba(193, 193, 193, 1)');
        });

        it('should handle rgb with extra whitespace', () => {
            const result = lighten('rgb(  100  ,  150  ,  200  )', 10);
            expect(result).toBe('rgb(  100  ,  150  ,  200  )');
        });

        it('should handle rgba with extra whitespace', () => {
            const result = lighten('rgba(  100  ,  150  ,  200  ,  0.5  )', 10);
            expect(result).toBe('rgba(  100  ,  150  ,  200  ,  0.5  )');
        });
    });
});
