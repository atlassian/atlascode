import Button from '@atlaskit/button';
import AddIcon from '@atlaskit/icon/core/add';
import Select, { components } from '@atlaskit/select';
import TextField from '@atlaskit/textfield';
import { emptyIssueType, IssueType, MinimalIssueOrKeyAndSite } from '@atlassianlabs/jira-pi-common-models';
import { Box } from '@mui/material';
import { VSCodeButton } from '@vscode/webview-ui-toolkit/react';
import React from 'react';

import { DetailedSiteInfo } from '../../../../../atlclients/authInfo';
import IssueList from '../../IssueList';

export type SummaryAndIssueType = {
    summary: string;
    issuetype: { id: string };
};
type Props = {
    childTypes: IssueType[];
    label: string;
    onSave: (val: SummaryAndIssueType) => void;
    loading: boolean;
    enable: boolean;
    setEnableSubtasks: (enable: boolean) => void;
    setEnableEpicChildren: (enable: boolean) => void;
    handleOpenIssue: (issueOrKey: MinimalIssueOrKeyAndSite<DetailedSiteInfo>) => void;
    issues: any[];
    isEpic: boolean;
    onStatusChange?: (issueKey: string, statusName: string) => void;
};

const { Option, SingleValue } = components;
const IconOption = (props: any) => (
    <Option {...props}>
        <div ref={props.innerRef} {...props.innerProps} className="ac-flex">
            <img src={props.data.iconUrl} width="24" height="24" alt={props.data.name || 'Issue type icon'} />
            <span style={{ marginLeft: '10px' }}>{props.label}</span>
        </div>
    </Option>
);

const IconValue = (props: any) => (
    <SingleValue {...props}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
            <img src={props.data.iconUrl} width="16" height="16" alt={props.data.name || 'Issue type icon'} />
            <span style={{ marginLeft: '10px' }}>{props.data.name}</span>
        </div>
    </SingleValue>
);

export const ChildIssuesComponent: React.FC<Props> = ({
    childTypes,
    label,
    onSave,
    loading,
    enable,
    setEnableSubtasks,
    setEnableEpicChildren,
    handleOpenIssue,
    issues,
    isEpic,
    onStatusChange,
}) => {
    const [isEditing, setIsEditing] = React.useState(false);
    const [inputValue, setInputValue] = React.useState('');
    const [selectedIssueType, setSelectedIssueType] = React.useState<IssueType>(
        childTypes.length > 0 ? childTypes[0] : emptyIssueType,
    );
    React.useEffect(() => {
        if (enable) {
            setIsEditing(true);
        }
    }, [enable]);
    const handleSave = () => {
        if (inputValue.trim() === '') {
            return;
        }
        const issueType = selectedIssueType ? selectedIssueType : emptyIssueType;
        onSave({ summary: inputValue, issuetype: { id: issueType.id } });
        setInputValue('');
        setIsEditing(false);
    };

    const handleCancel = () => {
        setInputValue('');
        setIsEditing(false);
        setSelectedIssueType(childTypes.length > 0 ? childTypes[0] : emptyIssueType);
        if (isEpic) {
            setEnableEpicChildren(false);
        } else {
            setEnableSubtasks(false);
        }
    };
    return (
        <Box>
            <Box style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '8px', flexDirection: 'row', alignItems: 'flex-start' }}>
                    <label className="ac-field-label">{label}</label>
                    {loading ? <p>Saving...</p> : null}
                </div>
                <Button
                    className="ac-button-secondary"
                    appearance="subtle"
                    iconBefore={<AddIcon size="small" label="Add" />}
                    onClick={() => setIsEditing(true)}
                ></Button>
            </Box>
            {isEditing && (
                <Box style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <Box style={{ display: 'flex', flexDirection: 'row', gap: '8px', width: '100%' }}>
                        <div style={{ width: '30%' }}>
                            <Select
                                className="ac-select-container"
                                classNamePrefix="ac-select"
                                options={childTypes}
                                defaultValue={selectedIssueType}
                                components={{ Option: IconOption, SingleValue: IconValue }}
                                getOptionLabel={(option: IssueType) => option.name}
                                getOptionValue={(option: IssueType) => option.id}
                                isDisabled={loading}
                                onChange={(option: IssueType) => {
                                    setSelectedIssueType(option);
                                }}
                            />
                        </div>
                        <TextField
                            className="ac-inputField"
                            placeholder="What needs to be done?"
                            onChange={(e) => setInputValue(e.currentTarget.value)}
                        />
                    </Box>
                    <Box style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <VSCodeButton appearance="primary" disabled={inputValue === '' || loading} onClick={handleSave}>
                            Create
                        </VSCodeButton>
                        <VSCodeButton appearance="secondary" onClick={handleCancel}>
                            Cancel
                        </VSCodeButton>
                    </Box>
                </Box>
            )}
            <IssueList onIssueClick={handleOpenIssue} issues={issues} onStatusChange={onStatusChange} />
        </Box>
    );
};
