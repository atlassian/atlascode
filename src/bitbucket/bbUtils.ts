import gitUrlParse from 'git-url-parse';

import { DetailedSiteInfo, ProductBitbucket } from '../atlclients/authInfo';
import { bbAPIConnectivityError } from '../constants';
import { Container } from '../container';
import { Remote, Repository } from '../typings/git';
import { BitbucketApi, BitbucketSite, WorkspaceRepo } from './model';

const bbServerRepoRegEx = new RegExp(/(?<type>users|projects)\/(?<owner>.*)\/repos/);

export function parseGitUrl(url: string): gitUrlParse.GitUrl {
    const parsed = gitUrlParse(url);
    parsed.owner = parsed.owner.slice(parsed.owner.lastIndexOf('/') + 1);

    if (parsed.owner === 'repos') {
        const matches = url.match(bbServerRepoRegEx);
        if (matches && matches.groups && matches.groups.type && matches.groups.owner) {
            parsed.owner = matches.groups.type === 'users' ? `~${matches.groups.owner}` : matches.groups.owner;
            parsed.full_name = `${parsed.owner}/${parsed.name}`;
        }
    }
    return parsed;
}

export function getBitbucketRemotes(repository: Repository): Remote[] {
    return repository.state.remotes.filter((remote) => {
        return siteDetailsForRemote(remote) !== undefined;
    });
}

export function getBitbucketCloudRemotes(repository: Repository): Remote[] {
    return repository.state.remotes.filter((remote) => {
        const details = siteDetailsForRemote(remote);
        if (details) {
            return details.isCloud;
        }
        return false;
    });
}

export function siteDetailsForRemote(remote: Remote): DetailedSiteInfo | undefined {
    const parsed = parseGitUrl(urlForRemote(remote));
    const site = Container.siteManager.getSiteForHostname(ProductBitbucket, parsed.resource);
    if (site) {
        return site;
    }

    const hostname = parsed.source;
    if (
        hostname.includes('bitbucket.org') ||
        hostname.includes('bitbucket_org') ||
        hostname.includes('bitbucket-org')
    ) {
        return Container.siteManager.getSiteForHostname(ProductBitbucket, 'bitbucket.org');
    }

    return undefined;
}

export function bitbucketSiteForRemote(remote: Remote): BitbucketSite | undefined {
    const parsed = parseGitUrl(urlForRemote(remote));
    const site = Container.siteManager.getSiteForHostname(ProductBitbucket, parsed.resource);
    if (site) {
        return {
            details: site,
            ownerSlug: parsed.owner,
            repoSlug: parsed.name,
        };
    }

    const hostname = parsed.source;
    if (
        hostname.includes('bitbucket.org') ||
        hostname.includes('bitbucket_org') ||
        hostname.includes('bitbucket-org')
    ) {
        const site = Container.siteManager.getSiteForHostname(ProductBitbucket, 'bitbucket.org');
        if (site) {
            return {
                details: site,
                ownerSlug: parsed.owner,
                repoSlug: parsed.name,
            };
        }
    }

    return undefined;
}

export function urlForRemote(remote: Remote): string {
    return remote ? remote.fetchUrl! || remote.pushUrl! : '';
}

export async function clientForRemote(remote: Remote): Promise<BitbucketApi> {
    const site = siteDetailsForRemote(remote);

    if (site) {
        return await Container.clientManager.bbClient(site);
    }

    return Promise.reject(bbAPIConnectivityError);
}

export async function clientForHostname(hostname: string): Promise<BitbucketApi> {
    const site = Container.siteManager.getSiteForHostname(ProductBitbucket, hostname);

    if (site) {
        return await Container.clientManager.bbClient(site);
    }

    return Promise.reject(bbAPIConnectivityError);
}

export async function clientForSite(site: BitbucketSite): Promise<BitbucketApi> {
    return clientForHostname(site.details.host);
}

// Use only for bitbucket repositories
function firstBitbucketRemote(repo: Repository, preferredRemotes: string[]): Remote {
    const remotes = getBitbucketRemotes(repo);

    for (const preferredRemote of preferredRemotes) {
        const foundRemote = remotes.find((r) => r.name === preferredRemote.trim());
        if (foundRemote) {
            return foundRemote;
        }
    }
    return remotes[0];
}

export function workspaceRepoFor(repository: Repository): WorkspaceRepo {
    const siteRemotes = repository.state.remotes.map((r) => ({
        site: bitbucketSiteForRemote(r),
        remote: r,
    }));

    const firstRemote =
        getBitbucketRemotes(repository).length > 0
            ? firstBitbucketRemote(repository, Container.config.bitbucket.preferredRemotes)
            : repository.state.remotes[0];

    const mainSiteRemote = {
        site: bitbucketSiteForRemote(firstRemote),
        remote: firstRemote,
    };

    return {
        rootUri: repository.rootUri.toString(),
        mainSiteRemote: mainSiteRemote,
        siteRemotes: siteRemotes,
    };
}
