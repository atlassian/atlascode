import { ProductBitbucket, ProductJira } from '../../../../atlclients/authInfo';
import { AuthFormType, FIELD_NAMES } from '../../constants';
import { Fields } from '../types';
import { clearFieldsSwitchingFormTypes, getFieldsValidationHelpers, selectAuthFormType } from './helpers';

describe('Form Helpers', () => {
    const createMockFields = (values: Partial<Record<string, string>> = {}): Fields => ({
        username: {
            inputRef: { value: values.username ?? 'testuser', name: 'username' },
            error: undefined,
            touched: false,
            validator: undefined,
            options: [],
        } as any,
        password: {
            inputRef: { value: values.password ?? 'testpass', name: 'password' },
            error: undefined,
            touched: false,
            validator: undefined,
            options: [],
        } as any,
        personalAccessToken: {
            inputRef: { value: values.personalAccessToken ?? 'testtoken', name: 'personalAccessToken' },
            error: undefined,
            touched: false,
            validator: undefined,
            options: [],
        } as any,
    });

    const createWatches = (baseUrl: string) => ({ baseUrl });
    const createCurrentWatches = (baseUrl: string) => ({ current: { baseUrl } });

    const expectFieldCleared = (fields: Fields, fieldName: string) => {
        expect(fields[fieldName]?.inputRef.value).toBe('');
    };

    const expectFieldNotCleared = (fields: Fields, fieldName: string, originalValue: string) => {
        expect(fields[fieldName]?.inputRef.value).toBe(originalValue);
    };

    const testSelectAuthFormType = (product: any, baseUrl: string, expectedType: AuthFormType, errors = {}) => {
        const watches = createWatches(baseUrl);
        const result = selectAuthFormType(product, watches, errors);
        expect(result).toBe(expectedType);
    };

    describe('clearFieldsSwitchingFormTypes', () => {
        describe('CustomSite form type', () => {
            it('should clear PAT when on tab 0 (username/password tab)', () => {
                const fields = createMockFields();
                const errors = { current: {} };

                clearFieldsSwitchingFormTypes(AuthFormType.CustomSite, fields, errors, 0);

                expectFieldCleared(fields, 'personalAccessToken');
                expectFieldNotCleared(fields, 'username', 'testuser');
                expectFieldNotCleared(fields, 'password', 'testpass');
            });

            it('should clear username and password when on tab 1 (PAT tab)', () => {
                const fields = createMockFields();
                const errors = { current: {} };

                clearFieldsSwitchingFormTypes(AuthFormType.CustomSite, fields, errors, 1);

                expectFieldCleared(fields, 'username');
                expectFieldCleared(fields, 'password');
                expectFieldNotCleared(fields, 'personalAccessToken', 'testtoken');
            });
        });

        describe('JiraCloud form type', () => {
            it('should clear PAT when switching to JiraCloud', () => {
                const fields = createMockFields();
                const errors = { current: {} };

                clearFieldsSwitchingFormTypes(AuthFormType.JiraCloud, fields, errors, 0);

                expectFieldCleared(fields, 'personalAccessToken');
                expectFieldNotCleared(fields, 'username', 'testuser');
                expectFieldNotCleared(fields, 'password', 'testpass');
            });

            it('should clear PAT regardless of tab index', () => {
                const fields = createMockFields();
                const errors = { current: {} };

                clearFieldsSwitchingFormTypes(AuthFormType.JiraCloud, fields, errors, 1);

                expectFieldCleared(fields, 'personalAccessToken');
            });
        });
    });

    describe('selectAuthFormType', () => {
        describe('with Jira product', () => {
            it('should return JiraCloud for cloud URLs', () => {
                testSelectAuthFormType(ProductJira, 'https://mycompany.atlassian.net', AuthFormType.JiraCloud);
            });

            it('should return CustomSite for custom URLs', () => {
                testSelectAuthFormType(ProductJira, 'https://jira.mycompany.com', AuthFormType.CustomSite);
            });

            it('should return None when baseUrl is empty', () => {
                testSelectAuthFormType(ProductJira, '', AuthFormType.None);
            });

            it('should return None when baseUrl has errors', () => {
                testSelectAuthFormType(ProductJira, 'https://mycompany.atlassian.net', AuthFormType.None, {
                    baseUrl: 'Invalid URL',
                });
            });
        });

        describe('with Bitbucket product', () => {
            it('should return None for cloud URLs (Bitbucket cloud not supported)', () => {
                testSelectAuthFormType(ProductBitbucket, 'https://bitbucket.org', AuthFormType.None);
            });

            it('should return CustomSite for custom URLs', () => {
                testSelectAuthFormType(ProductBitbucket, 'https://bitbucket.mycompany.com', AuthFormType.CustomSite);
            });
        });
    });

    describe('getFieldsValidationHelpers', () => {
        const mockFields = createMockFields();
        const defaultWatches = createCurrentWatches('https://mycompany.atlassian.net');
        const defaultErrors = { current: {} };

        const getHelpers = (watches = defaultWatches, authTypeTabIndex = 0, errors = defaultErrors) => {
            return getFieldsValidationHelpers(mockFields, ProductJira, watches, errors, authTypeTabIndex);
        };

        describe('getRelevantFieldNames', () => {
            it('should return username and password for JiraCloud', () => {
                const { getRelevantFieldNames } = getHelpers();
                expect(getRelevantFieldNames()).toEqual([FIELD_NAMES.USERNAME, FIELD_NAMES.PASSWORD]);
            });

            it('should return PAT for CustomSite tab 1', () => {
                const customWatches = createCurrentWatches('https://jira.mycompany.com');
                const { getRelevantFieldNames } = getHelpers(customWatches, 1);
                expect(getRelevantFieldNames()).toEqual([FIELD_NAMES.PAT]);
            });

            it('should return username and password for CustomSite tab 0', () => {
                const customWatches = createCurrentWatches('https://jira.mycompany.com');
                const { getRelevantFieldNames } = getHelpers(customWatches, 0);
                expect(getRelevantFieldNames()).toEqual([FIELD_NAMES.USERNAME, FIELD_NAMES.PASSWORD]);
            });

            it('should include context path when contextPathEnabled is true', () => {
                const customWatches = { current: { baseUrl: 'https://jira.mycompany.com', contextPathEnabled: true } };
                const { getRelevantFieldNames } = getHelpers(customWatches, 0);
                expect(getRelevantFieldNames()).toEqual([
                    FIELD_NAMES.USERNAME,
                    FIELD_NAMES.PASSWORD,
                    FIELD_NAMES.CONTEXT_PATH,
                ]);
            });

            it('should not include context path when contextPathEnabled is false', () => {
                const customWatches = { current: { baseUrl: 'https://jira.mycompany.com', contextPathEnabled: false } };
                const { getRelevantFieldNames } = getHelpers(customWatches, 0);
                expect(getRelevantFieldNames()).toEqual([FIELD_NAMES.USERNAME, FIELD_NAMES.PASSWORD]);
            });

            it('should include SSL cert paths when customSSLEnabled is true and customSSLType is customServerSSL', () => {
                const customWatches = {
                    current: {
                        baseUrl: 'https://jira.mycompany.com',
                        customSSLEnabled: true,
                        customSSLType: 'customServerSSL',
                    },
                };
                const { getRelevantFieldNames } = getHelpers(customWatches, 0);
                expect(getRelevantFieldNames()).toEqual([
                    FIELD_NAMES.USERNAME,
                    FIELD_NAMES.PASSWORD,
                    FIELD_NAMES.SSL_CERT_PATHS,
                ]);
            });

            it('should include PFX path when customSSLEnabled is true and customSSLType is customClientSSL', () => {
                const customWatches = {
                    current: {
                        baseUrl: 'https://jira.mycompany.com',
                        customSSLEnabled: true,
                        customSSLType: 'customClientSSL',
                    },
                };
                const { getRelevantFieldNames } = getHelpers(customWatches, 0);
                expect(getRelevantFieldNames()).toEqual([
                    FIELD_NAMES.USERNAME,
                    FIELD_NAMES.PASSWORD,
                    FIELD_NAMES.PFX_PATH,
                ]);
            });

            it('should not include SSL fields when customSSLEnabled is false', () => {
                const customWatches = {
                    current: {
                        baseUrl: 'https://jira.mycompany.com',
                        customSSLEnabled: false,
                        customSSLType: 'customServerSSL',
                    },
                };
                const { getRelevantFieldNames } = getHelpers(customWatches, 0);
                expect(getRelevantFieldNames()).toEqual([FIELD_NAMES.USERNAME, FIELD_NAMES.PASSWORD]);
            });

            it('should include multiple conditional fields when enabled', () => {
                const customWatches = {
                    current: {
                        baseUrl: 'https://jira.mycompany.com',
                        contextPathEnabled: true,
                        customSSLEnabled: true,
                        customSSLType: 'customServerSSL',
                    },
                };
                const { getRelevantFieldNames } = getHelpers(customWatches, 0);
                expect(getRelevantFieldNames()).toEqual([
                    FIELD_NAMES.USERNAME,
                    FIELD_NAMES.PASSWORD,
                    FIELD_NAMES.CONTEXT_PATH,
                    FIELD_NAMES.SSL_CERT_PATHS,
                ]);
            });

            it('should include context path and PFX path when both are enabled', () => {
                const customWatches = {
                    current: {
                        baseUrl: 'https://jira.mycompany.com',
                        contextPathEnabled: true,
                        customSSLEnabled: true,
                        customSSLType: 'customClientSSL',
                    },
                };
                const { getRelevantFieldNames } = getHelpers(customWatches, 0);
                expect(getRelevantFieldNames()).toEqual([
                    FIELD_NAMES.USERNAME,
                    FIELD_NAMES.PASSWORD,
                    FIELD_NAMES.CONTEXT_PATH,
                    FIELD_NAMES.PFX_PATH,
                ]);
            });
        });

        describe('validRequiredFields', () => {
            it('should return true when all required fields have values', () => {
                const { validRequiredFields } = getHelpers();
                expect(validRequiredFields(['username', 'password'])).toBe(true);
            });

            it('should return false when a required field is missing', () => {
                const fieldsWithEmptyPassword = createMockFields({ password: '' });
                const { validRequiredFields } = getFieldsValidationHelpers(
                    fieldsWithEmptyPassword,
                    ProductJira,
                    defaultWatches,
                    defaultErrors,
                    0,
                );

                expect(validRequiredFields(['username'])).toBe(true);
                expect(validRequiredFields(['password'])).toBe(false);
                expect(validRequiredFields(['username', 'password'])).toBe(false);
            });
        });

        describe('getRelevantErrors', () => {
            it('should return 0 when no relevant errors exist', () => {
                const { getRelevantErrors } = getHelpers();
                expect(getRelevantErrors()).toBe(0);
            });

            it('should count only relevant errors', () => {
                const errorsWithRelevantAndIrrelevant = {
                    current: {
                        username: 'Username is required',
                        personalAccessToken: 'PAT is invalid', // irrelevant for JiraCloud
                    },
                };
                const { getRelevantErrors } = getHelpers(defaultWatches, 0, errorsWithRelevantAndIrrelevant);
                expect(getRelevantErrors()).toBe(1);
            });
        });
    });
});
