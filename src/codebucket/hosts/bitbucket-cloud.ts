import * as path from 'path';

import { BitbucketSite } from '../../bitbucket/model';
import { BitbucketSiteBase } from './bitbucket-site-base';

export class BitbucketCloudSite extends BitbucketSiteBase {
    constructor(site: BitbucketSite) {
        super(site);
    }

    public getChangeSetUrl(revision: string, filePath: string): string {
        const { ownerSlug, repoSlug } = this.site;
        return `${this.site.details.baseLinkUrl}/${ownerSlug}/${repoSlug}/commits/${revision}#chg-${filePath}`;
    }

    public getSourceUrl(revision: string, filePath: string, lineRanges: string[]) {
        const ranges = lineRanges.join(',');
        const hash = `${encodeURIComponent(path.basename(filePath))}-${ranges}`;
        const { ownerSlug, repoSlug } = this.site;
        return `${this.site.details.baseLinkUrl}/${ownerSlug}/${repoSlug}/src/${revision}/${filePath}#${hash}`;
    }

    public getPullRequestUrl(id: string, filePath: string): string {
        const { ownerSlug, repoSlug } = this.site;
        return `${this.site.details.baseLinkUrl}/${ownerSlug}/${repoSlug}/pull-requests/${id}/diff#chg-${filePath}`;
    }
}
