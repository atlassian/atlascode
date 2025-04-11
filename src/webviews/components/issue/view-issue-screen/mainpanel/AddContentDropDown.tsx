import { LoadingButton } from '@atlaskit/button';
import DropdownMenu, { DropdownItem } from '@atlaskit/dropdown-menu';
import AddIcon from '@atlaskit/icon/glyph/add';
import ChildIssuesIcon from '@atlaskit/icon/glyph/child-issues';
import EditorAttachmentIcon from '@atlaskit/icon/glyph/editor/attachment';
import EmojiFrequentIcon from '@atlaskit/icon/glyph/emoji/frequent';
import IssuesIcon from '@atlaskit/icon/glyph/issues';
import { Box } from '@material-ui/core';
import React from 'react';

export const AddContentDropdown: React.FC<{
    handleAttachmentClick: () => void;
    handleChildIssueClick: () => void;
    handleLinkedIssueClick: () => void;
    handleLogWorkClick: () => void;
    loading?: boolean;
}> = ({ handleAttachmentClick, handleChildIssueClick, handleLinkedIssueClick, handleLogWorkClick, loading }) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [isHovered, setIsHovered] = React.useState(false);
    return (
        <Box
            style={{
                display: 'flex',
            }}
        >
            <DropdownMenu<HTMLButtonElement>
                testId="vscode-dropdown"
                onOpenChange={(open) => setIsOpen(open.isOpen)}
                isLoading={loading}
                trigger={({ triggerRef, ...props }) => (
                    <LoadingButton
                        isLoading={loading}
                        onMouseOver={() => setIsHovered(true)}
                        onMouseLeave={() => setIsHovered(false)}
                        style={{
                            alignContent: 'center',
                            border:
                                isOpen || isHovered
                                    ? '1px solid var(--vscode-list-focusOutline)'
                                    : '1px solid var(--vscode-editorGroup-border)',
                            backgroundColor: 'var(--vscode-editor-background)',

                            color: 'var(--vscode-editor-foreground)',
                        }}
                        {...props}
                        ref={triggerRef}
                        iconBefore={<AddIcon size="small" label="Add" />}
                    >
                        Add
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
                    <DropdownItem
                        testId="vscode-dropdown-item"
                        elemBefore={<EditorAttachmentIcon label="Add Attachment" />}
                        onClick={handleAttachmentClick}
                    >
                        Attachment
                    </DropdownItem>
                    <DropdownItem
                        testId="vscode-dropdown-item"
                        elemBefore={<ChildIssuesIcon label="Add Child Issues" />}
                        onClick={handleChildIssueClick}
                    >
                        Child issue
                    </DropdownItem>
                    <DropdownItem
                        testId="vscode-dropdown-item"
                        elemBefore={<IssuesIcon label="Add Linked Issue" />}
                        onClick={handleLinkedIssueClick}
                    >
                        Linked issue
                    </DropdownItem>
                    <DropdownItem
                        testId="vscode-dropdown-item"
                        elemBefore={<EmojiFrequentIcon label="Log Work" />}
                        onClick={handleLogWorkClick}
                    >
                        Work log
                    </DropdownItem>
                </Box>
            </DropdownMenu>
        </Box>
    );
};
