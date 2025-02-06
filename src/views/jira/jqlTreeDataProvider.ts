import { isMinimalIssue, MinimalIssue, MinimalORIssueLink } from '@atlassianlabs/jira-pi-common-models';
import { Command, Disposable, Event, EventEmitter, TreeItem, l10n } from 'vscode';
import { DetailedSiteInfo, ProductJira } from '../../atlclients/authInfo';
import { Commands } from '../../commands';
import { JQLEntry } from '../../config/model';
import { Container } from '../../container';
import { fetchMinimalIssue } from '../../jira/fetchIssue';
import { issuesForJQL } from '../../jira/issuesForJql';
import { BaseTreeDataProvider } from '../Explorer';
import { AbstractBaseNode } from '../nodes/abstractBaseNode';
import { IssueNode } from '../nodes/issueNode';
import { SimpleJiraIssueNode } from '../nodes/simpleJiraIssueNode';

export abstract class JQLTreeDataProvider extends BaseTreeDataProvider implements AbstractBaseNode {
    public disposables: Disposable[] = [];

    protected _issues: MinimalIssue<DetailedSiteInfo>[] | undefined;
    private _jqlEntry: JQLEntry | undefined;
    private _jqlSite: DetailedSiteInfo | undefined;

    private _emptyState = 'No issues';
    private _emptyStateCommand: Command | undefined;
    protected _onDidChangeTreeData = new EventEmitter<AbstractBaseNode | null>();
    public get onDidChangeTreeData(): Event<AbstractBaseNode | null> {
        return this._onDidChangeTreeData.event;
    }

    constructor(jqlEntry?: JQLEntry, emptyState?: string, emptyStateCommand?: Command) {
        super();
        this._jqlEntry = jqlEntry;
        if (jqlEntry) {
            this._jqlSite = Container.siteManager.getSiteForId(ProductJira, jqlEntry.siteId);
        }

        if (emptyState && emptyState !== '') {
            this._emptyState = emptyState;
        }

        if (emptyStateCommand) {
            this._emptyStateCommand = emptyStateCommand;
        }
    }

    public setJqlEntry(entry: JQLEntry) {
        this._issues = undefined;
        this._jqlEntry = entry;
        this._jqlSite = Container.siteManager.getSiteForId(ProductJira, entry.siteId);
    }

    setEmptyState(text: string) {
        this._emptyState = text.trim() === '' ? 'No issues' : text;
    }

    refresh() {
        this._issues = undefined;
        this._onDidChangeTreeData.fire(null);
    }

    dispose() {
        this.disposables.forEach((d) => {
            d.dispose();
        });

        this.disposables = [];
    }

    async getChildren(parent?: IssueNode, allowFetch: boolean = true): Promise<IssueNode[]> {
        if (!Container.siteManager.productHasAtLeastOneSite(ProductJira)) {
            return [
                new SimpleJiraIssueNode(
                    l10n.t('Please login to Jira'),
                    {
                        command: Commands.ShowConfigPage,
                        title: l10n.t('Login to Jira'),
                        arguments: [ProductJira],
                    },
                    this,
                ),
            ];
        }
        if (parent) {
            return parent.getChildren();
        }
        if (!this._jqlEntry) {
            return [new SimpleJiraIssueNode(this._emptyState, this._emptyStateCommand, this)];
        } else if (this._issues) {
            return this.nodesForIssues();
        } else {
            return [];
        }
    }

    async executeQuery(): Promise<MinimalORIssueLink<DetailedSiteInfo>[]> {
        if (Container.siteManager.productHasAtLeastOneSite(ProductJira) && this._jqlEntry && this._jqlSite) {
            const newIssues = await issuesForJQL(this._jqlEntry.query, this._jqlSite);

            // We already have everything that matches the JQL. The subtasks likely include things that
            // don't match the query so we get rid of them.
            newIssues.forEach((i) => {
                i.subtasks = [];
            });

            if (Container.config.jira.explorer.nestSubtasks) {
                this._issues = await this.constructIssueTree(newIssues);
            } else {
                this._issues = newIssues;
            }

            return this.flattenIssueList(this._issues);
        }

        return [];
    }

