import { User } from '@atlassianlabs/jira-pi-common-models';
import { Avatar, Grid, TextField, Typography } from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import AwesomeDebouncePromise from 'awesome-debounce-promise';
import React, { useCallback, useState } from 'react';
import { useAsyncAbortable } from 'react-async-hook';
import useConstant from 'use-constant';

type UserPickerFieldProps = {
    value: User | null;
    onChange: (user: User | null) => void;
    fetchUsers: (input: string) => Promise<User[]>;
    placeholder?: string;
    label?: string;
    required?: boolean;
    disabled?: boolean;
};

const UserPickerField: React.FC<UserPickerFieldProps> = ({
    value,
    onChange,
    fetchUsers,
    placeholder = 'Type to search',
    label,
    required = false,
    disabled = false,
}) => {
    const [open, setOpen] = useState(false);
    const [inputText, setInputText] = useState('');

    const debouncedUserFetcher = useConstant(() =>
        AwesomeDebouncePromise(
            async (query: string, abortSignal?: AbortSignal): Promise<User[]> => {
                try {
                    if (query.length > 1) {
                        return await fetchUsers(query);
                    }
                    return [];
                } catch (error) {
                    console.warn('Failed to fetch users:', error);
                    return [];
                }
            },
            300,
            { leading: false },
        ),
    );

    const handleChange = useCallback(
        (event: React.ChangeEvent, newValue: User | null) => {
            onChange(newValue);
        },
        [onChange],
    );

    const handleInputChange = useCallback(
        (event: React.ChangeEvent, newInputValue: string) => {
            if (event?.type === 'change') {
                setInputText(newInputValue);
            }
        },
        [setInputText],
    );

    const fetchUsersResult = useAsyncAbortable(
        async (abortSignal) => {
            if (inputText.length > 1) {
                try {
                    const results = await debouncedUserFetcher(inputText, abortSignal);
                    return results || [];
                } catch {
                    return [];
                }
            }
            return [];
        },
        [inputText],
    );

    const handleOpen = useCallback(() => {
        setOpen(true);
    }, []);

    const handleClose = useCallback(() => {
        setOpen(false);
    }, []);

    return (
        <Autocomplete
            open={open}
            onOpen={handleOpen}
            onClose={handleClose}
            options={fetchUsersResult.result || []}
            getOptionLabel={(option) => option?.displayName || ''}
            isOptionEqualToValue={(option, value) => option?.accountId === value?.accountId}
            value={value}
            onInputChange={handleInputChange}
            onChange={handleChange}
            loading={fetchUsersResult.loading}
            disabled={disabled}
            noOptionsText={
                fetchUsersResult.loading ? 'Loading...' : inputText.length > 1 ? 'No users found' : 'Type to search'
            }
            sx={{
                '& .MuiAutocomplete-popupIndicator': {
                    color: 'var(--vscode-foreground)',
                },
                '& .MuiAutocomplete-clearIndicator': {
                    color: 'var(--vscode-foreground)',
                },
                '& .MuiOutlinedInput-root': {
                    padding: '1px',
                    fontSize: '14px',
                    color: 'var(--vscode-input-foreground)',
                    backgroundColor: 'var(--vscode-input-background)',
                    '& fieldset': {
                        borderColor: 'var(--vscode-quickInput-foreground)',
                    },
                    '&:hover fieldset': {
                        borderColor: 'var(--vscode-quickInput-foreground)',
                    },
                    '&.Mui-focused fieldset': {
                        borderColor: 'var(--vscode-quickInput-foreground)',
                    },
                },
                '& .MuiInputLabel-root': {
                    color: 'var(--vscode-descriptionForeground)',
                },
            }}
            renderInput={(params) => (
                <TextField
                    {...params}
                    label={label}
                    placeholder={placeholder}
                    required={required}
                    InputProps={{
                        ...params.InputProps,
                    }}
                />
            )}
            renderOption={(optionProps, option) => (
                <li {...optionProps} key={option?.accountId}>
                    <Grid container spacing={1} direction="row" alignItems="center">
                        <Grid item>
                            <Avatar
                                src={
                                    option?.avatarUrls?.['48x48'] ||
                                    option?.avatarUrls?.['32x32'] ||
                                    option?.avatarUrls?.['24x24']
                                }
                                sx={{ width: 24, height: 24 }}
                            />
                        </Grid>
                        <Grid item>
                            <Typography variant="body2">{option?.displayName}</Typography>
                        </Grid>
                    </Grid>
                </li>
            )}
        />
    );
};

export default UserPickerField;
