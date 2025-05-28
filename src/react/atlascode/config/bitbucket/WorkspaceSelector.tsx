import { Grid, makeStyles, TextField, Typography } from '@material-ui/core';
import { Autocomplete } from '@material-ui/lab';
import AwesomeDebouncePromise from 'awesome-debounce-promise';
import React, { Fragment, useCallback, useContext, useState } from 'react';
import { useAsyncAbortable } from 'react-async-hook';
import useConstant from 'use-constant';

import { DetailedSiteInfo } from '../../../../atlclients/authInfo';
import { ConfigControllerContext } from '../configController';

const useStyles = makeStyles({
    container: {
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        position: 'relative',
        paddingLeft: 28,
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

type WorkspaceSelectorProps = {
    site: DetailedSiteInfo | undefined;
    workspace: string;
    updateWorkspace: (workspace: string) => void;
};

export const WorkspaceSelectorDropDown: React.FunctionComponent<WorkspaceSelectorProps> = ({
    site,
    workspace,
    updateWorkspace,
}) => {
    const controller = useContext(ConfigControllerContext);
    const [inputText, setInputText] = useState('');
    const classes = useStyles();

    const debouncedWorkspaceFetcher = useConstant(() =>
        AwesomeDebouncePromise(
            async (site: DetailedSiteInfo, query: string, abortSignal?: AbortSignal): Promise<string[]> => {
                return await controller.fetchWorkspaces(site, query, abortSignal);
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

    const fetchWorkspaces = useAsyncAbortable(
        async (abortSignal) => {
            if (inputText.length > 1 && site) {
                return await debouncedWorkspaceFetcher(site, inputText, abortSignal);
            }
            return [];
        },
        [site, inputText],
    );

    const handleWorkspaceSelect = useCallback(
        async (event: React.ChangeEvent, workspace: string | null) => {
            if (workspace) {
                updateWorkspace(workspace);
            }
        },
        [updateWorkspace],
    );

    return (
        <Fragment>
            Workspace:
            <Autocomplete
                value={workspace}
                className={classes.autocompleteRoot}
                size="small"
                options={fetchWorkspaces.result || []}
                getOptionLabel={(option) => option || ''}
                onInputChange={handleInputChange}
                onChange={handleWorkspaceSelect}
                loading={fetchWorkspaces.loading}
                renderInput={(params) => (
                    <TextField
                        {...params}
                        variant="outlined"
                        placeholder="Add workspace"
                        InputProps={{
                            ...params.InputProps,
                            startAdornment: null,
                        }}
                    />
                )}
                renderOption={(option) => (
                    <div className={classes.optionContainer}>
                        <Grid container alignItems="center">
                            <Grid item>
                                <Typography className={classes.optionText}>{option}</Typography>
                            </Grid>
                        </Grid>
                    </div>
                )}
            />
        </Fragment>
    );
};

export const WorkspaceSelector: React.FunctionComponent<WorkspaceSelectorProps> = ({
    site,
    workspace,
    updateWorkspace,
}: WorkspaceSelectorProps) => {
    const classes = useStyles();

    return (
        <div className={classes.container}>
            {site ? (
                <WorkspaceSelectorDropDown site={site} workspace={workspace} updateWorkspace={updateWorkspace} />
            ) : (
                <Typography variant="subtitle2">No Bitbucket cloud site found</Typography>
            )}
        </div>
    );
};
