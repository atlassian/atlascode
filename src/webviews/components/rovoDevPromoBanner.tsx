import Button from '@atlaskit/button';
import * as React from 'react';

import { RovoDevEntitlementType } from '../../util/rovo-dev-entitlement/rovoDevEntitlementChecker';

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
                alignItems: 'center',
                padding: '16px',
                backgroundColor: '#2C2C2C',
                borderRadius: '4px',
                marginBottom: '16px',
                gap: '16px',
            }}
        >
            {/* Overlapping Icons */}
            <div style={{ display: 'flex', alignItems: 'center', position: 'relative', flexShrink: 0 }}>
                {/* Left icon - lime green with black shape */}
                <div
                    style={{
                        position: 'relative',
                        width: '40px',
                        height: '40px',
                        borderRadius: '4px',
                        backgroundColor: '#A4E635',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 2,
                        marginRight: '-8px',
                    }}
                >
                    <div
                        style={{
                            width: '18px',
                            height: '18px',
                            backgroundColor: '#000000',
                            clipPath: 'polygon(50% 0%, 0% 50%, 50% 100%, 100% 50%)',
                        }}
                    />
                </div>
                {/* Right icon - blue with white chevrons */}
                <div
                    style={{
                        position: 'relative',
                        width: '40px',
                        height: '40px',
                        borderRadius: '4px',
                        backgroundColor: '#0052CC',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1,
                    }}
                >
                    <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
                        <div
                            style={{
                                width: 0,
                                height: 0,
                                borderLeft: '5px solid white',
                                borderTop: '4px solid transparent',
                                borderBottom: '4px solid transparent',
                            }}
                        />
                        <div
                            style={{
                                width: 0,
                                height: 0,
                                borderLeft: '5px solid white',
                                borderTop: '4px solid transparent',
                                borderBottom: '4px solid transparent',
                            }}
                        />
                        <div
                            style={{
                                width: 0,
                                height: 0,
                                borderLeft: '5px solid white',
                                borderTop: '4px solid transparent',
                                borderBottom: '4px solid transparent',
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Text Content */}
            <div
                style={{
                    flex: 1,
                    color: '#FFFFFF',
                    fontSize: '14px',
                    lineHeight: '20px',
                }}
            >
                Your Jira site now has access to {entitlementType}, Atlassian's AI agent for software teams that uses
                your team's knowledge to streamline development from idea to deployment.
            </div>

            {/* Buttons */}
            <div
                style={{
                    display: 'flex',
                    gap: '8px',
                    flexShrink: 0,
                }}
            >
                <Button
                    className="ac-button"
                    appearance="subtle"
                    onClick={onDismiss}
                    style={{
                        backgroundColor: '#2C2C2C',
                        color: '#FFFFFF',
                    }}
                >
                    Dismiss
                </Button>
                <Button className="ac-button" appearance="primary" onClick={onOpen}>
                    Open Rovo Dev
                </Button>
            </div>
        </div>
    );
};

export default RovoDevPromoBanner;
