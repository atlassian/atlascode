import fs from 'fs';
import path from 'path';
import { ExtensionContext, Uri } from 'vscode';

export class Resources {
    static rovoDevPath: string = '';
    static pipelinesSchemaPath: string = '';
    static icons: Map<string, Uri | { light: Uri; dark: Uri }> = new Map();
    static charlesCert: string;
    static html: Map<string, string> = new Map();
    static htmlNotFound: string = `<!DOCTYPE html>
    <html lang="en">
    <body>
    Resource not found: {{resource}}
    </body>
    </html>`;
}

export enum iconSet {
    ADDCIRCLE = 'add-circle',
    EDIT = 'edit',
    DELETE = 'delete',
    DETAIL = 'detail',
    WARNING = 'warning',
    BITBUCKETICON = 'bitbucketFavicon',
    JIRAICON = 'jiraFavicon',
    ATLASSIANICON = 'atlassianIcon',
    PULLREQUEST = 'pullrequests',
    PREFERENCES = 'preferences',
    SEARCH = 'search',
    ADD = 'add',
    ISSUES = 'issues',
    PIPELINEPENDING = 'pending',
    PIPELINEBUILDING = 'building',
    PIPELINESUCCESSFUL = 'success',
    PIPELINEFAILED = 'failed',
    PIPELINESTOPPED = 'stopped',
    PIPELINEPAUSED = 'paused',
    ROVODEV = 'rovodev',
}

export function registerResources(vscodeContext: ExtensionContext) {
    Resources.icons.set(
        iconSet.ADDCIRCLE,
        Uri.file(vscodeContext.asAbsolutePath(path.join('resources', 'bitbucket', 'add-circle.svg'))),
    );
    Resources.icons.set(
        iconSet.EDIT,
        Uri.file(vscodeContext.asAbsolutePath(path.join('resources', 'bitbucket', 'edit-filled.svg'))),
    );
    Resources.icons.set(
        iconSet.DELETE,
        Uri.file(vscodeContext.asAbsolutePath(path.join('resources', 'bitbucket', 'blocker.svg'))),
    );
    Resources.icons.set(
        iconSet.DETAIL,
        Uri.file(vscodeContext.asAbsolutePath(path.join('resources', 'bitbucket', 'detail-view.svg'))),
    );
    Resources.icons.set(
        iconSet.WARNING,
        Uri.file(vscodeContext.asAbsolutePath(path.join('resources', 'bitbucket', 'warning.svg'))),
    );
    Resources.icons.set(
        iconSet.BITBUCKETICON,
        Uri.file(vscodeContext.asAbsolutePath(path.join('resources', 'BitbucketFavicon.png'))),
    );
    Resources.icons.set(
        iconSet.JIRAICON,
        Uri.file(vscodeContext.asAbsolutePath(path.join('resources', 'JiraFavicon.png'))),
    );
    Resources.icons.set(
        iconSet.ATLASSIANICON,
        Uri.file(vscodeContext.asAbsolutePath(path.join('resources', 'atlassian-icon.svg'))),
    );
    Resources.icons.set(iconSet.PULLREQUEST, {
        light: Uri.file(vscodeContext.asAbsolutePath(path.join('resources', 'light', 'pullrequests.svg'))),
        dark: Uri.file(vscodeContext.asAbsolutePath(path.join('resources', 'dark', 'pullrequests.svg'))),
    });
    Resources.icons.set(iconSet.PREFERENCES, {
        light: Uri.file(vscodeContext.asAbsolutePath(path.join('resources', 'light', 'preferences.svg'))),
        dark: Uri.file(vscodeContext.asAbsolutePath(path.join('resources', 'dark', 'preferences.svg'))),
    });
    Resources.icons.set(iconSet.SEARCH, {
        light: Uri.file(vscodeContext.asAbsolutePath(path.join('resources', 'light', 'search.svg'))),
        dark: Uri.file(vscodeContext.asAbsolutePath(path.join('resources', 'dark', 'search.svg'))),
    });
    Resources.icons.set(iconSet.ADD, {
        light: Uri.file(vscodeContext.asAbsolutePath(path.join('resources', 'light', 'add.svg'))),
        dark: Uri.file(vscodeContext.asAbsolutePath(path.join('resources', 'dark', 'add.svg'))),
    });
    Resources.icons.set(iconSet.ROVODEV, {
        light: Uri.file(vscodeContext.asAbsolutePath(path.join('resources', 'light', 'rovodev-icon.svg'))),
        dark: Uri.file(vscodeContext.asAbsolutePath(path.join('resources', 'dark', 'rovodev-icon.svg'))),
    });

    Resources.icons.set(iconSet.ISSUES, Uri.file(vscodeContext.asAbsolutePath(path.join('resources', 'issues.svg'))));

    Resources.icons.set(
        iconSet.PIPELINEPENDING,
        Uri.file(vscodeContext.asAbsolutePath(path.join('resources', 'pipelines', 'icon-pending.svg'))),
    );
    Resources.icons.set(
        iconSet.PIPELINEBUILDING,
        Uri.file(vscodeContext.asAbsolutePath(path.join('resources', 'pipelines', 'icon-building.svg'))),
    );
    Resources.icons.set(
        iconSet.PIPELINESUCCESSFUL,
        Uri.file(vscodeContext.asAbsolutePath(path.join('resources', 'pipelines', 'icon-success.svg'))),
    );
    Resources.icons.set(
        iconSet.PIPELINEFAILED,
        Uri.file(vscodeContext.asAbsolutePath(path.join('resources', 'pipelines', 'icon-failed.svg'))),
    );
    Resources.icons.set(
        iconSet.PIPELINESTOPPED,
        Uri.file(vscodeContext.asAbsolutePath(path.join('resources', 'pipelines', 'icon-stopped.svg'))),
    );
    Resources.icons.set(
        iconSet.PIPELINEPAUSED,
        Uri.file(vscodeContext.asAbsolutePath(path.join('resources', 'pipelines', 'icon-paused.svg'))),
    );

    Resources.charlesCert = vscodeContext.asAbsolutePath('charles-ssl-proxying-certificate.pem');

    Resources.html.set(
        'reactHtml',
        fs.readFileSync(vscodeContext.asAbsolutePath(path.join('resources', 'html', 'reactView.html'))).toString(),
    );
    Resources.html.set(
        'reactWebviewHtml',
        fs.readFileSync(vscodeContext.asAbsolutePath(path.join('resources', 'html', 'reactWebview.html'))).toString(),
    );
    Resources.html.set(
        'statusBarText',
        fs.readFileSync(vscodeContext.asAbsolutePath(path.join('resources', 'html', 'statusbar.html'))).toString(),
    );
    Resources.html.set(
        'authSuccessHtml',
        fs.readFileSync(vscodeContext.asAbsolutePath(path.join('resources', 'html', 'auth-success.html'))).toString(),
    );
    Resources.html.set(
        'authFailureHtml',

        fs.readFileSync(vscodeContext.asAbsolutePath(path.join('resources', 'html', 'auth-failure.html'))).toString(),
    );

    Resources.pipelinesSchemaPath = path
        .join(vscodeContext.extensionPath, 'resources', 'schemas', 'pipelines-schema.json')
        .toString();

    Resources.rovoDevPath = path
        .join(vscodeContext.extensionPath, 'resources', 'rovo-dev', 'atlassian_cli_rovodev')
        .toString();
}
