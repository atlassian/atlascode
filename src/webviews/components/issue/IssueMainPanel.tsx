import { FieldUI, FieldUIs, FieldValues } from '@atlassianlabs/jira-pi-meta-models';
import React from 'react';
import { AttachmentsModal } from './AttachmentsModal';
import { AttachmentList } from './AttachmentList';
import { DetailedSiteInfo } from 'src/atlclients/authInfo';
import { AddContentDropdown } from './common/AddContentDropDown';
import { ChildIssuesComponent } from './common/ChildIssuesComponent';
import { IssueType, MinimalIssueOrKeyAndSite } from '@atlassianlabs/jira-pi-common-models';

type Props = {
    fields: FieldUIs;
    fieldValues: FieldValues;
    handleAddAttachments: (files: File[]) => void;
    siteDetails: DetailedSiteInfo;
    onDeleteAttachment: (attachment: any) => void;
    loadingField?: string;
    isEpic: boolean;
    handleInlineEdit: (field: FieldUI, subtask: any) => void;
    subtaskTypes: IssueType[];
    handleOpenIssue: (issueOrKey: MinimalIssueOrKeyAndSite<DetailedSiteInfo>) => void;
};

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
    handleOpenIssue,
}) => {
    const attachments = fields['attachment'] && fieldValues['attachment'] ? fieldValues['attachment'] : undefined;
    const subtasks =
        fields['subtasks'] && fieldValues['subtasks'] && !isEpic && !fieldValues['issuetype'].subtask
            ? fieldValues['subtasks']
            : undefined;

    const [enableSubtasks, setEnableSubtasks] = React.useState(false);
    const [isModalOpen, setIsModalOpen] = React.useState(false);
    return (
        <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: '8px' }}>
            <AttachmentsModal
                isOpen={isModalOpen}
                onSave={(f: File[]) => {
                    handleAddAttachments(f);
                    setIsModalOpen(false);
                }}
                onCancel={() => setIsModalOpen(false)}
            />
            <AddContentDropdown
                handleAttachmentClick={() => setIsModalOpen(true)}
                handleChildIssueClick={() => {
                    setEnableSubtasks(true);
                }}
                handleLinkedIssueClick={() => {}}
                loading={loadingField === 'attachment'}
            />
            {attachments && attachments.length > 0 && (
                <>
                    <label className="ac-field-label">Attachments</label>
                    <AttachmentList
                        attachments={attachments}
                        baseLinkUrl={siteDetails.baseLinkUrl}
                        onDelete={onDeleteAttachment}
                    />
                </>
            )}
            {subtasks && (subtasks.length > 0 || enableSubtasks) && (
                <ChildIssuesComponent
                    subtaskTypes={subtaskTypes}
                    label="Child issues"
                    loading={loadingField === 'subtasks'}
                    onSave={(e: any) => handleInlineEdit(fields['subtasks'], e)}
                    enableSubtasks={{ enable: enableSubtasks, setEnableSubtasks }}
                    handleOpenIssue={handleOpenIssue}
                    issues={subtasks}
                />
            )}
        </div>
    );
};

export default IssueMainPanel;
