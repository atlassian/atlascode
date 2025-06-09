import { MinimalIssue } from '@atlassianlabs/jira-pi-common-models';
import pTimeout from 'p-timeout';

import { DetailedSiteInfo, ProductJira } from '../atlclients/authInfo';
import { Container } from '../container';
import { Time } from '../util/time';
import { fetchMinimalIssue } from './fetchIssue';

export async function issueForKey(issueKey: string): Promise<MinimalIssue<DetailedSiteInfo>> {
    const emptyPromises = Container.siteManager
        .getSitesAvailable(ProductJira)
        .map((site) => fetchMinimalIssue(issueKey, site));
    const promise = Promise.any(emptyPromises);

    const foundSite = await pTimeout(promise, 1 * Time.MINUTES).catch(() => undefined);
    return foundSite ?? Promise.reject(`no issue found with key ${issueKey}`);
}
