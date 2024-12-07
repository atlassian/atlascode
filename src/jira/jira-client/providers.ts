import { AuthorizationProvider, TransportFactory } from '@atlassianlabs/jira-pi-client';
import { AgentProvider, getProxyHostAndPort, shouldTunnelHost } from '@atlassianlabs/pi-client-common';
import axios, { AxiosInstance } from 'axios';
import * as fs from 'fs';
import * as https from 'https';
import { Logger } from '../../logger';
import * as sslRootCas from 'ssl-root-cas';
import { DetailedSiteInfo, SiteInfo } from '../../atlclients/authInfo';
import { BasicInterceptor } from '../../atlclients/basicInterceptor';
import { addCurlLogging, rewriteSecureImageRequests } from '../../atlclients/interceptors';
import { configuration } from '../../config/configuration';
import { AxiosUserAgent } from '../../constants';
import { Container } from '../../container';
import { Resources } from '../../resources';
import { ConnectionTimeout } from '../../util/time';

var tunnel = require('tunnel');

export function getAxiosInstance(): AxiosInstance {
    const instance = axios.create({
        timeout: ConnectionTimeout,
        headers: {
            'User-Agent': AxiosUserAgent,
            'X-Atlassian-Token': 'no-check',
            'Accept-Encoding': 'gzip, deflate',
        },
    });

    if (Container.config.enableCurlLogging) {
        addCurlLogging(instance);
    }

    return instance;
}

export function oauthJiraTransportFactory(site: DetailedSiteInfo): TransportFactory {
    const axios = getAxiosInstance();
    rewriteSecureImageRequests(axios);
    return () => axios;
}

export function basicJiraTransportFactory(site: DetailedSiteInfo): TransportFactory {
    const axios = getAxiosInstance();
    const interceptor = new BasicInterceptor(site, Container.credentialManager);
    interceptor.attachToAxios(axios);
    return () => axios;
}

export const jiraTokenAuthProvider = (token: string): AuthorizationProvider => {
    return (method: string, url: string) => {
        return Promise.resolve(`Bearer ${token}`);
    };
};

export const jiraBasicAuthProvider = (username: string, password: string): AuthorizationProvider => {
    const basicAuth = Buffer.from(`${username}:${password}`).toString('base64');
    return (method: string, url: string) => {
        return Promise.resolve(`Basic ${basicAuth}`);
    };
};

export const getAgent: AgentProvider = (site?: SiteInfo) => {
    let agent = {};
    try {
        if (site) {
            if (site.customSSLCertPaths && site.customSSLCertPaths.trim() !== '') {
                const cas = sslRootCas.create();
                const certs = site.customSSLCertPaths.split(',');

                certs.forEach((cert) => {
                    cas.addFile(cert.trim());
                });

                https.globalAgent.options.ca = cas;

                agent = { httpsAgent: new https.Agent({ rejectUnauthorized: false }) };
            } else if (site.pfxPath && site.pfxPath.trim() !== '') {
                const pfxFile = fs.readFileSync(site.pfxPath);

                agent = {
                    httpsAgent: new https.Agent({
                        pfx: pfxFile,
                        passphrase: site.pfxPassphrase,
                    }),
                };
            }
        }

        if (!agent['httpsAgent']) {
            if (configuration.get<boolean>('enableHttpsTunnel')) {
                let shouldTunnel: boolean = true;
                if (site) {
                    shouldTunnel = shouldTunnelHost(site.host);
                }

                if (shouldTunnel) {
                    const [host, port] = getProxyHostAndPort();

                    let numPort = undefined;
                    if (host.trim() !== '') {
                        if (port.trim() !== '') {
                            numPort = parseInt(port);
                        }
                        agent = {
                            httpsAgent: tunnel.httpsOverHttp({
                                proxy: {
                                    host: host,
                                    port: numPort,
                                },
                            }),
                            proxy: false,
                        };
                    }
                }
            } else {
                const useCharles = configuration.get<boolean>('enableCharles');
                if (useCharles) {
                    const debugOnly = configuration.get<boolean>('charlesDebugOnly');

                    if (!debugOnly || (debugOnly && Container.isDebugging)) {
                        let certPath = configuration.get<string>('charlesCertPath');
                        if (!certPath || certPath.trim() === '') {
                            certPath = Resources.charlesCert;
                        }

                        let pemFile = fs.readFileSync(certPath);

                        agent = {
                            httpsAgent: tunnel.httpsOverHttp({
                                ca: [pemFile],
                                proxy: {
                                    host: '127.0.0.1',
                                    port: 8888,
                                },
                            }),
                        };
                    }
                }
            }
        }
    } catch (err) {
        Logger.error(err, 'Error while creating agent');
        agent = {};
    }

    return agent;
};
