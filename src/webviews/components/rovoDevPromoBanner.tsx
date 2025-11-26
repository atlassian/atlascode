import { LoadingButton } from '@atlaskit/button';
import * as React from 'react';

import { RovoDevEntitlementType } from '../../util/rovo-dev-entitlement/rovoDevEntitlementChecker';
import { RovoDevPromoBannerIcon } from './RovoDevPromoBannerIcon';

interface RovoDevPromoBannerProps {
    entitlementType: RovoDevEntitlementType;
    onOpen: () => void;
    onDismiss: () => void;
}

const RovoDevPromoBanner = ({ entitlementType, onOpen, onDismiss }: RovoDevPromoBannerProps) => {
    return (
        <div
            style={{
                display: 'flex',
                width: '100%',
                alignItems: 'center',
                padding: '14px 24px',
                marginBottom: '16px',
                gap: '16px',
                background: 'var(--Base-Base-19, #252526)',
            }}
        >
            <RovoDevPromoBannerIcon width={70} height={50} />
            <div>
                Your Jira site now has access to {entitlementType}, Atlassian's AI agent for software teams that uses
                your team's knowledge to streamline development from idea to deployment.
            </div>
            <div
                style={{
                    display: 'flex',
                    gap: '12px',
                }}
            >
                <LoadingButton
                    className="ac-button-secondary"
                    testId="rov-dev-promo-dismiss-button"
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

export default RovoDevPromoBanner;
