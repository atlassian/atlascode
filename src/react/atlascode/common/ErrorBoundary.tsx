// eslint-disable-next-line no-restricted-imports
import { AnalyticsErrorBoundary, AnalyticsListener, UIAnalyticsEvent } from '@atlaskit/analytics-next';
import React, { useCallback } from 'react';
import { AnalyticsChannels, UIAnalyticsContext } from 'src/analyticsTypes';
import { CommonActionType } from 'src/lib/ipc/fromUI/common';

// Maximum limit for the simplified stack trace
// We're using a high value deliberately for now, but it's arbitrary and can be changed in the future
const STACK_LIMIT = 1500;

const COMPONENT_GLOBAL = 'global';

export type AtlascodeErrorBoundaryProps = {
    postMessageFunc: (action: any) => void;
    context: UIAnalyticsContext;
    children?: React.ReactNode;
};

/**
 * Global error boundary for Atlascode UI components
 *
 * Put this somewhere close to the root of your component tree.
 * It will catch all rendering errors in the subtree and send them to the main process.
 *
 * Add `AnalyticsErrorBoundary` around the specific components you'd like to handle and track separately.
 *
 * @param {AtlascodeErrorBoundaryProps} props
 * @returns
 */
export const AtlascodeErrorBoundary: React.FC<AtlascodeErrorBoundaryProps> = ({
    children,
    postMessageFunc,
    context,
}: AtlascodeErrorBoundaryProps) => {
    const onRenderError = useCallback(
        (event: UIAnalyticsEvent) => {
            const { error, info, ...rest } = event.payload.attributes;
            postMessageFunc({
                type: CommonActionType.SendAnalytics,
                errorInfo: {
                    ...context,
                    errorType: error.name,
                    errorMessage: error.message,
                    errorCause: error.cause,
                    componentStack: simplifyStack(
                        info.componentStack,
                        (line) => line.match(/in (.*) \(created by (.*)\)/)?.[1],
                    ),
                    stack: simplifyStack(error.stack, (line) => line.match(/at (.*) \((.*)\)/)?.[1]),
                    ...rest,
                },
            });
        },
        [postMessageFunc, context],
    );

    return (
        <AnalyticsListener channel={AnalyticsChannels.AtlascodeUiErrors} onEvent={onRenderError}>
            <AnalyticsErrorBoundary
                channel={AnalyticsChannels.AtlascodeUiErrors}
                data={{ component: COMPONENT_GLOBAL }}
            >
                {children}
            </AnalyticsErrorBoundary>
        </AnalyticsListener>
    );
};

const simplifyStack = (stack: string, extractFunc: (line: string) => string | undefined) => {
    const line = stack.split('\n').map(extractFunc).filter(Boolean).join(' < ');

    return line.length > STACK_LIMIT ? line.substring(0, STACK_LIMIT) + '...' : line;
};
