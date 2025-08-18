import { LoadingButton } from '@atlaskit/button';
import DropdownMenu, { DropdownItem } from '@atlaskit/dropdown-menu';
import ChevronDownIcon from '@atlaskit/icon/glyph/chevron-down';
import Lozenge from '@atlaskit/lozenge';
import { Status, Transition } from '@atlassianlabs/jira-pi-common-models';
import { Box } from '@mui/material';
import React from 'react';

import { colorToLozengeAppearanceMap } from '../../../colors';

const statusCategoryOrder: Record<string, number> = {
    new: 1,
    indeterminate: 2,
    done: 3,
};

// Sort transitions by status category (new → indeterminate → done)
const sortTransitionsByStatusCategory = (transitions: Transition[]): Transition[] =>
    [...transitions].sort((a, b) => {
        const aOrder = statusCategoryOrder[a.to.statusCategory.key] ?? transitions.length;
        const bOrder = statusCategoryOrder[b.to.statusCategory.key] ?? transitions.length;
        if (aOrder !== bOrder) {
            return aOrder - bOrder;
        }
        return parseInt(a.to.id) - parseInt(b.to.id);
    });

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
    const hasTransitions = props?.transitions?.length > 0;
    const transitionsSortedByCategory = sortTransitionsByStatusCategory(props.transitions);
    const shouldShowTransitionName = props.transitions.some((t) => t.name !== t.to.name);

    const dropdownContent = hasTransitions ? (
        <Box
            data-testid="issue.status-transition-menu-dropdown"
            style={{
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: 'var(--vscode-settings-textInputBackground)',
                paddingTop: '4px',
                paddingBottom: '4px',
                border: '1px solid var(--vscode-list-focusOutline)',
            }}
        >
            {transitionsSortedByCategory.map((t) => (
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
    ) : null;

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
                        isDisabled={!hasTransitions}
                        onMouseOver={() => setIsHovered(true)}
                        onMouseLeave={() => setIsHovered(false)}
                        style={{
                            alignContent: 'center',
                            border:
                                (isOpen || isHovered) && hasTransitions
                                    ? '1px solid var(--vscode-list-focusOutline)'
                                    : border,
                            backgroundColor: background,

                            color: 'var(--vscode-editor-foreground)',
                        }}
                        {...properties}
                        ref={triggerRef}
                        iconAfter={hasTransitions ? <ChevronDownIcon label="Status" /> : undefined}
                    >
                        {props.currentStatus.name}
                    </LoadingButton>
                )}
            >
                {dropdownContent}
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
