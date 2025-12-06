import { trackEvent } from 'src/analytics';
import { TrackEvent } from 'src/analytics-node-client/src/types';
import { Container } from 'src/container';

import { RovoDevCommonParams, RovoDevEnv, RovoDevPerfEvent } from './rovodevAnalyticsTypes';

export class RovodevAnalyticsApi {
    sendTrackEvent = async (event: any) => {
        await Container.analyticsClient.sendTrackEvent(event);
    };

    performanceEvent = async (
        tag: RovoDevPerfEvent,
        measure: number,
        params: RovoDevCommonParams,
    ): Promise<TrackEvent> => {
        return trackEvent('performanceEvent', 'atlascode', {
            attributes: { tag, measure, ...(params || {}) },
        });
    };
}

// Rovo Dev events, previously from src/analytics.ts
// TODO: refactor these, and particularly the usage in RovoDevTelemetryProvider, in a follow-up

export function rovoDevEntitlementCheckEvent(isEntitled: boolean, type: string, source?: string) {
    return trackEvent('checked', 'rovoDevEntitlement', {
        attributes: { source, isEntitled, type },
    });
}
export function rovoDevNewSessionActionEvent(
    rovoDevEnv: RovoDevEnv,
    appInstanceId: string,
    sessionId: string,
    isManuallyCreated: boolean,
) {
    return trackEvent('rovoDevNewSessionAction', 'atlascode', {
        attributes: { rovoDevEnv, appInstanceId, sessionId, isManuallyCreated },
    });
}

export function rovoDevPromptSentEvent(
    rovoDevEnv: RovoDevEnv,
    appInstanceId: string,
    sessionId: string,
    promptId: string,
    deepPlanEnabled: boolean,
) {
    return trackEvent('rovoDevPromptSent', 'atlascode', {
        attributes: { rovoDevEnv, appInstanceId, sessionId, promptId, deepPlanEnabled },
    });
}

export function rovoDevTechnicalPlanningShownEvent(
    rovoDevEnv: RovoDevEnv,
    appInstanceId: string,
    sessionId: string,
    promptId: string,
    stepsCount: number,
    filesCount: number,
    questionsCount: number,
) {
    return trackEvent('rovoDevTechnicalPlanningShown', 'atlascode', {
        attributes: { rovoDevEnv, appInstanceId, sessionId, promptId, stepsCount, filesCount, questionsCount },
    });
}

export function rovoDevFilesSummaryShownEvent(
    rovoDevEnv: RovoDevEnv,
    appInstanceId: string,
    sessionId: string,
    promptId: string,
    filesCount: number,
) {
    return trackEvent('rovoDevFilesSummaryShown', 'atlascode', {
        attributes: { rovoDevEnv, appInstanceId, sessionId, promptId, filesCount },
    });
}

export function rovoDevFileChangedActionEvent(
    rovoDevEnv: RovoDevEnv,
    appInstanceId: string,
    sessionId: string,
    promptId: string,
    action: 'undo' | 'keep',
    filesCount: number,
) {
    return trackEvent('rovoDevFileChangedAction', 'atlascode', {
        attributes: { rovoDevEnv, appInstanceId, sessionId, promptId, action, filesCount },
    });
}

export function rovoDevStopActionEvent(
    rovoDevEnv: RovoDevEnv,
    appInstanceId: string,
    sessionId: string,
    promptId: string,
    failed?: boolean,
) {
    return trackEvent('rovoDevStopAction', 'atlascode', {
        attributes: { rovoDevEnv, appInstanceId, sessionId, promptId, failed },
    });
}

export function rovoDevGitPushActionEvent(
    rovoDevEnv: RovoDevEnv,
    appInstanceId: string,
    sessionId: string,
    promptId: string,
    prCreated: boolean,
) {
    return trackEvent('rovoDevGitPushAction', 'atlascode', {
        attributes: { rovoDevEnv, appInstanceId, sessionId, promptId, prCreated },
    });
}

export function rovoDevDetailsExpandedEvent(
    rovoDevEnv: RovoDevEnv,
    appInstanceId: string,
    sessionId: string,
    promptId: string,
) {
    return trackEvent('rovoDevDetailsExpanded', 'atlascode', {
        attributes: { rovoDevEnv, appInstanceId, sessionId, promptId },
    });
}

export function rovoDevCreatePrButtonClickedEvent(
    rovoDevEnv: RovoDevEnv,
    appInstanceId: string,
    sessionId: string,
    promptId: string,
) {
    return trackEvent('clicked', 'rovoDevCreatePrButton', {
        attributes: { rovoDevEnv, appInstanceId, sessionId, promptId },
    });
}

export function rovoDevAiResultViewedEvent(
    rovoDevEnv: RovoDevEnv,
    appInstanceId: string,
    sessionId: string,
    promptId: string,
    dwellMs: number,
) {
    return trackEvent('viewed', 'aiResult', {
        attributes: {
            rovoDevEnv,
            appInstanceId,
            sessionId,
            promptId,
            dwellMs,
            xid: 'rovodev-sessions',
            singleInstrumentationID: promptId,
            aiFeatureName: 'rovodevSessions',
            proactiveGeneratedAI: 0,
            userGeneratedAI: 1,
            isAIFeature: 1,
        },
    });
}

export function rovoDevPromptTextInputEvent(
    rovoDevEnv: RovoDevEnv,
    appInstanceId: string,
    sessionId: string,
    promptId: string,
) {
    return trackEvent('rovoDevPromptTextInput', 'atlascode', {
        attributes: { rovoDevEnv, appInstanceId, sessionId, promptId },
    });
}
