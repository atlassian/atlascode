import { Project } from '@atlassianlabs/jira-pi-common-models';
import { DetailedSiteInfo, ProductJira } from 'src/atlclients/authInfo';
import { Container } from 'src/container';
import { getHtmlForView } from 'src/webview/common/getHtmlForView';
import {
    CancellationToken,
    Disposable,
    ExtensionContext,
    Uri,
    Webview,
    WebviewView,
    WebviewViewProvider,
    WebviewViewResolveContext,
} from 'vscode';

export class CreateWorkItemWebviewProvider extends Disposable implements WebviewViewProvider {
    private webview?: Webview;
    private webviewView?: WebviewView;
    private readonly _extensionPath: string;
    private readonly _extensionUri: Uri;
    private readonly _context: ExtensionContext;
    private _availableSites: DetailedSiteInfo[] = [];
    private _selectedSite?: DetailedSiteInfo;
    private _selectedProject?: Project;

    constructor(context: ExtensionContext, extensionPath: string) {
        super(() => this.dispose());
        this._context = context;
        this._extensionPath = extensionPath;
        this._extensionUri = Uri.file(this._extensionPath);
        this._availableSites = Container.siteManager.getSitesAvailable(ProductJira);
    }

    async resolveWebviewView(webviewView: WebviewView, context: WebviewViewResolveContext, token: CancellationToken) {
        this.webviewView = webviewView;
        this.webview = webviewView.webview;

        const webview = this.webview;

        webview.options = {
            enableCommandUris: true,
            enableScripts: true,
            localResourceRoots: [],
        };

        webview.html = getHtmlForView(
            this._extensionPath,
            webview.asWebviewUri(this._extensionUri),
            webview.cspSource,
            'createWorkItemWebview',
        );

        await this.initializeWebview();
    }

    private async initializeWebview(): Promise<void> {
        await this.updateFields();
    }

    private async updateFields(inputSite?: DetailedSiteInfo, inputProject?: Project): Promise<void> {
        if (!this.webview) {
            return;
        }

        if (!inputSite && !inputProject) {
            this._selectedSite = Container.config.jira.lastCreateSiteAndProject.siteId
                ? this._availableSites.find((site) => site.id === Container.config.jira.lastCreateSiteAndProject.siteId)
                : this._availableSites[0];

            if (this._selectedSite) {
                const projectKey = Container.config.jira.lastCreateSiteAndProject.projectKey;
                const projects = await Container.jiraProjectManager.getProjects(this._selectedSite);
                if (projectKey) {
                    this._selectedProject = projects.find((project) => project.key === projectKey) || projects[0];
                } else {
                    this._selectedProject = projects[0];
                }

                this.updateFields(this._selectedSite, this._selectedProject);
                return;
            }
        }
        this.webview.postMessage({
            command: 'updateFields',
            site: inputSite,
            project: inputProject,
        });
    }
}
