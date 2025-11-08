import { IssueType, Project } from '@atlassianlabs/jira-pi-common-models';
import path from 'path';
import { DetailedSiteInfo, ProductJira } from 'src/atlclients/authInfo';
import { setCommandContext } from 'src/commandContext';
import { Container } from 'src/container';
import { fetchCreateIssueUI } from 'src/jira/fetchIssue';
import {
    CreateWorkItemWebviewResponse,
    CreateWorkItemWebviewResponseType,
} from 'src/react/atlascode/create-work-item/createWorkItemWebviewMessages';
import { TypedWebview } from 'src/rovo-dev/rovoDevWebviewProvider';
import { getHtmlForView } from 'src/webview/common/getHtmlForView';
import {
    CancellationToken,
    Disposable,
    ExtensionContext,
    Uri,
    WebviewView,
    WebviewViewProvider,
    WebviewViewResolveContext,
    window,
} from 'vscode';

import {
    CreateWorkItemWebviewProviderMessage,
    CreateWorkItemWebviewProviderMessageType,
} from './messages/createWorkItemWebviewProviderMessages';

export class CreateWorkItemWebviewProvider extends Disposable implements WebviewViewProvider {
    private webview?: TypedWebview<CreateWorkItemWebviewProviderMessage, CreateWorkItemWebviewResponse>;
    private webviewView?: WebviewView;
    private readonly _extensionPath: string;
    private readonly _extensionUri: Uri;
    private readonly _context: ExtensionContext;
    private _availableSites: Record<string, DetailedSiteInfo> = {};
    private _availableProjects: Record<string, Project> = {};
    private _availableIssueTypes: Record<string, IssueType> = {};
    private _selectedSite?: DetailedSiteInfo;
    private _selectedProject?: Project;
    private _hasMoreProjects: boolean = false;
    private _selectedIssueType?: IssueType;
    private _id: string = 'createWorkItemWebview';
    private _disposables: Disposable[] = [];
    private _pendingState: boolean = false;
    private get _isPending(): boolean {
        return this._pendingState;
    }
    private _webviewReady: boolean = false;
    private get _isWebviewReady(): boolean {
        return this._webviewReady;
    }

    constructor(context: ExtensionContext, extensionPath: string) {
        super(() => this.dispose());
        this._context = context;
        this._extensionPath = extensionPath;
        this._extensionUri = Uri.file(this._extensionPath);
        this._disposables.push(
            window.registerWebviewViewProvider('atlascode.views.jira.createWorkItemWebview', this, {
                webviewOptions: {
                    retainContextWhenHidden: true,
                },
            }),
        );
        // this._availableSites = Container.siteManager.getSitesAvailable(ProductJira);
    }

    public async resolveWebviewView(
        webviewView: WebviewView,
        context: WebviewViewResolveContext,
        token: CancellationToken,
    ) {
        this.webviewView = webviewView;
        this.webview = webviewView.webview;

        const webview = this.webview;

        webview.options = {
            enableCommandUris: true,
            enableScripts: true,
            localResourceRoots: [Uri.file(path.join(this._extensionPath, 'build'))],
        };
        this.webviewView.title = 'Create';
        webview.html = getHtmlForView(
            this._extensionPath,
            webview.asWebviewUri(this._extensionUri),
            webview.cspSource,
            this._id,
        );
        webview.onDidReceiveMessage(this.onMessageHandler.bind(this), null, this._disposables);
        console.log(this._context);
        await this.initValues();
    }

    private async onMessageHandler(message: CreateWorkItemWebviewResponse): Promise<void> {
        switch (message.type) {
            case CreateWorkItemWebviewResponseType.WebviewReady: {
                this._webviewReady = true;
                await this.initFields();
                break;
            }
            case CreateWorkItemWebviewResponseType.CreateWorkItem: {
                setCommandContext('atlascode:showCreateWorkItemWebview', false);
                this.dispose();
                break;
            }
            case CreateWorkItemWebviewResponseType.UpdateSite: {
                const siteId = message.payload.siteId;
                await this.updateSelectedSite(siteId);
                break;
            }
            default: {
                console.warn(`Unknown message type received in CreateWorkItemWebview: ${message.type}`);
            }
        }
    }

    private async initFields(): Promise<void> {
        if (!this.webview) {
            return;
        }

        if (this._isPending) {
            return;
        }

        this.webview.postMessage({
            type: CreateWorkItemWebviewProviderMessageType.InitFields,
            payload: {
                availableIssueTypes: Object.values(this._availableIssueTypes),
                availableProjects: Object.values(this._availableProjects),
                availableSites: Object.values(this._availableSites),
                selectedSiteId: this._selectedSite?.id,
                selectedProjectKey: this._selectedProject?.key,
                selectedIssueTypeId: this._selectedIssueType?.id,
            },
        });
    }

