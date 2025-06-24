import { commands, Memento, window } from 'vscode';

import { Commands } from '../constants';
import { Container } from '../container';
import { ConfigSection, ConfigSubSection } from '../lib/ipc/models/config';
import { Logger } from '../logger';
import { checkout } from '../views/pullrequest/gitActions';
import { bitbucketSiteForRemote, clientForHostname } from './bbUtils';
import { BitbucketCheckoutHelper } from './checkoutHelper';
import { WorkspaceRepo } from './model';

// Mock dependencies
jest.mock('../container', () => ({
    Container: {
        bitbucketContext: {
            getBitbucketCloudRepositories: jest.fn(),
        },
        pullRequestDetailsWebviewFactory: {
            createOrShow: jest.fn(),
        },
        settingsWebviewFactory: {
            createOrShow: jest.fn(),
        },
    },
}));
jest.mock('../logger');
jest.mock('../views/pullrequest/gitActions');
jest.mock('./bbUtils');

const mockCommands = commands as jest.Mocked<typeof commands>;
const mockWindow = window as jest.Mocked<typeof window>;
const mockLogger = Logger as jest.Mocked<typeof Logger>;
const mockCheckout = checkout as jest.MockedFunction<typeof checkout>;
const mockBitbucketSiteForRemote = bitbucketSiteForRemote as jest.MockedFunction<typeof bitbucketSiteForRemote>;
const mockClientForHostname = clientForHostname as jest.MockedFunction<typeof clientForHostname>;

