import Page, { Grid, GridColumn } from '@atlaskit/page';
import { emptyProject, Project } from '@atlassianlabs/jira-pi-common-models';
import { CreateMetaTransformerProblems } from '@atlassianlabs/jira-pi-meta-models';
import * as React from 'react';
import { IssueProblemsData } from '../../../ipc/issueMessaging';
import { Action, HostErrorMessage } from '../../../ipc/messaging';
import ErrorBanner from '../ErrorBanner';
import { WebviewComponent } from '../WebviewComponent';
import * as l10n from '@vscode/l10n';
//import TableTree from '@atlaskit/table-tree';
type Accept = IssueProblemsData | HostErrorMessage;

interface ViewState {
    isErrorBannerOpen: boolean;
    errorDetails: any;
    problems: CreateMetaTransformerProblems;
    project: Project;
}

export default class CreateIssueProblems extends WebviewComponent<Action, Accept, {}, ViewState> {
    constructor(props: any) {
        super(props);
        this.state = {
            isErrorBannerOpen: false,
            errorDetails: undefined,
            problems: {},
            project: emptyProject,
        };
    }

    onMessageReceived(e: any): boolean {
        switch (e.type) {
            case 'error': {
                this.setState({ isErrorBannerOpen: true, errorDetails: e.reason });
                break;
            }
            case 'screenRefresh': {
                this.setState({
                    problems: e.problems,
                    project: e.project,
                    isErrorBannerOpen: false,
                    errorDetails: undefined,
                });
                break;
            }
        }
        return true;
    }

    handleDismissError = () => {
        this.setState({ isErrorBannerOpen: false, errorDetails: undefined });
    };

    public render() {
        let issueTypeProblems: any[] = [];
        Object.keys(this.state.problems).forEach((problemKey) => {
            const problem = this.state.problems[problemKey];
            let issueTypeFields: any[] = [];
            problem.nonRenderableFields.forEach((fieldProblem) => {
                issueTypeFields.push(
                    <tr>
                        <td>{fieldProblem.name}</td>
                        <td>{fieldProblem.key}</td>
                        <td style={{ textAlign: 'center' }}>{String(fieldProblem.required)}</td>
                        <td>{fieldProblem.schema}</td>
                        <td>{fieldProblem.message}</td>
                    </tr>,
                );
            });
            issueTypeProblems.push(
                <tr className="issuetype-row">
                    <td>
                        <div className="ac-icon-with-text">
                            <img src={problem.issueType.iconUrl} />
                            <h3 style={{ marginLeft: '10px' }}>{problem.issueType.name}</h3>
                        </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>{String(problem.isRenderable)}</td>
                    <td>{problem.message}</td>
                </tr>,
            );
            issueTypeProblems.push(
                <tr>
                    <td colSpan={3}>
                        <h4 style={{ marginTop: '3px', marginBottom: '5px;' }}>Non-renderable Fields:</h4>
                        <table className="field-problem-table">
                            <tr>
                                <th>{l10n.t('Field Name')}</th>
                                <th>{l10n.t('Key')}</th>
                                <th>{l10n.t('Is Required')}</th>
                                <th>{l10n.t('Schema')}</th>
                                <th>{l10n.t('Message')}</th>
                            </tr>
                            {issueTypeFields}
                        </table>
                    </td>
                </tr>,
            );
        });

        return (
            <Page>
                <Grid>
                    <GridColumn medium={20}>
                        <div>
                            {this.state.isErrorBannerOpen && (
                                <ErrorBanner
                                    onDismissError={this.handleDismissError}
                                    errorDetails={this.state.errorDetails}
                                />
                            )}
                            <h2>
                                {l10n.t(
                                    'Create Issue Problem Report: {0} ({1})',
                                    this.state.project.name,
                                    this.state.project.key,
                                )}
                            </h2>
                            <table className="problem-table">
                                <tr>
                                    <th>{l10n.t('Issue Type')}</th>
                                    <th>{l10n.t('Is Renderable')}</th>
                                    <th>{l10n.t('Message')}</th>
                                </tr>
                                {issueTypeProblems}
                            </table>
                        </div>
                    </GridColumn>
                </Grid>
            </Page>
        );
    }
}
