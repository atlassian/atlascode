import AwesomeDebouncePromise from 'awesome-debounce-promise';
import equal from 'fast-deep-equal/es6';
import { useCallback, useEffect, useRef, useState } from 'react';
import useConstant from 'use-constant';

type InputElement = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

type ValidationResult = string | undefined;
type ValidateFunc = (fieldName: string, data: any) => ValidationResult | Promise<ValidationResult>;
type FieldDescriptor = {
    inputRef: InputElement;
    error: ValidationResult;
    touched: boolean;
    validator: ValidateFunc | undefined;
    options: InputElement[];
};
type Fields = {
    [k: string]: FieldDescriptor;
};

type Errors<T> = {
    [key in keyof T]: string;
};

export type OnSubmit<FieldTypes> = (data: FieldTypes) => void | Promise<void>;

export type FormValidation<FieldTypes> = {
    register<Element extends InputElement = InputElement>(): (ref: Element | null) => void;
    register<Element extends InputElement = InputElement>(validate: ValidateFunc): (ref: Element | null) => void;
    register<Element extends InputElement = InputElement>(
        ref?: Element,
        validate?: ValidateFunc,
    ): ((ref: Element | null) => void) | void;
    watches: Partial<FieldTypes>;
    errors: Partial<Errors<FieldTypes>>;
    isValid: boolean;
    handleSubmit: (callback: OnSubmit<Partial<FieldTypes>>) => (e?: React.BaseSyntheticEvent) => Promise<void>;
};

const isFileInput = (element?: InputElement): element is HTMLInputElement => {
    return !!element && element.type === 'file';
};

const isRadioInput = (element?: InputElement): element is HTMLInputElement => {
    return !!element && element.type === 'radio';
};

const isCheckBox = (element?: InputElement): element is HTMLInputElement => {
    return !!element && element.type === 'checkbox';
};

const isCheckboxOrRadio = (element?: InputElement): element is HTMLInputElement => {
    return !!element && (element.type === 'checkbox' || element.type === 'radio');
};

const getFieldValue = (field: FieldDescriptor): any => {
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

export function useFormValidation<FieldTypes>(watch?: Partial<FieldTypes>): FormValidation<FieldTypes> {
    const fields = useConstant<Fields>(() => ({}));
    const watchDefaults = useRef<Partial<FieldTypes>>(watch ? watch : {});
    const watches = useRef<Partial<FieldTypes>>(watch ? watch : {});
    const errors = useRef<Partial<Errors<FieldTypes>>>({});
    const [, reRender] = useState(false);

    const handleChange = useConstant(() => async (e: Event) => {
        const field = fields[(e.target as InputElement).name];
        let needsReRender = false;

        if (field) {
            if (Object.keys(watches.current).includes(field.inputRef.name)) {
                needsReRender = true;
                if (typeof (watches.current as any)[field.inputRef.name] === 'boolean') {
                    watches.current = {
                        ...watches.current,
                        [field.inputRef.name]: (field.inputRef as HTMLInputElement).checked,
                    };
                } else {
                    watches.current = {
                        ...watches.current,
                        [field.inputRef.name]: getFieldValue(field),
                    };
                }
            }

            if (field.validator) {
                const errString = await field.validator(field.inputRef.name, field.inputRef.value);
                if ((watches.current as any)[field.inputRef.name] !== errString) {
                    needsReRender = true;

                    if (errString) {
                        errors.current = { ...errors.current, [field.inputRef.name]: errString };
                    } else {
                        delete (watches.current as any)[field.inputRef.name];
                    }
                }
            }
        }

        if (needsReRender) {
            reRender((prevToggle) => !prevToggle);
        }
    });

    const handleSubmit = useCallback(
        (callback: OnSubmit<Partial<FieldTypes>>) =>
            async (e?: React.BaseSyntheticEvent): Promise<void> => {
                if (e) {
                    e.preventDefault();
                    e.persist();
                }

                //TODO: add an option to validate all fields before submitting.
                const fieldValues: any = {};
                try {
                    for (const field of Object.values<FieldDescriptor>(fields)) {
                        if (field) {
                            fieldValues[field.inputRef.name] = getFieldValue(field);
                        }
                    }
                    await callback(fieldValues);
                } finally {
                    reRender((prevToggle) => !prevToggle);
                }
            },
        [fields],
    );

    useEffect(() => {
        if (watch && !equal(watch, watchDefaults.current)) {
            watchDefaults.current = watch;
            watches.current = watch;
            errors.current = {};
            reRender((prevToggle) => !prevToggle);
        }
    }, [watch]);

    const doRegister = useCallback(
        (ref: InputElement | null, validate?: ValidateFunc) => {
            if (ref) {
                if (!ref.name) {
                    return console.warn('ref is missing name @ when trying to register form validation', ref);
                }

                const isOptionable = isCheckboxOrRadio(ref);
                // check for existing field

                if (validate) {
                    ref.addEventListener(
                        'input',
                        AwesomeDebouncePromise(handleChange, 300, { key: (fieldId, text) => fieldId }),
                    );
                    ref.addEventListener(
                        'blur',
                        AwesomeDebouncePromise(handleChange, 10, { key: (fieldId, text) => fieldId }),
                    );
                } else {
                    ref.addEventListener('input', handleChange);
                }

                if (fields[ref.name] !== undefined && isOptionable) {
                    const existingField = fields[ref.name];
                    if (!existingField.options.find((option) => option.value === ref.value)) {
                        existingField.options.push(ref);
                        return;
                    }
                }

                //it's a new field
                if (!isOptionable) {
                    fields[ref.name] = {
                        inputRef: ref,
                        error: undefined,
                        touched: false,
                        validator: validate,
                        options: [],
                    };
                } else {
                    fields[ref.name] = {
                        inputRef: ref,
                        error: undefined,
                        touched: false,
                        validator: validate,
                        options: [ref],
                    };
                }
            }
        },
        [fields, handleChange],
    );
    function register<Element extends InputElement = InputElement>(): (ref: Element | null) => void;
    function register<Element extends InputElement = InputElement>(
        refOrValidate?: Element | ValidateFunc,
    ): ((ref: Element | null) => void) | void {
        if (refOrValidate) {
            if (typeof refOrValidate === 'function') {
                return (ref: Element | null) => ref && doRegister(ref, refOrValidate);
            }
            return doRegister(refOrValidate as InputElement);
        }

        return doRegister;
    }

    return {
        register: useCallback(register, []), // eslint-disable-line react-hooks/exhaustive-deps
        watches: watches.current,
        errors: errors.current,
        handleSubmit,
        isValid: Object.values(errors.current).length < 1,
    };
}
