import { Position, Range, TextDocument } from 'vscode';

import { issueForKey } from '../../jira/issueForKey';
import { IssueHoverProvider } from './issueHoverProvider';

jest.mock('vscode', () => {
    class MockHover {
        contents: any;
        constructor(contents: any) {
            this.contents = contents;
        }
    }
    class MockMarkdownString {
        value: string;
        isTrusted?: boolean;
        constructor(value: string) {
            this.value = value;
        }
    }
    class MockPosition {
        line: number;
        character: number;
        constructor(line: number, character: number) {
            this.line = line;
            this.character = character;
        }
    }
    class MockRange {
        start: MockPosition;
        end: MockPosition;
        constructor(start: MockPosition, end: MockPosition) {
            this.start = start;
            this.end = end;
        }
    }
    return {
        Hover: MockHover,
        MarkdownString: MockMarkdownString,
        Position: MockPosition,
        Range: MockRange,
    };
});

jest.mock('../../jira/issueForKey', () => ({
    issueForKey: jest.fn(),
}));

jest.mock('turndown', () => ({
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
        turndown: jest.fn().mockReturnValue('Mocked description'),
    })),
}));

jest.mock('../../analytics', () => ({
    viewScreenEvent: jest.fn().mockResolvedValue({ name: 'issueHover' }),
}));

jest.mock('../../container', () => ({
    Container: {
        analyticsClient: {
            sendScreenEvent: jest.fn(),
        },
    },
}));

describe('IssueHoverProvider', () => {
    let provider: IssueHoverProvider;
    const issueForKeyMock = issueForKey as jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
        provider = new IssueHoverProvider();
    });

    const createMockDocument = (lineContent: string): TextDocument => {
        return {
            lineAt: (line: number) => ({
                text: lineContent,
                range: new Range(new Position(line, 0), new Position(line, lineContent.length)),
            }),
            getText: (range?: Range) => {
                if (range) {
                    return lineContent.substring(range.start.character, range.end.character);
                }
                return lineContent;
            },
            getWordRangeAtPosition: (position: Position, regex?: RegExp) => {
                if (!regex) {
                    return undefined;
                }
                const matches = Array.from(lineContent.matchAll(regex));
                for (const match of matches) {
                    if (match.index !== undefined) {
                        const start = match.index;
                        const end = start + match[0].length;
                        if (position.character >= start && position.character <= end) {
                            return new Range(new Position(position.line, start), new Position(position.line, end));
                        }
                    }
                }
                return undefined;
            },
        } as unknown as TextDocument;
    };

    it('should not call issueForKey when hovering over a YYYY-MM date (e.g. 2026-08)', async () => {
        const doc = createMockDocument('Date: 2026-08');
        const pos = new Position(0, 8); // position on 2026-08

        const result = await provider.provideHover(doc, pos);

        expect(result).toBeNull();
        expect(issueForKeyMock).not.toHaveBeenCalled();
    });

    it('should not call issueForKey when hovering over a YYYY-MM-DD date (e.g. 2026-08-05)', async () => {
        const doc = createMockDocument('Date: 2026-08-05');
        const pos = new Position(0, 8); // position on 2026-08 part of 2026-08-05

        const result = await provider.provideHover(doc, pos);

        expect(result).toBeNull();
        expect(issueForKeyMock).not.toHaveBeenCalled();
    });

    it('should call issueForKey when hovering over a valid issue key (e.g. ABC-123)', async () => {
        const mockIssue = {
            key: 'ABC-123',
            summary: 'Test Issue',
            status: { name: 'In Progress' },
            issuetype: { iconUrl: 'http://example.com/icon.png' },
            priority: { name: 'High', iconUrl: 'http://example.com/priority.svg' },
            descriptionHtml: '<p>Test description</p>',
            siteDetails: { id: 'site-1', baseLinkUrl: 'http://example.com' },
        };
        issueForKeyMock.mockResolvedValue(mockIssue);

        const doc = createMockDocument('Working on ABC-123 issue');
        const pos = new Position(0, 12); // position on ABC-123

        const result = await provider.provideHover(doc, pos);

        expect(issueForKeyMock).toHaveBeenCalledWith('ABC-123');
        expect(result).not.toBeNull();
    });

    it('should call issueForKey when hovering over a numeric project key (e.g. 123-456)', async () => {
        const mockIssue = {
            key: '123-456',
            summary: 'Numeric Project Issue',
            status: { name: 'Open' },
            issuetype: { iconUrl: 'http://example.com/icon.png' },
            priority: { name: 'Medium', iconUrl: 'http://example.com/priority.svg' },
            descriptionHtml: '<p>Test</p>',
            siteDetails: { id: 'site-1', baseLinkUrl: 'http://example.com' },
        };
        issueForKeyMock.mockResolvedValue(mockIssue);

        const doc = createMockDocument('Working on 123-456 issue');
        const pos = new Position(0, 12); // position on 123-456

        const result = await provider.provideHover(doc, pos);

        expect(issueForKeyMock).toHaveBeenCalledWith('123-456');
        expect(result).not.toBeNull();
    });
});
