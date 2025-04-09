import { MinimalIssue } from '@atlassianlabs/jira-pi-common-models';
import pTimeout from 'p-timeout';

import { DetailedSiteInfo, ProductJira } from '../atlclients/authInfo';
import { Container } from '../container';
import { Time } from '../util/time';
import { fetchMinimalIssue } from './fetchIssue';

export async function issueForKey(issueKey: string): Promise<MinimalIssue<DetailedSiteInfo>> {
    const emptyPromises: Promise<MinimalIssue<DetailedSiteInfo>>[] = [];

    Container.siteManager.getSitesAvailable(ProductJira).forEach((site) => {
        emptyPromises.push(
            (async () => {
                return await fetchMinimalIssue(issueKey, site);
            })(),
        );
    });
    const promise = Promise.any(emptyPromises);

    const foundSite = await pTimeout(promise, 1 * Time.MINUTES).catch(() => undefined);
    return foundSite ? foundSite : Promise.reject(`no issue found with key ${issueKey}`);
}
