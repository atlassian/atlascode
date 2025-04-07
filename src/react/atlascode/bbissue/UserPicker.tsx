import { Avatar, CircularProgress, Grid, InputAdornment, TextField, Typography } from '@material-ui/core';
import { Autocomplete } from '@material-ui/lab';
import AwesomeDebouncePromise from 'awesome-debounce-promise';
import React, { useCallback, useContext, useState } from 'react';
import { useAsyncAbortable } from 'react-async-hook';
import useConstant from 'use-constant';

import { emptyUser, User } from '../../../bitbucket/model';
import { BitbucketIssueControllerContext } from './bitbucketIssueController';

type UserPickerProps = { user: User; onChange: (accountId?: string) => Promise<void> };

const UserPicker: React.FC<UserPickerProps> = (props: UserPickerProps) => {
    const controller = useContext(BitbucketIssueControllerContext);

    const [open, setOpen] = useState(false);
    const [optionChangeLoading, setOptionChangeLoading] = useState(false);
    const [loadingUser, setLoadingUser] = useState<User>(props.user);
    const [inputText, setInputText] = useState(props.user.displayName);

    const debouncedUserFetcher = useConstant(() =>
        AwesomeDebouncePromise(
            async (query: string, abortSignal?: AbortSignal): Promise<User[]> => {
                return await controller.fetchUsers(query, abortSignal);
            },
            300,
            { leading: false },
        ),
    );

    const handleChange = async (event: React.ChangeEvent, value: User | undefined, reason: string) => {
        // ignore change event when input text is cleared
        if (event?.target?.nodeName === 'INPUT' && reason === 'clear') {
            return;
        }

        setOptionChangeLoading(true);
        try {
            setLoadingUser(value || emptyUser);
            await props.onChange(value?.accountId);
        } finally {
            setOptionChangeLoading(false);
        }
    };

    const handleInputChange = useCallback(
        (event: React.ChangeEvent, value: string) => {
            if (open && event?.type === 'change') {
                setInputText(value);
            }
        },
        [open, setInputText],
    );

    const fetchUsers = useAsyncAbortable(
        async (abortSignal) => {
            const results = await debouncedUserFetcher(inputText, abortSignal);
            return results;
        },
        [inputText],
    );

    return (
        <Autocomplete
            open={open}
            onOpen={() => setOpen(true)}
            onClose={() => setOpen(false)}
            options={fetchUsers.result || []}
            getOptionLabel={(option) => option?.displayName || ''}
            value={optionChangeLoading ? loadingUser : props.user}
            onInputChange={handleInputChange}
            onChange={handleChange}
            loading={fetchUsers.loading || optionChangeLoading}
            renderInput={(params) => (
                <TextField
                    {...params}
                    InputProps={{
                        ...params.InputProps,
                        startAdornment: open ? null : (
                            <InputAdornment position="start">
                                <Avatar src={loadingUser?.avatarUrl} />
                            </InputAdornment>
                        ),
                        endAdornment: (
                            <React.Fragment>
                                {fetchUsers.loading || optionChangeLoading ? <CircularProgress size={20} /> : null}
                                {params.InputProps.endAdornment}
                            </React.Fragment>
                        ),
                    }}
                />
            )}
            renderOption={(option) => (
                <Grid container spacing={1} direction="row" alignItems="center">
                    <Grid item>
                        <Avatar src={option?.avatarUrl} />
                    </Grid>
                    <Grid item>
                        <Typography>{option?.displayName}</Typography>
                    </Grid>
                </Grid>
            )}
        />
    );
};

export default UserPicker;
