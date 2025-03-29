import { FieldUI, FieldUIs, FieldValues, IssueLinkTypeSelectOption } from '@atlassianlabs/jira-pi-meta-models';
import React from 'react';
import { AttachmentsModal } from './AttachmentsModal';
import { AttachmentList } from './AttachmentList';
import { DetailedSiteInfo } from 'src/atlclients/authInfo';
import { AddContentDropdown } from './common/AddContentDropDown';
import { ChildIssuesComponent } from './common/ChildIssuesComponent';
import { IssueType, MinimalIssueOrKeyAndSite } from '@atlassianlabs/jira-pi-common-models';
import { LinkedIssuesComponent } from './common/LinkedIssuesComponent';
import InlineDialog from '@atlaskit/inline-dialog';
import WorklogForm from './WorklogForm';
import Worklogs from './Worklogs';
import JiraIssueTextAreaEditor from './common/JiraIssueTextArea';
import { RenderedContent } from '../RenderedContent';
import { Box } from '@material-ui/core';
import AddIcon from '@atlaskit/icon/glyph/add';
import Button from '@atlaskit/button';

type Props = {
    fields: FieldUIs;
    fieldValues: FieldValues;
    handleAddAttachments: (files: File[]) => void;
    siteDetails: DetailedSiteInfo;
    onDeleteAttachment: (attachment: any) => void;
    loadingField?: string;
    isEpic: boolean;
    handleInlineEdit: (field: FieldUI, edit: any) => void;
    subtaskTypes: IssueType[];
    linkTypes: IssueLinkTypeSelectOption[];
    handleOpenIssue: (issueOrKey: MinimalIssueOrKeyAndSite<DetailedSiteInfo>) => void;
    onDelete: (issueLink: any) => void;
    onFetchIssues: (input: string) => Promise<any>;
    fetchUsers: (input: string) => Promise<any[]>;
    fetchImage: (url: string) => Promise<string>;
};

