import { Avatar, Grid, TextField, Typography } from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import AwesomeDebouncePromise from 'awesome-debounce-promise';
import React, { useCallback, useContext, useState } from 'react';
import { useAsyncAbortable } from 'react-async-hook';
import useConstant from 'use-constant';

import { BitbucketSite, User } from '../../../bitbucket/model';
import { CreatePullRequestControllerContext } from './createPullRequestController';

type UserPickerProps = { site?: BitbucketSite; users: User[]; defaultUsers: User[]; onChange: (users: User[]) => void };

const UserPicker: React.FC<UserPickerProps> = (props: UserPickerProps) => {
    const controller = useContext(CreatePullRequestControllerContext);

    const [open, setOpen] = useState(false);
    const [inputText, setInputText] = useState('');

    const debouncedUserFetcher = useConstant(() =>
        AwesomeDebouncePromise(
            async (site: BitbucketSite, query: string, abortSignal?: AbortSignal): Promise<User[]> => {
                return await controller.fetchUsers(site, query, abortSignal);
            },
            300,
            { leading: false },
        ),
    );

    const handleChange = (event: React.ChangeEvent, value: User[]) => props.onChange(value);

    const handleInputChange = useCallback(
        (event: React.ChangeEvent, value: string) => {
            if (event?.type === 'change') {
                setInputText(value);
            }
        },
        [setInputText],
    );

    const fetchUsers = useAsyncAbortable(
        async (abortSignal) => {
            if (inputText.length > 1 && props.site) {
                try {
                    const results = await debouncedUserFetcher(props.site, inputText, abortSignal);
                    return results || [];
                } catch {
                    // Return empty array on error so user can see "No options" instead of crash
                    return [];
                }
            }
            return props.defaultUsers || [];
        },
        [props.site, inputText, props.defaultUsers],
    );

    // Ensure selected users are always included in options to avoid MUI warnings
    const fetchedOptions = fetchUsers.result || [];
    const selectedUsers = props.users || [];

    // Combine fetched options with selected users, removing duplicates
    const allOptions = [...fetchedOptions];
    selectedUsers.forEach((selectedUser) => {
        if (!allOptions.find((option) => option.accountId === selectedUser.accountId)) {
            allOptions.push(selectedUser);
        }
    });

    return (
        <Autocomplete
            multiple
            filterSelectedOptions
            size="small"
            open={open}
            onOpen={() => setOpen(true)}
            onClose={() => setOpen(false)}
            options={allOptions}
            getOptionLabel={(option) => option?.displayName || ''}
            isOptionEqualToValue={(option, value) => option?.accountId === value?.accountId}
            value={props.users}
            onInputChange={handleInputChange}
            onChange={handleChange}
            loading={fetchUsers.loading}
            noOptionsText={
                fetchUsers.loading
                    ? 'Loading...'
                    : !props.site
                      ? 'No site available for search'
                      : inputText.length > 1
                        ? 'No users found in this workspace'
                        : 'Type to search users'
            }
            renderInput={(params) => <TextField {...params} label="Reviewers" />}
            renderOption={(optionProps, option) => (
                <li {...optionProps} key={option?.accountId}>
                    <Grid container spacing={1} direction="row" alignItems="center">
                        <Grid item>
                            <Avatar src={option?.avatarUrl} />
                        </Grid>
                        <Grid item>
                            <Typography>{option?.displayName}</Typography>
                        </Grid>
                    </Grid>
                </li>
            )}
        />
    );
};

export default UserPicker;
