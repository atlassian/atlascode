import axios from 'axios';

import { Logger } from '../logger';
import { ConnectionTimeout } from '../util/time';

/**
 * Probes a hostname for an HTTP redirect (e.g. a DNS alias that a webserver
 * 301/302-redirects to the real Bitbucket Server host) and returns the
 * hostname it redirects to, if any.
 *
 * This does not follow the redirect (no auth headers, no request body) - it
 * only inspects the `Location` header of a 3xx response to discover the
 * real host so that it can be matched against configured sites.
 */
export async function resolveRedirectHostname(hostname: string): Promise<string | undefined> {
    for (const protocol of ['https', 'http']) {
        try {
            const response = await axios.get(`${protocol}://${hostname}/`, {
                timeout: ConnectionTimeout,
                maxRedirects: 0,
                validateStatus: (status) => status >= 200 && status < 400,
            });

            const location = response.headers?.location;
            if (!location) {
                continue;
            }

            const resolvedHostname = new URL(location, `${protocol}://${hostname}/`).hostname;
            if (resolvedHostname && resolvedHostname !== hostname) {
                return resolvedHostname;
            }
        } catch (e) {
            Logger.debug(`Failed to probe ${hostname} for redirects over ${protocol}: ${e}`);
        }
    }

    return undefined;
}
