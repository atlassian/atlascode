import { Product, ProductJira } from '../../../../atlclients/authInfo';
import { AuthFormType, FIELD_NAMES } from '../../constants';
import { clearField, getFieldValue, isCustomUrl } from '../../util/authFormUtils';
import { Fields } from '../types';

export const clearFieldsSwitchingFormTypes = (
    currentAuthFormType: AuthFormType,
    fields: Fields,
    errors: any,
    authTypeTabIndex: number,
) => {
    if (currentAuthFormType === AuthFormType.CustomSite) {
        if (authTypeTabIndex === 0) {
            clearField(fields, errors, 'personalAccessToken');
        } else if (authTypeTabIndex === 1) {
            clearField(fields, errors, 'username');
            clearField(fields, errors, 'password');
        }
    }

    if (currentAuthFormType === AuthFormType.JiraCloud) {
        clearField(fields, errors, 'personalAccessToken');
    }
};

export function selectAuthFormType(product: Product, watches: any, errors: any): AuthFormType {
    if (!watches.baseUrl || errors.baseUrl) {
        return AuthFormType.None;
    }

    if (product.key === ProductJira.key && !isCustomUrl(watches.baseUrl)) {
        return AuthFormType.JiraCloud;
    }

    if (watches.baseUrl && !errors.baseUrl && isCustomUrl(watches.baseUrl)) {
        return AuthFormType.CustomSite;
    }

    return AuthFormType.None;
}

export const getFieldsValidationHelpers = (
    fields: Fields,
    product: Product,
    watches: any,
    errors: any,
    authTypeTabIndex: number,
) => {
    const validRequiredFields = (fieldNames: string[]): boolean => {
        return fieldNames.every((fieldName) => {
            if (!fields[fieldName]) {
                return false;
            }
            const value = getFieldValue(fields[fieldName]);
            return value && value.trim() !== '';
        });
    };

    const getRelevantFieldNames = (): string[] => {
        const currentAuthFormType = selectAuthFormType(product, watches.current, errors.current);
        let relevantFields: string[] = [];

        if (currentAuthFormType === AuthFormType.JiraCloud) {
            relevantFields = [FIELD_NAMES.USERNAME, FIELD_NAMES.PASSWORD];
        } else {
            relevantFields = authTypeTabIndex === 1 ? [FIELD_NAMES.PAT] : [FIELD_NAMES.USERNAME, FIELD_NAMES.PASSWORD];
        }

        // Add context path if enabled
        if (watches.current.contextPathEnabled) {
            relevantFields.push(FIELD_NAMES.CONTEXT_PATH);
        }

        // Add SSL fields if enabled
        if (watches.current.customSSLEnabled) {
            if (watches.current.customSSLType === 'customServerSSL') {
                relevantFields.push(FIELD_NAMES.SSL_CERT_PATHS);
            }
            if (watches.current.customSSLType === 'customClientSSL') {
                relevantFields.push(FIELD_NAMES.PFX_PATH);
            }
        }

        return relevantFields;
    };

    // Filter errors based on current tab to avoid cross-tab validation issues
    const getRelevantErrors = (): number => {
        const relevantFields = getRelevantFieldNames();
        const relevantErrors = Object.entries(errors.current).filter(([key]) => relevantFields.includes(key));
        return relevantErrors.length;
    };

    return { validRequiredFields, getRelevantFieldNames, getRelevantErrors };
};
