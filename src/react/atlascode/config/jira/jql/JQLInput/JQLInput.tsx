import { CircularProgress, TextField, TextFieldProps } from '@material-ui/core';
import Autocomplete from '@material-ui/lab/Autocomplete';
import match from 'autosuggest-highlight/match';
import parse from 'autosuggest-highlight/parse';
import React, { useMemo, useRef, useState } from 'react';

import { FieldSuggestionFetcher, JqlAutocompleteRestData, Suggestion } from '../jqlTypes';
import { JqlSuggestor } from './jqlSuggestor';
import { useJqlAutocomplete } from './useJqlAutocomplete';

interface JQLInputProps {
    jqlAutocompleteRestData: JqlAutocompleteRestData;
    suggestionFetcher: FieldSuggestionFetcher;
    defaultValue?: string;
    disabled?: boolean;
    loading?: boolean;
}

export const JQLInput: React.FunctionComponent<JQLInputProps & TextFieldProps> = ({
    jqlAutocompleteRestData,
    suggestionFetcher,
    defaultValue,
    disabled,
    helperText,
    onChange,
    inputRef,
    loading,
    ...tfProps
}) => {
    const localHelperText = helperText ? helperText : ' ';
    const loadingText = localHelperText + '  (Loading...)';

    const [fieldPositionDirty, setFieldPositionDirty] = useState<boolean>(false);
    const inputField = useRef<HTMLInputElement>();
    const [open, setOpen] = React.useState<boolean>(false);

    const suggestor = useMemo<JqlSuggestor>(
        () => new JqlSuggestor(jqlAutocompleteRestData, suggestionFetcher),
        [jqlAutocompleteRestData, suggestionFetcher],
    );

    const { inputValue, setInputValue, cursorIndex, setCursorIndex, jqlAutocomplete } = useJqlAutocomplete(
        suggestor,
        defaultValue ? defaultValue : '',
        0,
    );

    const optionsLoading = useMemo<boolean>(
        () => (open && jqlAutocomplete.loading) || (loading !== undefined && loading),
        [jqlAutocomplete.loading, open, loading],
    );

    const handleTextFieldChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        // fires on typing, but not when option is selected
        // update our local state
        if (inputField.current) {
            const newStart = inputField.current.selectionStart ? inputField.current.selectionStart : 0;
            setCursorIndex(newStart);
        }
        setInputValue(event.target.value);

        if (onChange) {
            onChange(event);
        }
    };

    const handleAutocompleteChange = (event: React.ChangeEvent<HTMLInputElement>, value: any) => {
        //only fires when an option is selected with the option value
        let insertText: string = value ? value.value : '';
        let newCursorPos = 0;
        if (insertText === '') {
            return;
        }

        if (inputField.current) {
            newCursorPos = cursorIndex;
            [insertText, newCursorPos] = suggestor.calculateNewValueForSelected(inputValue, insertText, cursorIndex);
        }
        setInputValue(insertText);
        setCursorIndex(newCursorPos);

        // if we're not at the end, we're editing and need to update the cursor position later when the text field catches up
        if (newCursorPos !== insertText.length) {
            setFieldPositionDirty(true);
        }

        if (onChange) {
            const ev2 = { ...event, target: { ...event.target, value: insertText } };
            onChange(ev2);
        }
    };

    const getOptionLabel = (option: Suggestion): string => {
        //fires when option is selected and should return the new input box value in it's entirety. Also fires on focus events, and randomly.
        // if we recently edited a value, we need to set the new cursor position manually
        if (fieldPositionDirty && inputField.current) {
            inputField.current.value = inputValue; // have to reset the value to get the right sel index
            inputField.current.selectionStart = cursorIndex;
            inputField.current.selectionEnd = cursorIndex;
            setFieldPositionDirty(false);
        }

        return inputValue;
    };

    const handleTextFieldKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        // update our local cursorPosition on arrow keys so we fetch the proper options
        switch (event.key) {
            case 'ArrowRight': {
                if (
                    inputField.current &&
                    inputField.current.selectionStart !== null &&
                    inputField.current.selectionStart !== inputField.current.value.length
                ) {
                    const newStart =
                        inputField.current.selectionStart < inputField.current.value.length
                            ? inputField.current.selectionStart + 1
                            : inputField.current.value.length;
                    setCursorIndex(newStart);
                    if (!open) {
                        setOpen(true);
                    }
                }
                break;
            }
            case 'ArrowLeft': {
                if (
                    inputField.current &&
                    inputField.current.selectionStart &&
                    inputField.current.selectionStart !== 0
                ) {
                    const newStart = inputField.current.selectionStart > 0 ? inputField.current.selectionStart - 1 : 0;
                    setCursorIndex(newStart);
                    if (!open) {
                        setOpen(true);
                    }
                }
                break;
            }
        }
    };

    return (
        <Autocomplete
            id="jql-editor"
            getOptionLabel={getOptionLabel}
            filterOptions={(x) => x}
            options={jqlAutocomplete.result ? jqlAutocomplete.result : []}
            value={inputValue}
            includeInputInList
            freeSolo
            autoHighlight
            onChange={handleAutocompleteChange}
            loading={optionsLoading}
            open={open}
            disabled={disabled}
            onOpen={() => {
                setOpen(true);
            }}
            onClose={() => {
                setOpen(false);
            }}
            renderInput={(params) => (
                <TextField
                    {...params}
                    {...tfProps}
                    helperText={optionsLoading ? loadingText : localHelperText}
                    inputRef={(r) => {
                        if (inputRef && typeof inputRef === 'function') {
                            inputRef(r);
                        }
                        inputField.current = r;
                    }}
                    onChange={handleTextFieldChange}
                    onKeyDown={handleTextFieldKeyDown}
                    InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                            <React.Fragment>
                                {optionsLoading ? <CircularProgress color="inherit" size={20} /> : null}
                                {params.InputProps.endAdornment}
                            </React.Fragment>
                        ),
                    }}
                />
            )}
            renderOption={(option) => {
                const matches = match(option.displayName, suggestor.getCurrentToken().value);
                const parts = parse(option.displayName, matches);

                return (
                    <div key={option.value}>
                        {parts.map((part, index) => (
                            <span key={index} style={{ fontWeight: part.highlight ? 700 : 400 }}>
                                {part.text}
                            </span>
                        ))}
                    </div>
                );
            }}
        />
    );
};
