import { DetailedSiteInfo, ProductJira } from 'src/atlclients/authInfo';
import { Container } from 'src/container';
import { Logger } from 'src/logger';
import { window, workspace } from 'vscode';

import { fetchIssueSuggestions, findApiTokenForSite } from '../../atlclients/issueBuilder';
import { IssueSuggestionContextLevel, IssueSuggestionSettings, SimplifiedTodoIssueData } from '../../config/model';
import { Features } from '../../util/featureFlags';

export class IssueSuggestionManager {
    constructor(private readonly settings: IssueSuggestionSettings) {}

    createSuggestionPrompt(
        data: SimplifiedTodoIssueData,
        contextLevel?: IssueSuggestionContextLevel,
    ): { prompt: string; context?: string } {
        if (!contextLevel) {
            throw new Error('Context level is not defined');
        }

        switch (contextLevel) {
            case IssueSuggestionContextLevel.TodoOnly: {
                return {
                    prompt: data.summary,
                };
            }
            case IssueSuggestionContextLevel.CodeContext: {
                return {
                    prompt: data.summary,
                    context: data.context,
                };
            }
            default:
                throw new Error(`Unknown context level: ${contextLevel}`);
        }
    }

    getSuggestionSettings(): IssueSuggestionSettings {
        return this.settings;
    }

    async generateIssueSuggestion(data: SimplifiedTodoIssueData) {
        const { prompt, context } = this.createSuggestionPrompt(data, this.settings.level);
        try {
            const suggestionSite = getSelectedSite();
            if (!suggestionSite) {
                throw new Error('No site selected for issue suggestions');
            }
            const response = await fetchIssueSuggestions(suggestionSite, prompt, context);
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
            Logger.error(error, 'Error fetching issue suggestions');
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
        return this.settings.isEnabled && this.settings.isAvailable
            ? this.generateIssueSuggestion(data)
            : this.generateDummyIssueSuggestion(data);
    }

    async sendFeedback(isPositive: boolean, data: SimplifiedTodoIssueData) {
        const feedback = isPositive
            ? `Positive feedback for issue suggestion: ${data.summary}`
            : `Negative feedback for issue suggestion: ${data.summary}`;
        console.log('Sending feedback:', feedback);
        try {
            await Container.analyticsApi.fireFeedbackSentEvent({
                feature: 'issueSuggestions',
                feedbackType: isPositive ? 'positive' : 'negative',
            });
            window.showInformationMessage(`Thank you for your feedback!`);
        } catch (error) {
            Logger.error(error, 'Error sending feedback');
            window.showErrorMessage('Error sending feedback: ' + error.message);
        }
    }
}

export async function buildSuggestionSettings(): Promise<IssueSuggestionSettings> {
    const isSuggestionEnabled = getSuggestionEnabled();
    const contextLevel = getSuggestionContextLevel();
    const isSuggestionAvailable = await getSuggestionAvailable();

    return {
        isAvailable: isSuggestionAvailable,
        isEnabled: isSuggestionEnabled,
        level: contextLevel,
    };
}
function getSuggestionEnabled(): boolean {
    if (!Container.featureFlagClient.checkGate(Features.EnableAiSuggestions)) {
        return false;
    }

    const config = workspace.getConfiguration('atlascode.issueSuggestion').get<boolean>('enabled');
    return Boolean(config);
}

function getSuggestionContextLevel(): IssueSuggestionContextLevel {
    const config = workspace
        .getConfiguration('atlascode')
        .get<IssueSuggestionContextLevel>('issueSuggestion.contextLevel');

    return config || IssueSuggestionContextLevel.CodeContext;
}

function getSelectedSite(): DetailedSiteInfo | undefined {
    const siteId = workspace.getConfiguration('atlascode').get<string>('jira.lastCreateSiteAndProject.siteId');
    return siteId ? Container.siteManager.getSiteForId(ProductJira, siteId) : undefined;
}

async function getSuggestionAvailable(): Promise<boolean> {
    const isFeatureEnabled = Container.featureFlagClient.checkGate(Features.EnableAiSuggestions);
    if (!isFeatureEnabled) {
        return false;
    }

    const selectedSite = getSelectedSite();
    if (!selectedSite) {
        return false;
    }

    return (await findApiTokenForSite(selectedSite)) !== undefined;
}