const addContentFieldKeys = ['attachment', 'subtasks', 'issuelinks', 'worklog'];
const IssueMainPanel: React.FC<Props> = ({
    fields,
    fieldValues,
    handleAddAttachments,
    siteDetails,
    onDeleteAttachment,
    loadingField,
    isEpic,
    handleInlineEdit,
    subtaskTypes,
    linkTypes,
    handleOpenIssue,
    onDelete,
    onFetchIssues,
    fetchUsers,
    fetchImage,
}) => {
    //field values
    const attachments = fields['attachment'] && fieldValues['attachment'] ? fieldValues['attachment'] : undefined;
    const subtasks =
        fields['subtasks'] && fieldValues['subtasks'] && !isEpic && !fieldValues['issuetype'].subtask
            ? fieldValues['subtasks']
            : undefined;
    const originalEstimate: string = fieldValues['timetracking'] ? fieldValues['timetracking'].originalEstimate : '';
    const issuelinks = fields['issuelinks'] && fieldValues['issuelinks'] ? fieldValues['issuelinks'] : undefined;
    const defaultDescription = fieldValues['description'] ? fieldValues['description'] : '';
    const renderedDescription = fieldValues['description.rendered'] ? fieldValues['description.rendered'] : undefined;

    //states
    const [enableSubtasks, setEnableSubtasks] = React.useState(false);
    const [enableLinkedIssues, setEnableLinkedIssues] = React.useState(false);
    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const [isInlineDialogOpen, setIsInlineDialogOpen] = React.useState(false);
    const [descriptionText, setDescriptionText] = React.useState(defaultDescription);
    const [isEditingDescription, setIsEditingDescription] = React.useState(false);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: '16px' }}>
            {fields['attachment'] && (
                <AttachmentsModal
                    isOpen={isModalOpen}
                    onSave={(f: File[]) => {
                        handleAddAttachments(f);
                        setIsModalOpen(false);
                    }}
                    onCancel={() => setIsModalOpen(false)}
                />
            )}
            {fields['worklog'] && (
                <div className="ac-inline-dialog">
                    <InlineDialog
                        content={
                            <WorklogForm
                                onSave={(val: any) => handleInlineEdit(fields['worklog'], val)}
                                onCancel={() => setIsInlineDialogOpen(false)}
                                originalEstimate={originalEstimate}
                            />
                        }
                        isOpen={isInlineDialogOpen}
                        onClose={() => setIsInlineDialogOpen(false)}
                        placement="auto"
                    >
                        {true} {/* this needs child component but we do not want to display here*/}
                    </InlineDialog>
                </div>
            )}
            <AddContentDropdown
                handleAttachmentClick={() => setIsModalOpen(true)}
                handleChildIssueClick={() => {
                    setEnableSubtasks(true);
                }}
                handleLinkedIssueClick={() => {
                    setEnableLinkedIssues(true);
                }}
                handleLogWorkClick={() => {
                    setIsInlineDialogOpen(true);
                }}
                loading={addContentFieldKeys.some((key) => fields[key] && loadingField === key)}
            />
            {fields['description'] && (
                <div>
                    <div style={{ display: 'flex', gap: '8px', flexDirection: 'row', alignItems: 'flex-start' }}>
                        <label className="ac-field-label">Description</label>
                        {loadingField === 'description' ? <p>Saving...</p> : null}
                    </div>
                    {isEditingDescription || loadingField === 'description' ? (
                        <JiraIssueTextAreaEditor
                            value={descriptionText}
                            onChange={(e: string) => setDescriptionText(e)}
                            onSave={() => {
                                handleInlineEdit(fields['description'], descriptionText);
                                setIsEditingDescription(false);
                            }}
                            onCancel={() => {
                                setDescriptionText(defaultDescription);
                                setIsEditingDescription(false);
                            }}
                            fetchUsers={fetchUsers}
                            isDescription
                            saving={loadingField === 'description'}
                        />
                    ) : (
                        <Box
                            css={{
                                ':hover': {
                                    backgroundColor: 'var(--vscode-editor-selectionHighlightBackground)!important',
                                    cursor: 'pointer !important',
                                },
                                paddingLeft: 0,
                                paddingBottom: '4px',
                                display: 'flex',
                                alignItems: 'flex-start',
                            }}
                            onClick={() => setIsEditingDescription(true)}
                            className="ac-inline-input-view-p"
                        >
                            {renderedDescription ? (
                                <RenderedContent html={renderedDescription} fetchImage={fetchImage} />
                            ) : (
                                <p style={{ margin: 0 }}>{descriptionText}</p>
                            )}
                        </Box>
                    )}
                </div>
            )}
            {attachments && attachments.length > 0 && (
                <div>
                    <label className="ac-field-label">Attachments</label>
                    <AttachmentList
                        attachments={attachments}
                        baseLinkUrl={siteDetails.baseLinkUrl}
                        onDelete={onDeleteAttachment}
                    />
                </div>
            )}
            {subtasks && (subtasks.length > 0 || enableSubtasks) && (
                <div>
                    <ChildIssuesComponent
                        subtaskTypes={subtaskTypes}
                        label="Child issues"
                        loading={loadingField === 'subtasks'}
                        onSave={(e: any) => handleInlineEdit(fields['subtasks'], e)}
                        enableSubtasks={{ enable: enableSubtasks, setEnableSubtasks }}
                        handleOpenIssue={handleOpenIssue}
                        issues={subtasks}
                    />
                </div>
            )}
            {issuelinks && (issuelinks.length > 0 || enableLinkedIssues) && (
                <div>
                    <LinkedIssuesComponent
                        linkTypes={linkTypes}
                        onIssueClick={handleOpenIssue}
                        onSave={(e: any) => handleInlineEdit(fields['issuelinks'], e)}
                        label="Linked issues"
                        loading={loadingField === 'issuelinks'}
                        issuelinks={issuelinks}
                        onFetchIssues={onFetchIssues}
                        onDelete={onDelete}
                        enableLinkedIssues={{ enable: enableLinkedIssues, setEnableLinkedIssues }}
                    />
                </div>
            )}
            {fields['worklog'] &&
                Array.isArray(fieldValues['worklog']?.worklogs) &&
                fieldValues['worklog'].worklogs.length > 0 && (
                    <div className="ac-vpadding">
                        <Box style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <label className="ac-field-label">Work log</label>
                            <Button
                                appearance="subtle"
                                iconBefore={<AddIcon size="small" label="Add" />}
                                onClick={() => setIsInlineDialogOpen(true)}
                            ></Button>
                        </Box>
                        <Worklogs worklogs={fieldValues['worklog']} />
                    </div>
                )}
        </div>
    );
};

export default IssueMainPanel;
