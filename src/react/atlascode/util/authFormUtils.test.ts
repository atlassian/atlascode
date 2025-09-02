import { FieldDescriptor, Fields } from '../common/types';
import { clearField, getFieldValue, isCheckboxOrRadio, isCustomUrl } from './authFormUtils';

// mock URL.parse if missing
if (!URL.parse) {
    (URL as any).parse = (url: string) => {
        try {
            return new URL(url);
        } catch {
            return null;
        }
    };
}

describe('authFormUtils', () => {
    describe('isCustomUrl', () => {
        it('should return true for custom domain URLs', () => {
            expect(isCustomUrl('https://jira.mycompany.com')).toBe(true);
            expect(isCustomUrl('https://bitbucket.mycompany.com')).toBe(true);
            expect(isCustomUrl('https://custom-domain.example.com')).toBe(true);
            expect(isCustomUrl('https://scammer.fake-atlassian.net')).toBe(true);
            expect(isCustomUrl('http://localhost:8080')).toBe(true);
        });

        it('should return false for Atlassian cloud URLs', () => {
            expect(isCustomUrl('https://mycompany.atlassian.net')).toBe(false);
            expect(isCustomUrl('https://test.jira.com')).toBe(false);
            expect(isCustomUrl('https://test.jira-dev.com')).toBe(false);
            expect(isCustomUrl('https://bitbucket.org')).toBe(false);
            expect(isCustomUrl('https://test.bb-inf.net')).toBe(false);
        });

        it('should handle edge cases', () => {
            expect(isCustomUrl('https://subdomain.atlassian.net.fake.com')).toBe(true);
            expect(isCustomUrl('https://atlassian.net.fake.com')).toBe(true);
            expect(isCustomUrl('https://fake-atlassian.net')).toBe(true);
            expect(isCustomUrl('https://fake-atlassian.com')).toBe(true);
            expect(isCustomUrl('https://127.0.0.1')).toBe(true);
        });

        it('should handle missing protocol', () => {
            expect(isCustomUrl('mycompany.atlassian.net')).toBe(false);
            expect(isCustomUrl('test.jira.com')).toBe(false);
            expect(isCustomUrl('test.jira-dev.com')).toBe(false);
            expect(isCustomUrl('local-url')).toBe(true);
            expect(isCustomUrl('localhost')).toBe(true);
            expect(isCustomUrl('127.0.0.1')).toBe(true);
        });
    });

    describe('isCheckboxOrRadio', () => {
        it('should return true for checkbox inputs', () => {
            const checkbox = { type: 'checkbox' } as HTMLInputElement;
            expect(isCheckboxOrRadio(checkbox)).toBe(true);
        });

        it('should return true for radio inputs', () => {
            const radio = { type: 'radio' } as HTMLInputElement;
            expect(isCheckboxOrRadio(radio)).toBe(true);
        });

        it('should return false for other input types', () => {
            const text = { type: 'text' } as HTMLInputElement;
            const password = { type: 'password' } as HTMLInputElement;
            const email = { type: 'email' } as HTMLInputElement;

            expect(isCheckboxOrRadio(text)).toBe(false);
            expect(isCheckboxOrRadio(password)).toBe(false);
            expect(isCheckboxOrRadio(email)).toBe(false);
        });

        it('should return false for undefined input', () => {
            expect(isCheckboxOrRadio(undefined)).toBe(false);
        });

        it('should return false for non-input elements', () => {
            const select = { type: undefined } as any;
            expect(isCheckboxOrRadio(select)).toBe(false);
        });
    });

    describe('getFieldValue', () => {
        it('should return files for file input', () => {
            const files = [{ name: 'test.txt' }] as any;
            const field: FieldDescriptor = {
                inputRef: { type: 'file', files } as HTMLInputElement,
                error: undefined,
                touched: false,
                validator: undefined,
                options: [],
            };

            expect(getFieldValue(field)).toBe(files);
        });

        it('should return value from checked radio option', () => {
            const radioOption1 = { type: 'radio', value: 'option1', checked: false } as HTMLInputElement;
            const radioOption2 = { type: 'radio', value: 'option2', checked: true } as HTMLInputElement;

            const field: FieldDescriptor = {
                inputRef: radioOption1,
                error: undefined,
                touched: false,
                validator: undefined,
                options: [radioOption1, radioOption2],
            };

            expect(getFieldValue(field)).toBe('option2');
        });

        it('should return empty string when no radio option is checked', () => {
            const radioOption1 = { type: 'radio', value: 'option1', checked: false } as HTMLInputElement;
            const radioOption2 = { type: 'radio', value: 'option2', checked: false } as HTMLInputElement;

            const field: FieldDescriptor = {
                inputRef: radioOption1,
                error: undefined,
                touched: false,
                validator: undefined,
                options: [radioOption1, radioOption2],
            };

            expect(getFieldValue(field)).toBe('');
        });

        it('should return checked state for single checkbox', () => {
            const checkbox = { type: 'checkbox', checked: true } as HTMLInputElement;

            const field: FieldDescriptor = {
                inputRef: checkbox,
                error: undefined,
                touched: false,
                validator: undefined,
                options: [checkbox],
            };

            expect(getFieldValue(field)).toBe(true);
        });

        it('should return false for unchecked single checkbox', () => {
            const checkbox = { type: 'checkbox', checked: false } as HTMLInputElement;

            const field: FieldDescriptor = {
                inputRef: checkbox,
                error: undefined,
                touched: false,
                validator: undefined,
                options: [checkbox],
            };

            expect(getFieldValue(field)).toBe(false);
        });

        it('should return array of values for multiple checked checkboxes', () => {
            const checkbox1 = { type: 'checkbox', value: 'option1', checked: true } as HTMLInputElement;
            const checkbox2 = { type: 'checkbox', value: 'option2', checked: true } as HTMLInputElement;
            const checkbox3 = { type: 'checkbox', value: 'option3', checked: false } as HTMLInputElement;

            const field: FieldDescriptor = {
                inputRef: checkbox1,
                error: undefined,
                touched: false,
                validator: undefined,
                options: [checkbox1, checkbox2, checkbox3],
            };

            expect(getFieldValue(field)).toEqual(['option1', 'option2']);
        });

        it('should return input value for regular text inputs', () => {
            const textInput = { type: 'text', value: 'test value' } as HTMLInputElement;

            const field: FieldDescriptor = {
                inputRef: textInput,
                error: undefined,
                touched: false,
                validator: undefined,
                options: [],
            };

            expect(getFieldValue(field)).toBe('test value');
        });

        it('should handle empty options array for radio input', () => {
            const radioInput = { type: 'radio', value: 'test' } as HTMLInputElement;

            const field: FieldDescriptor = {
                inputRef: radioInput,
                error: undefined,
                touched: false,
                validator: undefined,
                options: [],
            };

            expect(getFieldValue(field)).toBe('');
        });

        it('should handle non-array options for checkbox input', () => {
            const checkbox = { type: 'checkbox', checked: true } as HTMLInputElement;

            const field: FieldDescriptor = {
                inputRef: checkbox,
                error: undefined,
                touched: false,
                validator: undefined,
                options: null as any,
            };

            expect(getFieldValue(field)).toBe(false);
        });
    });

    describe('clearField', () => {
        let mockFields: Fields;
        let mockErrors: { current: any };

        beforeEach(() => {
            mockFields = {};
            mockErrors = { current: {} };
        });

        it('should clear field value and remove error when field exists', () => {
            const mockInput = { value: 'test value' } as HTMLInputElement;
            mockFields.testField = {
                inputRef: mockInput,
                error: undefined,
                touched: false,
                validator: undefined,
                options: [],
            };
            mockErrors.current.testField = 'Some error';

            clearField(mockFields, mockErrors, 'testField');

            expect(mockInput.value).toBe('');
            expect(mockErrors.current.testField).toBeUndefined();
        });

        it('should do nothing when field does not exist', () => {
            mockErrors.current.someField = 'Some error';

            clearField(mockFields, mockErrors, 'nonExistentField');

            expect(mockErrors.current.someField).toBe('Some error');
        });

        it('should handle field without error', () => {
            const mockInput = { value: 'test value' } as HTMLInputElement;
            mockFields.testField = {
                inputRef: mockInput,
                error: undefined,
                touched: false,
                validator: undefined,
                options: [],
            };

            clearField(mockFields, mockErrors, 'testField');

            expect(mockInput.value).toBe('');
            expect(mockErrors.current.testField).toBeUndefined();
        });
    });
});
