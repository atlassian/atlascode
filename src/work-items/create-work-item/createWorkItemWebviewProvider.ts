// import { Project } from '@atlassianlabs/jira-pi-common-models';
// import { DetailedSiteInfo, ProductJira } from 'src/atlclients/authInfo';
// import { Container } from 'src/container';
import path from 'path';
import { setCommandContext } from 'src/commandContext';
import { CreateWorkItemWebviewResponse } from 'src/react/atlascode/create-work-item/createWorkItemWebviewMessages';
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
    window,
} from 'vscode';

export class CreateWorkItemWebviewProvider extends Disposable implements WebviewViewProvider {
    private webview?: Webview;
    private webviewView?: WebviewView;
    private readonly _extensionPath: string;
    private readonly _extensionUri: Uri;
    private readonly _context: ExtensionContext;
    // private _availableSites: DetailedSiteInfo[] = [];
    // private _selectedSite?: DetailedSiteInfo;
    // private _selectedProject?: Project;
    private _id: string = 'createWorkItemWebview';
    private _disposables: Disposable[] = [];

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

        console.log(this._context.extensionUri);
        // await this.initializeWebview();
    }

    private async onMessageHandler(message: CreateWorkItemWebviewResponse): Promise<void> {
        switch (message.type) {
            case 'webviewReady': {
                // await this.initializeWebview();
                break;
            }
            case 'createWorkItem': {
                setCommandContext('atlascode:showCreateWorkItemWebview', false);
                this.dispose();
                break;
            }
            default: {
                console.warn(`Unknown message type received in CreateWorkItemWebview: ${message.type}`);
            }
        }
    }
    // private async initializeWebview(): Promise<void> {
    //     await this.updateFields();
    // }

    // private async updateFields(inputSite?: DetailedSiteInfo, inputProject?: Project): Promise<void> {
    //     if (!this.webview) {
    //         return;
    //     }

    //     if (!inputSite && !inputProject) {
    //         this._selectedSite = Container.config.jira.lastCreateSiteAndProject.siteId
    //             ? this._availableSites.find((site) => site.id === Container.config.jira.lastCreateSiteAndProject.siteId)
    //             : this._availableSites[0];

    //         if (this._selectedSite) {
    //             const projectKey = Container.config.jira.lastCreateSiteAndProject.projectKey;
    //             const projects = await Container.jiraProjectManager.getProjects(this._selectedSite);
    //             if (projectKey) {
    //                 this._selectedProject = projects.find((project) => project.key === projectKey) || projects[0];
    //             } else {
    //                 this._selectedProject = projects[0];
    //             }

    //             this.updateFields(this._selectedSite, this._selectedProject);
    //             return;
    //         }
    //     }
    //     this.webview.postMessage({
    //         command: 'updateFields',
    //         site: inputSite,
    //         project: inputProject,
    //     });
    // }

    override dispose(): void {
        this._disposables.forEach((d) => d.dispose());
        super.dispose();
    }
}
