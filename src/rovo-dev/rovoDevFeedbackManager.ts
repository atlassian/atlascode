import { truncate } from 'lodash';
import { UserInfo } from 'src/atlclients/authInfo';
import * as vscode from 'vscode';

import { ExtensionApi, getAxiosInstance } from './api/extensionApi';
import { MIN_SUPPORTED_ROVODEV_VERSION } from './rovoDevProcessManager';
import { RovoDevLogger } from './util/rovoDevLogger';

interface FeedbackObject {
    feedbackType: 'bug' | 'reportContent' | 'general';
    feedbackMessage: string;
    canContact: boolean;
    lastTenMessages?: string[];
    rovoDevSessionId?: string;
}

const FEEDBACK_ENDPOINT = `https://jsd-widget.atlassian.com/api/embeddable/57037b9e-743e-407d-bb03-441a13c7afd0/request?requestTypeId=3066`;

export class RovoDevFeedbackManager {
    public static async submitFeedback(
        feedback: FeedbackObject,
        user?: UserInfo,
        isBBY: boolean = false,
    ): Promise<void> {
        const transport = getAxiosInstance();
        const context = this.getContext(isBBY, feedback.rovoDevSessionId);

        let userEmail = 'do-not-reply@atlassian.com';
        let userName = 'unknown';

        if (feedback.canContact && user) {
            userEmail = user.email;
            userName = user.displayName;
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
            RovoDevLogger.error(error, 'Error submitting Rovo Dev feedback');
            vscode.window.showErrorMessage('There was an error submitting your feedback. Please try again later.');
            return;
        }

        vscode.window.showInformationMessage('Thank you for your feedback!');
    }

    private static getContext(isBBY: boolean = false, rovoDevSessionId?: string): any {
        const extensionApi = new ExtensionApi();
        return {
            component: isBBY ? 'Boysenberry - vscode' : 'IDE - vscode',
            extensionVersion: extensionApi.metadata.version(),
            vscodeVersion: vscode.version,
            rovoDevVersion: MIN_SUPPORTED_ROVODEV_VERSION,
            ...(rovoDevSessionId && { rovoDevSessionId }),
        };
    }
}