    private async initValues(): Promise<void> {
        if (!this.webview) {
            return;
        }
        if (this._isPending) {
            return;
        }
        try {
            this._pendingState = true;
            const allSites = Container.siteManager.getSitesAvailable(ProductJira);

            if (allSites.length === 0) {
                throw new Error('No Jira sites available to create work items.');
            }

            this._availableSites = allSites.reduce<Record<string, DetailedSiteInfo>>((acc, site) => {
                acc[site.id] = site;
                return acc;
            }, {});

            const selectedSiteAndProject = Container.config.jira.lastCreateSiteAndProject;

            const selectedSite =
                this._availableSites[selectedSiteAndProject.siteId] ||
                this._availableSites[Object.keys(this._availableSites)[0]];

            if (!selectedSite) {
                throw new Error('No Jira sites available to create work items.');
            }

            this._selectedSite = selectedSite;

            const { selectedProject, projects, hasMore } = await this.getProjectsForSite(this._selectedSite);

            this._selectedProject = selectedProject;
            this._hasMoreProjects = hasMore;

            this._availableProjects = projects.reduce<Record<string, Project>>((acc, project) => {
                acc[project.key] = project;
                return acc;
            }, {});

            const screenData = await fetchCreateIssueUI(this._selectedSite!, this._selectedProject.key);
            this._selectedIssueType = screenData.selectedIssueType || screenData.issueTypes[0];
            this._availableIssueTypes = screenData.issueTypes.reduce<Record<string, IssueType>>((acc, issueType) => {
                acc[issueType.id] = issueType;
                return acc;
            }, {});

            this._pendingState = false;
            if (this._isWebviewReady) {
                await this.initFields();
            }
        } catch (err) {
            console.error('Error initializing Create Work Item webview fields:', err);
            this._pendingState = false;
        }
    }

    private async updateSelectedSite(siteId: string): Promise<void> {
        if (!this.webview) {
            return;
        }

        if (siteId === this._selectedSite?.id) {
            return;
        }

        if (this._isPending) {
            return;
        }

        try {
            this._pendingState = true;
            const selectedSite = this._availableSites[siteId];

            if (!selectedSite) {
                throw Error('Selected site not found');
            }

            this._selectedSite = selectedSite;

            const { selectedProject, projects, hasMore } = await this.getProjectsForSite(this._selectedSite);

            this._selectedProject = selectedProject;
            this._hasMoreProjects = hasMore;

            this._availableProjects = projects.reduce<Record<string, Project>>((acc, project) => {
                acc[project.key] = project;
                return acc;
            }, {});

            const screenData = await fetchCreateIssueUI(this._selectedSite!, this._selectedProject.key);
            this._selectedIssueType = screenData.selectedIssueType || screenData.issueTypes[0];
            this._availableIssueTypes = screenData.issueTypes.reduce<Record<string, IssueType>>((acc, issueType) => {
                acc[issueType.id] = issueType;
                return acc;
            }, {});

            this.webview.postMessage({
                type: CreateWorkItemWebviewProviderMessageType.UpdatedSelectedSite,
                payload: {
                    availableProjects: Object.values(this._availableProjects),
                    availableIssueTypes: Object.values(this._availableIssueTypes),
                    selectedProjectKey: this._selectedProject.key,
                    selectedIssueTypeId: this._selectedIssueType.id,
                },
            });
        } catch (err) {
            console.error('Error updating selected site in Create Work Item webview:', err);
        } finally {
            this._pendingState = false;
            console.log(this._hasMoreProjects);
        }
    }

    override dispose(): void {
        this._disposables.forEach((d) => d.dispose());
        super.dispose();
    }

    private async getProjectsForSite(
        site: DetailedSiteInfo,
    ): Promise<{ selectedProject: Project; projects: Project[]; hasMore: boolean }> {
        const projects = await Container.jiraProjectManager.getProjectsPaginated(
            site,
            undefined,
            undefined,
            undefined,
            undefined,
            'create',
        );

        const lastCreateSiteAndProject = Container.config.jira.lastCreateSiteAndProject;
        const selectedProject =
            projects.projects.find((p) => p.key === lastCreateSiteAndProject.projectKey) || projects.projects[0];

        if (!selectedProject) {
            throw Error('No projects found for selected site');
        }

        return { selectedProject, projects: projects.projects, hasMore: projects.hasMore };
    }
}
