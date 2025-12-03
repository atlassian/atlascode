import { LoadingButton } from '@atlaskit/button';
import { cssMap } from '@atlaskit/css';
import { token } from '@atlaskit/tokens';
import * as React from 'react';

import { RovoDevPromoBannerIcon } from './RovoDevPromoBannerIcon';

interface RovoDevPromoBannerProps {
    onOpen: () => void;
    onDismiss: () => void;
}

const RovoDevPromoBanner = ({ onOpen, onDismiss }: RovoDevPromoBannerProps) => {
    return (
        <div css={styles.banner}>
            <RovoDevPromoBannerIcon width={70} height={50} />
            <div css={styles.content}>
                <div css={styles.titleLine}>Your Jira site now has access to Rovo Dev</div>
                <div css={styles.descriptionLine}>
                    Atlassian's AI agent for software teams that uses your team's knowledge to streamline development
                    from idea to deployment.
                </div>
            </div>
            <div css={styles.buttonGroup}>
                <LoadingButton
                    className="ac-button-secondary"
                    testId="rovo-dev-promo-dismiss-button"
                    onClick={onDismiss}
                    isLoading={false}
                >
                    Dismiss
                </LoadingButton>
                <LoadingButton
                    className="ac-button"
                    testId="rov-dev-promo-open-button"
                    onClick={onOpen}
                    isLoading={false}
                >
                    Open Rovo Dev
                </LoadingButton>
            </div>
        </div>
    );
};

// CSS-in-JS styles

const styles = cssMap({
    banner: {
        display: 'flex',
        width: '100%',
        alignItems: 'center',
        padding: token('space.200', '14px 24px'),
        marginBottom: token('space.200', '16px'),
        gap: token('space.200', '16px'),
        backgroundColor: 'var(--vscode-sideBar-background)' as any,
    },
    content: {
        flex: 1,
    },
    titleLine: {
        color: 'var(--vscode-foreground) !important' as any,
        fontFamily: 'var(--vscode-font-family)' as any,
        fontSize: 'var(--vscode-font-size)' as any,
        fontWeight: 'bold' as any,
        lineHeight: '16px' as any,
        paddingBottom: '9px' as any,
    },
    descriptionLine: {
        color: 'var(--vscode-descriptionForeground) !important' as any,
        fontFamily: 'var(--vscode-font-family)' as any,
        fontSize: 'var(--vscode-font-size)' as any,
        fontWeight: '400' as any,
        lineHeight: '16px' as any,
    },
    buttonGroup: {
        display: 'flex',
        gap: token('space.150', '12px'),
    },
});

export default RovoDevPromoBanner;
