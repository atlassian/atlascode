import InlineEdit from '@atlaskit/inline-edit';
import Select from '@atlaskit/select';
import { token } from '@atlaskit/tokens';
import React, { useEffect, useRef, useState } from 'react';

import * as SelectFieldHelper from '../selectFieldHelper';

export type CascadingSelectOption = {
    child?: CascadingSelectOption;
    children?: CascadingSelectOption[];
    id: string;
    self: string;
    value: string;
};
export type CascadingSelectFieldProps = {
    commonProps: {
        isMulti: boolean;
        getOptionLabel: SelectFieldHelper.OptionFunc;
        getOptionValue: SelectFieldHelper.OptionFunc;
        components: Object;
    };
    isClearable: boolean;
    options: CascadingSelectOption[];
    isDisabled: boolean;
    isCreateMode: boolean;
    onSave: (selected: any) => void;
    initialValue: Omit<CascadingSelectOption, 'children'>;
};

const CascadingSelectField: React.FC<CascadingSelectFieldProps> = ({
    commonProps,
    isClearable,
    options,
    isDisabled,
    isCreateMode,
    initialValue,
    onSave,
}) => {
    const childRef = useRef<HTMLElement>(null);
    const [childOptions, setChildOptions] = useState<Omit<CascadingSelectOption, 'children' | 'child'>[]>([]);
    const [childValue, setChildValue] = useState<Omit<CascadingSelectOption, 'children' | 'child'> | null>(null);
    const [parentValue, setParentValue] =
        useState<Required<Omit<CascadingSelectOption, 'children' | 'child'> | null>>(null);

    const initialValueCopy = { ...initialValue };
    if (initialValueCopy?.child && initialValueCopy.child.value) {
        initialValueCopy.value = initialValueCopy.value + ' - ' + initialValueCopy.child.value;
    }
    const hasChild = childOptions.length > 0 || (!parentValue && initialValueCopy?.child);

    const handleSave = () => {
        if (!parentValue) {
            handleCancel();
            return;
        }
        const combinedValue = {
            ...parentValue,
        } as NonNullable<Omit<CascadingSelectOption, 'children'>>;

        if (childValue && childValue.id) {
            combinedValue.child = childValue;
        }
        onSave(combinedValue);
    };

    const handleCancel = () => {
        setParentValue(null);
        setChildValue(null);
        setChildOptions([]);
    };

    const editView = ({}) => {
        const parentRef = useRef<HTMLElement>(null);
        useEffect(() => {
            if (isCreateMode) {
                return;
            }
            const rafId = requestAnimationFrame(() => {
                // focus parent select on opening edit view
                parentRef.current?.focus();
            });
            return () => cancelAnimationFrame(rafId);
        }, []);

        return (
            <div>
                <Select
                    {...commonProps}
                    value={parentValue || initialValueCopy}
                    className={isCreateMode ? 'ac-form-select-container' : 'ac-select-container'}
                    classNamePrefix={isCreateMode ? 'ac-form-select' : 'ac-select'}
                    isClearable={isClearable}
                    options={options}
                    isDisabled={isDisabled}
                    openMenuOnFocus
                    onChange={(selected: Omit<CascadingSelectOption, 'child'>) => {
                        const childrenOptions = selected?.children || [];
                        setParentValue(selected);
                        // reset child value on parent change
                        setChildValue({
                            self: '',
                            value: '',
                            id: '',
                        });
                        if (childrenOptions.length > 0) {
                            setChildOptions(childrenOptions);
                        } else {
                            setChildOptions([]);
                        }
                        if (isCreateMode) {
                            onSave(selected);
                        }
                    }}
                    onMenuClose={() => {
                        requestAnimationFrame(() => {
                            childRef.current?.focus();
                        });
                    }}
                    ref={parentRef}
                />
                {hasChild && (
                    <Select
                        {...commonProps}
                        value={childValue || initialValue?.child?.value}
                        className={isCreateMode ? 'ac-form-select-container' : 'ac-select-container'}
                        classNamePrefix={isCreateMode ? 'ac-form-select' : 'ac-select'}
                        isClearable={true}
                        options={childOptions}
                        isDisabled={isDisabled}
                        openMenuOnFocus
                        onChange={(selected: Omit<CascadingSelectOption, 'child'>) => {
                            setChildValue(selected);
                            if (isCreateMode) {
                                onSave({
                                    ...parentValue,
                                    child: selected,
                                });
                            }
                        }}
                        ref={childRef}
                    />
                )}
            </div>
        );
    };

    return !isCreateMode ? (
        <InlineEdit
            defaultValue={initialValueCopy.value}
            editButtonLabel={initialValueCopy.value}
            editView={editView}
            readViewFitContainerWidth
            startWithEditViewOpen={isCreateMode}
            hideActionButtons={isCreateMode}
            readView={() => (
                <div
                    style={{
                        color: !initialValueCopy.value
                            ? 'var(--vscode-input-placeholderForeground) !important'
                            : undefined,
                        paddingBlock: token('space.100'),
                        wordBreak: 'break-word',
                        fontSize: '14px',
                    }}
                >
                    {initialValueCopy.value || 'Add option'}
                </div>
            )}
            onConfirm={() => {
                handleSave();
            }}
        />
    ) : (
        editView({})
    );
};

export default CascadingSelectField;
