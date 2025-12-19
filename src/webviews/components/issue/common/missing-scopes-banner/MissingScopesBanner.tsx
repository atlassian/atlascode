import { LoadingButton } from '@atlaskit/button';
import { cssMap } from '@atlaskit/css';
import { token } from '@atlaskit/tokens';
import * as React from 'react';

import { MissingScopesLogo } from './MissingScopesLogo';

export type MissingScopesBannerProps = {
    onOpen: () => void;
    onDismiss: () => void;
};

const styles = cssMap({
    banner: {
        display: 'flex',
        maxWidth: '100%',
        alignItems: 'center',
        paddingLeft: token('space.150', '12px'),
        paddingRight: token('space.150', '12px'),
        paddingBlockStart: token('space.100', '8px'),
        paddingBlockEnd: token('space.100', '8px'),
        marginBottom: token('space.200', '16px'),
        gap: token('space.150', '12px'),
        backgroundColor: 'var(--vscode-sideBar-background) !important' as any,
    },
    content: {
        flex: 1,
    },
    descriptionLine: {
        color: 'var(--vscode-descriptionForeground) !important' as any,
        fontFamily: 'var(--vscode-font-family) !important' as any,
        fontSize: 'var(--vscode-font-size) !important' as any,
        fontWeight: token('font.weight.medium'),
        lineHeight: '16px' as any,
    },
    buttonGroup: {
        display: 'flex',
        gap: token('space.150', '12px'),
    },
    svgContainer: {
        width: '22px',
        height: '22px',
    },
});

export const MissingScopesBanner: React.FC<MissingScopesBannerProps> = ({ onOpen, onDismiss }) => {
    return (
        <div css={styles.banner}>
            <div css={styles.svgContainer}>
                <MissingScopesLogo width={22} height={22} />
            </div>
            <div css={styles.content}>
                <div css={styles.descriptionLine}>
                    We've updated Jira's editing experience. Please reauthenticate to use the new features.
                </div>
            </div>
            <div css={styles.buttonGroup}>
                <LoadingButton
                    className="ac-button-secondary"
                    testId="missing-scopes-dismiss-button"
                    onClick={onDismiss}
                    isLoading={false}
                >
                    Dismiss
                </LoadingButton>
                <LoadingButton
                    className="ac-button"
                    testId="missing-scopes-open-button"
                    onClick={onOpen}
                    isLoading={false}
                >
                    Reauthenticate
                </LoadingButton>
            </div>
        </div>
    );
};
