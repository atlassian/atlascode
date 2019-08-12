import * as React from 'react';
import { IssueType } from "../../../jira/jira-client/model/entities";
import EdiText from 'react-editext';
import { FieldValidators } from '../fieldValidators';
import Select, { components } from '@atlaskit/select';
import Spinner from '@atlaskit/spinner';
import { emptyIssueType } from '../../../jira/jira-client/model/emptyEntities';

export type SummaryAndIssueType = {
    summary: string;
    issuetype: { id: string; };
};

type Props = {
    subtaskTypes: IssueType[],
    label: string,
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
}

const { Option } = components;
const IconOption = (props: any) => (
    <Option {...props}>
        <div ref={props.innerRef} {...props.innerProps} style={{ display: 'flex', 'align-items': 'center' }}><img src={props.data.iconUrl} width="24" height="24" /><span style={{ marginLeft: '10px' }}>{props.label}</span></div>
    </Option>
);

const IconValue = (props: any) => (
    <components.SingleValue {...props}>
        <div style={{ display: 'flex', alignItems: 'center' }}><img src={props.data.iconUrl} width="16" height="16" /><span style={{ marginLeft: '10px' }}>{props.data.name}</span></div>
    </components.SingleValue >

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
            selectedIssueType: (props.subtaskTypes.length > 0) ? props.subtaskTypes[0] : emptyIssueType
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
        this.setState({ isEditing: true });
    }

    handleCancelInlineEdit = (value: string) => {
        this.setState({ isEditing: false });
    }

    handleIssueTypeChange = (newType: IssueType) => {
        if (newType.id !== this.state.selectedIssueType.id) {
            this.setState({ selectedIssueType: newType });
        }
    }

    handleSave = (val: string) => {
        this.setState({ inputValue: " ", isEditing: false });
        this.props.onSave(
            {
                summary: val,
                issuetype: { id: this.state.selectedIssueType.id }
            }
        );

    }

    render() {
        return (
            <React.Fragment>
                <div className='label-and-button'>
                    <label className='ac-field-label' htmlFor='subtasks-editor'>{this.props.label}</label>
                    <button className='ac-inline-add-button' onClick={this.handleOpenInlineEditor} />
                </div>
                <div className='ac-flex-space-between'>
                    {this.state.isLoading &&
                        <Spinner size="small" />
                    }
                    {this.state.isEditing &&
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
                    }
                    <EdiText
                        type='text'
                        value={this.state.inputValue}
                        onSave={this.handleSave}
                        onCancel={this.handleCancelInlineEdit}
                        validation={FieldValidators.isValidString}
                        validationMessage='sub-task summary is required'
                        inputProps={{ className: 'ac-inputField', placeholder: 'What needs to be done?', style: { width: '100%' } }}
                        viewProps={{ id: 'subtasks-editor', className: 'ac-inline-input-view-p' }}
                        mainContainerClassName='ac-inline-edit-main_container-left-margin'
                        editButtonClassName='ac-inline-edit-button'
                        cancelButtonClassName='ac-inline-cancel-button'
                        saveButtonClassName='ac-inline-save-button'
                        editing={this.state.isEditing}
                    />
                </div>
            </React.Fragment>
        );
    }
}