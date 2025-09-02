import { FieldDescriptor, Fields, InputElement } from '../common/types';
import { cloudHostnames } from '../constants';

export function isCustomUrl(url: string): boolean {
    try {
        const urlObj = URL.parse(url) || URL.parse('https://' + url);
        if (!urlObj) {
            return false;
        }

        const isCloudHost = cloudHostnames.find(
            (host) => urlObj.hostname === host || urlObj.hostname.endsWith(`.${host}`),
        );

        return !isCloudHost;
    } catch {
        return false;
    }
}

const isFileInput = (element?: InputElement): element is HTMLInputElement => {
    return !!element && element.type === 'file';
};

const isRadioInput = (element?: InputElement): element is HTMLInputElement => {
    return !!element && element.type === 'radio';
};

const isCheckBox = (element?: InputElement): element is HTMLInputElement => {
    return !!element && element.type === 'checkbox';
};

export const isCheckboxOrRadio = (element?: InputElement): element is HTMLInputElement => {
    return !!element && (element.type === 'checkbox' || element.type === 'radio');
};

export const getFieldValue = (field: FieldDescriptor): any => {
    if (isFileInput(field.inputRef)) {
        return field.inputRef.files;
    }

    if (isRadioInput(field.inputRef)) {
        const radioOptions = Array.isArray(field.options)
            ? field.options.filter((opt) => (opt as HTMLInputElement).checked)
            : [];

        return radioOptions.length > 0 ? radioOptions[0].value : '';
    }

    if (isCheckBox(field.inputRef)) {
        const checkOptions = Array.isArray(field.options)
            ? field.options.filter((opt) => (opt as HTMLInputElement).checked)
            : [];

        return checkOptions.length > 1
            ? checkOptions.map((opt) => opt.value)
            : checkOptions.length > 0
              ? (checkOptions[0] as HTMLInputElement).checked
              : false;
    }

    return field.inputRef.value;
};

export const clearField = (fields: Fields, errors: any, name: string) => {
    if (fields[name]) {
        fields[name].inputRef.value = '';
        delete (errors.current as any)[name];
    }
};

export const clearFieldsAndWatches = (
    updateWatches: (updates: Record<string, string>) => void,
    watchUpdates: Record<string, string>,
    fieldIds: string[],
) => {
    updateWatches(watchUpdates);

    fieldIds.forEach((fieldId) => {
        const field = document.getElementById(fieldId) as HTMLInputElement;
        if (field) {
            field.value = '';
        }
    });
};
