import Select, { components } from '@atlaskit/select';
import Spinner from '@atlaskit/spinner';
import { emptyIssueType, IssueType } from '@atlassianlabs/jira-pi-common-models';
import * as React from 'react';
import EdiText from 'react-editext';

import * as FieldValidators from '../fieldValidators';

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

// seems whole component is unused, but keeping it for now.
export default class InlineSubtaskEditor extends React.Component<Props, State> {
    constructor(props: Props) {
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

    static getDerivedStateFromProps(nextProps: Omit<Props, 'onSave'>, state: Partial<State>) {
        const newState: Partial<State> = {};

        if (nextProps.subtaskTypes && nextProps.subtaskTypes !== state.subtaskTypes) {
            newState.subtaskTypes = nextProps.subtaskTypes;
        }

        if (nextProps.label && nextProps.label !== state.label) {
            newState.label = nextProps.label;
        }

        if (nextProps.isLoading !== undefined && nextProps.isLoading !== state.isLoading) {
            newState.isLoading = nextProps.isLoading;
        }

        if (Object.keys(newState).length > 0) {
            return newState;
        }
        return null;
    }

    handleOpenInlineEditor = () => {
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

    override render() {
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
                                getOptionLabel={(option: IssueType) => option.name}
                                getOptionValue={(option: IssueType) => option.id}
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
                        validationMessage="sub-task summary is required"
                        inputProps={{
                            className: 'ac-inputField',
                            placeholder: 'What needs to be done?',
                            style: { width: '100%' },
                        }}
                        containerProps={{ className: 'ac-inline-edit-main_container-left-margin' }}
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
