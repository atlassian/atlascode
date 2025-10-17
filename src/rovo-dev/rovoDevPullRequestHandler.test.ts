import { RovoDevPullRequestHandler } from './rovoDevPullRequestHandler';

describe('RovoDevPullRequestHandler', () => {
    let handler: RovoDevPullRequestHandler;

    beforeEach(() => {
        handler = new RovoDevPullRequestHandler();
    });

    describe('findPRLink', () => {
        it('Should match the link in GitHub push output', () => {
            const link = handler.findPRLink(`
remote:      https://github.com/my-org/my-repo/pull/new/my-branch
remote:`);
            expect(link).toBe('https://github.com/my-org/my-repo/pull/new/my-branch');
        });

        it('Should match the link in Bitbucket push output', () => {
            const link = handler.findPRLink(`
remote:      https://bitbucket.org/my-org/my-repo/pull-requests/new?source=my-branch
remote:`);
            expect(link).toBe('https://bitbucket.org/my-org/my-repo/pull-requests/new?source=my-branch');
        });

        it('Should match the link in internal Bitbucket push output', () => {
            const link = handler.findPRLink(`
remote:      https://integration.bb-inf.net/my-org/my-repo/pull-requests/new?source=my-branch
remote:`);
            expect(link).toBe('https://integration.bb-inf.net/my-org/my-repo/pull-requests/new?source=my-branch');
        });

        it('Should match the link in generic push output', () => {
            const link = handler.findPRLink(`
                remote:      https://example.com/my-org/my-repo/pull/new/my-branch
remote:`);
            expect(link).toBe('https://example.com/my-org/my-repo/pull/new/my-branch');
        });

        it('Should return undefined for empty output', () => {
            const link = handler.findPRLink('');
            expect(link).toBeUndefined();
        });

        it('Should not match anything to odd links', () => {
            const link = handler.findPRLink(`
                remote:      https://example.com/my-org/my-repo/not-a-pr-link
remote:`);
            expect(link).toBeUndefined();
        });
    });

    describe('buildCreatePrLinkFromGitOutput', () => {
        it('Should match for a github.com remote', () => {
            const link = handler.buildCreatePrLinkFromGitOutput(
                `remote:      some demo text
To github.com:atlassian/atlascode.git
   4bc73e86..71548ad9  FLOW-729-boysenberry-pr-create-messaging -> FLOW-729-boysenberry-pr-create-messaging
   `,
                'my-branch',
            );
            expect(link).toBe('https://github.com/atlassian/atlascode/pull/new/my-branch');
        });

        it('Should match for a bitbucket.org remote', () => {
            const link = handler.buildCreatePrLinkFromGitOutput(
                `remote:      some demo text
To bitbucket.org:atlassian/atlascode.git
   4bc73e86..71548ad9  FLOW-729-boysenberry-pr-create-messaging -> FLOW-729-boysenberry-pr-create-messaging
   `,
                'my-branch',
            );
            expect(link).toBe('https://bitbucket.org/atlassian/atlascode/pull-requests/new?source=my-branch');
        });

        it('Should match for an internal staging instance of Bitbucket remote', () => {
            const link = handler.buildCreatePrLinkFromGitOutput(
                `remote:      some demo text
To integration.bb-inf.net:atlassian/atlascode.git
   4bc73e86..71548ad9  FLOW-729-boysenberry-pr-create-messaging -> FLOW-729-boysenberry-pr-create-messaging
   `,
                'my-branch',
            );
            expect(link).toBe('https://integration.bb-inf.net/atlassian/atlascode/pull-requests/new?source=my-branch');
        });

        it('Should return undefined for unknown git host', () => {
            const link = handler.buildCreatePrLinkFromGitOutput(
                `remote:      some demo text
To unknown-host.com:atlassian/atlascode.git
   4bc73e86..71548ad9  FLOW-729-boysenberry-pr-create-messaging -> FLOW-729-boysenberry-pr-create-messaging
   `,
                'my-branch',
            );
            expect(link).toBeUndefined();
        });

        it('Should return undefined for empty output', () => {
            const link = handler.buildCreatePrLinkFromGitOutput('', 'my-branch');
            expect(link).toBeUndefined();
        });

        it('Should return undefined for output without git remote', () => {
            const link = handler.buildCreatePrLinkFromGitOutput(
                `remote:      some demo text
   4bc73e86..71548ad9  FLOW-729-boysenberry-pr-create-messaging -> FLOW-729-boysenberry-pr-create-messaging
   `,
                'my-branch',
            );
            expect(link).toBeUndefined();
        });
    });
});
