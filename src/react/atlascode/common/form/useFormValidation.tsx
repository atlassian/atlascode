import AwesomeDebouncePromise from 'awesome-debounce-promise';
import equal from 'fast-deep-equal/es6';
import { useCallback, useEffect, useRef, useState } from 'react';
import useConstant from 'use-constant';

import { Product } from '../../../../atlclients/authInfo';
import { AuthFormType } from '../../constants';
import { getFieldValue, isCheckboxOrRadio } from '../../util/authFormUtils';
import { Errors, FieldDescriptor, Fields, FormValidation, InputElement, OnSubmit, ValidateFunc } from '../types';
import { clearFieldsSwitchingFormTypes, getFieldsValidationHelpers, selectAuthFormType } from './helpers';

export function useFormValidation<FieldTypes>(
    authTypeTabIndex: number,
    product: Product,
    watch?: Partial<FieldTypes>,
): FormValidation<FieldTypes> {
    const fields = useConstant<Fields>(() => ({}));
    const watchDefaults = useRef<Partial<FieldTypes>>(watch ? watch : {});
    const watches = useRef<Partial<FieldTypes>>(watch ? watch : {});
    const errors = useRef<Partial<Errors<FieldTypes>>>({});
    const [, reRender] = useState(false);
    const previousAuthFormType = useRef<AuthFormType>(AuthFormType.None);

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
                if ((errors.current as any)[field.inputRef.name] !== errString) {
                    needsReRender = true;

                    if (errString) {
                        errors.current = { ...errors.current, [field.inputRef.name]: errString };
                    } else {
                        delete (errors.current as any)[field.inputRef.name];
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

    // Clear fields when switching between form types
    useEffect(() => {
        const currentAuthFormType = selectAuthFormType(product, watches.current, errors.current);
        clearFieldsSwitchingFormTypes(currentAuthFormType, fields, errors, authTypeTabIndex);
        previousAuthFormType.current = currentAuthFormType;

        reRender((prevToggle) => !prevToggle);
    }, [authTypeTabIndex, product, (watches.current as any).baseUrl]); // eslint-disable-line react-hooks/exhaustive-deps

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
    const { getRelevantFieldNames, validRequiredFields, getRelevantErrors } = getFieldsValidationHelpers(
        fields,
        product,
        watches,
        errors,
        authTypeTabIndex,
    );

    const validateFields = (): boolean => {
        const requiredFields = getRelevantFieldNames();
        return validRequiredFields(requiredFields);
    };

    const noErrors = getRelevantErrors() < 1;
    const fieldsValid = validateFields();
    const isValid = noErrors && fieldsValid;

    const updateWatches = (updates: Partial<FieldTypes>) => {
        watches.current = { ...watches.current, ...updates };
    };

    const authFormType = selectAuthFormType(product, watches.current, errors.current);

    return {
        register: useCallback(register, []), // eslint-disable-line react-hooks/exhaustive-deps
        watches: watches.current,
        errors: errors.current,
        handleSubmit,
        isValid,
        authFormType,
        updateWatches,
    };
}
