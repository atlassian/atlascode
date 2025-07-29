import { AsyncSelect } from '@atlaskit/select';
import Spinner from '@atlaskit/spinner';
import { IssuePickerIssue, IssueType } from '@atlassianlabs/jira-pi-common-models';
import * as React from 'react';

import * as SelectFieldHelper from '../selectFieldHelper';

/*
 * ParentIssueEditor Component Design Notes
 *
 * PURPOSE:
 * This component allows users to search for and select parent issues when creating or editing issues.
 * The available parent options depend on the current issue type and mode (create vs edit).
 *
 *
 *
 *
 * BUSINESS RULES:
 * - Create Mode: Only epics can be selected as parents (regardless of issue type)
 * - Edit Mode - Regular Issues (Story, Bug, Task): Only epics can be selected as parents
 * - Edit Mode - Subtasks: Both epics and regular issues can be selected as parents
 *
 *
 *
 *
 * SUGGESTED PROPS:
 *
 * From InlineIssueLinkEditor.tsx:
 * - onFetchIssues: (input: string) => Promise<IssuePickerIssue[]> - General issue search function
 * - isLoading: boolean - For loading states
 * - label: string - Component label text
 *
 * From InlineSubtaskEditor.tsx:
 * - Issue type selection patterns
 * - Inline editing state management patterns
 *
 *
 *
 *
 * New Props Needed:
 * - currentIssueType: IssueType - To determine what parent types are allowed
 * - onFetchEpics: (input: string) => Promise<IssuePickerIssue[]> - Specific function for fetching only epics
 * - onFetchParentIssues: (input: string) => Promise<IssuePickerIssue[]> - For fetching epics + regular issues (for subtasks)
 * - onSave: (parentIssue: IssuePickerIssue) => void - Callback when parent is selected
 * - currentParent?: IssuePickerIssue - If there's already a parent set (for edit mode)
 * - isCreateMode: boolean - To distinguish between create vs edit scenarios
 *
 *
 *
 * USEFUL PATTERNS TO REUSE:
 *
 * State Management (from both components):
 * - isEditing, isLoading states
 * - editorContainerClassname for show/hide logic ('ac-hidden' vs 'ac-flex-space-between')
 * - handleOpenInlineEditor, handleCancel, handleSave pattern
 *
 *
 *
 *
 * From InlineIssueLinkEditor.tsx:
 * - AsyncSelect component usage with loadOptions prop
 * - Issue picker components: SelectFieldHelper.IssueSuggestionOption and SelectFieldHelper.IssueSuggestionValue
 * - Search placeholder: "Search for an issue" or customize to "Search for parent issue"
 * - getOptionLabel: (option: any) => option.key
 * - getOptionValue: (option: any) => option.key
 *
 *
 *
 * CONDITIONAL LOGIC NEEDED:
 *
 * // Determine which fetch function to use based on current issue type and mode
 * const fetchFunction = () => {
 *   if (isCreateMode) {
 *     return onFetchEpics; // Always epics only in create mode
 *   }
 *
 *   if (currentIssueType.subtask) {
 *     return onFetchParentIssues; // Epics + regular issues for subtasks
 *   }
 *
 *   return onFetchEpics; // Only epics for regular issues in edit mode
 * };
 *
 *
 *
 * NEW FUNCTIONS TO IMPLEMENT (outside this component):
 *
 * 1. fetchEpicsOnly(input: string): Promise<IssuePickerIssue[]>
 *    - Filter issues where issueType.name === 'Epic' or similar epic identification
 *
 * 2. fetchEpicsAndRegularIssues(input: string): Promise<IssuePickerIssue[]>
 *    - Filter out subtasks, keep epics and regular issues (Story, Bug, Task, etc.)
 *    - Exclude issues where issueType.subtask === true
 *
 * COMPONENT STRUCTURE:
 * - Similar to InlineIssueLinkEditor but simpler (no link type selection)
 * - Just the issue picker with conditional filtering
 * - Same button/label structure and inline editing pattern
 * - Same save/cancel button layout and styling classes
 *
 * STYLING CLASSES TO REUSE:
 * - 'label-and-button' for header
 * - 'ac-field-label' for label
 * - 'ac-inline-add-button' for add button
 * - 'ac-select-container' and 'ac-select' for select styling
 * - 'ac-inline-edit-buttons-container' for button container
 * - 'ac-inline-save-button' and 'ac-inline-cancel-button' for action buttons
 *
 * IMPLEMENTATION NOTES:
 * - Remove the link type selection (first Select component) since we're only selecting parent issues
 * - Update Props interface to remove linkTypes and add the new props mentioned above
 * - Update State interface to remove selectedLinkType and linkTypes
 * - Modify handleSave to only return the selected parent issue, not a link type
 * - Update placeholder text to "Search for parent issue" or similar
 * - Add conditional logic to determine which fetch function to use based on currentIssueType and isCreateMode
 */

type Props = {
    label: string;
    currentIssueType: IssueType;
    isCreateMode: boolean;
    currentParent?: IssuePickerIssue;
    onSave: (parentIssue: IssuePickerIssue) => void;
    onFetchEpics: (input: string) => Promise<IssuePickerIssue[]>;
    onFetchParentIssues: (input: string) => Promise<IssuePickerIssue[]>;
    isLoading: boolean;
};

