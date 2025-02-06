import Select, { components } from '@atlaskit/select';
import Spinner from '@atlaskit/spinner';
import { emptyIssueType, IssueType } from '@atlassianlabs/jira-pi-common-models';
import * as React from 'react';
import EdiText from 'react-editext';
import * as FieldValidators from '../fieldValidators';
import * as l10n from '@vscode/l10n';

export type SummaryAndIssueType = {
    summary: string;
    issuetype: { id: string };
};

type Props = {
    subtaskTypes: IssueType[];
    label: string;
    onSave: (val: SummaryAndIssueType) => void;
    isLoading: boolean;
};

interface State {
    subtaskTypes: IssueType[];
    label: string;
    isEditing: boolean;
    isLoading: boolean;
    selectedIssueType: IssueType;
    inputValue: string;
    editorContainerClassname: string | undefined;
}

const { Option } = components;
const IconOption = (props: any) => (
    <Option {...props}>
        <div ref={props.innerRef} {...props.innerProps} className="ac-flex">
            <img src={props.data.iconUrl} width="24" height="24" />
            <span style={{ marginLeft: '10px' }}>{props.label}</span>
        </div>
    </Option>
);

const IconValue = (props: any) => (
    <components.SingleValue {...props}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
            <img src={props.data.iconUrl} width="16" height="16" />
            <span style={{ marginLeft: '10px' }}>{props.data.name}</span>
        </div>
    </components.SingleValue>
);

export default class InlineSubtaskEditor extends React.Component<Props, State> {
    constructor(props: any) {
        super(props);

        this.state = {
            subtaskTypes: props.subtaskTypes,
            label: props.label,
            isEditing: false,
            isLoading: false,
            inputValue: '',
            editorContainerClassname: 'ac-hidden',
            selectedIssueType: props.subtaskTypes.length > 0 ? props.subtaskTypes[0] : emptyIssueType,
        };
    }

    componentWillReceiveProps(nextProps: any) {
        const newState: any = {};

        if (nextProps.subtaskTypes && nextProps.subtaskTypes !== this.state.subtaskTypes) {
            newState.subtaskTypes = nextProps.subtaskTypes;
        }

        if (nextProps.label && nextProps.label !== this.state.label) {
            newState.label = nextProps.label;
        }

        if (nextProps.isLoading !== undefined && nextProps.isLoading !== this.state.isLoading) {
            newState.isLoading = nextProps.isLoading;
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

    handleIssueTypeChange = (newType: IssueType) => {
        if (newType.id !== this.state.selectedIssueType.id) {
            this.setState({ selectedIssueType: newType });
        }
    };

    handleSave = (val: string) => {
        this.setState({ inputValue: '', isEditing: false, editorContainerClassname: 'ac-hidden' });

        this.props.onSave({
            summary: val,
            issuetype: { id: this.state.selectedIssueType.id },
        });
    };

    render() {
        return (
            <React.Fragment>
                <div className="label-and-button">
                    <label className="ac-field-label" htmlFor="subtasks-editor">
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
                        <div style={{ width: '30%' }}>
                            <Select
                                defaultValue={this.state.selectedIssueType}
                                className="ac-select-container"
                                classNamePrefix="ac-select"
                                options={this.state.subtaskTypes}
                                components={{ Option: IconOption, SingleValue: IconValue }}
                                getOptionLabel={(option: any) => option.name}
                                getOptionValue={(option: any) => option.id}
                                isDisabled={this.state.isLoading}
                                onChange={this.handleIssueTypeChange}
                            />
                        </div>
                    )}
                    <EdiText
                        type="text"
                        value={this.state.inputValue}
                        onSave={this.handleSave}
                        onCancel={this.handleCancelInlineEdit}
                        validation={FieldValidators.isValidString}
                        validationMessage={l10n.t('sub-task summary is required')}
                        inputProps={{
                            className: 'ac-inputField',
                            placeholder: 'What needs to be done?',
                            style: { width: '100%' },
                        }}
                        mainContainerClassName="ac-inline-edit-main_container-left-margin"
                        editButtonClassName="ac-hidden"
                        cancelButtonClassName="ac-inline-cancel-button"
                        saveButtonClassName="ac-inline-save-button"
                        editing={this.state.isEditing}
                    />
                </div>
            </React.Fragment>
        );
    }
}
