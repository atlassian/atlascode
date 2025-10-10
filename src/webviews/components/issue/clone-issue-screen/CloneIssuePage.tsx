import Button, { ButtonGroup } from '@atlaskit/button';
import Checkbox from '@atlaskit/checkbox';
import { Form, FormField, FormSection } from '@atlaskit/form';
import Modal, { ModalBody, ModalFooter, ModalHeader, ModalTitle } from '@atlaskit/modal-dialog';
import TextField from '@atlaskit/textfield';
import { User } from '@atlassianlabs/jira-pi-common-models';
import { FieldUI, FieldUIs } from '@atlassianlabs/jira-pi-meta-models';
import { Box, Typography } from '@mui/material';
import React from 'react';

import { DetailedSiteInfo } from '../../../../atlclients/authInfo';
import { AbstractIssueEditorPage, CommonEditorViewState } from '../AbstractIssueEditorPage';

type Emit = {
    action: 'cloneIssue';
    site: DetailedSiteInfo;
    issueData: any;
    cloneOptions: {
        includeAttachments: boolean;
        includeLinkedIssues: boolean;
        includeChildIssues: boolean;
    };
};

type Accept = {
    type: 'issueCloned';
    issueData: any;
};

type ViewState = CommonEditorViewState & {
    key: string;
    summary: string;
    fields: FieldUIs;
    currentUser: User;
    cloneOptions: {
        includeAttachments: boolean;
        includeLinkedIssues: boolean;
        includeChildIssues: boolean;
    };
    clonedIssue: any;
};

const emptyState: ViewState = {
    type: '',
    siteDetails: {} as DetailedSiteInfo,
    fieldValues: {},
    selectFieldOptions: {},
    isSomethingLoading: false,
    loadingField: '',
    editingField: '',
    isOnline: true,
    showPMF: false,
    isErrorBannerOpen: false,
    errorDetails: undefined,
    currentUser: {} as User,
    isGeneratingSuggestions: false,
    summaryKey: 'summary',
    isAtlaskitEditorEnabled: false,
    commentInputValue: '',
    isRovoDevEnabled: false,
    key: '',
    summary: '',
    fields: {},
    cloneOptions: {
        includeAttachments: false,
        includeLinkedIssues: false,
        includeChildIssues: false,
    },
    clonedIssue: null,
};

export default class CloneIssuePage extends AbstractIssueEditorPage<Emit, Accept, {}, ViewState> {
    constructor(props: any) {
        super(props);
        this.state = { ...emptyState };
    }

    override onMessageReceived(e: any): boolean {
        let handled = super.onMessageReceived(e);
        if (!handled) {
            switch (e.type) {
                case 'cloneIssueData': {
                    handled = true;
                    this.setState({
                        siteDetails: e.siteDetails,
                        key: e.key,
                        summary: e.summary,
                        fields: e.fields,
                        fieldValues: e.fieldValues,
                        currentUser: e.currentUser,
                    });
                    break;
                }
                case 'currentUserUpdate': {
                    handled = true;
                    this.setState({ currentUser: e.currentUser });
                    break;
                }
                case 'issueCloned': {
                    handled = true;
                    if (e.issueData) {
                        this.setState({
                            isErrorBannerOpen: false,
                            errorDetails: undefined,
                            isSomethingLoading: false,
                            loadingField: '',
                            clonedIssue: e.issueData,
                        });
                        // Refresh sidebar tree views after successful issue cloning
                        this.postMessage({
                            action: 'refreshTreeViews',
                        });
                    }
                    break;
                }
            }
        }
        return handled;
    }

    handleSubmit = async (e: any) => {
        const requiredFields = Object.values(this.state.fields).filter((field) => field.required);

        const errs: Record<string, string> = {};
        requiredFields.forEach((field: FieldUI) => {
            const val = this.state.fieldValues[field.key];
            if (val === undefined || val.length < 1) {
                errs[field.key] = 'EMPTY';
            }
        });

        if (Object.keys(errs).length > 0) {
            return errs;
        }

        this.setState({
            isSomethingLoading: true,
            loadingField: 'submitButton',
        });

        this.postMessage({
            action: 'cloneIssue',
            site: this.state.siteDetails,
            issueData: this.state.fieldValues,
            cloneOptions: this.state.cloneOptions,
        });

        return undefined;
    };

    handleCancel = () => {
        this.postMessage({
            action: 'closeCloneIssuePage',
        });
    };

