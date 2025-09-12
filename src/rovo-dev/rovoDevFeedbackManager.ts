import { truncate } from 'lodash';
import { Container } from 'src/container';
import { getAxiosInstance } from 'src/jira/jira-client/providers';
import { Logger } from 'src/logger';
import * as vscode from 'vscode';

import { MIN_SUPPORTED_ROVODEV_VERSION } from './rovoDevProcessManager';

interface FeedbackObject {
    feedbackType: 'bug' | 'reportContent' | 'general';
    feedbackMessage: string;
    canContact: boolean;
    lastTenMessages?: string[];
}

const FEEDBACK_ENDPOINT = `https://jsd-widget.atlassian.com/api/embeddable/57037b9e-743e-407d-bb03-441a13c7afd0/request?requestTypeId=3066`;

export class RovoDevFeedbackManager {
    public static async submitFeedback(feedback: FeedbackObject, isBBY: boolean = false): Promise<void> {
        const transport = getAxiosInstance();
        const context = this.getContext(isBBY);

        let userEmail = 'do-not-reply@atlassian.com';
        let userName = 'unknown';

        if (feedback.canContact) {
            // Get user info from primary site if available
            const primarySite = Container.siteManager.primarySite;
            const info = primarySite ? await Container.credentialManager.getAuthInfo(primarySite) : undefined;

            if (info && info.user) {
                userEmail = info.user.email;
                userName = info.user.displayName;
            }
        }

        let descriptionHeader = '';
        if (feedback.feedbackType === 'general') {
            descriptionHeader = 'Feedback:';
        } else if (feedback.feedbackType === 'bug') {
            descriptionHeader = 'Bug report:';
        } else if (feedback.feedbackType === 'reportContent') {
            descriptionHeader = 'Inappropriate content report:';
        }

        const description = `*${descriptionHeader}* ${feedback.feedbackMessage}`;

        const payload = {
            fields: [
                {
                    id: 'summary',
                    value: truncate(feedback.feedbackMessage.trim().split('\n', 1)[0], {
                        length: 100,
                        separator: /,?\s+/,
                    }).trim(),
                },
                {
                    id: 'description',
                    value: `${description}\n\n*Last 10 messages:*\n ${feedback.lastTenMessages && feedback.lastTenMessages.join('\n\n')}`,
                },
                {
                    // Feedback context (text)
                    id: 'customfield_10047',
                    value: JSON.stringify(context, undefined, 4),
                },
                {
                    // Feedback type General: Comment, Bug/ReportContent: Bug)
                    id: 'customfield_10042',
                    value: { id: feedback.feedbackType === 'general' ? '10106' : '10105' },
                },
                {
                    // User name (text, optional)
                    id: 'customfield_10045',
                    value: userName,
                },
                {
                    id: 'email',
                    value: userEmail,
                },
                {
                    id: 'customfield_10043',
                    value: [{ id: feedback.canContact ? '10109' : '10111' }],
                },
            ],
        };

        try {
            await transport(FEEDBACK_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                data: payload,
            });
        } catch (error) {
            Logger.error(error as Error, 'Error submitting Rovo Dev feedback');
            vscode.window.showErrorMessage('There was an error submitting your feedback. Please try again later.');
            return;
        }

        vscode.window.showInformationMessage('Thank you for your feedback!');
    }

    private static getContext(isBBY: boolean = false): any {
        return {
            component: isBBY ? 'Boysenberry - vscode' : 'IDE - vscode',
            extensionVersion: Container.version,
            vscodeVersion: vscode.version,
            rovoDevVersion: MIN_SUPPORTED_ROVODEV_VERSION,
        };
    }
}
