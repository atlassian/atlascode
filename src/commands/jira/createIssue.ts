import { Position, Range, Uri, ViewColumn, window, workspace, WorkspaceEdit } from 'vscode';

import { startIssueCreationEvent } from '../../analytics';
import { ProductJira } from '../../atlclients/authInfo';
import { WorkspaceRepo } from '../../bitbucket/model';
import { Container } from '../../container';
import { CommentData } from '../../webviews/createIssueWebview';

export interface TodoIssueData {
    summary: string;
    uri: Uri;
    insertionPoint: Position;
}

export function createIssue(data: Uri | TodoIssueData | undefined, source?: string) {
    if (isTodoIssueData(data)) {
        const partialIssue = {
            summary: data.summary,
            description: descriptionForUri(data.uri),
            uri: data.uri,
            position: data.insertionPoint,
            onCreated: annotateComment,
        };
        Container.createIssueWebview.createOrShow(ViewColumn.Beside, partialIssue);
        startIssueCreationEvent('todoComment', ProductJira).then((e) => {
            Container.analyticsClient.sendTrackEvent(e);
        });
        return;
    } else if (isUri(data) && data.scheme === 'file') {
        Container.createIssueWebview.createOrShow(ViewColumn.Active, { description: descriptionForUri(data) });
        startIssueCreationEvent('contextMenu', ProductJira).then((e) => {
            Container.analyticsClient.sendTrackEvent(e);
        });
        return;
    }

    Container.createIssueWebview.createOrShow();
    startIssueCreationEvent(source || 'explorer', ProductJira).then((e) => {
        Container.analyticsClient.sendTrackEvent(e);
    });
}

function isTodoIssueData(a: any): a is TodoIssueData {
    return a && (<TodoIssueData>a).insertionPoint !== undefined;
}

function isUri(a: any): a is Uri {
    return a && (<Uri>a).fsPath !== undefined;
}

function annotateComment(data: CommentData) {
    const we = new WorkspaceEdit();

    const summary = data.summary && data.summary.length > 0 ? ` ${data.summary}` : '';
    we.insert(data.uri, data.position, ` [${data.issueKey}]${summary}`);
    workspace.applyEdit(we);
}

function descriptionForUri(uri: Uri) {
    const linesText = getLineRange();

    const wsRepos = Container.bitbucketContext.getAllRepositories();

    const urls = wsRepos
        .map((wsRepo) => bitbucketUrlsInRepo(wsRepo, uri, linesText))
        .filter((url) => url !== undefined);

    if (urls.length === 0) {
        return `${workspace.asRelativePath(uri)}${linesText}`;
    }

    const selectionText = getSelectionText();

    return urls.join('\r') + selectionText;
}

function bitbucketUrlsInRepo(wsRepo: WorkspaceRepo, fileUri: Uri, linesText: string): string | undefined {
    const scm = Container.bitbucketContext.getRepositoryScm(wsRepo.rootUri);
    const head = scm ? scm.state.HEAD : undefined;
    if (!scm || !head || head.name === undefined) {
        return undefined;
    }
    const rootPath = scm.rootUri.path;
    const filePath = fileUri.path;
    if (!filePath.startsWith(scm.rootUri.path)) {
        return undefined;
    }
    const relativePath = filePath.replace(rootPath, '');
    if (wsRepo.mainSiteRemote.site) {
        const site = wsRepo.mainSiteRemote.site;
        const commit = head.upstream && head.ahead && head.ahead > 0 ? head.name : head.commit;
        if (commit) {
            return site.details.isCloud
                ? `${site.details.baseLinkUrl}/${site.ownerSlug}/${site.repoSlug}/src/${commit}${relativePath}${
                      linesText ? `#lines-${linesText}` : ''
                  }`
                : `${site.details.baseLinkUrl}/projects/${site.ownerSlug}/repos/${
                      site.repoSlug
                  }/browse${relativePath}?at=${commit}${linesText ? `#${linesText.replace(':', '-')}` : ''}`;
        }
    }

    return undefined;
}

function getLineRange(): string {
    const editor = window.activeTextEditor;
    if (!editor || !editor.selection) {
        return '';
    }
    const selection = editor.selection;
    // vscode provides 0-based line numbers but Bitbucket line numbers start with 1.
    if (selection.start.line === selection.end.line) {
        return `${selection.start.line + 1}`;
    }
    return `${selection.start.line + 1}:${selection.end.line + 1}`;
}

function getSelectionText(): string {
    const editor = window.activeTextEditor;
    if (!editor || !editor.selection) {
        return '';
    }

    let result = '';
    const selection = editor.selection;
    if (selection.start.line === selection.end.line) {
        result = editor.document.lineAt(selection.start.line).text;
    } else {
        result = editor.document.getText(new Range(editor.selection.start, editor.selection.end));
    }

    return `\r{code}${result}{code}`;
}
