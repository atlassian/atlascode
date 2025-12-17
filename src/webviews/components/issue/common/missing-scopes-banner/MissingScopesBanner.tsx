import { LoadingButton } from '@atlaskit/button';
import { cssMap } from '@atlaskit/css';
import { token } from '@atlaskit/tokens';
import * as React from 'react';
import { RovoDevPromoBannerIcon } from 'src/webviews/components/RovoDevPromoBannerIcon';

export type MissingScopesBannerProps = {
    onOpen: () => void;
    onDismiss: () => void;
};

const styles = cssMap({
    banner: {
        display: 'flex',
        maxWidth: '100%',
        alignItems: 'center',
        padding: token('space.200', '14px'),
        marginBottom: token('space.200', '16px'),
        gap: token('space.200', '16px'),
        backgroundColor: 'var(--vscode-sideBar-background) !important' as any,
    },
    content: {
        flex: 1,
    },
    titleLine: {
        color: 'var(--vscode-foreground) !important' as any,
        fontFamily: 'var(--vscode-font-family) !important' as any,
        fontSize: 'var(--vscode-font-size) !important' as any,
        fontWeight: 'bold' as any,
        lineHeight: '16px' as any,
        paddingBottom: '9px' as any,
    },
    descriptionLine: {
        color: 'var(--vscode-descriptionForeground) !important' as any,
        fontFamily: 'var(--vscode-font-family) !important' as any,
        fontSize: 'var(--vscode-font-size) !important' as any,
        fontWeight: '400' as any,
        lineHeight: '16px' as any,
    },
    buttonGroup: {
        display: 'flex',
        gap: token('space.150', '12px'),
    },
});

export const MissingScopesBanner: React.FC<MissingScopesBannerProps> = ({ onOpen, onDismiss }) => {
    return (
        <div css={styles.banner}>
            <RovoDevPromoBannerIcon width={70} height={50} />
            <div css={styles.content}>
                <div css={styles.titleLine}>Jira editor functionality has been improved</div>
                <div css={styles.descriptionLine}>
                    Jira editing functionality has been enhanced for a better experience. Please reauthenticate to
                    access new features.
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