    handleCloneOptionChange = (option: keyof ViewState['cloneOptions'], value: boolean) => {
        this.setState({
            cloneOptions: {
                ...this.state.cloneOptions,
                [option]: value,
            },
        });
    };

    getProjectKey(): string {
        return this.state.key.split('-')[0] || '';
    }

    protected fetchAndTransformUsers = async (input: string, accountId?: string): Promise<any[]> => {
        // For clone page, we don't need user fetching functionality
        return [];
    };

    protected getApiVersion(): string {
        return '2';
    }

    override render() {
        const { clonedIssue } = this.state;

        if (clonedIssue) {
            return (
                <Box style={{ padding: '20px', textAlign: 'center' }}>
                    <Typography variant="h6" style={{ color: 'green', marginBottom: '16px' }}>
                        Cloning complete
                    </Typography>
                    <Typography variant="body1" style={{ marginBottom: '16px' }}>
                        You can find the cloned work item {clonedIssue.key} linked to {this.state.key} or by clicking
                        the link below.
                    </Typography>
                    <Button
                        appearance="primary"
                        onClick={() => {
                            this.postMessage({
                                action: 'openClonedIssue',
                                issueKey: clonedIssue.key,
                                site: this.state.siteDetails,
                            });
                        }}
                    >
                        Open cloned work item
                    </Button>
                </Box>
            );
        }

        return (
            <Modal isOpen={true} onClose={this.handleCancel} width="medium">
                <ModalHeader>
                    <ModalTitle>Clone {this.state.key}</ModalTitle>
                </ModalHeader>
                <ModalBody>
                    <Typography variant="body2" style={{ marginBottom: '16px', color: '#666' }}>
                        Required fields are marked with an asterisk *
                    </Typography>

                    <Form>
                        <FormSection>
                            <FormField label="Summary *" isRequired isInvalid={false}>
                                <TextField
                                    value={this.state.fieldValues['summary'] || `CLONE - ${this.state.summary}`}
                                    onChange={(e: any) => {
                                        this.setState({
                                            fieldValues: {
                                                ...this.state.fieldValues,
                                                summary: e.target.value,
                                            },
                                        });
                                    }}
                                    placeholder="Enter summary"
                                />
                            </FormField>

                            <FormField label="Assignee">
                                <TextField
                                    value={this.state.fieldValues['assignee']?.displayName || ''}
                                    onChange={(e: any) => {
                                        this.setState({
                                            fieldValues: {
                                                ...this.state.fieldValues,
                                                assignee: { displayName: e.target.value },
                                            },
                                        });
                                    }}
                                    placeholder="Enter assignee"
                                />
                            </FormField>

                            <FormField label="Reporter *" isRequired>
                                <TextField
                                    value={
                                        this.state.fieldValues['reporter']?.displayName ||
                                        this.state.currentUser?.displayName ||
                                        ''
                                    }
                                    onChange={(e: any) => {
                                        this.setState({
                                            fieldValues: {
                                                ...this.state.fieldValues,
                                                reporter: { displayName: e.target.value },
                                            },
                                        });
                                    }}
                                    placeholder="Enter reporter"
                                />
                            </FormField>
                        </FormSection>

                        <FormSection>
                            <Typography variant="h6" style={{ marginBottom: '12px' }}>
                                Include
                            </Typography>

                            <Box style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <Checkbox
                                    isChecked={this.state.cloneOptions.includeAttachments}
                                    onChange={(e: any) =>
                                        this.handleCloneOptionChange('includeAttachments', e.target.checked)
                                    }
                                    label="Attachments"
                                />
                                <Checkbox
                                    isChecked={this.state.cloneOptions.includeLinkedIssues}
                                    onChange={(e: any) =>
                                        this.handleCloneOptionChange('includeLinkedIssues', e.target.checked)
                                    }
                                    label="Linked issues"
                                />
                                <Checkbox
                                    isChecked={this.state.cloneOptions.includeChildIssues}
                                    onChange={(e: any) =>
                                        this.handleCloneOptionChange('includeChildIssues', e.target.checked)
                                    }
                                    label="Child issues"
                                />
                            </Box>
                        </FormSection>
                    </Form>
                </ModalBody>
                <ModalFooter>
                    <ButtonGroup>
                        <Button onClick={this.handleCancel}>Cancel</Button>
                        <Button appearance="primary" onClick={this.handleSubmit}>
                            Clone
                        </Button>
                    </ButtonGroup>
                </ModalFooter>
            </Modal>
        );
    }
}
