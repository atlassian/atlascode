import { User } from '@atlassianlabs/jira-pi-common-models';
import CloseIcon from '@mui/icons-material/Close';
import LinkIcon from '@mui/icons-material/Link';
import {
    Avatar,
    Box,
    Button as MuiButton,
    Chip,
    Grid,
    Paper,
    TextField as MuiTextField,
    Typography,
} from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import AwesomeDebouncePromise from 'awesome-debounce-promise';
import React, { useCallback, useMemo, useState } from 'react';
import { useAsyncAbortable } from 'react-async-hook';
import useConstant from 'use-constant';

type Props = {
    onShare: (shareData: { recipients: User[]; message: string }) => void;
    onCancel: () => void;
    fetchUsers: (input: string) => Promise<User[]>;
    isLoading?: boolean;
    issueUrl: string;
};

const ShareForm: React.FC<Props> = ({ onShare, onCancel, fetchUsers, isLoading = false, issueUrl }) => {
    const [recipients, setRecipients] = useState<User[]>([]);
    const [message, setMessage] = useState('');
    const [inputText, setInputText] = useState('');
    const [open, setOpen] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);

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

    const fetchUsersResult = useAsyncAbortable(
        async (abortSignal) => {
            if (inputText.length > 1) {
                try {
                    const results = await debouncedUserFetcher(inputText, abortSignal);
                    return results || [];
                } catch (error) {
                    console.error('Error fetching users:', error);
                    return [];
                }
            }
            return [];
        },
        [inputText],
    );

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        if (recipients.length > 0) {
            onShare({
                recipients,
                message,
            });
        }
    };

    const handleCopyLink = useCallback(() => {
        navigator.clipboard
            .writeText(issueUrl)
            .then(() => {
                setCopySuccess(true);
                setTimeout(() => setCopySuccess(false), 2000);
            })
            .catch((error) => {
                console.error('Failed to copy link to clipboard:', error);
            });
    }, [issueUrl]);

    const handleInputChange = useCallback((_event: React.SyntheticEvent, newInputValue: string, reason: string) => {
        if (reason === 'input') {
            setInputText(newInputValue);
        }
    }, []);

    const handleChange = useCallback((_event: React.SyntheticEvent, newValue: User[]) => {
        setRecipients(newValue);
        setInputText('');
    }, []);

    const handleOpen = useCallback(() => {
        setOpen(true);
    }, []);

    const handleClose = useCallback(() => {
        setOpen(false);
    }, []);

    const filteredOptions = useMemo(
        () =>
            (fetchUsersResult.result || []).filter(
                (option) => !recipients.some((r) => r.accountId === option.accountId),
            ),
        [fetchUsersResult.result, recipients],
    );

    return (
        <Paper
            elevation={3}
            sx={{
                padding: '16px',
                minWidth: '400px',
                maxWidth: '500px',
                backgroundColor: 'var(--vscode-editor-background--lighten-05)',
            }}
        >
            <Typography variant="h6" sx={{ marginBottom: '16px', color: 'var(--vscode-foreground)' }}>
                Share issue
            </Typography>

            <form onSubmit={handleSubmit}>
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px',
                    }}
                >
                    <Box>
                        <Typography
                            variant="body2"
                            sx={{ marginBottom: '8px', color: 'var(--vscode-descriptionForeground)' }}
                        >
                            Names
                        </Typography>
                        <Autocomplete
                            multiple
                            open={open}
                            onOpen={handleOpen}
                            onClose={handleClose}
                            options={filteredOptions}
                            getOptionLabel={(option) => option?.displayName || ''}
                            isOptionEqualToValue={(option, value) => option?.accountId === value?.accountId}
                            value={recipients}
                            onInputChange={handleInputChange}
                            onChange={handleChange}
                            loading={fetchUsersResult.loading}
                            inputValue={inputText}
                            noOptionsText={
                                fetchUsersResult.loading
                                    ? 'Loading...'
                                    : inputText.length > 1
                                      ? 'No users found'
                                      : 'Type to search'
                            }
                            sx={{
                                '& .MuiAutocomplete-popupIndicator': {
                                    color: 'var(--vscode-foreground)',
                                },
                                '& .MuiAutocomplete-clearIndicator': {
                                    color: 'var(--vscode-foreground)',
                                },
                                '& .MuiOutlinedInput-root': {
                                    padding: '4px',
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
                            }}
                            renderInput={(params) => <MuiTextField {...params} placeholder="Enter more" size="small" />}
                            renderTags={(value, getTagProps) =>
                                value.map((option, index) => {
                                    const { key, ...tagProps } = getTagProps({ index });
                                    return (
                                        <Chip
                                            key={key}
                                            avatar={
                                                <Avatar
                                                    src={
                                                        option?.avatarUrls?.['24x24'] ||
                                                        option?.avatarUrls?.['32x32'] ||
                                                        option?.avatarUrls?.['48x48']
                                                    }
                                                    sx={{ width: 20, height: 20 }}
                                                />
                                            }
                                            label={option?.displayName}
                                            {...tagProps}
                                            size="small"
                                            deleteIcon={<CloseIcon sx={{ fontSize: 14 }} />}
                                            sx={{
                                                backgroundColor: 'var(--vscode-badge-background)',
                                                color: 'var(--vscode-badge-foreground)',
                                                '& .MuiChip-deleteIcon': {
                                                    color: 'var(--vscode-badge-foreground)',
                                                    '&:hover': {
                                                        color: 'var(--vscode-foreground)',
                                                    },
                                                },
                                            }}
                                        />
                                    );
                                })
                            }
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
                    </Box>

                    <Box>
                        <Typography
                            variant="body2"
                            sx={{ marginBottom: '8px', color: 'var(--vscode-descriptionForeground)' }}
                        >
                            Message
                        </Typography>
                        <MuiTextField
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Anything they should know?"
                            multiline
                            rows={3}
                            fullWidth
                            sx={{
                                '& .MuiOutlinedInput-root': {
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
                            }}
                        />
                    </Box>

                    <Box
                        sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginTop: '8px',
                        }}
                    >
                        <MuiButton
                            onClick={handleCopyLink}
                            startIcon={<LinkIcon />}
                            sx={{
                                color: 'var(--vscode-foreground)',
                                textTransform: 'none',
                            }}
                        >
                            {copySuccess ? 'Link copied!' : 'Copy link'}
                        </MuiButton>
                        <Box sx={{ display: 'flex', gap: '8px' }}>
                            <MuiButton onClick={onCancel} sx={{ color: 'var(--vscode-foreground)' }}>
                                Cancel
                            </MuiButton>
                            <MuiButton
                                type="submit"
                                variant="contained"
                                disabled={recipients.length === 0 || isLoading}
                                sx={{
                                    backgroundColor: 'var(--vscode-button-background)',
                                    color: 'var(--vscode-button-foreground)',
                                    '&:disabled': {
                                        backgroundColor: 'var(--vscode-button-secondaryBackground)',
                                        color: 'var(--vscode-button-secondaryForeground)',
                                    },
                                }}
                            >
                                {isLoading ? 'Sharing...' : 'Share'}
                            </MuiButton>
                        </Box>
                    </Box>
                </Box>
            </form>
        </Paper>
    );
};

export default ShareForm;
