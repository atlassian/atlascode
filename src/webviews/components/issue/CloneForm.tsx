import { User } from '@atlassianlabs/jira-pi-common-models';
import {
    Box,
    Button as MuiButton,
    Checkbox as MuiCheckbox,
    FormControlLabel,
    Paper,
    TextField as MuiTextField,
    Typography,
} from '@mui/material';
import React from 'react';

import UserPickerField from './UserPickerField';

type Props = {
    onClone: (cloneData: {
        summary: string;
        assignee?: any;
        reporter: any;
        cloneOptions: {
            includeAttachments: boolean;
            includeLinkedIssues: boolean;
            includeChildIssues: boolean;
        };
    }) => void;
    onCancel: () => void;
    currentUser: User;
    originalSummary: string;
    originalAssignee?: any;
    fetchUsers: (input: string) => Promise<User[]>;
    hasAttachments?: boolean;
    hasLinkedIssues?: boolean;
    hasChildIssues?: boolean;
    isLoading?: boolean;
};

export default class CloneForm extends React.Component<Props, any> {
    constructor(props: Props) {
        super(props);
        this.state = {
            summary: `CLONE - ${props.originalSummary}`,
            assignee: props.originalAssignee,
            reporter: props.currentUser,
            cloneOptions: {
                includeAttachments: false,
                includeLinkedIssues: false,
                includeChildIssues: false,
            },
        };
    }

    override render() {
        const { onCancel } = this.props;

        const handleSubmit = (event: React.FormEvent) => {
            event.preventDefault();

            this.props.onClone({
                summary: this.state.summary,
                assignee: this.state.assignee,
                reporter: this.state.reporter,
                cloneOptions: {
                    includeAttachments: this.state.cloneOptions.includeAttachments,
                    includeLinkedIssues: this.state.cloneOptions.includeLinkedIssues,
                    includeChildIssues: this.state.cloneOptions.includeChildIssues,
                },
            });
        };

        return (
            <Paper
                elevation={3}
                sx={{
                    padding: '16px',
                    minWidth: '400px',
                    backgroundColor: 'var(--vscode-editor-background--lighten-05)',
                }}
            >
                <Typography variant="h6" sx={{ marginBottom: '16px', color: 'var(--vscode-foreground)' }}>
                    Clone Issue
                </Typography>
                <Typography variant="body2" sx={{ marginBottom: '16px', color: 'var(--vscode-descriptionForeground)' }}>
                    Required fields are marked with an asterisk *
                </Typography>

                <form onSubmit={handleSubmit}>
                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '16px',
                        }}
                    >
                        <MuiTextField
                            label="Summary"
                            value={this.state.summary}
                            onChange={(e) => this.setState({ summary: e.target.value })}
                            placeholder="Enter summary"
                            required
                            fullWidth
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    color: 'var(--vscode-input-foreground)',
                                    backgroundColor: 'var(--vscode-input-background)',
                                    '& fieldset': {
                                        borderColor: 'var(--vscode-foreground)',
                                    },
                                    '&:hover fieldset': {
                                        borderColor: 'var(--vscode-foreground)',
                                    },
                                    '&.Mui-focused fieldset': {
                                        borderColor: 'var(--vscode-foreground)',
                                    },
                                },
                                '& .MuiInputLabel-root': {
                                    color: 'var(--vscode-descriptionForeground)',
                                },
                            }}
                        />

                        <UserPickerField
                            value={this.state.assignee}
                            onChange={(assignee) => this.setState({ assignee })}
                            fetchUsers={this.props.fetchUsers}
                            placeholder="Type to search"
                            label="Assignee&nbsp;"
                        />

                        <UserPickerField
                            value={this.state.reporter}
                            onChange={(reporter) => this.setState({ reporter })}
                            fetchUsers={this.props.fetchUsers}
                            placeholder="Type to search"
                            label="Reporter"
                            required
                        />

                        {(this.props.hasAttachments || this.props.hasLinkedIssues || this.props.hasChildIssues) && (
                            <Box>
                                <Typography
                                    variant="h6"
                                    sx={{ marginBottom: '12px', color: 'var(--vscode-foreground)' }}
                                >
                                    Include
                                </Typography>

                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {this.props.hasAttachments && (
                                        <FormControlLabel
                                            control={
                                                <MuiCheckbox
                                                    checked={this.state.cloneOptions.includeAttachments}
                                                    onChange={(e) =>
                                                        this.setState({
                                                            cloneOptions: {
                                                                ...this.state.cloneOptions,
                                                                includeAttachments: e.target.checked,
                                                            },
                                                        })
                                                    }
                                                    sx={{
                                                        color: 'var(--vscode-foreground)',
                                                        '&.Mui-checked': {
                                                            color: 'var(--vscode-foreground)',
                                                            fontSize: '14px',
                                                        },
                                                    }}
                                                />
                                            }
                                            label="Attachments"
                                            sx={{ color: 'var(--vscode-foreground)' }}
                                        />
                                    )}
                                    {this.props.hasLinkedIssues && (
                                        <FormControlLabel
                                            control={
                                                <MuiCheckbox
                                                    checked={this.state.cloneOptions.includeLinkedIssues}
                                                    onChange={(e) =>
                                                        this.setState({
                                                            cloneOptions: {
                                                                ...this.state.cloneOptions,
                                                                includeLinkedIssues: e.target.checked,
                                                                fontSize: '14px',
                                                            },
                                                        })
                                                    }
                                                    sx={{
                                                        color: 'var(--vscode-foreground)',
                                                        '&.Mui-checked': {
                                                            color: 'var(--vscode-foreground)',
                                                        },
                                                    }}
                                                />
                                            }
                                            label="Linked issues"
                                            sx={{ color: 'var(--vscode-foreground)' }}
                                        />
                                    )}
                                    {this.props.hasChildIssues && (
                                        <FormControlLabel
                                            control={
                                                <MuiCheckbox
                                                    checked={this.state.cloneOptions.includeChildIssues}
                                                    onChange={(e) =>
                                                        this.setState({
                                                            cloneOptions: {
                                                                ...this.state.cloneOptions,
                                                                includeChildIssues: e.target.checked,
                                                            },
                                                        })
                                                    }
                                                    sx={{
                                                        color: 'var(--vscode-foreground)',
                                                        '&.Mui-checked': {
                                                            color: 'var(--vscode-foreground)',
                                                        },
                                                    }}
                                                />
                                            }
                                            label="Child issues"
                                            sx={{ color: 'var(--vscode-foreground)' }}
                                        />
                                    )}
                                </Box>
                            </Box>
                        )}

                        <Box sx={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                            <MuiButton onClick={onCancel} sx={{ color: 'var(--vscode-foreground)' }}>
                                Cancel
                            </MuiButton>
                            <MuiButton
                                type="submit"
                                variant="contained"
                                sx={{
                                    backgroundColor: 'var(--vscode-button-background)',
                                    color: 'var(--vscode-button-foreground)',
                                }}
                            >
                                Clone
                            </MuiButton>
                        </Box>
                    </Box>
                </form>
            </Paper>
        );
    }
}
