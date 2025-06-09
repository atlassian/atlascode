import axios, { AxiosInstance } from 'axios';
import * as EventEmitter from 'eventemitter3';
import * as express from 'express';
import * as http from 'http';
import { expansionCastTo, resolvePromiseSync } from 'testsutil';
import { v4 as uuidv4 } from 'uuid';
import * as vscode from 'vscode';

import { getAgent } from '../jira/jira-client/providers';
import { Resources } from '../resources';
import { OAuthProvider, SiteInfo } from './authInfo';
import { OAuthDancer } from './oauthDancer';
import { responseHandlerForStrategy } from './responseHandler';
import { Strategy, strategyForProvider } from './strategy';

// Mock dependencies
jest.mock('axios');
jest.mock('uuid');
jest.mock('http');
jest.mock('express');
jest.mock('../jira/jira-client/providers');
jest.mock('./strategy');
jest.mock('./responseHandler');
jest.mock('../logger');
jest.mock('../resources');
jest.mock('../container', () => ({
    Container: {
        config: {
            enableCurlLogging: false,
        },
    },
}));
jest.mock('mustache', () => ({
    default: {
        render: jest.fn(() => '<mustached />'),
    },
}));
jest.mock('eventemitter3', () => ({
    default: jest.fn(),
}));
jest.mock('p-timeout', () => ({
    default: jest.fn((promise: Promise<unknown>) => promise),
}));
jest.mock('p-cancelable', () => ({
    default: jest.fn((fn: (resolve: any, reject: any, onCancel: any) => void) => {
        let onCancel = () => {};
        const promise = new Promise<unknown>((resolve, reject) =>
            fn(
                (arg: unknown) => {
                    resolve(arg);
                },
                reject,
                (fn: any) => (onCancel = fn),
            ),
        );
        (promise as any).cancel = onCancel;
        return promise;
    }),
}));
jest.mock('util', () => ({
    ...jest.requireActual('util'),
    promisify: () => resolvePromiseSync,
}));

