import { ReducerAction } from '@atlassianlabs/guipi-core-controller';
import { Box, IconButton, TextField, TextFieldProps } from '@material-ui/core';
import ClearIcon from '@material-ui/icons/Clear';
import SaveIcon from '@material-ui/icons/Save';
import React, { useEffect, useReducer, useRef, useState } from 'react';

type InlineTextEditorProps = {
    onSave?: (value: string) => void;
    onCancel?: (initialValue: string, value: string) => void;
    hideLabelOnBlur?: boolean;
    saveDisabled?: (value: string) => boolean;
};

interface EditorState {
    isEditing: boolean;
    savedValue: string;
    dirtyValue: string;
    currentLabel: React.ReactNode | undefined;
}

export enum TextEditorActionType {
    StartEditing = 'startEditing',
    Cancel = 'cancel',
    Save = 'save',
    ChangeEvent = 'changeEvent',
    NewDefault = 'newDefault',
}

type EditorAction =
    | ReducerAction<TextEditorActionType.StartEditing, { label: React.ReactNode }>
    | ReducerAction<TextEditorActionType.Cancel, { label: React.ReactNode | undefined }>
    | ReducerAction<TextEditorActionType.Save>
    | ReducerAction<TextEditorActionType.ChangeEvent, { value: string }>
    | ReducerAction<TextEditorActionType.NewDefault, { value: string }>;

function editorReducer(state: EditorState, action: EditorAction): EditorState {
    switch (action.type) {
        case TextEditorActionType.StartEditing: {
            return { ...state, isEditing: true, currentLabel: action.label };
        }
        case TextEditorActionType.Cancel: {
            return { ...state, isEditing: false, dirtyValue: state.savedValue, currentLabel: action.label };
        }
        case TextEditorActionType.Save: {
            return { ...state, isEditing: false, savedValue: state.dirtyValue };
        }
        case TextEditorActionType.ChangeEvent: {
            return { ...state, dirtyValue: action.value };
        }
        case TextEditorActionType.NewDefault: {
            return { ...state, savedValue: action.value, dirtyValue: action.value };
        }

        default:
            return state;
    }
}

export const InlineTextEditor: React.FunctionComponent<TextFieldProps & InlineTextEditorProps> = ({
    label,
    disabled,
    saveDisabled,
    onSave,
    onCancel,
    onChange,
    defaultValue,
    hideLabelOnBlur,
    ...rest
}) => {
    const [defaultString, setDefaultString] = useState(defaultValue ? (defaultValue as string) : '');
    const [state, dispatch] = useReducer(editorReducer, {
        isEditing: false,
        dirtyValue: defaultString,
        savedValue: defaultString,
        currentLabel: hideLabelOnBlur ? undefined : label,
    });

    const checkSaveDisabled = saveDisabled ? saveDisabled : (v: string) => false;

    const inputEl = useRef<HTMLInputElement | undefined>(undefined);

    const doCancel = (): void => {
        if (onCancel) {
            onCancel(defaultString, state.dirtyValue);
        }

        dispatch({ type: TextEditorActionType.Cancel, label: hideLabelOnBlur ? undefined : label });
        if (inputEl.current) {
            inputEl.current.blur();
        }
    };

    const doBlur = (): void => {
        if (state.isEditing) {
            doCancel();
        }
    };

    const doSave = (e: React.MouseEvent<HTMLButtonElement>): void => {
        dispatch({ type: TextEditorActionType.Save });
        if (onSave) {
            onSave(state.dirtyValue);
        }

        if (inputEl.current) {
            inputEl.current.blur();
        }
    };

    const internalOnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        dispatch({ type: TextEditorActionType.ChangeEvent, value: e.target.value });
    };

    useEffect(() => {
        const dString = defaultValue ? (defaultValue as string) : '';
        setDefaultString((oldString) => {
            if (oldString !== dString) {
                dispatch({ type: TextEditorActionType.NewDefault, value: dString });
                return dString;
            }

            return oldString;
        });
    }, [defaultValue]);

    const editorAdorment = (
        <Box display="flex">
            <IconButton
                disabled={disabled || state.savedValue === state.dirtyValue || checkSaveDisabled(state.dirtyValue)}
                onClick={doSave}
                onMouseDown={(event: React.MouseEvent<HTMLButtonElement>) => event.preventDefault()}
            >
                <SaveIcon fontSize="small" color="inherit" />
            </IconButton>
            <IconButton
                disabled={disabled}
                onClick={doCancel}
                onMouseDown={(event: React.MouseEvent<HTMLButtonElement>) => event.preventDefault()}
            >
                <ClearIcon fontSize="small" color="inherit" />
            </IconButton>
        </Box>
    );
    const editButtons = state.isEditing
        ? {
              InputProps: {
                  endAdornment: editorAdorment,
              },
          }
        : {};

    return (
        <TextField
            {...rest}
            disabled={disabled}
            label={state.currentLabel}
            value={state.dirtyValue}
            onFocus={(e) => {
                e.preventDefault();
                dispatch({ type: TextEditorActionType.StartEditing, label: label });
            }}
            onBlur={doBlur}
            onChange={internalOnChange}
            inputRef={inputEl}
            {...editButtons}
        />
    );
};
