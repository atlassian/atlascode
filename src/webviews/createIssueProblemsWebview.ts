import { Project } from '@atlassianlabs/jira-pi-common-models';
import { ViewColumn, l10n } from 'vscode';
import { DetailedSiteInfo, Product, ProductJira } from '../atlclients/authInfo';
import { fetchCreateIssueUI } from '../jira/fetchIssue';
import { Logger } from '../logger';
import { AbstractReactWebview } from './abstractWebview';

export class CreateIssueProblemsWebview extends AbstractReactWebview {
    private _site: DetailedSiteInfo | undefined;
    private _project: Project | undefined;

    constructor(extensionPath: string) {
        super(extensionPath);
    }

    public get title(): string {
        return l10n.t('Create JIRA Issue Problem Report');
    }
    public get id(): string {
        return 'atlascodeCreateIssueProblemsScreen';
    }

    public get siteOrUndefined(): DetailedSiteInfo | undefined {
        return this._site;
    }

    public get productOrUndefined(): Product | undefined {
        return ProductJira;
    }

    async createOrShow(column?: ViewColumn, site?: DetailedSiteInfo, project?: Project): Promise<void> {
        await super.createOrShow(column);
        this._site = site;
        this._project = project;
    }

    public async invalidate() {
        if (this.isRefeshing) {
            return;
        }

        this.isRefeshing = true;

        try {
            if (!this._site || !this._project) {
                let err = new Error(`site or project is missing: site: ${this._site}, project: ${this._project}`);
                Logger.error(err);
                this.postMessage({
                    type: 'error',
                    reason: `site or project is missing: site: ${this._site}, project: ${this._project}`,
                });
                return;
            }

            let data = await fetchCreateIssueUI(this._site, this._project.key);

            this.postMessage({ type: 'screenRefresh', problems: data.problems, project: this._project });
        } catch (e) {
            let err = new Error(`error updating issue fields: ${e}`);
            Logger.error(err);
            this.postMessage({ type: 'error', reason: `error updating issue fields: ${e}` });
        } finally {
            this.isRefeshing = false;
        }
    }
}
