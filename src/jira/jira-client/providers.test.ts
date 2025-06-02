import * as piClientCommon from '@atlassianlabs/pi-client-common';
import axios from 'axios';
import * as fs from 'fs';
import { Agent } from 'http';
import * as https from 'https';
import { expansionCastTo } from 'testsutil';
import tunnel from 'tunnel';

import { DetailedSiteInfo, SiteInfo } from '../../atlclients/authInfo';
import { BasicInterceptor } from '../../atlclients/basicInterceptor';
import * as interceptors from '../../atlclients/interceptors';
import { configuration } from '../../config/configuration';
import { AxiosUserAgent } from '../../constants';
import { Container } from '../../container';
import { Logger } from '../../logger';
import { Resources } from '../../resources';
import { ConnectionTimeout } from '../../util/time';
import {
    basicJiraTransportFactory,
    getAgent,
    getAxiosInstance,
    jiraBasicAuthProvider,
    jiraTokenAuthProvider,
    oauthJiraTransportFactory,
} from './providers';

jest.mock('@atlassianlabs/pi-client-common');
jest.mock('axios');
jest.mock('../../container');
jest.mock('../../atlclients/basicInterceptor');
jest.mock('../../atlclients/interceptors');
jest.mock('../../config/configuration');
jest.mock('fs');
jest.mock('https');
jest.mock('tunnel', () => ({
    default: {
        httpsOverHttp: jest.fn(),
    },
}));
jest.mock('ssl-root-cas', () => ({
    create: jest.fn().mockReturnValue({
        addFile: jest.fn(),
    }),
}));

