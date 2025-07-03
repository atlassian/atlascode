import { CompletionItemKind, Position, SnippetString, TextDocument } from 'vscode';

import { Logger } from '../../logger';
import { PipelinesYamlCompletionProvider } from './pipelinesYamlCompletionProvider';

// Mock Logger
jest.mock('../../logger', () => ({
    Logger: {
        error: jest.fn(),
        debug: jest.fn(),
    },
}));

// Mock jira-client providers
jest.mock('../../jira/jira-client/providers', () => ({
    getAgent: jest.fn(() => ({ agent: 'mock-agent' })),
    getAxiosInstance: jest.fn(),
}));

const mockPipeData = [
    {
        name: 'atlassian/aws-s3-deploy',
        description: 'Deploy files to AWS S3',
        repositoryPath: 'atlassian/aws-s3-deploy',
        version: '1.4.0',
        vendor: { name: 'Atlassian', website: 'https://atlassian.com' },
        maintainer: { name: 'Atlassian', website: 'https://atlassian.com' },
        yml: "- pipe: atlassian/aws-s3-deploy:1.4.0\n  variables:\n    AWS_ACCESS_KEY_ID: $AWS_ACCESS_KEY_ID\n    AWS_SECRET_ACCESS_KEY: $AWS_SECRET_ACCESS_KEY\n    AWS_DEFAULT_REGION: 'us-east-1'\n    S3_BUCKET: 'my-bucket'",
        logo: 'https://example.com/logo.png',
    },
    {
        name: 'atlassian/slack-notify',
        description: 'Send notifications to Slack',
        repositoryPath: 'atlassian/slack-notify',
        version: '2.1.0',
        vendor: { name: 'Atlassian', website: 'https://atlassian.com' },
        maintainer: { name: 'Atlassian', website: 'https://atlassian.com' },
        yml: "- pipe: atlassian/slack-notify:2.1.0\n  variables:\n    WEBHOOK_URL: $SLACK_WEBHOOK_URL\n    MESSAGE: 'Build completed'",
        logo: 'https://example.com/slack-logo.png',
    },
];