interface State {
    label: string;
    isEditing: boolean;
    isLoading: boolean;
    isIssueLoading: boolean;
    selectedParent: IssuePickerIssue | undefined;
    editorContainerClassname: string | undefined;
    isCreateMode: boolean;
}

export default class ParentIssueEditor extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);

        this.state = {
            label: props.label,
            isEditing: false,
            isLoading: false,
            isIssueLoading: false,
            selectedParent: props.currentParent,
            editorContainerClassname: 'ac-hidden',
            isCreateMode: props.isCreateMode,
        };
    }

    componentWillReceiveProps(nextProps: Props) {
        const newState: any = {};

        if (nextProps.label && nextProps.label !== this.state.label) {
            newState.label = nextProps.label;
        }

        if (nextProps.isLoading !== undefined && nextProps.isLoading !== this.state.isLoading) {
            newState.isLoading = nextProps.isLoading;
        }

        if (nextProps.currentParent !== this.props.currentParent) {
            newState.selectedParent = nextProps.currentParent;
        }

        if (Object.keys(newState).length > 0) {
            this.setState(newState);
        }
    }

    handleOpenInlineEditor = (e: any) => {
        this.setState({ isEditing: true, editorContainerClassname: 'ac-flex-space-between' });
    };

    handleCancelInlineEdit = (value: string) => {
        this.setState({ isEditing: false, editorContainerClassname: 'ac-hidden' });
    };

    handleParentChange = (newParent: IssuePickerIssue) => {
        if (this.state.selectedParent === undefined || newParent.key !== this.state.selectedParent.key) {
            this.setState({ selectedParent: newParent });

            // In create mode, immediately save the selection since there's no save button
            if (this.props.isCreateMode && newParent) {
                this.props.onSave(newParent);
            }
        }
    };

    // Determine which fetch function to use based on current issue type and mode
    getFetchFunction = () => {
        if (this.props.isCreateMode) {
            return this.props.onFetchEpics; // Always epics only in create mode
        }

        if (this.props.currentIssueType.subtask) {
            return this.props.onFetchParentIssues; // Epics + regular issues for subtasks
        }
        return this.props.onFetchEpics; // Only epics for regular issues in edit mode
    };

    handleCancel = () => {
        this.setState({
            isEditing: false,
            selectedParent: this.props.currentParent,
        });
    };

    handleSave = (e: any) => {
        this.setState({
            isEditing: false,
        });

        if (this.state.selectedParent) {
            this.props.onSave(this.state.selectedParent);
        }
    };

    render() {
        // Create mode - render select directly without inline editing wrapper
        if (this.props.isCreateMode) {
            return (
                <div>
                    <label className="ac-field-label" htmlFor="parent-issue-editor">
                        {this.props.label}
                    </label>
                    {this.state.isLoading && <Spinner size="small" />}
                    <AsyncSelect
                        value={this.state.selectedParent}
                        className="ac-form-select-container"
                        classNamePrefix="ac-form-select"
                        loadOptions={this.getFetchFunction()}
                        getOptionLabel={(option: any) => option.key}
                        getOptionValue={(option: any) => option.key}
                        placeholder="Search for parent issue"
                        isLoading={this.state.isLoading}
                        isDisabled={this.state.isLoading}
                        onChange={this.handleParentChange}
                        isClearable={true}
                        components={{
                            Option: SelectFieldHelper.IssueSuggestionOption,
                            SingleValue: SelectFieldHelper.IssueSuggestionValue,
                        }}
                    />
                </div>
            );
        }

        // Edit mode - render with inline editing pattern
        return (
            <React.Fragment>
                <div className="label-and-button">
                    <label className="ac-field-label" htmlFor="parent-issue-editor">
                        {this.props.label}
                    </label>
                    <button
                        className="ac-inline-add-button"
                        onClick={this.handleOpenInlineEditor}
                        disabled={this.state.isEditing || this.state.isLoading}
                    />
                </div>
                {this.state.isLoading && <Spinner size="small" />}
                <div className={this.state.editorContainerClassname}>
                    {this.state.isEditing && (
                        <React.Fragment>
                            <div style={{ width: '100%' }}>
                                <AsyncSelect
                                    value={this.state.selectedParent}
                                    className="ac-select-container"
                                    classNamePrefix="ac-select"
                                    loadOptions={this.getFetchFunction}
                                    getOptionLabel={(option: any) => option.key}
                                    getOptionValue={(option: any) => option.key}
                                    placeholder="Search for parent issue"
                                    isLoading={this.state.isLoading}
                                    isDisabled={this.state.isLoading}
                                    onChange={this.handleParentChange}
                                    components={{
                                        Option: SelectFieldHelper.IssueSuggestionOption,
                                        SingleValue: SelectFieldHelper.IssueSuggestionValue,
                                    }}
                                />
                            </div>
                            <div className="ac-inline-edit-buttons-container">
                                <button
                                    type="button"
                                    className="ac-inline-save-button"
                                    onClick={this.handleSave}
                                    disabled={this.state.selectedParent === undefined}
                                />
                                <button type="button" className="ac-inline-cancel-button" onClick={this.handleCancel} />
                            </div>
                        </React.Fragment>
                    )}
                </div>
            </React.Fragment>
        );
    }
}
