import pAny from 'p-any';
import pathlib from 'path';
import vscode from 'vscode';
import { BitbucketContext } from '../bitbucket/bbContext';
import { clientForSite } from '../bitbucket/bbUtils';
import { Container } from '../container';
import { PRFileDiffQueryParams } from './pullrequest/diffViewHelper';

//This class is responsible for fetching the text of a specific version of a file which may not be on your machine
//Everytime the vscode.diff is invoked in this extension, it's using this file to fetch the data for both files.
//Note this this is called twice (once for each file); it's not responsible for actually generating the diff
export class GitContentProvider implements vscode.TextDocumentContentProvider {
    private _onDidChange = new vscode.EventEmitter<vscode.Uri>();
    get onDidChange(): vscode.Event<vscode.Uri> {
        return this._onDidChange.event;
    }

    constructor(private bbContext: BitbucketContext) {}

    async provideTextDocumentContent(uri: vscode.Uri, token: vscode.CancellationToken): Promise<string> {
        const { site, repoUri, branchName, path, commitHash } = JSON.parse(uri.query) as PRFileDiffQueryParams;

        if (!path || !commitHash) {
            return '';
        }

        let content = '';
        try {
            //Attempt to get the file content locally with a source-control manager and also try to fetch from Bitbucket
            //pAny returns the first successful result, so it will return the local one if you have this commit on your computer,
            //otherwise it will get it from the Bitbucket API (which takes longer)
            content = await pAny([
                (async () => {
                    const u: vscode.Uri = vscode.Uri.parse(repoUri);
                    const wsRepo = this.bbContext.getRepository(u);
                    const scm = wsRepo ? Container.bitbucketContext.getRepositoryScm(wsRepo.rootUri) : undefined;
                    if (!scm) {
                        throw new Error('no workspace repo');
                    }

                    const absolutePath = pathlib.join(scm.rootUri.fsPath, path);
                    try {
                        return await scm.show(commitHash, absolutePath);
                    } catch (err) {
                        await scm.fetch(wsRepo!.mainSiteRemote.remote.name, branchName);
                        return await scm.show(commitHash, absolutePath);
                    }
                })(),
                (async () => {
                    const bbApi = await clientForSite(site);
                    const fileContent = await bbApi.pullrequests.getFileContent(site, commitHash, path);
                    return fileContent;
                })(),
            ]);
        } catch (err) {
            vscode.window.showErrorMessage(
                vscode.l10n.t(
                    "We couldn't find {0} at commit {1}. You may want to sync the branch with remote. Sometimes commits can disappear after a force-push.",
                    path,
                    commitHash,
                ),
            );
        }

        return content || '';
    }
}
