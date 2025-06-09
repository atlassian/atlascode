import { CodeLens, Position, Range, TextDocument, Uri } from 'vscode';

import { Commands } from '../constants';
import { Container } from '../container';
import { parseJiraIssueKeys } from './issueKeyParser';
import { provideCodeLenses } from './todoObserver';

// Mock the dependencies
jest.mock('../container');
jest.mock('./issueKeyParser');

describe('todoObserver', () => {
    // Create mock for TextDocument
    const createMockTextDocument = (lines: string[]): TextDocument => {
        return {
            uri: Uri.parse('file:///test/file.ts'),
            lineCount: lines.length,
            lineAt: (index: number) => ({
                text: lines[index],
                range: new Range(new Position(index, 0), new Position(index, lines[index].length)),
            }),
            getText: jest.fn(() => lines.join('\n')),
        } as unknown as TextDocument;
    };

    // Reset all mocks before each test
    beforeEach(() => {
        jest.resetAllMocks();

        // Default mock implementation for container config
        (Container.config as jest.Mocked<any>) = {
            jira: {
                enabled: true,
                todoIssues: {
                    enabled: true,
                    triggers: ['TODO', 'FIXME'],
                },
            },
        };

        // Default mock implementation for parseJiraIssueKeys
        (parseJiraIssueKeys as jest.Mock).mockReturnValue([]);
    });

    describe('provideCodeLenses', () => {
        it('should return empty array when jira is disabled', () => {
            // Arrange
            (Container.config as jest.Mocked<any>).jira.enabled = false;
            const document = createMockTextDocument(['// TODO: implement this']);
            const token = {} as any;

            // Act
            const result = provideCodeLenses(document, token);

            // Assert
            expect(result).toEqual([]);
        });

        it('should return empty array when todoIssues is disabled', () => {
            // Arrange
            (Container.config as jest.Mocked<any>).jira.todoIssues.enabled = false;
            const document = createMockTextDocument(['// TODO: implement this']);
            const token = {} as any;

            // Act
            const result = provideCodeLenses(document, token);

            // Assert
            expect(result).toEqual([]);
        });

        it('should return CodeLens for TODO item', () => {
            // Arrange
            const document = createMockTextDocument(['// TODO: implement this feature']);
            const token = {} as any;

            // Act
            const result = provideCodeLenses(document, token);

            // Assert
            expect(result.length).toEqual(1);
            expect(result[0]).toBeInstanceOf(CodeLens);
            expect(result[0].command).toEqual({
                title: 'Create Jira Issue',
                command: Commands.CreateIssue,
                arguments: [
                    {
                        fromCodeLens: true,
                        summary: ': implement this feature',
                        uri: document.uri,
                        insertionPoint: new Position(0, 7),
                    },
                ],
            });
        });

        it('should return multiple CodeLenses for multiple TODOs', () => {
            // Arrange
            const document = createMockTextDocument(['// TODO: first task', 'let x = 5;', '// FIXME: second task']);
            const token = {} as any;

            // Act
            const result = provideCodeLenses(document, token);

            // Assert
            expect(result.length).toEqual(2);
            // Check first CodeLens
            expect(result[0].command?.arguments?.[0].summary).toEqual(': first task');
            // Check second CodeLens
            expect(result[1].command?.arguments?.[0].summary).toEqual(': second task');
        });

        it('should not create CodeLens if line already contains Jira issue key', () => {
            // Arrange
            const document = createMockTextDocument(['// TODO: implement this ABC-123', '// FIXME: another task']);
            const token = {} as any;

            // Mock parseJiraIssueKeys to return a key for the first line
            (parseJiraIssueKeys as jest.Mock).mockImplementation((line: string) => {
                if (line.includes('ABC-123')) {
                    return ['ABC-123'];
                }
                return [];
            });

            // Act
            const result = provideCodeLenses(document, token);

            // Assert
            expect(result.length).toEqual(1); // Only one CodeLens for the FIXME line
            expect(result[0].command?.arguments?.[0].summary).toEqual(': another task');
        });
    });

    describe('findTodos', () => {
        it('should return empty array when there are no triggers configured', () => {
            // Arrange
            (Container.config as jest.Mocked<any>).jira.todoIssues.triggers = [];
            const document = createMockTextDocument(['// TODO: implement this']);
            const token = {} as any;

            // Act
            const result = provideCodeLenses(document, token);

            // Assert
            expect(result).toEqual([]);
        });

        it('should properly handle special regex characters in trigger words', () => {
            // Arrange
            (Container.config as jest.Mocked<any>).jira.todoIssues.triggers = ['TO*DO', 'FIX.ME'];
            const document = createMockTextDocument([
                '// TO*DO: special character test',
                '// FIX.ME: another special character',
            ]);
            const token = {} as any;

            // Act
            const result = provideCodeLenses(document, token);

            // Assert
            expect(result.length).toEqual(2);
        });

        it('should only match trigger words not preceded by alphanumeric characters', () => {
            // Arrange
            const document = createMockTextDocument([
                '// TODO: valid trigger',
                'methodTODO: invalid trigger', // This shouldn't match as "TODO" is preceded by alphanumeric
                '//FIXME: valid trigger',
                'noticeFIXMEPlease: invalid trigger', // This shouldn't match as "FIXME" is preceded by alphanumeric
            ]);
            const token = {} as any;

            // Act
            const result = provideCodeLenses(document, token);

            // Assert
            expect(result.length).toEqual(2);
            expect(result[0].command?.arguments?.[0].summary).toEqual(': valid trigger');
            expect(result[1].command?.arguments?.[0].summary).toEqual(': valid trigger');
        });

        it('should properly extract summary text after trigger', () => {
            // Arrange
            const document = createMockTextDocument([
                '// TODO:    summary with extra spaces    ',
                '// FIXME:summary without space',
                '// TODO - using dash instead of colon',
            ]);
            const token = {} as any;

            // Act
            const result = provideCodeLenses(document, token);

            // Assert
            expect(result.length).toEqual(3);
            expect(result[0].command?.arguments?.[0].summary).toEqual(':    summary with extra spaces');
            expect(result[1].command?.arguments?.[0].summary).toEqual(':summary without space');
            expect(result[2].command?.arguments?.[0].summary).toEqual('- using dash instead of colon');
        });
    });
});
