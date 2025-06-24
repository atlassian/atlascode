import { IPC } from 'node-ipc';
import { uptime } from 'process';
import { Memento } from 'vscode';

import { Logger } from '../logger';
import { DetailedSiteInfo } from './authInfo';
import { Negotiator, startListening } from './negotiate';

// Mock dependencies
jest.mock('node-ipc');
jest.mock('process', () => ({
    pid: 12345,
    uptime: jest.fn(),
}));
jest.mock('../logger');

describe('negotiate', () => {
    const mockIPC = IPC as jest.MockedClass<typeof IPC>;
    const mockUptime = uptime as jest.MockedFunction<typeof uptime>;
    const mockLogger = Logger as jest.Mocked<typeof Logger>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockUptime.mockReturnValue(30); // Default to 30 seconds uptime
    });

    describe('startListening', () => {
        let mockIPCInstance: any;
        let mockRequestSite: jest.MockedFunction<(site: DetailedSiteInfo) => void>;

        beforeEach(() => {
            mockRequestSite = jest.fn();
            mockIPCInstance = {
                config: {
                    id: '',
                    retry: 0,
                    silent: false,
                },
                serve: jest.fn(),
                server: {
                    on: jest.fn(),
                    emit: jest.fn(),
                    start: jest.fn(),
                },
            };
            mockIPC.mockImplementation(() => mockIPCInstance);
        });

        it('should configure IPC server correctly', () => {
            startListening(mockRequestSite);

            expect(mockIPCInstance.config.id).toBe('atlascode-12345');
            expect(mockIPCInstance.config.retry).toBe(1500);
            expect(mockIPCInstance.config.silent).toBe(true);
        });

        it('should start IPC server and set up message handler', () => {
            startListening(mockRequestSite);

            expect(mockIPCInstance.serve).toHaveBeenCalledWith(expect.any(Function));
            expect(mockIPCInstance.server.start).toHaveBeenCalled();
            expect(mockLogger.debug).toHaveBeenCalledWith('atlascode-12345 is listening');
        });

        it('should handle ping messages correctly', () => {
            const mockSite: DetailedSiteInfo = {
                id: 'site1',
                name: 'Test Site',
                host: 'test.atlassian.net',
                baseApiUrl: 'https://test.atlassian.net/rest/api/2',
                baseLinkUrl: 'https://test.atlassian.net',
                avatarUrl: 'https://avatar.url',
                isCloud: true,
                userId: 'user1',
                credentialId: 'cred1',
                product: { name: 'Jira', key: 'jira' },
            };

            let pingHandler: (message: any, socket: any) => void;
            mockIPCInstance.serve.mockImplementation((callback: () => void) => {
                callback();
            });
            mockIPCInstance.server.on.mockImplementation((event: string, handler: any) => {
                if (event === 'atlascode-ping') {
                    pingHandler = handler;
                }
            });

            startListening(mockRequestSite);

            const mockSocket = {};
            pingHandler!(JSON.stringify(mockSite), mockSocket);

            expect(mockRequestSite).toHaveBeenCalledWith(mockSite);
            expect(mockIPCInstance.server.emit).toHaveBeenCalledWith(mockSocket, 'atlascode-ack');
        });

        it('should handle errors in requestSite callback', () => {
            const mockSite: DetailedSiteInfo = {
                id: 'site1',
                name: 'Test Site',
                host: 'test.atlassian.net',
                baseApiUrl: 'https://test.atlassian.net/rest/api/2',
                baseLinkUrl: 'https://test.atlassian.net',
                avatarUrl: 'https://avatar.url',
                isCloud: true,
                userId: 'user1',
                credentialId: 'cred1',
                product: { name: 'Jira', key: 'jira' },
            };

            const error = new Error('Test error');
            mockRequestSite.mockImplementation(() => {
                throw error;
            });

            let pingHandler: (message: any, socket: any) => void;
            mockIPCInstance.serve.mockImplementation((callback: () => void) => {
                callback();
            });
            mockIPCInstance.server.on.mockImplementation((event: string, handler: any) => {
                if (event === 'atlascode-ping') {
                    pingHandler = handler;
                }
            });

            startListening(mockRequestSite);

            const mockSocket = {};
            pingHandler!(JSON.stringify(mockSite), mockSocket);

            expect(mockLogger.error).toHaveBeenCalledWith(error, 'Error in Negotiate.startListening requestSite');
            expect(mockIPCInstance.server.emit).toHaveBeenCalledWith(mockSocket, 'atlascode-ack');
        });
    });

    describe('Negotiator', () => {
        let mockGlobalState: jest.Mocked<Memento>;
        let negotiator: Negotiator;

        beforeEach(() => {
            mockGlobalState = {
                get: jest.fn(),
                update: jest.fn(),
                keys: jest.fn(),
            };
            negotiator = new Negotiator(mockGlobalState);
        });

        describe('thisIsTheResponsibleProcess', () => {
            it('should return true when current process is responsible', () => {
                mockGlobalState.get.mockReturnValue(12345); // Same as mocked pid

                const result = negotiator.thisIsTheResponsibleProcess();

                expect(result).toBe(true);
                expect(mockGlobalState.get).toHaveBeenCalledWith('rulingPid');
                expect(mockLogger.debug).toHaveBeenCalledWith('Is responsible process: true');
            });

            it('should return false when another process is responsible', () => {
                mockGlobalState.get.mockReturnValue(54321); // Different from mocked pid

                const result = negotiator.thisIsTheResponsibleProcess();

                expect(result).toBe(false);
                expect(mockGlobalState.get).toHaveBeenCalledWith('rulingPid');
                expect(mockLogger.debug).toHaveBeenCalledWith('Is responsible process: false');
            });

            it('should return false when no responsible process is set', () => {
                mockGlobalState.get.mockReturnValue(undefined);

                const result = negotiator.thisIsTheResponsibleProcess();

                expect(result).toBe(false);
                expect(mockGlobalState.get).toHaveBeenCalledWith('rulingPid');
                expect(mockLogger.debug).toHaveBeenCalledWith('Is responsible process: false');
            });
        });

        describe('requestTokenRefreshForSite', () => {
            beforeEach(() => {
                jest.spyOn(negotiator, 'negotiationRound').mockResolvedValue(true);
            });

            it('should wait for launch delay if process is too young', async () => {
                mockUptime.mockReturnValue(10); // 10 seconds uptime, less than 20 second delay
                jest.spyOn(global, 'setTimeout').mockImplementation((callback: any) => {
                    callback();
                    return {} as any;
                });

                const result = await negotiator.requestTokenRefreshForSite('test-site');

                expect(mockLogger.debug).toHaveBeenCalledWith('Waiting 20 seconds before starting negotiations');
                expect(mockLogger.debug).toHaveBeenCalledWith("We've waited long enough.");
                expect(result).toBe(true);
            });

            it('should not wait if process is old enough', async () => {
                mockUptime.mockReturnValue(30); // 30 seconds uptime, more than 20 second delay

                const result = await negotiator.requestTokenRefreshForSite('test-site');

                expect(mockLogger.debug).not.toHaveBeenCalledWith('Waiting 20 seconds before starting negotiations');
                expect(result).toBe(true);
            });

            it('should perform multiple negotiation rounds if needed', async () => {
                jest.spyOn(negotiator, 'negotiationRound')
                    .mockResolvedValueOnce(undefined)
                    .mockResolvedValueOnce(undefined)
                    .mockResolvedValueOnce(true);

                const result = await negotiator.requestTokenRefreshForSite('test-site');

                expect(negotiator.negotiationRound).toHaveBeenCalledTimes(3);
                expect(result).toBe(true);
            });

            it('should return false after maximum rounds without success', async () => {
                jest.spyOn(negotiator, 'negotiationRound').mockResolvedValue(undefined);

                const result = await negotiator.requestTokenRefreshForSite('test-site');

                expect(negotiator.negotiationRound).toHaveBeenCalledTimes(3);
                expect(mockLogger.error).toHaveBeenCalledWith(expect.any(Error));
                expect(result).toBe(false);
            });
        });

        describe('negotiationRound', () => {
            beforeEach(() => {
                jest.spyOn(negotiator, 'sendSiteRequest').mockResolvedValue(true);
            });

            it('should return true if current process is responsible', async () => {
                mockGlobalState.get.mockReturnValue(12345); // Same as mocked pid

                const result = await negotiator.negotiationRound('test-site');

                expect(result).toBe(true);
                expect(mockLogger.debug).toHaveBeenCalledWith('This process is in charge of refreshing credentials.');
            });

            it('should return false if responsible process responds', async () => {
                mockGlobalState.get.mockReturnValue(54321); // Different from mocked pid
                jest.spyOn(negotiator, 'sendSiteRequest').mockResolvedValue(true);

                const result = await negotiator.negotiationRound('test-site');

                expect(result).toBe(false);
                expect(negotiator.sendSiteRequest).toHaveBeenCalledWith(12345, 54321, 'test-site');
                expect(mockLogger.debug).toHaveBeenCalledWith('54321 responded.');
            });

            it('should negotiate new responsible process if current one fails to respond', async () => {
                mockGlobalState.get
                    .mockReturnValueOnce(54321) // Initial call
                    .mockReturnValueOnce(12345); // After update call

                jest.spyOn(negotiator, 'sendSiteRequest').mockResolvedValue(false);
                jest.spyOn(global, 'setTimeout').mockImplementation((callback: any) => {
                    callback();
                    return {} as any;
                });

                const result = await negotiator.negotiationRound('test-site');

                expect(mockGlobalState.update).toHaveBeenCalledWith('rulingPid', 12345);
                expect(result).toBe(true);
            });

            it('should return false if another process becomes responsible after negotiation', async () => {
                mockGlobalState.get
                    .mockReturnValueOnce(54321) // Initial call
                    .mockReturnValueOnce(99999); // After update call (different process won)

                jest.spyOn(negotiator, 'sendSiteRequest').mockResolvedValue(false);
                jest.spyOn(global, 'setTimeout').mockImplementation((callback: any) => {
                    callback();
                    return {} as any;
                });

                const result = await negotiator.negotiationRound('test-site');

                expect(result).toBe(false);
            });
        });

        describe('sendSiteRequest', () => {
            let mockIPCInstance: any;

            beforeEach(() => {
                mockIPCInstance = {
                    config: {
                        id: '',
                        retry: 0,
                        silent: false,
                    },
                    connectTo: jest.fn(),
                    disconnect: jest.fn(),
                    of: {},
                };
                mockIPC.mockImplementation(() => mockIPCInstance);
            });

            it('should configure IPC client correctly', async () => {
                const mockConnection = {
                    on: jest.fn(),
                    emit: jest.fn(),
                };
                mockIPCInstance.of['atlascode-54321'] = mockConnection;

                // Mock setTimeout to immediately call the timeout callback
                jest.spyOn(global, 'setTimeout').mockImplementation((callback: any) => {
                    callback();
                    return {} as any;
                });

                mockIPCInstance.connectTo.mockImplementation((address: string, callback: () => void) => {
                    callback();
                });

                const result = await negotiator.sendSiteRequest(12345, 54321, 'test-site');

                expect(mockIPCInstance.config.id).toBe('atlascode-12345');
                expect(mockIPCInstance.config.retry).toBe(6000);
                expect(mockIPCInstance.config.silent).toBe(true);
                expect(result).toBe(false); // Should timeout
            });

            it('should return true when receiving ACK message', async () => {
                const mockConnection = {
                    on: jest.fn(),
                    emit: jest.fn(),
                };
                mockIPCInstance.of['atlascode-54321'] = mockConnection;

                // Mock setTimeout to not timeout
                jest.spyOn(global, 'setTimeout').mockImplementation((callback: any, delay: number) => {
                    if (delay === 5000) {
                        // This is the timeout - don't call it
                        return { id: 'timeout' } as any;
                    }
                    return {} as any;
                });

                jest.spyOn(global, 'clearTimeout').mockImplementation(() => {});

                // Mock the connection handlers
                let connectHandler: () => void;
                let ackHandler: () => void;

                mockConnection.on.mockImplementation((event: string, handler: () => void) => {
                    if (event === 'connect') {
                        connectHandler = handler;
                    } else if (event === 'atlascode-ack') {
                        ackHandler = handler;
                    }
                });

                mockIPCInstance.connectTo.mockImplementation((address: string, callback: () => void) => {
                    callback();
                    // Immediately trigger connection and ACK
                    process.nextTick(() => {
                        connectHandler();
                        process.nextTick(() => {
                            ackHandler();
                        });
                    });
                });

                const result = await negotiator.sendSiteRequest(12345, 54321, 'test-site');

                expect(mockConnection.emit).toHaveBeenCalledWith('atlascode-ping', 'test-site');
                expect(mockIPCInstance.disconnect).toHaveBeenCalledWith('atlascode-54321');
                expect(global.clearTimeout).toHaveBeenCalled();
                expect(result).toBe(true);
            });

            it('should return false on timeout', async () => {
                const mockConnection = {
                    on: jest.fn(),
                    emit: jest.fn(),
                };
                mockIPCInstance.of['atlascode-54321'] = mockConnection;

                // Mock setTimeout to immediately call the timeout callback
                jest.spyOn(global, 'setTimeout').mockImplementation((callback: any, delay: number) => {
                    if (delay === 5000) {
                        // This is the timeout
                        callback();
                    }
                    return {} as any;
                });

                mockIPCInstance.connectTo.mockImplementation((address: string, callback: () => void) => {
                    callback();
                });

                const result = await negotiator.sendSiteRequest(12345, 54321, 'test-site');

                expect(mockIPCInstance.disconnect).toHaveBeenCalledWith('atlascode-54321');
                expect(mockLogger.debug).toHaveBeenCalledWith(
                    expect.stringContaining('Timed out waiting on atlascode-54321'),
                );
                expect(result).toBe(false);
            });

            it('should emit ping message on connect', async () => {
                const mockConnection = {
                    on: jest.fn(),
                    emit: jest.fn(),
                };
                mockIPCInstance.of['atlascode-54321'] = mockConnection;

                mockIPCInstance.connectTo.mockImplementation((address: string, callback: () => void) => {
                    callback();
                });

                let connectHandler: () => void;
                mockConnection.on.mockImplementation((event: string, handler: () => void) => {
                    if (event === 'connect') {
                        connectHandler = handler;
                    }
                });

                // Mock setTimeout to not call timeout immediately
                jest.spyOn(global, 'setTimeout').mockImplementation(() => ({}) as any);

                negotiator.sendSiteRequest(12345, 54321, 'test-site');

                // Simulate connection
                connectHandler!();

                expect(mockConnection.emit).toHaveBeenCalledWith('atlascode-ping', 'test-site');
            });
        });
    });
});
