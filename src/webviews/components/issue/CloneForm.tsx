import Button from '@atlaskit/button';
import ButtonGroup from '@atlaskit/button/button-group';
import Checkbox from '@atlaskit/checkbox';
import Form, { Field, FormSection } from '@atlaskit/form';
import TextField from '@atlaskit/textfield';
import { User } from '@atlassianlabs/jira-pi-common-models';
import { Box, Typography } from '@mui/material';
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

        return (
            <Box style={{ padding: '16px', minWidth: '400px' }}>
                <Typography variant="h6" style={{ marginBottom: '16px' }}>
                    Clone Issue
                </Typography>
                <Typography variant="body2" style={{ marginBottom: '16px', color: '#666' }}>
                    Required fields are marked with an asterisk *
                </Typography>

                <Form
                    onSubmit={(data: any) => {
                        this.props.onClone({
                            summary: data.summary,
                            assignee: data.assignee,
                            reporter: data.reporter || this.props.currentUser,
                            cloneOptions: {
                                includeAttachments: data.includeAttachments || false,
                                includeLinkedIssues: data.includeLinkedIssues || false,
                                includeChildIssues: data.includeChildIssues || false,
                            },
                        });
                        return Promise.resolve();
                    }}
                >
                    {({ formProps, submitting }: any) => (
                        <form {...formProps}>
                            <FormSection>
                                <Field name="summary" label="Summary" isRequired defaultValue={this.state.summary}>
                                    {({ fieldProps }: any) => (
                                        <TextField
                                            {...fieldProps}
                                            placeholder="Enter summary"
                                            style={{
                                                color: 'var(--vscode-input-foreground)',
                                                backgroundColor: 'var(--vscode-input-background)',
                                            }}
                                        />
                                    )}
                                </Field>

                                <Field
                                    name="assignee"
                                    label="Assignee"
                                    defaultValue={this.props.originalAssignee || null}
                                >
                                    {({ fieldProps }: any) => (
                                        <UserPickerField
                                            value={fieldProps.value}
                                            onChange={fieldProps.onChange}
                                            fetchUsers={this.props.fetchUsers}
                                            placeholder="Type to search"
                                        />
                                    )}
                                </Field>

                                <Field
                                    name="reporter"
                                    label="Reporter"
                                    isRequired
                                    defaultValue={this.props.currentUser}
                                >
                                    {({ fieldProps }: any) => (
                                        <UserPickerField
                                            value={fieldProps.value}
                                            onChange={fieldProps.onChange}
                                            fetchUsers={this.props.fetchUsers}
                                            placeholder="Type to search"
                                            required
                                        />
                                    )}
                                </Field>
                            </FormSection>

                            {(this.props.hasAttachments || this.props.hasLinkedIssues || this.props.hasChildIssues) && (
                                <FormSection>
                                    <Typography variant="h6" style={{ marginBottom: '12px' }}>
                                        Include
                                    </Typography>

                                    <Box style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {this.props.hasAttachments && (
                                            <Field
                                                name="includeAttachments"
                                                defaultValue={this.state.cloneOptions.includeAttachments}
                                            >
                                                {({ fieldProps }: any) => (
                                                    <Checkbox {...fieldProps} label="Attachments" />
                                                )}
                                            </Field>
                                        )}
                                        {this.props.hasLinkedIssues && (
                                            <Field
                                                name="includeLinkedIssues"
                                                defaultValue={this.state.cloneOptions.includeLinkedIssues}
                                            >
                                                {({ fieldProps }: any) => (
                                                    <Checkbox {...fieldProps} label="Linked issues" />
                                                )}
                                            </Field>
                                        )}
                                        {this.props.hasChildIssues && (
                                            <Field
                                                name="includeChildIssues"
                                                defaultValue={this.state.cloneOptions.includeChildIssues}
                                            >
                                                {({ fieldProps }: any) => (
                                                    <Checkbox {...fieldProps} label="Child issues" />
                                                )}
                                            </Field>
                                        )}
                                    </Box>
                                </FormSection>
                            )}

                            <Box style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                                <ButtonGroup>
                                    <Button onClick={onCancel}>Cancel</Button>
                                    <Button type="submit" appearance="primary">
                                        Clone
                                    </Button>
                                </ButtonGroup>
                            </Box>
                        </form>
                    )}
                </Form>
            </Box>
        );
    }
}
