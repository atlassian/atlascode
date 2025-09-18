import { isOAuthInfo } from '../../../../atlclients/authInfo';
import { SiteWithAuthInfo } from '../../../../lib/ipc/toUI/config';

/**
 * Deduplicates OAuth sites by username, keeping only one site per unique username.
 * For OAuth sites, also updates the display name to "Jira Cloud" or "Bitbucket Cloud".
 * Non-OAuth sites are returned as-is without deduplication.
 */
export function deduplicateOAuthSites(sites: SiteWithAuthInfo[]): SiteWithAuthInfo[] {
    const oauthSites: SiteWithAuthInfo[] = [];
    const nonOauthSites: SiteWithAuthInfo[] = [];
    const seenOAuthUsers = new Set<string>();

    // Separate OAuth and non-OAuth sites
    sites.forEach((site) => {
        if (isOAuthInfo(site.auth)) {
            oauthSites.push(site);
        } else {
            nonOauthSites.push(site);
        }
    });

    // Deduplicate OAuth sites by username and update display names
    const deduplicatedOAuthSites = oauthSites.filter((site) => {
        const username = site.auth.user.email || site.auth.user.displayName || site.auth.user.id;

        if (seenOAuthUsers.has(username)) {
            return false; // Skip duplicate
        }

        seenOAuthUsers.add(username);

        // Update the site name for OAuth sites
        const productName = site.site.product.name;
        if (productName === 'Jira') {
            site.site.name = '';
        } else if (productName === 'Bitbucket') {
            site.site.name = '';
        }

        return true;
    });

    // Return combined list: deduplicated OAuth sites + all non-OAuth sites
    return [...deduplicatedOAuthSites, ...nonOauthSites];
}