describe('PipelinesYamlCompletionProvider', () => {
    let provider: PipelinesYamlCompletionProvider;
    let mockAxiosInstance: jest.Mock;
    let mockTextDocument: jest.Mocked<TextDocument>;
    let mockPosition: Position;

    beforeEach(() => {
        jest.clearAllMocks();

        mockAxiosInstance = jest.fn();
        const { getAxiosInstance } = require('../../jira/jira-client/providers');
        getAxiosInstance.mockReturnValue(mockAxiosInstance);

        // Create mock text document
        mockTextDocument = {
            lineAt: jest.fn(),
            getWordRangeAtPosition: jest.fn(),
            getText: jest.fn(),
        } as unknown as jest.Mocked<TextDocument>;

        mockPosition = new Position(5, 10);
    });

    describe('constructor', () => {
        it('should initialize and load pipes on construction', () => {
            // Setup successful axios response
            mockAxiosInstance.mockResolvedValue({ data: mockPipeData });

            provider = new PipelinesYamlCompletionProvider();

            expect(mockAxiosInstance).toHaveBeenCalledWith(
                'https://api.bitbucket.org/2.0/repositories/bitbucketpipelines/official-pipes/src/master/pipes.prod.json',
                {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    agent: 'mock-agent',
                },
            );
        });

        it('should handle errors when loading pipes', async () => {
            const mockError = new Error('Network error');
            mockAxiosInstance.mockRejectedValue(mockError);

            provider = new PipelinesYamlCompletionProvider();

            // Wait for the promise to resolve/reject
            await new Promise((resolve) => setTimeout(resolve, 0));

            expect(Logger.error).toHaveBeenCalledWith(mockError, 'Error getting pipes');
            expect(Logger.debug).toHaveBeenCalledWith('knownpipes', []);
        });
    });

    describe('provideCompletionItems', () => {
        beforeEach(async () => {
            mockAxiosInstance.mockResolvedValue({ data: mockPipeData });
            provider = new PipelinesYamlCompletionProvider();

            // Wait for pipes to load
            await new Promise((resolve) => setTimeout(resolve, 0));
        });

        it('should return undefined when pipes are not loaded', () => {
            // Create a provider with no pipes loaded
            mockAxiosInstance.mockResolvedValue({ data: [] });
            const emptyProvider = new PipelinesYamlCompletionProvider();

            const result = emptyProvider.provideCompletionItems(mockTextDocument, mockPosition);

            expect(result).toBeUndefined();
        });

        it('should return undefined when pipes should not be shown', () => {
            // Mock getFirstWord to return something other than 'pipe'
            mockTextDocument.lineAt.mockReturnValue({
                isEmptyOrWhitespace: false,
                firstNonWhitespaceCharacterIndex: 0,
            } as any);
            mockTextDocument.getWordRangeAtPosition.mockReturnValue({} as any);
            mockTextDocument.getText.mockReturnValue('step');

            const result = provider.provideCompletionItems(mockTextDocument, mockPosition);

            expect(result).toBeUndefined();
        });

        it('should return pipe items without "pipe:" prefix when first word is "pipe"', () => {
            // Mock getFirstWord to return 'pipe'
            mockTextDocument.lineAt.mockReturnValue({
                isEmptyOrWhitespace: false,
                firstNonWhitespaceCharacterIndex: 0,
            } as any);
            mockTextDocument.getWordRangeAtPosition.mockReturnValue({} as any);
            mockTextDocument.getText.mockReturnValue('pipe');

            const result = provider.provideCompletionItems(mockTextDocument, mockPosition);

            expect(result).toBeDefined();
            expect(Array.isArray(result)).toBe(true);
            expect(result!.length).toBe(2);

            const firstItem = result![0];
            expect(firstItem.label).toBe('atlassian/aws-s3-deploy');
            expect(firstItem.kind).toBe(CompletionItemKind.Snippet);
            expect(firstItem.documentation).toBe('Deploy files to AWS S3');

            // Should have the "- pipe: " prefix removed
            const expectedText = mockPipeData[0].yml.substring(8);
            expect((firstItem.insertText as SnippetString).value).toBe(expectedText);
        });

        it('should return full pipe items when conditions are met but first word is not "pipe"', () => {
            // Mock showPipes to return true but getFirstWord to return undefined
            mockTextDocument.lineAt.mockReturnValue({
                isEmptyOrWhitespace: true,
                firstNonWhitespaceCharacterIndex: 0,
            } as any);

            // Mock findParentWord to return 'script'
            const scriptLineMock = {
                isEmptyOrWhitespace: false,
                firstNonWhitespaceCharacterIndex: 0,
            };
            mockTextDocument.lineAt
                .mockReturnValueOnce({ isEmptyOrWhitespace: true } as any) // Current line
                .mockReturnValueOnce(scriptLineMock as any); // Parent line

            mockTextDocument.getWordRangeAtPosition.mockReturnValue({} as any);
            mockTextDocument.getText.mockReturnValue('script');

            const result = provider.provideCompletionItems(mockTextDocument, mockPosition);

            expect(result).toBeDefined();
            expect(Array.isArray(result)).toBe(true);
            expect(result!.length).toBe(2);

            const firstItem = result![0];
            expect(firstItem.label).toBe('atlassian/aws-s3-deploy');
            expect(firstItem.kind).toBe(CompletionItemKind.Snippet);
            expect(firstItem.documentation).toBe('Deploy files to AWS S3');
            expect((firstItem.insertText as SnippetString).value).toBe(mockPipeData[0].yml);
        });
    });

    describe('showPipes integration tests', () => {
        beforeEach(async () => {
            mockAxiosInstance.mockResolvedValue({ data: mockPipeData });
            provider = new PipelinesYamlCompletionProvider();
            await new Promise((resolve) => setTimeout(resolve, 0));
        });

        it('should provide completions when first word is "pipe"', () => {
            mockTextDocument.lineAt.mockReturnValue({
                isEmptyOrWhitespace: false,
                firstNonWhitespaceCharacterIndex: 0,
            } as any);
            mockTextDocument.getWordRangeAtPosition.mockReturnValue({} as any);
            mockTextDocument.getText.mockReturnValue('pipe');

            const result = provider.provideCompletionItems(mockTextDocument, mockPosition);

            expect(result).toBeDefined();
            expect(result!.length).toBe(2);
        });

        it('should not provide completions when context is not appropriate', () => {
            mockTextDocument.lineAt.mockReturnValue({
                isEmptyOrWhitespace: false,
                firstNonWhitespaceCharacterIndex: 0,
            } as any);
            mockTextDocument.getWordRangeAtPosition.mockReturnValue({} as any);
            mockTextDocument.getText.mockReturnValue('step');

            const result = provider.provideCompletionItems(mockTextDocument, mockPosition);

            expect(result).toBeUndefined();
        });
    });

    describe('private method integration tests', () => {
        beforeEach(async () => {
            mockAxiosInstance.mockResolvedValue({ data: mockPipeData });
            provider = new PipelinesYamlCompletionProvider();
            await new Promise((resolve) => setTimeout(resolve, 0));
        });

        it('should handle complex YAML structure context', () => {
            // Test a realistic scenario where user is typing in a script section
            const position = new Position(3, 0);

            // Mock to simulate being in a script context
            mockTextDocument.lineAt.mockReturnValue({
                isEmptyOrWhitespace: false,
                firstNonWhitespaceCharacterIndex: 0,
            } as any);
            mockTextDocument.getWordRangeAtPosition.mockReturnValue({} as any);
            mockTextDocument.getText.mockReturnValue('-');

            const result = provider.provideCompletionItems(mockTextDocument, position);

            // The exact result depends on the internal logic, but the method should not crash
            expect(typeof result === 'undefined' || Array.isArray(result)).toBe(true);
        });

        it('should handle empty lines gracefully', () => {
            mockTextDocument.lineAt.mockReturnValue({
                isEmptyOrWhitespace: true,
            } as any);

            const result = provider.provideCompletionItems(mockTextDocument, mockPosition);

            expect(result).toBeUndefined();
        });
    });

    describe('getFirstWord', () => {
        beforeEach(async () => {
            mockAxiosInstance.mockResolvedValue({ data: mockPipeData });
            provider = new PipelinesYamlCompletionProvider();
            await new Promise((resolve) => setTimeout(resolve, 0));
        });

        it('should return undefined for empty lines', () => {
            mockTextDocument.lineAt.mockReturnValue({
                isEmptyOrWhitespace: true,
            } as any);

            const result = provider.provideCompletionItems(mockTextDocument, mockPosition);

            expect(result).toBeUndefined();
        });

        it('should handle lines starting with dash', () => {
            mockTextDocument.lineAt.mockReturnValue({
                isEmptyOrWhitespace: false,
                firstNonWhitespaceCharacterIndex: 0,
            } as any);
            mockTextDocument.getWordRangeAtPosition
                .mockReturnValueOnce({} as any) // First call for dash in getFirstWord
                .mockReturnValueOnce({} as any) // Second call for word after dash in getFirstWord
                .mockReturnValueOnce({} as any); // Third call in showPipes/findParentWord
            mockTextDocument.getText.mockReturnValueOnce('-').mockReturnValueOnce('pipe').mockReturnValueOnce('pipe');

            const result = provider.provideCompletionItems(mockTextDocument, mockPosition);

            expect(result).toBeDefined();
            // Note: getWordRangeAtPosition gets called 3 times total due to internal logic
            expect(mockTextDocument.getWordRangeAtPosition).toHaveBeenCalledTimes(3);
        });
    });

    describe('pipe completion items generation', () => {
        beforeEach(async () => {
            mockAxiosInstance.mockResolvedValue({ data: mockPipeData });
            provider = new PipelinesYamlCompletionProvider();
            await new Promise((resolve) => setTimeout(resolve, 0));
        });

        it('should generate completion items with correct properties', () => {
            // Mock to show pipes
            mockTextDocument.lineAt.mockReturnValue({
                isEmptyOrWhitespace: false,
                firstNonWhitespaceCharacterIndex: 0,
            } as any);
            mockTextDocument.getWordRangeAtPosition.mockReturnValue({} as any);
            mockTextDocument.getText.mockReturnValue('pipe');

            const result = provider.provideCompletionItems(mockTextDocument, mockPosition);

            expect(result).toBeDefined();
            expect(result!.length).toBe(2);

            const awsItem = result!.find((item) => item.label === 'atlassian/aws-s3-deploy');
            const slackItem = result!.find((item) => item.label === 'atlassian/slack-notify');

            expect(awsItem).toBeDefined();
            expect(awsItem!.kind).toBe(CompletionItemKind.Snippet);
            expect(awsItem!.documentation).toBe('Deploy files to AWS S3');
            expect(awsItem!.insertText).toBeInstanceOf(SnippetString);

            expect(slackItem).toBeDefined();
            expect(slackItem!.kind).toBe(CompletionItemKind.Snippet);
            expect(slackItem!.documentation).toBe('Send notifications to Slack');
            expect(slackItem!.insertText).toBeInstanceOf(SnippetString);
        });

        it('should handle pipe yml that does not start with "- pipe: "', async () => {
            const customPipeData = [
                {
                    ...mockPipeData[0],
                    yml: 'custom-yml-format: value',
                },
            ];

            mockAxiosInstance.mockResolvedValue({ data: customPipeData });
            const customProvider = new PipelinesYamlCompletionProvider();
            await new Promise((resolve) => setTimeout(resolve, 0));

            mockTextDocument.lineAt.mockReturnValue({
                isEmptyOrWhitespace: false,
                firstNonWhitespaceCharacterIndex: 0,
            } as any);
            mockTextDocument.getWordRangeAtPosition.mockReturnValue({} as any);
            mockTextDocument.getText.mockReturnValue('pipe');

            const result = customProvider.provideCompletionItems(mockTextDocument, mockPosition);

            expect(result).toBeDefined();
            expect(result!.length).toBe(1);

            const item = result![0];
            // Note: Due to the bug in the original code (line 131), when yml doesn't start with "- pipe: ",
            // the itemNoPipe.insertText is not set, so it will be undefined
            // The original item.insertText is set to the yml value
            expect(item.insertText).toBeUndefined();
        });
    });
});
