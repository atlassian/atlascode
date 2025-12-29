import InlineEdit from '@atlaskit/inline-edit';
import Select from '@atlaskit/select';
import { token } from '@atlaskit/tokens';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import { ComponentsForValueType, OptionFunc } from '../selectFieldHelper';

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
        getOptionLabel: OptionFunc;
        getOptionValue: OptionFunc;
        components: ComponentsForValueType;
    };
    isClearable: boolean;
    parentSelectOptions: CascadingSelectOption[];
    isDisabled: boolean;
    isCreateMode: boolean;
    onSave: (selected: any) => void;
    initialValue: Omit<CascadingSelectOption, 'children'>;
};

export type CascadingSelectEditViewProps = Omit<
    CascadingSelectFieldProps,
    'isCreateMode' | 'onSave' | 'initialValue'
> & {
    hasChild: boolean;
    parentSelectValue: Omit<CascadingSelectOption, 'child'>;
    childSelectValue: Omit<CascadingSelectOption, 'children' | 'child'> | null;
    childSelectOptions: Omit<CascadingSelectOption, 'children' | 'child'>[];
    classesInfo: {
        className: string;
        classNamePrefix: string;
    };
    handleParentChange: (selected: Omit<CascadingSelectOption, 'child'>) => void;
    handleChildChange: (selected: Omit<CascadingSelectOption, 'children' | 'child'>) => void;
    shouldFocusParentOnOpen: boolean;
};

const CascadingSelectEditView: React.FC<CascadingSelectEditViewProps> = (props) => {
    const {
        commonProps,
        isClearable,
        parentSelectOptions,
        isDisabled,
        hasChild,
        parentSelectValue,
        childSelectValue,
        childSelectOptions,
        classesInfo,
        handleParentChange,
        handleChildChange,
        shouldFocusParentOnOpen,
    } = props;

    const childRef = useRef<HTMLElement>(null);
    const parentSelectRef = useRef<HTMLElement>(null);
    useEffect(() => {
        if (!shouldFocusParentOnOpen) {
            return;
        }
        const rafId = requestAnimationFrame(() => {
            // focus parent select on opening edit view
            parentSelectRef.current?.focus();
        });
        return () => cancelAnimationFrame(rafId);
    }, [shouldFocusParentOnOpen]);

    return (
        <div>
            <Select
                {...commonProps}
                value={parentSelectValue}
                className={classesInfo.className}
                classNamePrefix={classesInfo.classNamePrefix}
                isClearable={isClearable}
                options={parentSelectOptions}
                isDisabled={isDisabled}
                openMenuOnFocus
                onChange={handleParentChange}
                onMenuClose={() => {
                    requestAnimationFrame(() => {
                        childRef.current?.focus();
                    });
                }}
                ref={parentSelectRef}
            />
            {hasChild && (
                <Select
                    {...commonProps}
                    value={childSelectValue}
                    className={classesInfo.className}
                    classNamePrefix={classesInfo.classNamePrefix}
                    isClearable={true}
                    options={childSelectOptions}
                    isDisabled={isDisabled}
                    openMenuOnFocus
                    onChange={handleChildChange}
                    ref={childRef}
                />
            )}
        </div>
    );
};

const CascadingSelectField: React.FC<CascadingSelectFieldProps> = (props) => {
    const { isCreateMode, initialValue, onSave } = props;
    const [childOptions, setChildOptions] = useState<Omit<CascadingSelectOption, 'children' | 'child'>[]>([]);
    const [childValue, setChildValue] = useState<Omit<CascadingSelectOption, 'children' | 'child'> | null>(null);
    const [parentValue, setParentValue] = useState<Omit<CascadingSelectOption, 'children' | 'child'> | null>(null);

    const initialText =
        initialValue?.child && initialValue.child.value
            ? `${initialValue.value} - ${initialValue.child.value}`
            : initialValue?.value || '';
    const hasChild = childOptions.length > 0 || Boolean(!parentValue && initialValue?.child);

    const classesInfo = useMemo(() => {
        return isCreateMode
            ? {
                  className: 'ac-form-select-container',
                  classNamePrefix: 'ac-form-select',
              }
            : {
                  className: 'ac-select-container',
                  classNamePrefix: 'ac-select',
              };
    }, [isCreateMode]);

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

    const handleParentChange = (selected: Omit<CascadingSelectOption, 'child'>) => {
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
    };

    const handleChildChange = (selected: Omit<CascadingSelectOption, 'child'>) => {
        setChildValue(selected);
        if (isCreateMode) {
            onSave({
                ...parentValue,
                child: selected,
            });
        }
    };

    const editViewProps: CascadingSelectEditViewProps = {
        ...props,
        childSelectOptions: childOptions,
        hasChild,
        childSelectValue: childValue || initialValue?.child || null,
        parentSelectValue: parentValue || initialValue,
        classesInfo,
        handleParentChange,
        handleChildChange,
        shouldFocusParentOnOpen: !isCreateMode,
    };

    return !isCreateMode ? (
        <InlineEdit
            defaultValue={initialText}
            editButtonLabel={initialText}
            editView={() => CascadingSelectEditView(editViewProps)}
            readViewFitContainerWidth
            startWithEditViewOpen={isCreateMode}
            hideActionButtons={isCreateMode}
            readView={() => (
                <div
                    style={{
                        color: !initialText ? 'var(--vscode-input-placeholderForeground) !important' : undefined,
                        paddingBlock: token('space.100'),
                        wordBreak: 'break-word',
                        fontSize: '14px',
                    }}
                >
                    {initialText || 'Add option'}
                </div>
            )}
            onConfirm={() => {
                handleSave();
            }}
        />
    ) : (
        CascadingSelectEditView(editViewProps)
    );
};

export default CascadingSelectField;
