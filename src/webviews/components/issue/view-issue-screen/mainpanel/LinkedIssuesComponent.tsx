import { IconButton } from '@atlaskit/button/new';
import AddIcon from '@atlaskit/icon/glyph/add';
import { GlyphProps } from '@atlaskit/icon/types';
import Select, { AsyncSelect } from '@atlaskit/select';
import { IssuePickerIssue, MinimalIssueLink, MinimalIssueOrKeyAndSite } from '@atlassianlabs/jira-pi-common-models';
import { IssueLinkTypeSelectOption, ValueType } from '@atlassianlabs/jira-pi-meta-models';
import { Box } from '@mui/material';
import { VSCodeButton } from '@vscode/webview-ui-toolkit/react';
import React from 'react';
import { DetailedSiteInfo } from 'src/atlclients/authInfo';

import * as SelectFieldHelper from '../../../selectFieldHelper';
import { LinkedIssues } from '../../LinkedIssues';

export type LinkTypeAndIssue = {
    issueKey: string;
    type: IssueLinkTypeSelectOption;
};
type Props = {
    linkTypes: IssueLinkTypeSelectOption[];
    label: string;
    onSave: (val: LinkTypeAndIssue) => void;
    onFetchIssues: (input: string) => Promise<IssuePickerIssue[]>;
    loading: boolean;
    issuelinks: MinimalIssueLink<DetailedSiteInfo>[];
    onIssueClick: (issueOrKey: MinimalIssueOrKeyAndSite<DetailedSiteInfo>) => void;
    onDelete: (issueLink: any) => void;
    enableLinkedIssues: { enable: boolean; setEnableLinkedIssues: (enable: boolean) => void };
};

const SmallAddIcon = (iconProps: GlyphProps) => <AddIcon {...iconProps} size="small" />;

export const LinkedIssuesComponent: React.FC<Props> = ({
    linkTypes,
    label,
    onSave,
    loading,
    onFetchIssues,
    issuelinks,
    onIssueClick,
    onDelete,
    enableLinkedIssues,
}) => {
    const [isEditing, setIsEditing] = React.useState(false);
    const [selectedIssue, setSelectedIssue] = React.useState<IssuePickerIssue | undefined>(undefined);
    const [selectedLinkType, setSelectedLinkType] = React.useState<IssueLinkTypeSelectOption | undefined>(
        linkTypes.length > 0 ? linkTypes[0] : undefined,
    );
    const { enable, setEnableLinkedIssues } = enableLinkedIssues;
    React.useEffect(() => {
        if (enable) {
            setIsEditing(true);
        }
    }, [enable]);
    const handleIssueChange = (issue: IssuePickerIssue) => {
        if (!selectedIssue || issue.key !== selectedIssue.key) {
            setSelectedIssue(issue);
        }
    };
    const handleSave = () => {
        if (!selectedIssue || !selectedLinkType) {
            return;
        }

        setSelectedIssue(undefined);
        setSelectedLinkType(linkTypes.length > 0 ? linkTypes[0] : undefined);
        setIsEditing(false);
        onSave({ type: selectedLinkType, issueKey: selectedIssue.key });
    };

    const handleCancel = () => {
        setSelectedIssue(undefined);
        setSelectedLinkType(linkTypes.length > 0 ? linkTypes[0] : undefined);
        setIsEditing(false);
        setEnableLinkedIssues(false);
    };
    return (
        <Box>
            <Box style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '8px', flexDirection: 'row', alignItems: 'flex-start' }}>
                    <label className="ac-field-label">{label}</label>
                    {loading ? <p>Saving...</p> : null}
                </div>
                <IconButton
                    appearance="subtle"
                    icon={SmallAddIcon}
                    label="Add linked issue"
                    spacing="compact"
                    onClick={() => setIsEditing(true)}
                    isTooltipDisabled={false}
                />
            </Box>
            {isEditing && (
                <Box style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <Box style={{ display: 'flex', flexDirection: 'row', gap: '8px', width: '100%' }}>
                        <div style={{ width: '30%' }}>
                            <Select
                                className="ac-select-container"
                                classNamePrefix="ac-select"
                                options={linkTypes}
                                defaultValue={selectedLinkType}
                                components={SelectFieldHelper.getComponentsForValueType(ValueType.IssueLinks)}
                                getOptionLabel={SelectFieldHelper.labelFuncForValueType(ValueType.IssueLinks)}
                                getOptionValue={SelectFieldHelper.valueFuncForValueType(ValueType.IssueLinks)}
                                isDisabled={loading}
                                onChange={(option: IssueLinkTypeSelectOption) => {
                                    setSelectedLinkType(option);
                                }}
                            />
                        </div>
                        <div style={{ width: '100%' }}>
                            <AsyncSelect
                                className="ac-select-container"
                                classNamePrefix="ac-select"
                                loadOptions={onFetchIssues}
                                getOptionLabel={(option: any) => option.key}
                                getOptionValue={(option: any) => option.key}
                                placeholder="Search for an issue"
                                onChange={handleIssueChange}
                                components={{
                                    Option: SelectFieldHelper.IssueSuggestionOption,
                                    SingleValue: SelectFieldHelper.IssueSuggestionValue,
                                }}
                            />
                        </div>
                    </Box>
                    <Box style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <VSCodeButton
                            appearance="primary"
                            disabled={selectedIssue === undefined || loading}
                            onClick={handleSave}
                        >
                            Create
                        </VSCodeButton>
                        <VSCodeButton appearance="secondary" onClick={handleCancel}>
                            Cancel
                        </VSCodeButton>
                    </Box>
                </Box>
            )}
            <LinkedIssues onIssueClick={onIssueClick} issuelinks={issuelinks} onDelete={onDelete} />
        </Box>
    );
};
