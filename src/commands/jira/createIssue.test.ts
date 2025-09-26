import { Position, Uri, ViewColumn, workspace, WorkspaceEdit } from 'vscode';

import { startIssueCreationEvent } from '../../analytics';
import { ProductJira } from '../../atlclients/authInfo';
import { Container } from '../../container';
import { CommentData } from '../../webviews/createIssueWebview';
import { createIssue, TodoIssueData } from './createIssue';

// Mock dependencies
jest.mock('vscode', () => {
    const originalModule = jest.requireActual('jest-mock-vscode');
    return {
        ...originalModule.createVSCodeMock(jest),
        Uri: {
            file: jest.fn().mockImplementation((path) => ({
                fsPath: path,
                scheme: 'file',
                path,
            })),
            parse: jest.fn(),
        },
        ViewColumn: {
            Active: 1,
            Beside: 2,
        },
        Position: jest.fn().mockImplementation((line, character) => ({ line, character })),
        WorkspaceEdit: jest.fn().mockImplementation(() => ({
            insert: jest.fn(),
        })),
    };
});

jest.mock('../../analytics', () => ({
    startIssueCreationEvent: jest.fn().mockResolvedValue({ some: 'event' }),
}));

jest.mock('../../container', () => ({
    Container: {
        createIssueWebview: {
            createOrShow: jest.fn(),
            fastUpdateFields: jest.fn().mockResolvedValue(undefined),
            setGeneratingIssueSuggestions: jest.fn(),
        },
        analyticsClient: {
            sendTrackEvent: jest.fn(),
        },
        bitbucketContext: {
            getAllRepositories: jest.fn().mockReturnValue([]),
            getRepositoryScm: jest.fn(),
        },
        featureFlagClient: {
            checkGate: jest.fn().mockReturnValue(true),
        },
    },
}));

describe('createIssue', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('TodoIssueData', () => {
        it('should create issue from TODO comment', async () => {
            const todoData: TodoIssueData = {
                summary: 'Test summary',
                uri: Uri.file('/test/path'),
                insertionPoint: new Position(10, 20),
                context: 'This is a test context',
            };

            await createIssue(todoData);

            expect(Container.createIssueWebview.createOrShow).toHaveBeenCalled();

            expect(startIssueCreationEvent).toHaveBeenCalledWith('todoComment', ProductJira);

            // After the promise resolves
            await Promise.resolve();
            expect(Container.analyticsClient.sendTrackEvent).toHaveBeenCalledWith({ some: 'event' });
        });
    });

    describe('Uri input', () => {
        it('should create issue from file Uri', async () => {
            const uri = Uri.file('/test/path');

            await createIssue(uri);

            expect(Container.createIssueWebview.createOrShow).toHaveBeenCalledWith(ViewColumn.Active, {
                description: expect.any(String),
            });

            expect(startIssueCreationEvent).toHaveBeenCalledWith('contextMenu', ProductJira);

            // After the promise resolves
            await Promise.resolve();
            expect(Container.analyticsClient.sendTrackEvent).toHaveBeenCalledWith({ some: 'event' });
        });

        it('should not use file Uri handling for non-file scheme', async () => {
            const uri = { scheme: 'http', fsPath: 'http://example.com' };

            await createIssue(uri as any);

            expect(Container.createIssueWebview.createOrShow).toHaveBeenCalledWith();
            expect(startIssueCreationEvent).toHaveBeenCalledWith('explorer', ProductJira);
        });
    });

    describe('No input', () => {
        it('should create issue with no data', async () => {
            await createIssue(undefined);

            expect(Container.createIssueWebview.createOrShow).toHaveBeenCalledWith();
            expect(startIssueCreationEvent).toHaveBeenCalledWith('explorer', ProductJira);

            // After the promise resolves
            await Promise.resolve();
            expect(Container.analyticsClient.sendTrackEvent).toHaveBeenCalledWith({ some: 'event' });
        });

        it('should create issue with custom source', async () => {
            await createIssue(undefined, 'customSource');

            expect(Container.createIssueWebview.createOrShow).toHaveBeenCalledWith();
            expect(startIssueCreationEvent).toHaveBeenCalledWith('customSource', ProductJira);
        });
    });

    describe('Private helper functions', () => {
        it('should annotate comment correctly', async () => {
            // Set up the test to call annotateComment
            const todoData: TodoIssueData = {
                summary: 'Test summary',
                uri: Uri.file('/test/path'),
                insertionPoint: new Position(10, 20),
                context: 'This is a test context',
            };

            await createIssue(todoData);

            // Get the onCreated callback
            const createOrShowMock = Container.createIssueWebview.createOrShow as jest.Mock;
            const { onCreated } = createOrShowMock.mock.calls[0][1];

            // Create a WorkspaceEdit spy
            const insertSpy = jest.fn();
            (WorkspaceEdit as jest.Mock).mockImplementation(() => ({
                insert: insertSpy,
            }));

            // Mock workspace.applyEdit
            const applyEditSpy = jest.fn();
            (workspace as any).applyEdit = applyEditSpy;

            // Call onCreated with test data
            const commentData: CommentData = {
                issueKey: 'TEST-123',
                summary: 'Test issue',
                uri: Uri.file('/test/path'),
                position: new Position(10, 20),
            };

            onCreated(commentData);

            // Check if WorkspaceEdit was created and applied correctly
            expect(WorkspaceEdit).toHaveBeenCalled();
            expect(insertSpy).toHaveBeenCalledWith(
                commentData.uri,
                commentData.position,
                ` [${commentData.issueKey}] ${commentData.summary}`,
            );
            expect(applyEditSpy).toHaveBeenCalled();
        });

        it('should annotate comment with empty summary', async () => {
            // Similar setup as the previous test
            const todoData: TodoIssueData = {
                summary: 'Test summary',
                uri: Uri.file('/test/path'),
                insertionPoint: new Position(10, 20),
                context: 'This is a test context',
            };

            await createIssue(todoData);

            const createOrShowMock = Container.createIssueWebview.createOrShow as jest.Mock;
            const { onCreated } = createOrShowMock.mock.calls[0][1];

            const insertSpy = jest.fn();
            (WorkspaceEdit as jest.Mock).mockImplementation(() => ({
                insert: insertSpy,
            }));

            const applyEditSpy = jest.fn();
            (workspace as any).applyEdit = applyEditSpy;

            // Call with empty summary
            const commentData: CommentData = {
                issueKey: 'TEST-123',
                summary: '',
                uri: Uri.file('/test/path'),
                position: new Position(10, 20),
            };

            onCreated(commentData);

            expect(insertSpy).toHaveBeenCalledWith(commentData.uri, commentData.position, ` [${commentData.issueKey}]`);
        });
    });
});
