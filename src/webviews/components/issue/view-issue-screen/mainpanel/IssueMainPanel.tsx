import Button from '@atlaskit/button';
import AddIcon from '@atlaskit/icon/core/add';
import Tooltip from '@atlaskit/tooltip';
import { IssueType, MinimalIssueOrKeyAndSite, User } from '@atlassianlabs/jira-pi-common-models';
import { FieldUI, FieldUIs, FieldValues, IssueLinkTypeSelectOption } from '@atlassianlabs/jira-pi-meta-models';
import React from 'react';
import { DetailedSiteInfo } from 'src/atlclients/authInfo';

import { AdfAwareContent } from '../../../AdfAwareContent';
import { RenderedContent } from '../../../RenderedContent';
import { AttachmentList } from '../../AttachmentList';
import { AttachmentsModal } from '../../AttachmentsModal';
import { convertAdfToWikimarkup, convertWikimarkupToAdf } from '../../common/adfToWikimarkup';
import { AtlascodeMentionProvider } from '../../common/AtlaskitEditor/AtlascodeMentionsProvider';
import AtlaskitEditor from '../../common/AtlaskitEditor/AtlaskitEditor';
import JiraIssueTextAreaEditor from '../../common/JiraIssueTextArea';
import { WorklogFormDialog } from '../../WorklogFormDialog';
import Worklogs from '../../Worklogs';
import { useEditorState } from '../EditorStateContext';
import { useEditorForceClose } from '../hooks/useEditorForceClose';
import { AddContentDropdown } from './AddContentDropDown';
import { ChildIssuesComponent } from './ChildIssuesComponent';
import { LinkedIssuesComponent } from './LinkedIssuesComponent';

type Props = {
    fields: FieldUIs;
    fieldValues: FieldValues;
    handleAddAttachments: (files: File[]) => void;
    siteDetails: DetailedSiteInfo;
    onDeleteAttachment: (attachment: any) => void;
    loadingField?: string;
    isEpic: boolean;
    epicChildren?: any[];
    epicChildrenTypes?: IssueType[];
    handleInlineEdit: (field: FieldUI, edit: any) => void;
    subtaskTypes: IssueType[];
    linkTypes: IssueLinkTypeSelectOption[];
    handleOpenIssue: (issueOrKey: MinimalIssueOrKeyAndSite<DetailedSiteInfo>) => void;
    onDelete: (issueLink: any) => void;
    onFetchIssues: (input: string) => Promise<any>;
    fetchUsers: (input: string, accountId?: string) => Promise<any[]>;
    fetchImage: (url: string) => Promise<string>;
    onIssueUpdate?: (issueKey: string, fieldKey: string, newValue: any) => void;
    isAtlaskitEditorEnabled?: boolean;
    mentionProvider: AtlascodeMentionProvider;
    handleEditorFocus: (isFocused: boolean) => void;
};

