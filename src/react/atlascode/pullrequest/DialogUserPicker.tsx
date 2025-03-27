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
import React, { useCallback, useContext, useState } from 'react';
import { useAsyncAbortable } from 'react-async-hook';
import useConstant from 'use-constant';
import { BitbucketSite, User } from '../../../bitbucket/model';
import { PullRequestDetailsControllerContext } from './pullRequestDetailsController';

type DialogUserPickerProps = {
    site: BitbucketSite;
    users: User[];
    onChange: (newUser: User) => Promise<void>;
    hidden: boolean;
    onClose: () => void;
};

const DialogUserPicker: React.FC<DialogUserPickerProps> = (props: DialogUserPickerProps) => {
    const controller = useContext(PullRequestDetailsControllerContext);
    const [selectOpen, setSelectOpen] = useState(false);
    const [inputText, setInputText] = useState('');
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    const debouncedUserFetcher = useConstant(() =>
        AwesomeDebouncePromise(
            async (site: BitbucketSite, query: string, abortSignal?: AbortSignal): Promise<User[]> => {
                return await controller.fetchUsers(site, query, abortSignal);
            },
            300,
            { leading: false },
        ),
    );

    const handleSubmitReviewer = useCallback(async () => {
        if (selectedUser) {
            await props.onChange(selectedUser);
            props.onClose();
        }
    }, [selectedUser, props]);

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
                // Filter out users that are already in the list
                return results.filter((user) => !props.users.some((existing) => existing.accountId === user.accountId));
            }
            return [];
        },
        [props.site, inputText, props.users],
    );

    const handleUserSelect = useCallback((event: React.ChangeEvent, user: User | null) => {
        setSelectedUser(user);
    }, []);

    return (
        <Dialog
            fullWidth
            maxWidth={'sm'}
            open={props.hidden}
            onClose={props.onClose}
            aria-labelledby="reviewers-dialog-title"
        >
            <DialogTitle>
                <Typography variant="h4">Add Reviewer</Typography>
            </DialogTitle>
            <DialogContent>
                <Autocomplete
                    filterSelectedOptions
                    size="medium"
                    open={selectOpen}
                    onOpen={() => setSelectOpen(true)}
                    onClose={() => setSelectOpen(false)}
                    options={fetchUsers.result || []}
                    getOptionLabel={(option) => option?.displayName || ''}
                    value={selectedUser}
                    onInputChange={handleInputChange}
                    onChange={handleUserSelect}
                    loading={fetchUsers.loading}
                    renderInput={(params) => <TextField {...params} label="Search users" />}
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
                <Button onClick={props.onClose} color="default" variant={'contained'}>
                    Cancel
                </Button>
                <Button onClick={handleSubmitReviewer} color="primary" variant={'contained'} disabled={!selectedUser}>
                    Add
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default DialogUserPicker;
