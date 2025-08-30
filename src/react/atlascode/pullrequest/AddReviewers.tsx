import AddIcon from '@mui/icons-material/Add';
import { Avatar, Grid, TextField, Typography } from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import { makeStyles } from '@mui/styles';
import AwesomeDebouncePromise from 'awesome-debounce-promise';
import React, { useCallback, useContext, useState } from 'react';
import { useAsyncAbortable } from 'react-async-hook';
import useConstant from 'use-constant';

import { BitbucketSite, User } from '../../../bitbucket/model';
import { PullRequestDetailsControllerContext } from './pullRequestDetailsController';

const useStyles = makeStyles({
    container: {
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        position: 'relative',
        paddingLeft: 28,
    },
    addIcon: {
        padding: 0,
        fontSize: 20,
        color: 'var(--vscode-editor-foreground)',
        opacity: 0.8,
        position: 'absolute',
        left: 4,
        top: '50%',
        transform: 'translateY(-50%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '20px',
        width: '20px',
        lineHeight: 0,
    },
    autocompleteRoot: {
        flex: 1,
        '& .MuiInputBase-root': {
            backgroundColor: 'transparent',
            color: 'var(--vscode-editor-foreground)',
            padding: '0 !important',
            minHeight: '24px',
            display: 'flex',
            alignItems: 'center',
            border: '1px solid transparent',
            borderRadius: '2px',
            '&.Mui-focused': {
                border: '1px solid var(--vscode-editor-foreground)',
            },
            '&:hover': {
                border: '1px solid var(--vscode-editor-foreground)',
            },
        },
        '& .MuiOutlinedInput-notchedOutline': {
            border: 'none',
        },
        '& .MuiInputBase-input': {
            color: 'var(--vscode-editor-foreground)',
            height: '24px',
            lineHeight: '24px',
            padding: '0 7px !important',
            '&::placeholder': {
                color: 'var(--vscode-input-placeholderForeground)',
                opacity: 0.8,
                fontStyle: 'italic',
            },
        },
        '& .MuiAutocomplete-endAdornment': {
            display: 'none',
        },
        '& .MuiFormControl-marginDense': {
            margin: '0',
        },
    },
    optionContainer: {
        padding: '8px',
    },
    avatarContainer: {
        marginRight: '8px',
    },
    optionText: {
        color: 'var(--vscode-editor-foreground)',
    },
});

type AddReviewersProps = {
    site: BitbucketSite;
    reviewers: User[];
    updateReviewers: (user: User[]) => Promise<void>;
};

export const AddReviewers: React.FunctionComponent<AddReviewersProps> = ({ site, reviewers, updateReviewers }) => {
    const controller = useContext(PullRequestDetailsControllerContext);
    const [inputText, setInputText] = useState('');
    const classes = useStyles();

    const debouncedUserFetcher = useConstant(() =>
        AwesomeDebouncePromise(
            async (site: BitbucketSite, query: string, abortSignal?: AbortSignal): Promise<User[]> => {
                return await controller.fetchUsers(site, query, abortSignal);
            },
            300,
            { leading: false },
        ),
    );

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
            if (inputText.length > 1 && site) {
                try {
                    const results = await debouncedUserFetcher(site, inputText, abortSignal);
                    return (results || []).filter(
                        (user) => !reviewers.some((existing) => existing.accountId === user.accountId),
                    );
                } catch {
                    // Return empty array on error so user can see "No options" instead of crash
                    return [];
                }
            }
            return [];
        },
        [site, inputText, reviewers],
    );

    const handleUserSelect = useCallback(
        async (event: React.ChangeEvent, user: User | null) => {
            if (user) {
                const updatedReviewers = [...reviewers, user];
                await updateReviewers(updatedReviewers);
                setInputText(''); // Clear input after selection
            }
        },
        [reviewers, updateReviewers],
    );

    return (
        <div className={classes.container}>
            <AddIcon className={classes.addIcon} />
            <Autocomplete
                className={classes.autocompleteRoot}
                size="small"
                options={fetchUsers.result || []}
                getOptionLabel={(option) => option?.displayName || ''}
                isOptionEqualToValue={(option, value) => option?.accountId === value?.accountId}
                value={null} // No selected value since we clear after selection
                inputValue={inputText}
                onInputChange={handleInputChange}
                onChange={handleUserSelect}
                loading={fetchUsers.loading}
                noOptionsText={
                    fetchUsers.loading
                        ? 'Loading...'
                        : !site
                          ? 'No site available for search'
                          : inputText.length > 1
                            ? 'No users found in this workspace'
                            : 'Type to search users'
                }
                renderInput={(params) => (
                    <TextField
                        {...params}
                        variant="outlined"
                        placeholder="Add reviewer"
                        InputProps={{
                            ...params.InputProps,
                            startAdornment: null,
                        }}
                    />
                )}
                renderOption={(optionProps, option) => (
                    <li {...optionProps} key={option?.accountId} className={classes.optionContainer}>
                        <Grid container alignItems="center">
                            <Grid item className={classes.avatarContainer}>
                                <Avatar src={option?.avatarUrl} />
                            </Grid>
                            <Grid item>
                                <Typography className={classes.optionText}>{option?.displayName}</Typography>
                            </Grid>
                        </Grid>
                    </li>
                )}
            />
        </div>
    );
};