describe('OAuthDancer', () => {
    let mockAxiosInstance: AxiosInstance;
    let mockStrategy: Strategy;
    let mockOAuthResponseEventEmitter: any;
    let mockApp: any;
    let mockServer: any;
    let mockUri: any;
    let mockResponseHandler: any;

    beforeEach(() => {
        // Reset mocks and clear instances
        jest.clearAllMocks();

        // Setup mocks
        mockAxiosInstance = expansionCastTo<AxiosInstance>({
            create: jest.fn(),
            get: jest.fn(),
            post: jest.fn(),
        });

        mockStrategy = expansionCastTo<Strategy>({
            authorizeUrl: jest.fn().mockReturnValue('https://auth.example.com'),
            provider: jest.fn(),
            tokenUrl: jest.fn(),
        });

        mockApp = {
            get: jest.fn(),
        };

        mockServer = {
            listen: jest.fn((port, callback) => callback()),
            close: jest.fn(),
        };

        mockUri = {
            parse: jest.fn(),
            toString: jest.fn().mockReturnValue('https://auth.example.com'),
        };

        mockResponseHandler = {
            tokens: jest.fn().mockResolvedValue({
                accessToken: 'access-token',
                refreshToken: 'refresh-token',
                expiration: Date.now() + 3600000,
                iat: Date.now(),
                receivedAt: Date.now(),
            }),
            accessibleResources: jest.fn().mockResolvedValue([{ id: 'resource-1', name: 'Project 1' }]),
            user: jest.fn().mockResolvedValue({ id: 'user-1', displayName: 'Test User' }),
        };

        // Set up mock implementations
        (axios.create as jest.Mock).mockReturnValue(mockAxiosInstance);
        (express as any as jest.Mock).mockReturnValue(mockApp);
        (http.createServer as jest.Mock).mockReturnValue(mockServer);
        jest.spyOn(vscode.Uri, 'parse').mockReturnValue(mockUri);
        (strategyForProvider as jest.Mock).mockReturnValue(mockStrategy);
        (responseHandlerForStrategy as jest.Mock).mockReturnValue(mockResponseHandler);
        (getAgent as jest.Mock).mockReturnValue({});
        (uuidv4 as jest.Mock).mockReturnValue('mock-uuid');

        // Mock Resources
        Resources.html = new Map();
        Resources.html.set = jest.fn();
        Resources.html.get = jest.fn().mockReturnValue('mock-html-template');

        // Setup mock EventEmitter
        mockOAuthResponseEventEmitter = {
            addListener: jest.fn(),
            emit: jest.fn(),
        };

        jest.spyOn(EventEmitter, 'default').mockReturnValue(mockOAuthResponseEventEmitter);

        // Reset singleton instance
        (OAuthDancer as any)._instance = undefined;
    });

    afterEach(() => {
        // Cleanup
        OAuthDancer.Instance?.dispose();
    });

    describe('Instance', () => {
        it('should return a singleton instance', () => {
            const instance1 = OAuthDancer.Instance;
            const instance2 = OAuthDancer.Instance;

            expect(instance1).toBe(instance2);
        });
    });

    describe('doInitRemoteDance', () => {
        it('should initialize a remote OAuth dance', async () => {
            const instance = OAuthDancer.Instance;
            const state = { key: 'value' };
            const stateBase64 = Buffer.from(JSON.stringify(state)).toString('base64');

            await instance.doInitRemoteDance(state);

            expect(strategyForProvider).toHaveBeenCalledWith(OAuthProvider.JiraCloudRemote);
            expect(mockStrategy.authorizeUrl).toHaveBeenCalledWith(stateBase64);
            expect(vscode.Uri.parse).toHaveBeenCalledWith('https://auth.example.com');
            expect(vscode.env.openExternal).toHaveBeenCalledWith(mockUri);
        });
    });

    describe('doFinishRemoteDance', () => {
        it('should finish a remote OAuth dance successfully', async () => {
            const instance = OAuthDancer.Instance;
            const provider = OAuthProvider.JiraCloudRemote;
            const site = expansionCastTo<SiteInfo>({ host: 'example.atlassian.net' });
            const code = 'auth-code-123';

            const result = await instance.doFinishRemoteDance(provider, site, code);

            expect(strategyForProvider).toHaveBeenCalledWith(provider);
            expect(getAgent).toHaveBeenCalledWith(site);
            expect(responseHandlerForStrategy).toHaveBeenCalledWith(mockStrategy, {}, mockAxiosInstance);
            expect(mockResponseHandler.tokens).toHaveBeenCalledWith(code);
            expect(mockResponseHandler.accessibleResources).toHaveBeenCalledWith('access-token');
            expect(mockResponseHandler.user).toHaveBeenCalledWith('access-token', {
                id: 'resource-1',
                name: 'Project 1',
            });

            expect(result).toEqual({
                access: 'access-token',
                refresh: 'refresh-token',
                expirationDate: expect.any(Number),
                iat: expect.any(Number),
                receivedAt: expect.any(Number),
                user: { id: 'user-1', displayName: 'Test User' },
                accessibleResources: [{ id: 'resource-1', name: 'Project 1' }],
            });
        });

        it('should throw an error if no accessible resources are found', async () => {
            const instance = OAuthDancer.Instance;
            const provider = OAuthProvider.JiraCloudRemote;
            const site = expansionCastTo<SiteInfo>({ host: 'example.atlassian.net' });
            const code = 'auth-code-123';

            mockResponseHandler.accessibleResources.mockResolvedValueOnce([]);

            await expect(instance.doFinishRemoteDance(provider, site, code)).rejects.toThrow(
                `No accessible resources found for ${provider}`,
            );
        });
    });

    describe('doDance', () => {
        it('should set up an OAuth flow and handle successful authentication', async () => {
            const instance = OAuthDancer.Instance;
            const provider = OAuthProvider.JiraCloud;
            const site = expansionCastTo<SiteInfo>({ host: 'example.atlassian.net' });
            const callback = 'vscode://callback';

            // Setup server for this test
            (instance as any)._srv = undefined;

            // Simulate the successful OAuth response
            const responsePromise = instance.doDance(provider, site, callback);

            // Simulate the response event
            const mockReq = {
                query: {
                    code: 'auth-code-123',
                    state: 'mock-uuid',
                },
            };

            const mockRes = {
                send: jest.fn(),
            };

            // Extract the listener callback from the mock call
            const listenerCallback = mockOAuthResponseEventEmitter.addListener.mock.calls[0][1];

            // Call the listener callback with a response event
            await listenerCallback({
                provider: provider,
                req: mockReq,
                res: mockRes,
            });

            // Assert the result of the OAuth dance
            const result = await responsePromise;

            expect(result).toEqual({
                access: 'access-token',
                refresh: 'refresh-token',
                expirationDate: expect.any(Number),
                iat: expect.any(Number),
                receivedAt: expect.any(Number),
                user: { id: 'user-1', displayName: 'Test User' },
                accessibleResources: [{ id: 'resource-1', name: 'Project 1' }],
            });

            expect(mockRes.send).toHaveBeenCalled();
            expect(http.createServer).toHaveBeenCalledWith(mockApp);
            expect(vscode.env.openExternal).toHaveBeenCalled();

            OAuthDancer.Instance.dispose();
            (OAuthDancer as any)._instance = undefined;
        });

        it('should handle an error during the OAuth process', async () => {
            const instance = OAuthDancer.Instance;
            const provider = OAuthProvider.JiraCloud;
            const site = expansionCastTo<SiteInfo>({ host: 'example.atlassian.net' });
            const callback = 'vscode://callback';

            // Setup server for this test
            (instance as any)._srv = mockServer;

            // Simulate the OAuth response with an error
            const responsePromise = instance.doDance(provider, site, callback);

            // Simulate the response event with an error
            mockResponseHandler.tokens.mockRejectedValueOnce(new Error('Authentication failed'));

            const mockReq = {
                query: {
                    code: 'auth-code-123',
                    state: 'mock-uuid',
                },
            };

            const mockRes = {
                send: jest.fn(),
            };

            // Extract the listener callback from the mock call
            const listenerCallback = mockOAuthResponseEventEmitter.addListener.mock.calls[0][1];

            // Call the listener callback with a response event
            await listenerCallback({
                provider: provider,
                req: mockReq,
                res: mockRes,
            });

            // Assert the result of the OAuth dance
            await expect(responsePromise).rejects.toMatch(/Error authenticating with/);
            expect(mockRes.send).toHaveBeenCalled();
        });

        it('should cancel existing auth requests for the same provider', async () => {
            const instance = OAuthDancer.Instance;
            const provider = OAuthProvider.JiraCloud;
            const site = expansionCastTo<SiteInfo>({ host: 'example.atlassian.net' });
            const callback = 'vscode://callback';

            // Create a mock cancelable promise
            const mockCancelPromise = {
                cancel: jest.fn(),
            };

            // Set up the auth in flight
            (instance as any)._authsInFlight = new Map();
            (instance as any)._authsInFlight.set(provider, mockCancelPromise);

            // Attempt a new dance
            instance.doDance(provider, site, callback);

            // Verify the previous promise was canceled
            expect(mockCancelPromise.cancel).toHaveBeenCalled();
        });
    });

    describe('maybeShutdown and forceShutdownAll', () => {
        it('should shut down the server when no auth requests are in flight', () => {
            const instance = OAuthDancer.Instance;

            // Setup for this test
            (instance as any)._srv = mockServer;
            (instance as any)._authsInFlight = new Map();
            (instance as any)._shutdownCheck = setInterval(() => {}, 1000);

            // Call maybeShutdown
            (instance as any).maybeShutdown();

            // Verify the server was shut down
            expect(mockServer.close).toHaveBeenCalled();
            expect((instance as any)._srv).toBeUndefined();
        });

        it('should force shut down all auth requests on dispose', () => {
            const instance = OAuthDancer.Instance;

            // Setup mock auth in flight
            const mockCancelPromise1 = { cancel: jest.fn() };
            const mockCancelPromise2 = { cancel: jest.fn() };

            (instance as any)._authsInFlight = new Map();
            (instance as any)._authsInFlight.set(OAuthProvider.JiraCloud, mockCancelPromise1);
            (instance as any)._authsInFlight.set(OAuthProvider.BitbucketCloud, mockCancelPromise2);
            (instance as any)._srv = mockServer;
            (instance as any)._shutdownCheck = setInterval(() => {}, 1000);

            // Call dispose
            instance.dispose();

            // Verify all promises were cancelled and server shut down
            expect(mockCancelPromise1.cancel).toHaveBeenCalled();
            expect(mockCancelPromise2.cancel).toHaveBeenCalled();
            expect((instance as any)._authsInFlight.size).toBe(0);
            expect(mockServer.close).toHaveBeenCalled();
        });
    });

    describe('startShutdownChecker', () => {
        it('should set up a shutdown check interval and clear previous one', () => {
            const instance = OAuthDancer.Instance;

            // Set up a fake timer for the old shutdown check
            (instance as any)._shutdownCheck = 123;
            jest.spyOn(global, 'clearInterval');
            jest.spyOn(global, 'setInterval').mockReturnValue(456 as any);

            // Call startShutdownChecker
            (instance as any).startShutdownChecker();

            // Verify old timer was cleared and new one set
            expect(clearInterval).toHaveBeenCalledWith(123);
            expect(setInterval).toHaveBeenCalledWith(expect.any(Function), (instance as any)._shutdownCheckInterval);
            expect((instance as any)._shutdownCheck).toBe(456);
        });
    });
});
