import {
    chain,
    isValidNumber,
    isValidRequiredNumber,
    isValidRequiredUrl,
    isValidString,
    isValidUrl,
    validateEmail,
    validateMultiSelect,
    validateNumber,
    validateRequiredNumber,
    validateRequiredUrl,
    validateSingleSelect,
    validateString,
    validateUrl,
} from './fieldValidators';

describe('fieldValidators', () => {
    describe('chain', () => {
        it('should call all functions with the provided arguments', () => {
            const fn1 = jest.fn();
            const fn2 = jest.fn();
            const fn3 = jest.fn();
            const chainedFn = chain(fn1, fn2, fn3);

            chainedFn('arg1', 'arg2');

            expect(fn1).toHaveBeenCalledWith('arg1', 'arg2');
            expect(fn2).toHaveBeenCalledWith('arg1', 'arg2');
            expect(fn3).toHaveBeenCalledWith('arg1', 'arg2');
        });

        it('should handle empty function list', () => {
            const chainedFn = chain();
            expect(() => chainedFn('arg1')).not.toThrow();
        });

        it('should handle functions that throw errors', () => {
            const fn1 = jest.fn();
            const fn2 = jest.fn().mockImplementation(() => {
                throw new Error('Test error');
            });
            const fn3 = jest.fn();
            const chainedFn = chain(fn1, fn2, fn3);

            expect(() => chainedFn('arg1')).toThrow('Test error');
            expect(fn1).toHaveBeenCalledWith('arg1');
            expect(fn2).toHaveBeenCalledWith('arg1');
            expect(fn3).not.toHaveBeenCalled();
        });
    });

    describe('validateSingleSelect', () => {
        it('should return undefined for defined values', () => {
            expect(validateSingleSelect('test')).toBeUndefined();
            expect(validateSingleSelect('')).toBeUndefined();
            expect(validateSingleSelect('0')).toBeUndefined();
        });

        it('should return "EMPTY" for undefined values', () => {
            expect(validateSingleSelect(undefined as any)).toBe('EMPTY');
        });

        it('should accept optional state parameter', () => {
            const state = { someProperty: 'value' };
            expect(validateSingleSelect('test', state)).toBeUndefined();
            expect(validateSingleSelect(undefined as any, state)).toBe('EMPTY');
        });
    });

    describe('validateMultiSelect', () => {
        it('should always return undefined', () => {
            expect(validateMultiSelect('test', {})).toBeUndefined();
            expect(validateMultiSelect('', {})).toBeUndefined();
            expect(validateMultiSelect(undefined as any, {})).toBeUndefined();
        });

        it('should accept any state parameter', () => {
            const state = { someProperty: 'value' };
            expect(validateMultiSelect('test', state)).toBeUndefined();
        });
    });

    describe('validateString', () => {
        it('should return undefined for valid non-empty strings', () => {
            expect(validateString('test')).toBeUndefined();
            expect(validateString('hello world')).toBeUndefined();
            expect(validateString('123')).toBeUndefined();
            expect(validateString('   valid   ')).toBeUndefined();
        });

        it('should return "EMPTY" for empty or whitespace-only strings', () => {
            expect(validateString('')).toBe('EMPTY');
            expect(validateString('   ')).toBe('EMPTY');
            expect(validateString('\t\n')).toBe('EMPTY');
        });

        it('should return "EMPTY" for null or undefined values', () => {
            expect(validateString(null as any)).toBe('EMPTY');
            expect(validateString(undefined as any)).toBe('EMPTY');
        });

        it('should accept optional state parameter', () => {
            const state = { someProperty: 'value' };
            expect(validateString('test', state)).toBeUndefined();
            expect(validateString('', state)).toBe('EMPTY');
        });

        it('should return "EMPTY" for non-string values (objects, arrays, numbers, booleans)', () => {
            expect(validateString({} as any)).toBe('EMPTY');
            expect(validateString([] as any)).toBe('EMPTY');
            expect(validateString(123 as any)).toBe('EMPTY');
            expect(validateString(0 as any)).toBe('EMPTY');
            expect(validateString(true as any)).toBe('EMPTY');
            expect(validateString(false as any)).toBe('EMPTY');
        });
    });

    describe('isValidString', () => {
        it('should return true for valid strings', () => {
            expect(isValidString('test')).toBe(true);
            expect(isValidString('hello world')).toBe(true);
            expect(isValidString('123')).toBe(true);
        });

        it('should return false for invalid strings', () => {
            expect(isValidString('')).toBe(false);
            expect(isValidString('   ')).toBe(false);
            expect(isValidString(null as any)).toBe(false);
            expect(isValidString(undefined as any)).toBe(false);
        });
    });

    describe('validateEmail', () => {
        it('should return undefined for valid email addresses', () => {
            expect(validateEmail('test@example.com')).toBeUndefined();
            expect(validateEmail('user.name@domain.co.uk')).toBeUndefined();
            expect(validateEmail('simple@test')).toBeUndefined();
            expect(validateEmail('a@b')).toBeUndefined();
        });

        it('should return "EMPTY" for invalid email addresses', () => {
            expect(validateEmail('invalid-email')).toBe('EMPTY');
            expect(validateEmail('test@')).toBe('EMPTY');
            expect(validateEmail('@example.com')).toBe('EMPTY');
            expect(validateEmail('test.example.com')).toBe('EMPTY');
            expect(validateEmail('')).toBe('EMPTY');
        });

        it('should return "EMPTY" for undefined values and throw for null', () => {
            expect(validateEmail(undefined as any)).toBe('EMPTY');
            expect(() => validateEmail(null as any)).toThrow();
        });

        it('should accept optional state parameter', () => {
            const state = { someProperty: 'value' };
            expect(validateEmail('test@example.com', state)).toBeUndefined();
            expect(validateEmail('invalid', state)).toBe('EMPTY');
        });
    });

    describe('validateNumber', () => {
        it('should return undefined for valid numbers', () => {
            expect(validateNumber(123)).toBeUndefined();
            expect(validateNumber('123')).toBeUndefined();
            expect(validateNumber('123.45')).toBeUndefined();
            expect(validateNumber('-123')).toBeUndefined();
            expect(validateNumber('0')).toBeUndefined();
            expect(validateNumber(0)).toBeUndefined();
        });

        it('should return "NOT_NUMBER" for invalid string numbers only', () => {
            expect(validateNumber('abc')).toBe('NOT_NUMBER');
            // parseFloat('123abc') returns 123, so it's considered valid
            expect(validateNumber('123abc')).toBeUndefined();
            // parseFloat('12.34.56') returns 12.34, so it's considered valid
            expect(validateNumber('12.34.56')).toBeUndefined();
            // Objects and arrays without length property return undefined due to the value.length check
            expect(validateNumber({})).toBeUndefined();
            // Empty array has length 0, so condition is false, returns undefined
            expect(validateNumber([])).toBeUndefined();
        });

        it('should return undefined for undefined or empty values and throw for null', () => {
            expect(validateNumber(undefined)).toBeUndefined();
            expect(validateNumber('')).toBeUndefined();
            expect(() => validateNumber(null)).toThrow();
        });

        it('should accept optional state parameter', () => {
            const state = { someProperty: 'value' };
            expect(validateNumber('123', state)).toBeUndefined();
            expect(validateNumber('abc', state)).toBe('NOT_NUMBER');
        });
    });

    describe('isValidNumber', () => {
        it('should return true for valid numbers', () => {
            expect(isValidNumber('123')).toBe(true);
            expect(isValidNumber('123.45')).toBe(true);
            expect(isValidNumber('-123')).toBe(true);
            expect(isValidNumber('0')).toBe(true);
        });

        it('should return false for invalid string numbers only', () => {
            expect(isValidNumber('abc')).toBe(false);
            // parseFloat('123abc') returns 123, so it's considered valid
            expect(isValidNumber('123abc')).toBe(true);
            // parseFloat('12.34.56') returns 12.34, so it's considered valid
            expect(isValidNumber('12.34.56')).toBe(true);
        });

        it('should return true for undefined or empty values', () => {
            expect(isValidNumber(undefined as any)).toBe(true);
            expect(isValidNumber('')).toBe(true);
        });
    });

    describe('validateUrl', () => {
        it('should return undefined for valid URLs', () => {
            expect(validateUrl('https://example.com')).toBeUndefined();
            expect(validateUrl('http://test.org')).toBeUndefined();
            expect(validateUrl('ftp://files.example.com')).toBeUndefined();
            expect(validateUrl('https://sub.domain.com/path?query=value')).toBeUndefined();
        });

        it('should return "NOT_URL" for invalid URLs', () => {
            expect(validateUrl('not-a-url')).toBe('NOT_URL');
            expect(validateUrl('http://')).toBe('NOT_URL');
            expect(validateUrl('://example.com')).toBe('NOT_URL');
            expect(validateUrl('')).toBe('NOT_URL');
            expect(validateUrl('just-text')).toBe('NOT_URL');
        });

        it('should accept optional state parameter', () => {
            const state = { someProperty: 'value' };
            expect(validateUrl('https://example.com', state)).toBeUndefined();
            expect(validateUrl('invalid', state)).toBe('NOT_URL');
        });
    });

    describe('isValidUrl', () => {
        it('should return true for valid URLs', () => {
            expect(isValidUrl('https://example.com')).toBe(true);
            expect(isValidUrl('http://test.org')).toBe(true);
            expect(isValidUrl('ftp://files.example.com')).toBe(true);
        });

        it('should return false for invalid URLs', () => {
            expect(isValidUrl('not-a-url')).toBe(false);
            expect(isValidUrl('http://')).toBe(false);
            expect(isValidUrl('')).toBe(false);
        });
    });

    describe('validateRequiredNumber', () => {
        it('should return undefined for valid numbers', () => {
            expect(validateRequiredNumber(123)).toBeUndefined();
            expect(validateRequiredNumber('123')).toBeUndefined();
            expect(validateRequiredNumber('123.45')).toBeUndefined();
            expect(validateRequiredNumber('-123')).toBeUndefined();
            expect(validateRequiredNumber('0')).toBeUndefined();
            expect(validateRequiredNumber(0)).toBeUndefined();
        });

        it('should return "EMPTY" for empty values and throw for null', () => {
            expect(validateRequiredNumber('')).toBe('EMPTY');
            expect(validateRequiredNumber('   ')).toBe('EMPTY');
            expect(() => validateRequiredNumber(null)).toThrow();
            // undefined becomes "undefined" string, which passes validateString,
            // then validateNumber(undefined) returns undefined (not converted to string)
            expect(validateRequiredNumber(undefined)).toBeUndefined();
        });

        it('should return "NOT_NUMBER" for invalid numbers', () => {
            expect(validateRequiredNumber('abc')).toBe('NOT_NUMBER');
            // parseFloat('123abc') returns 123, so it's considered valid
            expect(validateRequiredNumber('123abc')).toBeUndefined();
            // parseFloat('12.34.56') returns 12.34, so it's considered valid
            expect(validateRequiredNumber('12.34.56')).toBeUndefined();
        });

        it('should accept optional state parameter', () => {
            const state = { someProperty: 'value' };
            expect(validateRequiredNumber('123', state)).toBeUndefined();
            expect(validateRequiredNumber('', state)).toBe('EMPTY');
            expect(validateRequiredNumber('abc', state)).toBe('NOT_NUMBER');
        });
    });

    describe('isValidRequiredNumber', () => {
        it('should return true for valid numbers', () => {
            expect(isValidRequiredNumber('123')).toBe(true);
            expect(isValidRequiredNumber('123.45')).toBe(true);
            expect(isValidRequiredNumber('-123')).toBe(true);
            expect(isValidRequiredNumber('0')).toBe(true);
        });

        it('should return false for empty values and throw for null', () => {
            expect(isValidRequiredNumber('')).toBe(false);
            expect(isValidRequiredNumber('   ')).toBe(false);
            expect(() => isValidRequiredNumber(null as any)).toThrow();
            // undefined becomes "undefined" string, which passes validateString,
            // then validateNumber(undefined) returns undefined (not converted to string)
            expect(isValidRequiredNumber(undefined as any)).toBe(true);
        });

        it('should return false for invalid numbers', () => {
            expect(isValidRequiredNumber('abc')).toBe(false);
            // parseFloat('123abc') returns 123, so it's considered valid
            expect(isValidRequiredNumber('123abc')).toBe(true);
            // parseFloat('12.34.56') returns 12.34, so it's considered valid
            expect(isValidRequiredNumber('12.34.56')).toBe(true);
        });
    });

    describe('validateRequiredUrl', () => {
        it('should return undefined for valid URLs', () => {
            expect(validateRequiredUrl('https://example.com')).toBeUndefined();
            expect(validateRequiredUrl('http://test.org')).toBeUndefined();
            expect(validateRequiredUrl('ftp://files.example.com')).toBeUndefined();
        });

        it('should return "EMPTY" for empty values', () => {
            expect(validateRequiredUrl('')).toBe('EMPTY');
            expect(validateRequiredUrl('   ')).toBe('EMPTY');
            expect(validateRequiredUrl(null as any)).toBe('EMPTY');
            expect(validateRequiredUrl(undefined as any)).toBe('EMPTY');
        });

        it('should return "NOT_URL" for invalid URLs', () => {
            expect(validateRequiredUrl('not-a-url')).toBe('NOT_URL');
            expect(validateRequiredUrl('http://')).toBe('NOT_URL');
            expect(validateRequiredUrl('just-text')).toBe('NOT_URL');
        });

        it('should accept optional state parameter', () => {
            const state = { someProperty: 'value' };
            expect(validateRequiredUrl('https://example.com', state)).toBeUndefined();
            expect(validateRequiredUrl('', state)).toBe('EMPTY');
            expect(validateRequiredUrl('invalid', state)).toBe('NOT_URL');
        });
    });

    describe('isValidRequiredUrl', () => {
        it('should return true for valid URLs', () => {
            expect(isValidRequiredUrl('https://example.com')).toBe(true);
            expect(isValidRequiredUrl('http://test.org')).toBe(true);
            expect(isValidRequiredUrl('ftp://files.example.com')).toBe(true);
        });

        it('should return false for empty values', () => {
            expect(isValidRequiredUrl('')).toBe(false);
            expect(isValidRequiredUrl('   ')).toBe(false);
            expect(isValidRequiredUrl(null as any)).toBe(false);
            expect(isValidRequiredUrl(undefined as any)).toBe(false);
        });

        it('should return false for invalid URLs', () => {
            expect(isValidRequiredUrl('not-a-url')).toBe(false);
            expect(isValidRequiredUrl('http://')).toBe(false);
            expect(isValidRequiredUrl('just-text')).toBe(false);
        });
    });
});