describe('providers', () => {
    const mockSite: DetailedSiteInfo = {
        id: 'test-site-id',
        name: 'Test Site',
        host: 'test.atlassian.net',
        avatarUrl: 'https://test.atlassian.net/avatar',
        baseApiUrl: 'https://test.atlassian.net/api',
        baseLinkUrl: 'https://test.atlassian.net',
        product: { key: 'jira', name: 'Jira' },
        isCloud: true,
        userId: 'test-user-id',
        credentialId: 'test-credential-id',
    };

    // Mock axios instance
    const mockAxiosInstance = {
        interceptors: {
            request: { use: jest.fn() },
            response: { use: jest.fn() },
        },
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (axios.create as jest.Mock).mockReturnValue(mockAxiosInstance);

        jest.spyOn(piClientCommon, 'shouldTunnelHost').mockReturnValue(true);

        // Mock Agent
        const mockAgent = { foo: 'bar0' };
        (https.Agent as any as jest.Mock).mockImplementation(() => mockAgent);

        // Mock Container
        (Container.isDebugging as any) = false;
        (Container.config as any) = { enableCurlLogging: false };
        (Container.credentialManager as any) = {
            getAuthInfo: jest.fn(),
        };

        // Mock Resources
        (Resources.charlesCert as any) = undefined;
    });

    describe('getAxiosInstance', () => {
        it('creates an axios instance with correct configuration', () => {
            const instance = getAxiosInstance();

            expect(axios.create).toHaveBeenCalledWith({
                timeout: ConnectionTimeout,
                headers: {
                    'User-Agent': AxiosUserAgent,
                    'X-Atlassian-Token': 'no-check',
                    'Accept-Encoding': 'gzip, deflate',
                },
            });

            expect(instance).toBe(mockAxiosInstance);
        });

        it('adds curl logging when enabled in config', () => {
            (Container.config as any) = { enableCurlLogging: true };

            const instance = getAxiosInstance();

            expect(interceptors.addCurlLogging).toHaveBeenCalledWith(instance);
        });
    });

    describe('oauthJiraTransportFactory', () => {
        it('returns a TransportFactory function wrapping an axios instance', () => {
            const factory = oauthJiraTransportFactory(mockSite);

            expect(typeof factory).toBe('function');
            expect(interceptors.rewriteSecureImageRequests).toHaveBeenCalledWith(mockAxiosInstance);

            const axiosInstance = factory();
            expect(axiosInstance).toBe(mockAxiosInstance);
        });
    });

    describe('basicJiraTransportFactory', () => {
        it('returns a TransportFactory function with basic interceptor attached', async () => {
            const mockAttachToAxios = jest.fn().mockResolvedValue(undefined);
            (BasicInterceptor as jest.Mock).mockImplementation(() => ({
                attachToAxios: mockAttachToAxios,
            }));

            const factory = basicJiraTransportFactory(mockSite);

            expect(typeof factory).toBe('function');
            expect(BasicInterceptor).toHaveBeenCalledWith(mockSite, Container.credentialManager);
            expect(mockAttachToAxios).toHaveBeenCalledWith(mockAxiosInstance);

            const axiosInstance = factory();
            expect(axiosInstance).toBe(mockAxiosInstance);
        });
    });

    describe('jiraTokenAuthProvider', () => {
        it('returns an authorization provider function that resolves to a Bearer token', async () => {
            const token = 'test-token';
            const provider = jiraTokenAuthProvider(token);

            const auth = await provider('GET', 'https://test.atlassian.net');
            expect(auth).toBe(`Bearer ${token}`);
        });
    });

    describe('jiraBasicAuthProvider', () => {
        it('returns an authorization provider function that resolves to a Basic auth header', async () => {
            const username = 'user';
            const password = 'pass';
            const provider = jiraBasicAuthProvider(username, password);

            const auth = await provider('GET', 'https://test.atlassian.net');
            const expectedBase64 = Buffer.from(`${username}:${password}`).toString('base64');
            expect(auth).toBe(`Basic ${expectedBase64}`);
        });
    });

    describe('getAgent', () => {
        beforeEach(() => {
            jest.spyOn(configuration, 'get').mockImplementation((key) => {
                if (key === 'enableHttpsTunnel') {
                    return false;
                }
                if (key === 'enableCharles') {
                    return false;
                }
                if (key === 'charlesDebugOnly') {
                    return false;
                }
                if (key === 'charlesCertPath') {
                    return '';
                }
                return undefined;
            });
        });

        it('returns empty agent when no site is provided', () => {
            const agent = getAgent();
            expect(agent).toEqual({});
        });

        it('returns an agent with custom SSL certs when provided', () => {
            const siteWithSSLCerts: SiteInfo = {
                ...mockSite,
                customSSLCertPaths: '/path/to/cert.pem',
            };

            const mockAgent = { foo: 'bar1' };
            (https.Agent as any as jest.Mock).mockImplementation(() => mockAgent);

            const agent = getAgent(siteWithSSLCerts);

            expect(agent).toEqual({ httpsAgent: mockAgent });
            expect(https.Agent).toHaveBeenCalledWith({ rejectUnauthorized: false });
        });

        it('returns an agent with PFX cert when provided', () => {
            const siteWithPfx: SiteInfo = {
                ...mockSite,
                pfxPath: '/path/to/cert.pfx',
                pfxPassphrase: 'password',
            };

            const mockPfxFile = Buffer.from('test-pfx-data');
            (fs.readFileSync as jest.Mock).mockReturnValue(mockPfxFile);

            const mockAgent = { foo: 'bar2' };
            (https.Agent as any as jest.Mock).mockImplementation(() => mockAgent);

            const agent = getAgent(siteWithPfx);

            expect(agent).toEqual({ httpsAgent: mockAgent });
            expect(https.Agent).toHaveBeenCalledWith({
                pfx: mockPfxFile,
                passphrase: 'password',
            });
        });

        it('sets up HTTP tunnel when enableHttpsTunnel is true', () => {
            jest.spyOn(configuration, 'get').mockImplementation((key) => {
                if (key === 'enableHttpsTunnel') {
                    return true;
                }
                return undefined;
            });

            jest.spyOn(piClientCommon, 'getProxyHostAndPort').mockReturnValue(['proxy.example.com', '8080']);

            const mockTunnelAgent = expansionCastTo<Agent>({ maxSockets: 1234 });
            (tunnel.httpsOverHttp as jest.Mock).mockReturnValue(mockTunnelAgent);

            const agent = getAgent(mockSite);

            expect(agent).toEqual({
                httpsAgent: mockTunnelAgent,
                proxy: false,
            });

            expect(tunnel.httpsOverHttp).toHaveBeenCalledWith({
                proxy: {
                    host: 'proxy.example.com',
                    port: 8080,
                },
            });
        });

        it('sets up Charles proxy when enableCharles is true', () => {
            jest.spyOn(configuration, 'get').mockImplementation((key) => {
                if (key === 'enableHttpsTunnel') {
                    return false;
                }
                if (key === 'enableCharles') {
                    return true;
                }
                if (key === 'charlesDebugOnly') {
                    return false;
                }
                return undefined;
            });

            const mockPemFile = Buffer.from('test-pem-data');
            (fs.readFileSync as jest.Mock).mockReturnValue(mockPemFile);

            const mockTunnelAgent = expansionCastTo<Agent>({ maxSockets: 1234 });
            (tunnel.httpsOverHttp as jest.Mock).mockReturnValue(mockTunnelAgent);

            (Resources.charlesCert as any) = '/path/to/default/charles.pem';

            const agent = getAgent(mockSite);

            expect(agent).toEqual({
                httpsAgent: mockTunnelAgent,
            });

            expect(tunnel.httpsOverHttp).toHaveBeenCalledWith({
                ca: [mockPemFile],
                proxy: {
                    host: '127.0.0.1',
                    port: 8888,
                },
            });
        });

        it('handles errors gracefully and returns empty agent', () => {
            (fs.readFileSync as jest.Mock).mockImplementation(() => {
                throw new Error('File not found');
            });

            jest.spyOn(configuration, 'get').mockImplementation((key) => key === 'enableCharles');
            jest.spyOn(Logger, 'error').mockImplementation();

            const siteWithSSLCerts: SiteInfo = {
                ...mockSite,
            };

            const agent = getAgent(siteWithSSLCerts);

            expect(agent).toEqual({});
            expect(Logger.error).toHaveBeenCalledWith(expect.any(Error), 'Error while creating agent');
        });

        it('skips Charles proxy setup when charlesDebugOnly is true but not debugging', () => {
            jest.spyOn(configuration, 'get').mockImplementation((key) => {
                if (key === 'enableCharles') {
                    return true;
                }
                if (key === 'charlesDebugOnly') {
                    return true;
                }
                return undefined;
            });

            (Container.isDebugging as any) = false;

            const agent = getAgent(mockSite);

            expect(agent).toEqual({});
            expect(tunnel.httpsOverHttp).not.toHaveBeenCalled();
        });

        it('uses Charles proxy when charlesDebugOnly is true and debugging', () => {
            jest.spyOn(configuration, 'get').mockImplementation((key) => {
                if (key === 'enableCharles') {
                    return true;
                }
                if (key === 'charlesDebugOnly') {
                    return true;
                }
                return undefined;
            });

            (Container.isDebugging as any) = true;

            const mockPemFile = Buffer.from('test-pem-data');
            (fs.readFileSync as jest.Mock).mockReturnValue(mockPemFile);

            const mockTunnelAgent = expansionCastTo<Agent>({ maxSockets: 1234 });
            (tunnel.httpsOverHttp as jest.Mock).mockReturnValue(mockTunnelAgent);

            (Resources.charlesCert as any) = '/path/to/default/charles.pem';

            const agent = getAgent(mockSite);

            expect(agent).toEqual({
                httpsAgent: mockTunnelAgent,
            });

            expect(tunnel.httpsOverHttp).toHaveBeenCalled();
        });
    });
});