    //Recursively traverse the issue tree and count all the issues
    flattenIssueList(issues: MinimalORIssueLink<DetailedSiteInfo>[]): MinimalORIssueLink<DetailedSiteInfo>[] {
        return issues.reduce((issueAccumulator, issue) => {
            if (isMinimalIssue(issue) && Array.isArray(issue.subtasks) && issue.subtasks.length > 0) {
                //Issue has subtasks, append the issue and the flattened subtasks
                return [...issueAccumulator, issue, ...this.flattenIssueList(issue.subtasks)];
            } else if (isMinimalIssue(issue) && Array.isArray(issue.epicChildren) && issue.epicChildren.length > 0) {
                //Issue is an epic, so append the issue and the flattened subtasks
                return [...issueAccumulator, issue, ...this.flattenIssueList(issue.epicChildren)];
            }
            //The issue is a regular issue, so just append the issue
            return [...issueAccumulator, issue];
        }, []);
    }

    abstract getTreeItem(): TreeItem;

    private async constructIssueTree(
        jqlIssues: MinimalIssue<DetailedSiteInfo>[],
    ): Promise<MinimalIssue<DetailedSiteInfo>[]> {
        const parentIssues = await this.fetchMissingAncestorIssues(jqlIssues);
        const jqlAndParents = [...jqlIssues, ...parentIssues];

        const rootIssues: MinimalIssue<DetailedSiteInfo>[] = [];
        jqlAndParents.forEach((i) => {
            const parentKey = i.parentKey ?? i.epicLink;
            if (parentKey) {
                const parent = jqlAndParents.find((i2) => parentKey === i2.key);
                if (parent) {
                    parent.subtasks.push(i);
                }
            } else {
                rootIssues.push(i);
            }
        });

        return [...rootIssues];
    }

    // Fetch any parents and grandparents that might be missing from the set to ensure that the a path can be drawn all
    // the way from a subtask to an epic.
    private async fetchMissingAncestorIssues(
        newIssues: MinimalIssue<DetailedSiteInfo>[],
    ): Promise<MinimalIssue<DetailedSiteInfo>[]> {
        if (newIssues.length < 1) {
            return [];
        }
        const site = newIssues[0].siteDetails;

        const missingParentKeys = this.calculateMissingParentKeys(newIssues);
        const parentIssues = await this.fetchIssuesForKeys(site, missingParentKeys);

        // If a jqlIssue is a sub-task we make a second call to make sure we get its parent's epic.
        const missingGrandparentKeys = this.calculateMissingParentKeys([...newIssues, ...parentIssues]);
        const grandparentIssues = await this.fetchIssuesForKeys(site, missingGrandparentKeys);

        return [...parentIssues, ...grandparentIssues];
    }

    private calculateMissingParentKeys(issues: MinimalIssue<DetailedSiteInfo>[]): string[] {
        // On NextGen projects epics are considered parents to issues and parentKey points to them. On classic projects
        // issues parentKey doesn't point to its epic, but its epicLink does. In both cases parentKey points to the
        // parent task for subtasks. Since they're disjoint we can just take both and treat them the same.
        const parentKeys = issues.filter((i) => i.parentKey).map((i) => i.parentKey) as string[];
        const epicKeys = issues.filter((i) => i.epicLink).map((i) => i.epicLink) as string[];
        const uniqueParentKeys = Array.from(new Set([...parentKeys, ...epicKeys]));
        return uniqueParentKeys.filter((k) => !issues.some((i) => i.key === k));
    }

    private async fetchIssuesForKeys(
        site: DetailedSiteInfo,
        keys: string[],
    ): Promise<MinimalIssue<DetailedSiteInfo>[]> {
        return await Promise.all(
            keys.map(async (issueKey) => {
                const parent = await fetchMinimalIssue(issueKey, site);
                // we only need the parent information here, we already have all the subtasks that satisfy the jql query
                parent.subtasks = [];
                return parent;
            }),
        );
    }

    private nodesForIssues(): IssueNode[] {
        if (this._issues && this._issues.length > 0) {
            return this._issues.map((issue) => new IssueNode(issue, this));
        } else {
            return [new SimpleJiraIssueNode(this._emptyState, undefined, this)];
        }
    }

    getParent() {
        return undefined;
    }
}