describe('BitbucketCheckoutHelper', () => {
    let checkoutHelper: BitbucketCheckoutHelper;
    let mockGlobalState: jest.Mocked<Memento>;
    let mockWorkspaceRepo: WorkspaceRepo;

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock global state
        mockGlobalState = {
            get: jest.fn(),
            update: jest.fn(),
            keys: jest.fn(),
        };

        // Mock workspace repo
        mockWorkspaceRepo = {
            rootUri: 'file:///test/repo',
            mainSiteRemote: {
                site: {
                    ownerSlug: 'testowner',
                    repoSlug: 'testrepo',
                },
                remote: {
                    name: 'origin',
                },
            },
        } as any;

        // Mock Container methods
        (Container.bitbucketContext.getBitbucketCloudRepositories as jest.Mock).mockReturnValue([mockWorkspaceRepo]);

        checkoutHelper = new BitbucketCheckoutHelper(mockGlobalState);
    });

    describe('constructor', () => {
        it('should create an instance with global state', () => {
            expect(checkoutHelper).toBeInstanceOf(BitbucketCheckoutHelper);
        });
    });

    describe('checkoutRef', () => {
        const cloneUrl = 'https://bitbucket.org/testowner/testrepo.git';
        const ref = 'feature-branch';
        const refType = 'branch';

        it('should successfully checkout ref when repo is in workspace', async () => {
            mockCheckout.mockResolvedValue(true);

            const result = await checkoutHelper.checkoutRef(cloneUrl, ref, refType);

            expect(result).toBe(true);
            expect(mockCheckout).toHaveBeenCalledWith(mockWorkspaceRepo, ref, '');
            expect(mockWindow.showInformationMessage).toHaveBeenCalledWith(
                'Branch feature-branch successfully checked out',
            );
        });

        it('should handle checkout failure gracefully', async () => {
            mockCheckout.mockResolvedValue(false);

            const result = await checkoutHelper.checkoutRef(cloneUrl, ref, refType);

            expect(result).toBe(false);
            expect(mockCheckout).toHaveBeenCalledWith(mockWorkspaceRepo, ref, '');
            expect(mockWindow.showInformationMessage).not.toHaveBeenCalledWith(
                expect.stringContaining('successfully checked out'),
            );
        });

        it('should handle checkout with source clone URL', async () => {
            const sourceCloneUrl = 'https://bitbucket.org/sourceowner/sourcerepo.git';
            mockCheckout.mockResolvedValue(true);

            const result = await checkoutHelper.checkoutRef(cloneUrl, ref, refType, sourceCloneUrl);

            expect(result).toBe(true);
            expect(mockCheckout).toHaveBeenCalledWith(mockWorkspaceRepo, ref, sourceCloneUrl);
        });

        it('should show different success message for non-branch ref types', async () => {
            mockCheckout.mockResolvedValue(true);

            await checkoutHelper.checkoutRef(cloneUrl, 'v1.0.0', 'tag');

            expect(mockWindow.showInformationMessage).toHaveBeenCalledWith('v1.0.0 successfully checked out');
        });

        it('should prompt to clone repo when not in workspace', async () => {
            (Container.bitbucketContext.getBitbucketCloudRepositories as jest.Mock).mockReturnValue([]);
            // The window.showInformationMessage().then() pattern requires resolving to 'Clone Repo'
            mockWindow.showInformationMessage.mockImplementation((message: string, ...items: any[]) => {
                if (items[0] === 'Clone Repo') {
                    return Promise.resolve('Clone Repo' as any); // Return the string directly, but cast to any
                }
                return Promise.resolve(undefined);
            });

            const mockSelection = {
                label: 'Clone a new copy',
                action: jest.fn().mockResolvedValue(undefined),
            };
            mockWindow.showQuickPick.mockResolvedValue(mockSelection as any);

            const result = await checkoutHelper.checkoutRef(cloneUrl, ref, refType);

            expect(result).toBe(false);
            expect(mockGlobalState.update).toHaveBeenCalledWith(
                'bitbucket.checkoutRef',
                expect.objectContaining({
                    cloneUrl,
                    refName: ref,
                    refType,
                    sourceCloneUrl: '',
                }),
            );
            expect(mockWindow.showInformationMessage).toHaveBeenCalledWith(
                `To checkout ref ${ref}: this repository must be cloned in this workspace`,
                'Clone Repo',
            );
            expect(mockWindow.showQuickPick).toHaveBeenCalled();
            expect(mockSelection.action).toHaveBeenCalled();
        });

        it('should not show clone options when user cancels', async () => {
            (Container.bitbucketContext.getBitbucketCloudRepositories as jest.Mock).mockReturnValue([]);
            mockWindow.showInformationMessage.mockResolvedValue(undefined);

            const result = await checkoutHelper.checkoutRef(cloneUrl, ref, refType);

            expect(result).toBe(false);
            expect(mockWindow.showQuickPick).not.toHaveBeenCalled();
        });

        it('should throw error when repo has no site remote', async () => {
            const repoWithoutSite = {
                ...mockWorkspaceRepo,
                mainSiteRemote: {
                    ...mockWorkspaceRepo.mainSiteRemote,
                    site: null,
                },
            };
            (Container.bitbucketContext.getBitbucketCloudRepositories as jest.Mock).mockReturnValue([repoWithoutSite]);

            await expect(checkoutHelper.checkoutRef(cloneUrl, ref, refType)).rejects.toThrow(
                'Cannot read properties of null',
            );
        });
    });

    describe('completeBranchCheckOut', () => {
        const refInfo = {
            timestamp: Date.now(),
            cloneUrl: 'https://bitbucket.org/testowner/testrepo.git',
            refName: 'feature-branch',
            refType: 'branch',
            sourceCloneUrl: '',
        };

        it('should complete checkout when ref info is valid and fresh', async () => {
            mockGlobalState.get.mockReturnValue(refInfo);
            mockCheckout.mockResolvedValue(true);

            await checkoutHelper.completeBranchCheckOut();

            expect(mockCheckout).toHaveBeenCalledWith(mockWorkspaceRepo, 'feature-branch', '');
            expect(mockWindow.showInformationMessage).toHaveBeenCalledWith(
                'Branch feature-branch successfully checked out',
            );
            expect(mockGlobalState.update).toHaveBeenCalledWith(
                'bitbucket.checkoutRef',
                expect.objectContaining({ refName: '' }),
            );
        });

        it('should handle stale ref info', async () => {
            const staleRefInfo = {
                ...refInfo,
                timestamp: Date.now() - 120000, // 2 minutes ago
            };
            mockGlobalState.get.mockReturnValue(staleRefInfo);

            await checkoutHelper.completeBranchCheckOut();

            expect(mockCheckout).not.toHaveBeenCalled();
            expect(mockLogger.debug).toHaveBeenCalledWith("RefInfo found in globalState but it's stale.");
            expect(mockGlobalState.update).toHaveBeenCalledWith(
                'bitbucket.checkoutRef',
                expect.objectContaining({ refName: '' }),
            );
        });

        it('should handle missing repo in workspace', async () => {
            mockGlobalState.get.mockReturnValue(refInfo);
            (Container.bitbucketContext.getBitbucketCloudRepositories as jest.Mock).mockReturnValue([]);

            await checkoutHelper.completeBranchCheckOut();

            expect(mockWindow.showInformationMessage).toHaveBeenCalledWith(
                'Could not find repo in current workspace after attempting to clone. Are you authenticated with Bitbucket?',
                'Open auth settings',
            );
        });

        it('should handle empty ref info', async () => {
            mockGlobalState.get.mockReturnValue({ timestamp: 0, cloneUrl: '', refName: '', refType: '' });

            await checkoutHelper.completeBranchCheckOut();

            expect(mockCheckout).not.toHaveBeenCalled();
            expect(mockGlobalState.update).not.toHaveBeenCalled();
        });

        it('should handle checkout failure', async () => {
            mockGlobalState.get.mockReturnValue(refInfo);
            mockCheckout.mockResolvedValue(false);

            await checkoutHelper.completeBranchCheckOut();

            expect(mockCheckout).toHaveBeenCalled();
            expect(mockWindow.showInformationMessage).not.toHaveBeenCalledWith(
                expect.stringContaining('successfully checked out'),
            );
        });
    });

    describe('cloneRepository', () => {
        const repoUrl = 'https://bitbucket.org/testowner/testrepo.git';

        it('should skip cloning when repo is already in workspace', async () => {
            await checkoutHelper.cloneRepository(repoUrl);

            expect(mockWindow.showInformationMessage).toHaveBeenCalledWith(
                `Skipped cloning. Repository is open in this workspace already: ${mockWorkspaceRepo.rootUri}`,
            );
            expect(mockWindow.showQuickPick).not.toHaveBeenCalled();
        });

        it('should show clone options when repo is not in workspace', async () => {
            (Container.bitbucketContext.getBitbucketCloudRepositories as jest.Mock).mockReturnValue([]);
            const mockSelection = {
                label: 'Clone a new copy',
                action: jest.fn().mockResolvedValue(undefined),
            };
            mockWindow.showQuickPick.mockResolvedValue(mockSelection as any);

            await checkoutHelper.cloneRepository(repoUrl);

            expect(mockWindow.showQuickPick).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({ label: 'Clone a new copy' }),
                    expect.objectContaining({ label: 'Add an existing folder to this workspace' }),
                    expect.objectContaining({ label: 'Open repository in an different workspace' }),
                ]),
            );
            expect(mockSelection.action).toHaveBeenCalled();
        });
    });

    describe('pullRequest', () => {
        const repoUrl = 'https://bitbucket.org/testowner/testrepo.git';
        const pullRequestId = 123;

        beforeEach(() => {
            mockBitbucketSiteForRemote.mockReturnValue({
                ownerSlug: 'testowner',
                repoSlug: 'testrepo',
            } as any);
        });

        it('should successfully open pull request', async () => {
            const mockClient = {
                pullrequests: {
                    getById: jest.fn().mockResolvedValue({
                        data: { url: 'https://bitbucket.org/testowner/testrepo/pull-requests/123' },
                    }),
                },
            };
            mockClientForHostname.mockResolvedValue(mockClient as any);

            await checkoutHelper.pullRequest(repoUrl, pullRequestId);

            expect(mockClientForHostname).toHaveBeenCalledWith('bitbucket.org');
            expect(mockClient.pullrequests.getById).toHaveBeenCalledWith(
                expect.objectContaining({ ownerSlug: 'testowner', repoSlug: 'testrepo' }),
                pullRequestId,
            );
            expect(Container.pullRequestDetailsWebviewFactory.createOrShow).toHaveBeenCalled();
        });

        it('should handle pull request fetch error', async () => {
            const error = new Error('Authentication failed');
            mockClientForHostname.mockRejectedValue(error);

            await checkoutHelper.pullRequest(repoUrl, pullRequestId);

            expect(mockLogger.error).toHaveBeenCalledWith(error, 'Error opening pull request');
            expect(mockWindow.showInformationMessage).toHaveBeenCalledWith(
                'Cannot open pull request. Authenticate with Bitbucket in the extension settings and try again.',
                'Open auth settings',
            );
            expect(mockCommands.executeCommand).toHaveBeenCalledWith(Commands.ShowBitbucketAuth);
        });
    });

    describe('showCloneOptions', () => {
        const repoUrl = 'https://bitbucket.org/testowner/testrepo.git';

        it('should execute clone repository command when "Clone a new copy" is selected', async () => {
            (Container.bitbucketContext.getBitbucketCloudRepositories as jest.Mock).mockReturnValue([]);
            const mockSelection = {
                label: 'Clone a new copy',
                action: jest.fn().mockResolvedValue(undefined),
            };
            mockWindow.showQuickPick.mockResolvedValue(mockSelection as any);

            await checkoutHelper.cloneRepository(repoUrl);

            expect(mockWindow.showQuickPick).toHaveBeenCalled();
            expect(mockSelection.action).toHaveBeenCalled();
        });

        it('should handle no selection', async () => {
            (Container.bitbucketContext.getBitbucketCloudRepositories as jest.Mock).mockReturnValue([]);
            mockWindow.showQuickPick.mockResolvedValue(undefined);

            await checkoutHelper.cloneRepository(repoUrl);

            expect(mockWindow.showQuickPick).toHaveBeenCalled();
            // Should not throw error when no selection is made
        });

        it('should test clone action execution', async () => {
            // Test the actual action that would be executed
            (Container.bitbucketContext.getBitbucketCloudRepositories as jest.Mock).mockReturnValue([]);
            let capturedAction: (() => Promise<void>) | undefined;

            mockWindow.showQuickPick.mockImplementation((options: any[]) => {
                capturedAction = options[0].action; // Capture the first option's action
                return Promise.resolve(options[0]);
            });

            await checkoutHelper.cloneRepository(repoUrl);

            // Execute the captured action
            if (capturedAction) {
                await capturedAction();
                expect(mockCommands.executeCommand).toHaveBeenCalledWith(
                    Commands.CloneRepository,
                    'uriHandler',
                    repoUrl,
                );
            }
        });

        it('should test add existing folder action execution', async () => {
            (Container.bitbucketContext.getBitbucketCloudRepositories as jest.Mock).mockReturnValue([]);
            let capturedAction: (() => Promise<void>) | undefined;

            mockWindow.showQuickPick.mockImplementation((options: any[]) => {
                capturedAction = options[1].action; // Capture the second option's action
                return Promise.resolve(options[1]);
            });

            await checkoutHelper.cloneRepository(repoUrl);

            // Execute the captured action
            if (capturedAction) {
                await capturedAction();
                expect(mockCommands.executeCommand).toHaveBeenCalledWith(
                    Commands.WorkbenchOpenRepository,
                    'uriHandler',
                );
            }
        });

        it('should test open in different workspace action execution', async () => {
            (Container.bitbucketContext.getBitbucketCloudRepositories as jest.Mock).mockReturnValue([]);
            let capturedAction: (() => Promise<void>) | undefined;

            mockWindow.showQuickPick.mockImplementation((options: any[]) => {
                capturedAction = options[2].action; // Capture the third option's action
                return Promise.resolve(options[2]);
            });

            await checkoutHelper.cloneRepository(repoUrl);

            // Execute the captured action
            if (capturedAction) {
                await capturedAction();
                expect(mockCommands.executeCommand).toHaveBeenCalledWith(Commands.WorkbenchOpenWorkspace, 'uriHandler');
            }
        });
    });

    describe('showLoginMessage', () => {
        it('should open auth settings when user chooses to', async () => {
            // Mock the showInformationMessage to resolve to 'Open auth settings'
            mockWindow.showInformationMessage.mockImplementation((message: string, ...items: any[]) => {
                if (items[0] === 'Open auth settings') {
                    return Promise.resolve('Open auth settings' as any);
                }
                return Promise.resolve(undefined);
            });

            // Trigger the login message through completeBranchCheckOut
            mockGlobalState.get.mockReturnValue({
                timestamp: Date.now(),
                cloneUrl: 'https://bitbucket.org/testowner/testrepo.git',
                refName: 'feature-branch',
                refType: 'branch',
            });
            (Container.bitbucketContext.getBitbucketCloudRepositories as jest.Mock).mockReturnValue([]);

            await checkoutHelper.completeBranchCheckOut();

            expect(Container.settingsWebviewFactory.createOrShow).toHaveBeenCalledWith({
                section: ConfigSection.Bitbucket,
                subSection: ConfigSubSection.Auth,
            });
        });

        it('should not open auth settings when user cancels', async () => {
            mockWindow.showInformationMessage.mockResolvedValue(undefined);

            // Trigger the login message through completeBranchCheckOut
            mockGlobalState.get.mockReturnValue({
                timestamp: Date.now(),
                cloneUrl: 'https://bitbucket.org/testowner/testrepo.git',
                refName: 'feature-branch',
                refType: 'branch',
            });
            (Container.bitbucketContext.getBitbucketCloudRepositories as jest.Mock).mockReturnValue([]);

            await checkoutHelper.completeBranchCheckOut();

            expect(Container.settingsWebviewFactory.createOrShow).not.toHaveBeenCalled();
        });
    });

    describe('findRepoInCurrentWorkspace', () => {
        it('should find repo by matching owner and repo slug in URL', async () => {
            const repoUrl = 'https://bitbucket.org/testowner/testrepo.git';
            mockCheckout.mockResolvedValue(true); // Ensure checkout succeeds

            const result = await checkoutHelper.checkoutRef(repoUrl, 'test-branch', 'branch');

            expect(Container.bitbucketContext.getBitbucketCloudRepositories).toHaveBeenCalled();
            expect(result).toBe(true); // Should find the repo and succeed
        });

        it('should not find repo when URL does not match', async () => {
            const repoUrl = 'https://bitbucket.org/differentowner/differentrepo.git';

            const result = await checkoutHelper.checkoutRef(repoUrl, 'test-branch', 'branch');

            expect(result).toBe(false); // Should not find the repo
        });
    });
});
