import { FeatureFlagClient, Features } from 'src/util/featureFlags';
import { window, workspace } from 'vscode';

import { fetchIssueSuggestions, findCloudSiteWithApiKey } from '../../atlclients/issueBuilder';
import { IssueSuggestionContextLevel, IssueSuggestionSettings, SimplifiedTodoIssueData } from '../../config/model';

export class IssueSuggestionManager {
    static getSuggestionEnabled(): boolean {
        const config = workspace.getConfiguration('atlascode.issueSuggestion').get<boolean>('enabled');
        return config === true; // (as opposed to undefined)
    }

    static getSuggestionContextLevel(): IssueSuggestionContextLevel {
        const config = workspace
            .getConfiguration('atlascode')
            .get<IssueSuggestionContextLevel>('issueSuggestion.contextLevel');

        return config || IssueSuggestionContextLevel.CodeContext;
    }

    static async getSuggestionAvailable(): Promise<boolean> {
        return FeatureFlagClient.checkGate(Features.EnableAiSuggestions) && (await findCloudSiteWithApiKey()) !== null;
    }

    static async buildSettings(): Promise<IssueSuggestionSettings> {
        const isSuggestionEnabled = this.getSuggestionEnabled();
        const contextLevel = this.getSuggestionContextLevel();
        const isSuggestionAvailable = await this.getSuggestionAvailable();

        return {
            isAvailable: isSuggestionAvailable,
            isEnabled: isSuggestionEnabled,
            level: contextLevel,
        };
    }

    constructor(private readonly settings: IssueSuggestionSettings) {}

    createSuggestionPrompt(data: SimplifiedTodoIssueData, contextLevel?: IssueSuggestionContextLevel): string {
        if (!contextLevel) {
            throw new Error('Context level is not defined');
        }

        switch (contextLevel) {
            case IssueSuggestionContextLevel.TodoOnly: {
                return `Create a Jira issue based on the following TODO comment:\n\n${data.summary}`;
            }
            case IssueSuggestionContextLevel.CodeContext: {
                return `Create a Jira issue based on the following TODO comment:\n\n${data.summary}. The code context in which it appears is:\n\n${data.context}`;
            }
            default:
                throw new Error(`Unknown context level: ${contextLevel}`);
        }
    }

    getSuggestionSettings(): IssueSuggestionSettings {
        return this.settings;
    }

    async generateIssueSuggestion(data: SimplifiedTodoIssueData) {
        const prompt = this.createSuggestionPrompt(data, this.settings.level);
        try {
            const response = await fetchIssueSuggestions(prompt);
            const issue = response.suggestedIssues[0];
            if (!issue) {
                return {
                    summary: '',
                    description: '',
                    error: 'Unable to fetch issue suggestions. Sorry!',
                };
            }
            return {
                summary: issue.fieldValues.summary,
                description: issue.fieldValues.description,
                error: '',
            };
        } catch (error) {
            console.error('Error fetching issue suggestions:', error);
            window.showErrorMessage('Error fetching issue suggestions: ' + error.message);
            return {
                summary: '',
                description: '',
                error: 'Error fetching issue suggestions: ' + error.message,
            };
        }
    }

    async generateDummyIssueSuggestion(data: SimplifiedTodoIssueData) {
        return {
            summary: data.summary,
            description: `File: ${data.uri}\nLine: ${data.position.line}`,
        };
    }

    async generate(data: SimplifiedTodoIssueData) {
        return this.settings.isEnabled ? this.generateIssueSuggestion(data) : this.generateDummyIssueSuggestion(data);
    }

    async sendFeedback(isPositive: boolean, data: SimplifiedTodoIssueData) {
        const feedback = isPositive
            ? `Positive feedback for issue suggestion: ${data.summary}`
            : `Negative feedback for issue suggestion: ${data.summary}`;
        console.log('Sending feedback:', feedback);
        try {
            // TODO: actually send an analytics event
            window.showInformationMessage(`Thank you for your feedback!`);
        } catch (error) {
            console.error('Error sending feedback:', error);
            window.showErrorMessage('Error sending feedback: ' + error.message);
        }
    }
}
