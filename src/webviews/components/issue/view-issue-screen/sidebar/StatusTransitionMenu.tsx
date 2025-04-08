import { LoadingButton } from '@atlaskit/button';
import DropdownMenu, { DropdownItem } from '@atlaskit/dropdown-menu';
import ChevronDownIcon from '@atlaskit/icon/glyph/chevron-down';
import Lozenge from '@atlaskit/lozenge';
import { Status, Transition } from '@atlassianlabs/jira-pi-common-models';
import { Box } from '@material-ui/core';
import React from 'react';

import { colorToLozengeAppearanceMap } from '../../../colors';

const StatusOption = (data: Transition) => (
    <Box>
        <Lozenge appearance={colorToLozengeAppearanceMap[data.to.statusCategory.colorName]}>{data.to.name}</Lozenge>
    </Box>
);

const StatusOptionWithTransitionName = (data: Transition) => (
    <Box>
        {`${data.name} → `}
        <Lozenge appearance={colorToLozengeAppearanceMap[data.to.statusCategory.colorName]}>{data.to.name}</Lozenge>
    </Box>
);

type Props = {
    transitions: Transition[];
    currentStatus: Status;
    isStatusButtonLoading: boolean;
    onStatusChange: (item: Transition) => void;
};

export const StatusTransitionMenu: React.FC<Props> = (props) => {
    const [isHovered, setIsHovered] = React.useState(false);
    const [isOpen, setIsOpen] = React.useState(false);

    const { border, background } = getDynamicStyles(props.currentStatus.statusCategory.colorName);
    const shouldShowTransitionName = props.transitions.some((t) => t.name !== t.to.name);
    return (
        <Box
            style={{
                display: 'flex',
            }}
        >
            <DropdownMenu<HTMLButtonElement>
                css={{
                    backgroundColor: 'var(--vscode-settings-textInputBackground)!important',
                    ':hover': {
                        backgroundColor: 'var(--vscode-editor-selectionHighlightBackground)!important',
                    },
                }}
                onOpenChange={(open) => setIsOpen(open.isOpen)}
                isLoading={props.isStatusButtonLoading}
                trigger={({ triggerRef, ...properties }) => (
                    <LoadingButton
                        isLoading={props.isStatusButtonLoading}
                        onMouseOver={() => setIsHovered(true)}
                        onMouseLeave={() => setIsHovered(false)}
                        style={{
                            alignContent: 'center',
                            border: isOpen || isHovered ? '1px solid var(--vscode-list-focusOutline)' : border,
                            backgroundColor: background,

                            color: 'var(--vscode-editor-foreground)',
                        }}
                        {...properties}
                        ref={triggerRef}
                        iconAfter={<ChevronDownIcon label="Status" />}
                    >
                        {props.currentStatus.name}
                    </LoadingButton>
                )}
            >
                <Box
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        backgroundColor: 'var(--vscode-settings-textInputBackground)',
                        paddingTop: '4px',
                        paddingBottom: '4px',
                        border: '1px solid var(--vscode-list-focusOutline)',
                    }}
                >
                    {props.transitions.map((t) => (
                        <DropdownItem
                            key={t.id}
                            css={{
                                ':hover': {
                                    background: 'var(--vscode-editor-selectionHighlightBackground) !important',
                                },
                            }}
                            onClick={() => props.onStatusChange(t)}
                        >
                            {shouldShowTransitionName ? StatusOptionWithTransitionName(t) : StatusOption(t)}
                        </DropdownItem>
                    ))}
                </Box>
            </DropdownMenu>
        </Box>
    );
};

const getDynamicStyles = (colorName: string) => {
    let fields = { border: '', bg: '' };
    if (!statusCategoryToColorTokenMap[colorName]) {
        fields = statusCategoryToColorTokenMap['default'];
    } else {
        fields = statusCategoryToColorTokenMap[colorName];
    }
    return {
        border: `1px solid ${fields.border}`,
        background: fields.bg,
    };
};

const statusCategoryToColorTokenMap: { [key: string]: { border: string; bg: string } } = {
    yellow: { border: '#669DF1', bg: '#669DF133' },
    green: { border: '#94C748', bg: '#94C74833' },
    'blue-gray': {
        border: '#B0BEC5',
        bg: '#B0BEC533',
    },
    default: {
        border: '#B0BEC5',
        bg: '#B0BEC533',
    },
};
