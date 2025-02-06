import {
    Avatar,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Grid,
    TextField,
    Typography,
} from '@material-ui/core';
import { Autocomplete } from '@material-ui/lab';
import AwesomeDebouncePromise from 'awesome-debounce-promise';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { useAsyncAbortable } from 'react-async-hook';
import useConstant from 'use-constant';
import { BitbucketSite, User } from '../../../bitbucket/model';
import { PullRequestDetailsControllerContext } from './pullRequestDetailsController';
import * as l10n from '@vscode/l10n';

type DialogUserPickerProps = {
    site: BitbucketSite;
    users: User[];
    defaultUsers: User[];
    onChange: (users: User[]) => Promise<void>;
    hidden: boolean;
    onClose: () => void;
};

const DialogUserPicker: React.FC<DialogUserPickerProps> = (props: DialogUserPickerProps) => {
    const controller = useContext(PullRequestDetailsControllerContext);

    const [selectOpen, setSelectOpen] = useState(false);
    const [inputText, setInputText] = useState('');
    const [localUsers, setLocalUsers] = useState<User[]>([]);

    const debouncedUserFetcher = useConstant(() =>
        AwesomeDebouncePromise(
            async (site: BitbucketSite, query: string, abortSignal?: AbortSignal): Promise<User[]> => {
                return await controller.fetchUsers(site, query, abortSignal);
            },
            300,
            { leading: false },
        ),
    );

    const handleSubmitReviewers = useCallback(async () => props.onChange(localUsers), [localUsers, props]);

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
                const results = await debouncedUserFetcher(props.site, inputText, abortSignal);
                return results;
            }
            return props.defaultUsers;
        },
        [props.site, inputText],
    );

    const handleLocalChange = useCallback((event: React.ChangeEvent, newReviewers: User[]) => {
        setLocalUsers(newReviewers);
    }, []);

    const handleClose = useCallback(() => {
        props.onClose();
    }, [props]);

    useEffect(() => {
        setLocalUsers(props.users);
    }, [props.users]);

    return (
        <Dialog
            fullWidth
            maxWidth={'sm'}
            open={props.hidden}
            onClose={handleClose}
            aria-labelledby="reviewers-dialog-title"
        >
            <DialogTitle>
                <Typography variant="h4">{l10n.t('Select Reviewers')}</Typography>
            </DialogTitle>
            <DialogContent>
                <Autocomplete
                    multiple
                    filterSelectedOptions
                    size="medium"
                    disableClearable
                    open={selectOpen}
                    onOpen={() => setSelectOpen(true)}
                    onClose={() => setSelectOpen(false)}
                    options={fetchUsers.result || props.defaultUsers}
                    getOptionLabel={(option) => option?.displayName || ''}
                    getOptionSelected={(option, value) => option.accountId === value.accountId}
                    value={localUsers}
                    onInputChange={handleInputChange}
                    onChange={handleLocalChange}
                    loading={fetchUsers.loading}
                    renderInput={(params) => <TextField {...params} label="Reviewers" />}
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
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose} color="default" variant={'contained'}>
                    {l10n.t('Cancel')}
                </Button>
                <Button onClick={handleSubmitReviewers} color="primary" variant={'contained'}>
                    {l10n.t('Ok')}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default DialogUserPicker;
