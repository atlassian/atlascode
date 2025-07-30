import { AsyncSelect } from '@atlaskit/select';
import Spinner from '@atlaskit/spinner';
import { IssuePickerIssue, IssueType } from '@atlassianlabs/jira-pi-common-models';
import { SelectFieldUI } from '@atlassianlabs/jira-pi-meta-models';
import * as React from 'react';

import * as SelectFieldHelper from '../selectFieldHelper';

type Props = {
    label: string;
    currentIssueType: IssueType;
    isCreateMode: boolean;
    currentParent?: IssuePickerIssue;
    onSave: (parentIssue: IssuePickerIssue) => void;
    loadIssueOptions: (field: SelectFieldUI, input: string, currentJQL?: string) => Promise<IssuePickerIssue[]>;
    field: SelectFieldUI;
    isLoading: boolean;
    isClearable: boolean;
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
                                    loadOptions={async (input: string) =>
                                        await this.props.loadIssueOptions(
                                            this.props.field,
                                            input,
                                            this.props.isCreateMode
                                                ? 'issuetype = Epic'
                                                : this.props.currentIssueType.subtask
                                                  ? 'issuetype in standardIssueType()'
                                                  : 'issuetype = Epic',
                                        )
                                    }
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
