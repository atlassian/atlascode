import { trackEvent, viewScreenEvent } from 'src/analytics';
import { ProductRovoDev } from 'src/atlclients/authInfo';
import { Container } from 'src/container';
import { commands } from 'vscode';

import { TrackEvent } from './events';

/**
 * Command registered by the VSCode fork (see
 * `src/vs/workbench/browser/rovoDevInJiraMessageCommands.ts`) that forwards the
 * provided payload to the parent window via `postMessage`. This is the
 * atlascode → VSCode → Jira analytics bridge used when atlascode is embedded
 * inside Jira's web UI (Boysenberry mode).
 *
 * Expected payload shape:
 *   { eventType: string, event: { action, subject, attributes } }
 */
const SEND_ANALYTICS_EVENT_COMMAND = 'workbench.action.sendAnalyticsEvent';

/**
 * Forward a Rovo Dev analytics event to the VSCode → Jira bridge when running
 * in Boysenberry mode. Failures are swallowed so that bridge issues never break
 * the standard telemetry path.
 */
async function forwardToBoysenberryBridge(
    eventType: 'track' | 'screen',
    event: { action: string; subject?: string; attributes?: Record<string, any> },
): Promise<void> {
    if (!Container.isBoysenberryMode) {
        return;
    }

    try {
        await commands.executeCommand(SEND_ANALYTICS_EVENT_COMMAND, {
            eventType,
            event,
        });
    } catch {
        // Intentionally swallow — the bridge is best-effort and must never
        // interfere with the existing telemetry pipeline.
    }
}

export class RovodevAnalyticsApi {
    sendTrackEvent = async (event: TrackEvent) => {
        const finalizedEvent = await trackEvent(event.action, event.subject, { attributes: event.attributes });
        await Container.analyticsClient.sendTrackEvent(finalizedEvent);

        await forwardToBoysenberryBridge('track', {
            action: event.action,
            subject: event.subject,
            attributes: event.attributes,
        });
    };

    sendScreenEvent = async (screenName: string) => {
        const finalizedEvent = await viewScreenEvent(screenName, undefined, ProductRovoDev);
        await Container.analyticsClient.sendScreenEvent(finalizedEvent);

        await forwardToBoysenberryBridge('screen', {
            action: 'viewed',
            subject: screenName,
        });
    };
}
