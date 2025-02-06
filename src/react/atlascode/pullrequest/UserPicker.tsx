import { Avatar, Grid, TextField, Typography } from '@material-ui/core';
import { Autocomplete } from '@material-ui/lab';
import AwesomeDebouncePromise from 'awesome-debounce-promise';
import React, { useCallback, useContext, useState } from 'react';
import { useAsyncAbortable } from 'react-async-hook';
import useConstant from 'use-constant';
import { User, BitbucketSite } from '../../../bitbucket/model';
import { CreatePullRequestControllerContext } from './createPullRequestController';
import * as l10n from '@vscode/l10n';

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

    const handleChange = async (event: React.ChangeEvent, value: User[]) => props.onChange(value);

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
            if (inputText.length > 1 && props.site) {
                const results = await debouncedUserFetcher(props.site, inputText, abortSignal);
                return results;
            }
            return props.defaultUsers;
        },
        [props.site, inputText],
    );

    return (
        <Autocomplete
            multiple
            filterSelectedOptions
            size="small"
            disableClearable
            open={open}
            onOpen={() => setOpen(true)}
            onClose={() => setOpen(false)}
            options={fetchUsers.result || props.defaultUsers}
            getOptionLabel={(option) => option?.displayName || ''}
            getOptionSelected={(option, value) => option.accountId === value.accountId}
            value={props.users}
            onInputChange={handleInputChange}
            onChange={handleChange}
            loading={fetchUsers.loading}
            renderInput={(params) => <TextField {...params} label={l10n.t('Reviewers')} />}
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
