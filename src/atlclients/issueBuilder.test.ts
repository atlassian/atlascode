import { AuthInfoState, BasicAuthInfo } from './authInfo';
import { findApiTokenForSite } from './issueBuilder';

jest.mock('../container', () => {
    const actual = jest.requireActual('../container');
    return {
        ...actual,
        Container: {
            siteManager: {
                getSiteForId: jest.fn(),
                getSitesAvailable: jest.fn(),
            },
            credentialManager: {
                getAuthInfo: jest.fn(),
            },
        },
    };
});

import { Container } from '../container';

describe('findApiTokenForSite', () => {
    const basicAuthInfo: BasicAuthInfo = {
        username: 'user',
        password: 'pass',
        user: { email: 'test@domain.com', id: 'id', displayName: 'Test User', avatarUrl: '' },
        state: AuthInfoState.Valid,
    };

    const makeSite = (host: string, email: string): any => ({
        host,
        id: 'site-id',
        name: 'Test Site',
        avatarUrl: '',
        baseLinkUrl: '',
        product: 'jira',
        user: { email, id: 'id', displayName: 'Test User', avatarUrl: '' },
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns undefined if site is not found', async () => {
        (Container.siteManager.getSiteForId as jest.Mock).mockReturnValue(undefined);
        const result = await findApiTokenForSite('site-id');
        expect(result).toBeUndefined();
    });

    it('returns undefined if site host is not .atlassian.net', async () => {
        (Container.siteManager.getSiteForId as jest.Mock).mockReturnValue(makeSite('example.com', 'test@domain.com'));
        const result = await findApiTokenForSite('site-id');
        expect(result).toBeUndefined();
    });

    it('returns undefined if no matching authInfo found', async () => {
        const site = makeSite('test.atlassian.net', 'a@b.com');
        (Container.siteManager.getSiteForId as jest.Mock).mockReturnValue(site);
        (Container.siteManager.getSitesAvailable as jest.Mock).mockReturnValue([site]);
        (Container.credentialManager.getAuthInfo as jest.Mock).mockResolvedValueOnce({
            user: { email: 'a@b.com', id: 'id', displayName: '', avatarUrl: '' },
        });
        (Container.credentialManager.getAuthInfo as jest.Mock).mockResolvedValueOnce(undefined);
        const result = await findApiTokenForSite('site-id');
        expect(result).toBeUndefined();
    });

    it('returns BasicAuthInfo if matching site and authInfo found', async () => {
        const site = makeSite('test.atlassian.net', 'test@domain.com');
        (Container.siteManager.getSiteForId as jest.Mock).mockReturnValue(site);
        (Container.siteManager.getSitesAvailable as jest.Mock).mockReturnValue([site]);
        // First call returns an object with a user property, second returns BasicAuthInfo
        (Container.credentialManager.getAuthInfo as jest.Mock).mockResolvedValueOnce({ user: site.user });
        (Container.credentialManager.getAuthInfo as jest.Mock).mockResolvedValueOnce(basicAuthInfo);
        const result = await findApiTokenForSite('site-id');
        expect(result).toEqual(basicAuthInfo);
    });

    it('works when site is passed as DetailedSiteInfo', async () => {
        const site = makeSite('test.atlassian.net', 'test@domain.com');
        (Container.siteManager.getSitesAvailable as jest.Mock).mockReturnValue([site]);
        (Container.credentialManager.getAuthInfo as jest.Mock).mockResolvedValueOnce({ user: site.user });
        (Container.credentialManager.getAuthInfo as jest.Mock).mockResolvedValueOnce(basicAuthInfo);
        const result = await findApiTokenForSite(site);
        expect(result).toEqual(basicAuthInfo);
    });
});
