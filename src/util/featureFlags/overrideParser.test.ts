import { parseBoolOverride, parseExperimentOverrides, parseGateOverrides, parseStringOverride } from './overrideParser';

describe('overrideParser', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.resetModules();
        process.env = { ...originalEnv };
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    describe('parseBoolOverride', () => {
        it('should parse valid boolean overrides', () => {
            expect(parseBoolOverride('feature1=true')).toEqual({ key: 'feature1', value: true });
            expect(parseBoolOverride('feature2=false')).toEqual({ key: 'feature2', value: false });
            expect(parseBoolOverride('feature3=TRUE')).toEqual({ key: 'feature3', value: true });
            expect(parseBoolOverride('feature4=FALSE')).toEqual({ key: 'feature4', value: false });
        });

        it('should handle whitespace', () => {
            expect(parseBoolOverride('  feature1  =  true  ')).toEqual({ key: 'feature1', value: true });
        });

        it('should return undefined for invalid input', () => {
            expect(parseBoolOverride('')).toBeUndefined();
            expect(parseBoolOverride('=')).toBeUndefined();
            expect(parseBoolOverride('   =   ')).toBeUndefined();
            expect(parseBoolOverride('feature1')).toBeUndefined();
        });

        it('should handle missing value as false', () => {
            expect(parseBoolOverride('feature1=')).toEqual({ key: 'feature1', value: false });
        });
    });

    describe('parseStringOverride', () => {
        it('should parse valid string overrides', () => {
            expect(parseStringOverride('exp1=value1')).toEqual({ key: 'exp1', value: 'value1' });
            expect(parseStringOverride('exp2=some value')).toEqual({ key: 'exp2', value: 'some value' });
        });

        it('should handle whitespace', () => {
            expect(parseStringOverride('  exp1  =  value1  ')).toEqual({ key: 'exp1', value: 'value1' });
        });

        it('should return undefined for invalid input', () => {
            expect(parseStringOverride('')).toBeUndefined();
            expect(parseStringOverride('=')).toBeUndefined();
            expect(parseStringOverride('exp1=')).toBeUndefined();
            expect(parseStringOverride('exp1')).toBeUndefined();
        });
    });

    describe('parseGateOverrides', () => {
        it('should parse feature gate overrides from environment', () => {
            const overrides = parseGateOverrides('feature1=true,feature2=false');
            expect(overrides).toEqual({
                feature1: true,
                feature2: false,
            });
        });

        it('should handle empty environment variable', () => {
            const overrides = parseGateOverrides('');
            expect(overrides).toEqual({});
        });

        it('should handle undefined environment variable', () => {
            const overrides = parseGateOverrides(undefined);
            expect(overrides).toEqual({});
        });

        it('should skip invalid entries', () => {
            const overrides = parseGateOverrides('feature1=true,,feature2=false,invalid,=,feature3=true');
            expect(overrides).toEqual({
                feature1: true,
                feature2: false,
                feature3: true,
            });
        });
    });

    describe('parseExperimentOverrides', () => {
        it('should parse boolean experiment overrides from environment', () => {
            const overrides = parseExperimentOverrides('exp1=true,exp2=false');
            expect(overrides).toEqual({
                exp1: true,
                exp2: false,
            });
        });

        it('should parse string experiment overrides from environment', () => {
            const overrides = parseExperimentOverrides(undefined, 'exp1=value1,exp2=value2');
            expect(overrides).toEqual({
                exp1: 'value1',
                exp2: 'value2',
            });
        });

        it('should combine both boolean and string overrides', () => {
            const overrides = parseExperimentOverrides('exp1=true', 'exp2=value2');
            expect(overrides).toEqual({
                exp1: true,
                exp2: 'value2',
            });
        });

        it('should handle empty environment variables', () => {
            const overrides = parseExperimentOverrides('', '');
            expect(overrides).toEqual({});
        });

        it('should handle undefined environment variables', () => {
            const overrides = parseExperimentOverrides(undefined, undefined);
            expect(overrides).toEqual({});
        });

        it('should skip invalid entries', () => {
            const overrides = parseExperimentOverrides('exp1=true,,invalid', 'exp2=value2,=,exp3=');
            expect(overrides).toEqual({
                exp1: true,
                exp2: 'value2',
            });
        });
    });
});
