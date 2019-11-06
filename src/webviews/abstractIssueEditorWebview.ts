import { ValueType } from "jira-metaui-transformer";
import { isAutocompleteSuggestionsResult, isGroupPickerResult, isIssuePickerResult, isProjectsResult, IssuePickerIssue, IssuePickerResult } from "jira-pi-client";
import { showIssue } from "../commands/jira/showIssue";
import { Container } from "../container";
import { isCreateSelectOption, isFetchQueryAndSite, isOpenJiraIssue } from "../ipc/issueActions";
import { isAction } from "../ipc/messaging";
import { Logger } from "../logger";
import { AbstractReactWebview } from "./abstractWebview";

export abstract class AbstractIssueEditorWebview extends AbstractReactWebview {

    abstract async handleSelectOptionCreated(fieldKey: string, newValue: any, nonce?: string): Promise<void>;

    protected formatSelectOptions(result: any, valueType?: ValueType): any[] {
        let suggestions: any[] = [];

        if (isIssuePickerResult(result)) {
            if (Array.isArray(result.sections)) {
                suggestions = result.sections.reduce((prev, curr) => prev.concat(curr.issues), [] as IssuePickerIssue[]);
            }
        } else if (isGroupPickerResult(result)) {
            // NOTE: since the group endpoint doesn't support OAuth 2, this will never be called, but
            // we're keeping it here for future wackiness.
            suggestions = result.groups.map(result => {
                return { label: result.html, value: result.name };
            });
        } else if (isAutocompleteSuggestionsResult(result)) {
            suggestions = result.results.map(result => {
                return { label: result.displayName, value: result.value };
            });
        } else if (isProjectsResult(result)) {
            suggestions = result.values;
        } else if (Array.isArray(result)) {
            suggestions = result;
        }
        return suggestions;
    }

    protected async onMessageReceived(msg: any): Promise<boolean> {
        let handled = await super.onMessageReceived(msg);

        if (!handled) {
            if (isAction(msg)) {
                switch (msg.action) {
                    case 'fetchIssues': {
                        handled = true;
                        if (isFetchQueryAndSite(msg)) {
                            try {
                                let client = await Container.clientManager.jiraClient(msg.site);
                                let suggestions: IssuePickerIssue[] = [];
                                if (msg.autocompleteUrl && msg.autocompleteUrl.trim() !== '') {
                                    const result: IssuePickerResult = await client.getAutocompleteDataFromUrl(msg.autocompleteUrl + msg.query);
                                    if (Array.isArray(result.sections)) {
                                        suggestions = result.sections.reduce((prev, curr) => prev.concat(curr.issues), [] as IssuePickerIssue[]);
                                    }
                                } else {
                                    suggestions = await client.getIssuePickerSuggestions(msg.query);
                                }

                                this.postMessage({ type: 'issueSuggestionsList', issues: suggestions, nonce: msg.nonce });
                            } catch (e) {
                                Logger.error(new Error(`error posting comment: ${e}`));
                                this.postMessage({ type: 'error', reason: this.formatErrorReason(e, 'Error fetching issues'), nonce: msg.nonce });
                            }
                        }
                        break;
                    }
                    case 'fetchSelectOptions': {
                        handled = true;
                        if (isFetchQueryAndSite(msg)) {
                            try {
                                let client = await Container.clientManager.jiraClient(msg.site);
                                let suggestions: any[] = [];
                                if (msg.autocompleteUrl && msg.autocompleteUrl.trim() !== '') {
                                    const result = await client.getAutocompleteDataFromUrl(msg.autocompleteUrl + msg.query);
                                    suggestions = this.formatSelectOptions(result);
                                }

                                this.postMessage({ type: 'selectOptionsList', options: suggestions, nonce: msg.nonce });
                            } catch (e) {
                                Logger.error(new Error(`error posting comment: ${e}`));
                                this.postMessage({ type: 'error', reason: this.formatErrorReason(e, 'Error fetching issues'), nonce: msg.nonce });
                            }
                        }
                        break;
                    }
                    case 'openJiraIssue': {
                        handled = true;
                        if (isOpenJiraIssue(msg)) {
                            showIssue(msg.issueOrKey);
                        }
                        break;
                    }
                    case 'createOption': {
                        handled = true;
                        if (isCreateSelectOption(msg)) {
                            try {
                                let client = await Container.clientManager.jiraClient(msg.siteDetails);
                                const result = await client.postCreateUrl(msg.createUrl, msg.createData);
                                await this.handleSelectOptionCreated(msg.fieldKey, result, msg.nonce);
                            } catch (e) {
                                Logger.error(new Error(`error creating select option: ${e}`));
                                this.postMessage({ type: 'error', reason: this.formatErrorReason(e, 'Error creating select option'), nonce: msg.nonce });
                            }
                        }
                        break;
                    }
                }
            }
        }

        return handled;
    }
}