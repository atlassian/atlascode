import vscode from 'vscode';
import { ProductBitbucket } from '../atlclients/authInfo';
import { OutputLevel } from '../config/model';
import { Container } from '../container';
import { Logger } from '../logger';
import { parseGitUrl, urlForRemote } from './bbUtils';

export function showBitbucketDebugInfo() {
    if (Container.config.outputLevel !== OutputLevel.Debug) {
        const choice = vscode.l10n.t('Open settings');
        vscode.window
            .showInformationMessage(
                vscode.l10n.t(
                    'Set ouput level setting (atlascode.outputLevel) to debug and run the command again to view the information',
                ),
                choice,
            )
            .then((userChoice) => {
                if (userChoice === choice) {
                    vscode.commands.executeCommand('workbench.action.openSettings2');
                }
            });

        return;
    }

    const sites = Container.siteManager.getSitesAvailable(ProductBitbucket).map((site) => ({
        name: site.name,
        host: site.host,
        type: site.isCloud ? 'cloud' : 'server',
        mirrors: Container.bitbucketContext.getMirrors(site.host),
    }));

    const wsRepos = Container.bitbucketContext.getAllRepositories().map((wsRepo) => ({
        uri: wsRepo.rootUri,
        remotes: wsRepo.siteRemotes.map((siteRemote) => ({
            name: siteRemote.remote.name,
            url: urlForRemote(siteRemote.remote),
            host: parseGitUrl(urlForRemote(siteRemote.remote)).resource,
            matchingBitbucketSite: siteRemote.site ? siteRemote.site.details.name : 'Not found',
        })),
    }));

    Logger.show();
    Logger.debug(JSON.stringify({ bitbucketSites: sites, vscodeWorkspaceRepositories: wsRepos }, undefined, 4));
}