const IssueMainPanel: React.FC<Props> = ({
    fields,
    fieldValues,
    handleAddAttachments,
    siteDetails,
    onDeleteAttachment,
    loadingField,
    isEpic,
    epicChildren,
    epicChildrenTypes,
    handleInlineEdit,
    subtaskTypes,
    linkTypes,
    handleOpenIssue,
    onDelete,
    onFetchIssues,
    fetchUsers,
    fetchImage,
    onIssueUpdate,
    isAtlaskitEditorEnabled,
    mentionProvider,
    handleEditorFocus,
}) => {
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
    const [enableEpicChildren, setEnableEpicChildren] = React.useState(false);
    const [enableLinkedIssues, setEnableLinkedIssues] = React.useState(false);
    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const [worklogModalTriggerRef, setWorklogModalTriggerRef] = React.useState<null | React.RefObject<HTMLElement>>(
        null,
    );
    const menuWorklogDialogTriggerRef = React.useRef(null);
    const worklogDialogTriggerRef = React.useRef(null);

    // Use centralized editor state
    const { openEditor, closeEditor, isEditorActive } = useEditorState();
    // Use raw description (ADF or string) for the editor; no HTML→ADF conversion.
    const getDescriptionTextForEditor = React.useCallback(() => {
        if (
            typeof defaultDescription === 'object' &&
            defaultDescription !== null &&
            defaultDescription.version === 1 &&
            defaultDescription.type === 'doc'
        ) {
            if (isAtlaskitEditorEnabled) {
                return JSON.stringify(defaultDescription);
            }
            return convertAdfToWikimarkup(defaultDescription);
        }
        return typeof defaultDescription === 'string' ? defaultDescription : '';
    }, [defaultDescription, isAtlaskitEditorEnabled]);

    const [descriptionText, setDescriptionText] = React.useState(() => getDescriptionTextForEditor());
    const [localIsEditingDescription, setLocalIsEditingDescription] = React.useState(false);
    const isEditingDescription = isAtlaskitEditorEnabled ? isEditorActive('description') : localIsEditingDescription;

    // Define editor handlers based on feature flag
    const openEditorHandler = React.useMemo(
        () => (isAtlaskitEditorEnabled ? () => openEditor('description') : () => setLocalIsEditingDescription(true)),
        [isAtlaskitEditorEnabled, openEditor],
    );

    const closeEditorHandler = React.useMemo(
        () => (isAtlaskitEditorEnabled ? () => closeEditor('description') : () => setLocalIsEditingDescription(false)),
        [isAtlaskitEditorEnabled, closeEditor],
    );

    // Update descriptionText when defaultDescription changes (after save)
    React.useEffect(() => {
        if (!isEditingDescription) {
            setDescriptionText(getDescriptionTextForEditor());
        }
    }, [defaultDescription, isEditingDescription, getDescriptionTextForEditor]);

    // Listen for forced editor close events
    useEditorForceClose(
        'description',
        React.useCallback(() => {
            // Reset description editor state when it's forcibly closed
            setDescriptionText(getDescriptionTextForEditor());
            closeEditorHandler();
        }, [closeEditorHandler, getDescriptionTextForEditor]),
        isAtlaskitEditorEnabled,
    );

    const handleStatusChange = (issueKey: string, statusName: string) => {
        if (onIssueUpdate) {
            onIssueUpdate(issueKey, 'status', statusName);
        }
    };

    const handleAssigneeChange = (issueKey: string, assignee: User | null) => {
        if (onIssueUpdate) {
            onIssueUpdate(issueKey, 'assignee', assignee);
        }
    };

    const handleConfirmDeleteWorklog = (worklog: any) => {
        handleInlineEdit(fields['worklog'], {
            action: 'deleteWorklog',
            worklogId: worklog.id,
            adjustEstimate: 'auto',
        });
    };

    const handleWorklogSave = (worklogData: any) => {
        handleInlineEdit(fields['worklog'], worklogData);
        setWorklogModalTriggerRef(null);
    };

    const handleWorklogCancel = () => {
        setWorklogModalTriggerRef(null);
    };

    const handleWorklogEdit = (worklogData: any) => {
        handleInlineEdit(fields['worklog'], worklogData);
    };

    const addContentDropDown = (
        <Tooltip content="Add content">
            <AddContentDropdown
                handleAttachmentClick={() => setIsModalOpen(true)}
                handleChildIssueClick={
                    isEpic
                        ? () => {
                              setEnableEpicChildren(true);
                          }
                        : () => {
                              setEnableSubtasks(true);
                          }
                }
                handleLinkedIssueClick={() => {
                    setEnableLinkedIssues(true);
                }}
                handleLogWorkClick={() => {
                    setWorklogModalTriggerRef(menuWorklogDialogTriggerRef);
                }}
                loading={loadingField === 'attachment'}
            />
        </Tooltip>
    );

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
            <div style={{ display: 'flex', flexDirection: 'row', gap: '8px', alignItems: 'center', paddingTop: '8px' }}>
                {fields['worklog'] ? (
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'row',
                            gap: '8px',
                            alignItems: 'center',
                        }}
                        ref={menuWorklogDialogTriggerRef}
                    >
                        {addContentDropDown}
                    </div>
                ) : (
                    addContentDropDown
                )}
            </div>
            {fields['description'] && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', gap: '8px', flexDirection: 'row', alignItems: 'flex-start' }}>
                        <label className="ac-field-label">Description</label>
                        {loadingField === 'description' ? <p>Saving...</p> : null}
                    </div>
                    {isEditingDescription || loadingField === 'description' ? (
                        isAtlaskitEditorEnabled ? (
                            <AtlaskitEditor
                                defaultValue={descriptionText}
                                onSave={(content) => {
                                    handleInlineEdit(fields['description'], content);
                                    closeEditorHandler();
                                }}
                                onCancel={() => {
                                    setDescriptionText(getDescriptionTextForEditor());
                                    closeEditorHandler();
                                }}
                                onContentChange={(content) => {
                                    setDescriptionText(content);
                                }}
                                mentionProvider={Promise.resolve(mentionProvider)}
                                onFocus={() => handleEditorFocus(true)}
                                onBlur={() => handleEditorFocus(false)}
                            />
                        ) : (
                            <JiraIssueTextAreaEditor
                                value={descriptionText}
                                onChange={(e: string) => {
                                    setDescriptionText(e);
                                }}
                                onSave={(i: string) => {
                                    // Convert WikiMarkup to ADF before saving (API v3 requires ADF)
                                    const adfContent = convertWikimarkupToAdf(i);
                                    handleInlineEdit(fields['description'], adfContent);
                                    closeEditorHandler();
                                }}
                                onCancel={() => {
                                    setDescriptionText(getDescriptionTextForEditor());
                                    closeEditorHandler();
                                }}
                                fetchUsers={fetchUsers}
                                isDescription
                                saving={loadingField === 'description'}
                                onEditorFocus={() => handleEditorFocus(true)}
                                onEditorBlur={() => handleEditorFocus(false)}
                            />
                        )
                    ) : (
                        <div
                            data-testid="issue.description"
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
                            onClick={openEditorHandler}
                            className="ac-inline-input-view-p"
                        >
                            {isAtlaskitEditorEnabled ? (
                                <AdfAwareContent content={descriptionText} mentionProvider={mentionProvider} />
                            ) : renderedDescription ? (
                                <RenderedContent html={renderedDescription} fetchImage={fetchImage} />
                            ) : (
                                <p style={{ margin: 0 }}>{descriptionText}</p>
                            )}
                        </div>
                    )}
                </div>
            )}
            {attachments && attachments.length > 0 && (
                <div data-testid="issue.attachments">
                    <label className="ac-field-label">Attachments</label>
                    <AttachmentList
                        attachments={attachments}
                        baseLinkUrl={siteDetails.baseLinkUrl}
                        onDelete={onDeleteAttachment}
                        fetchImage={fetchImage}
                    />
                </div>
            )}
            {subtasks && (subtasks.length > 0 || enableSubtasks) && (
                <div>
                    <ChildIssuesComponent
                        childTypes={subtaskTypes}
                        label="Child issues"
                        loading={loadingField === 'subtasks'}
                        onSave={(e: any) => handleInlineEdit(fields['subtasks'], e)}
                        enable={enableSubtasks}
                        setEnableEpicChildren={setEnableEpicChildren}
                        setEnableSubtasks={setEnableSubtasks}
                        handleOpenIssue={handleOpenIssue}
                        issues={subtasks}
                        isEpic={isEpic}
                        onStatusChange={handleStatusChange}
                    />
                </div>
            )}
            {isEpic && epicChildren && (epicChildren.length > 0 || enableEpicChildren) && (
                <div>
                    <ChildIssuesComponent
                        childTypes={!epicChildrenTypes ? [] : epicChildrenTypes}
                        label="Epic Child issues"
                        loading={loadingField === 'subtasks'} // Handles loading state the same as subtasks
                        onSave={(e: any) => handleInlineEdit(fields['subtasks'], e)} // Creates an issue in the same way for standardIssues and subtasks
                        enable={enableEpicChildren}
                        setEnableEpicChildren={setEnableEpicChildren}
                        setEnableSubtasks={setEnableSubtasks}
                        handleOpenIssue={handleOpenIssue}
                        issues={epicChildren}
                        isEpic={isEpic}
                        onStatusChange={handleStatusChange}
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
                        onStatusChange={handleStatusChange}
                        onAssigneeChange={handleAssigneeChange}
                        fetchUsers={fetchUsers}
                    />
                </div>
            )}
            {fields['worklog'] &&
                Array.isArray(fieldValues['worklog']?.worklogs) &&
                fieldValues['worklog'].worklogs.length > 0 && (
                    <div className="ac-vpadding">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <label className="ac-field-label">Work log</label>
                            <Button
                                className="ac-button-secondary"
                                appearance="subtle"
                                iconBefore={<AddIcon size="small" label="Add" />}
                                onClick={() => setWorklogModalTriggerRef(worklogDialogTriggerRef)}
                                ref={worklogDialogTriggerRef}
                            ></Button>
                        </div>
                        <Worklogs
                            worklogs={fieldValues['worklog']}
                            onEditWorklog={handleWorklogEdit}
                            onConfirmDelete={handleConfirmDeleteWorklog}
                            originalEstimate={originalEstimate}
                        />
                    </div>
                )}
            {worklogModalTriggerRef && (
                <WorklogFormDialog
                    onClose={handleWorklogCancel}
                    onSave={handleWorklogSave}
                    onCancel={handleWorklogCancel}
                    originalEstimate={originalEstimate}
                    triggerRef={worklogModalTriggerRef}
                />
            )}
        </div>
    );
};

export default IssueMainPanel;
