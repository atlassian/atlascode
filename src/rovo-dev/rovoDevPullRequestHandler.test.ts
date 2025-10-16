import { RovoDevPullRequestHandler } from './rovoDevPullRequestHandler';

jest.mock('src/logger', () => ({
    RovoDevLogger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
    },
}));

describe('RovoDevPullRequestHandler', () => {
    let handler: RovoDevPullRequestHandler;
    let findPRLink: (output: string) => string | undefined;

    beforeEach(() => {
        handler = new RovoDevPullRequestHandler();
        findPRLink = (output) => handler['findPRLink'](output);
    });

    describe('findPRLink', () => {
        it('Should match the link in GitHub push output', () => {
            const link = findPRLink(`
remote:      https://github.com/my-org/my-repo/pull/new/my-branch
remote:`);
            expect(link).toBe('https://github.com/my-org/my-repo/pull/new/my-branch');
        });

        it('Should match the link in Bitbucket push output', () => {
            const link = findPRLink(`
remote:      https://bitbucket.org/my-org/my-repo/pull-requests/new?source=my-branch
remote:`);
            expect(link).toBe('https://bitbucket.org/my-org/my-repo/pull-requests/new?source=my-branch');
        });

        it('Should match the link in generic push output', () => {
            const link = findPRLink(`
                remote:      https://example.com/my-org/my-repo/pull/new/my-branch
remote:`);
            expect(link).toBe('https://example.com/my-org/my-repo/pull/new/my-branch');
        });

        it('Should return undefined for empty output', () => {
            const link = findPRLink('');
            expect(link).toBeUndefined();
        });

        it('Should not match anything to odd links', () => {
            const link = findPRLink(`
                remote:      https://example.com/my-org/my-repo/not-a-pr-link
remote:`);
            expect(link).toBeUndefined();
        });
    });
});
