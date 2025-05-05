import { DetailedSiteInfo } from 'src/atlclients/authInfo';
import { expansionCastTo } from 'testsutil/miscFunctions';
import { Uri, window } from 'vscode';

import * as showIssue from '../../commands/jira/showIssue';
import { Container } from '../../container';
import { OpenJiraIssueUriHandler } from './openJiraIssue';

jest.mock('../../commands/jira/showIssue', () => ({
    showIssue: () => Promise.resolve(),
}));
jest.mock('../../container', () => ({
    Container: {
        siteManager: {
            getSitesAvailable: () => [],
        },
    },
}));

describe('OpenJiraIssueUriHandler', () => {
    let action: OpenJiraIssueUriHandler;

    beforeEach(() => {
        action = new OpenJiraIssueUriHandler();
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.restoreAllMocks();
    });

    it('isAccepted only accepts URIs ending with openJiraIssue', () => {
        expect(action.isAccepted(Uri.parse('https://some-uri/openJiraIssue'))).toBeTruthy();
        expect(action.isAccepted(Uri.parse('https://some-uri/otherThing'))).toBeFalsy();
    });

    it('handle throws if required query params are missing', async () => {
        await expect(action.handle(Uri.parse('https://some-uri/openJiraIssue'))).rejects.toThrow();
    });

    it('if the site is not found (1), it opens a message that prompts for authentication', async () => {
        jest.spyOn(Container.siteManager, 'getSitesAvailable').mockReturnValue([]);
        jest.spyOn(window, 'showInformationMessage');

        await action.handle(Uri.parse('https://some-uri/openJiraIssue?key=ABC-123&site=this.site.net'));

        expect(window.showInformationMessage).toHaveBeenCalled();
    });

    it('if the site is not found (2), it opens a message that prompts for authentication', async () => {
        const siteInfo = expansionCastTo<DetailedSiteInfo>({ host: 'another.site.net' });
        jest.spyOn(Container.siteManager, 'getSitesAvailable').mockReturnValue([siteInfo]);
        jest.spyOn(window, 'showInformationMessage');

        await action.handle(Uri.parse('https://some-uri/openJiraIssue?key=ABC-123&site=this.site.net'));

        expect(window.showInformationMessage).toHaveBeenCalled();
    });

    it('if the site is found, it invokes the `showIssue` function', async () => {
        const siteInfo = expansionCastTo<DetailedSiteInfo>({ host: 'this.site.net' });
        jest.spyOn(Container.siteManager, 'getSitesAvailable').mockReturnValue([siteInfo]);
        jest.spyOn(showIssue, 'showIssue');

        await action.handle(Uri.parse('https://some-uri/openJiraIssue?key=ABC-123&site=this.site.net'));

        expect(showIssue.showIssue).toHaveBeenCalledWith(
            expect.objectContaining({
                key: 'ABC-123',
                siteDetails: expect.objectContaining({ host: 'this.site.net' }),
            }),
        );
    });

    it('if showIssue fails, the handler throws and an error is shown', async () => {
        const siteInfo = expansionCastTo<DetailedSiteInfo>({ host: 'this.site.net' });
        jest.spyOn(Container.siteManager, 'getSitesAvailable').mockReturnValue([siteInfo]);
        jest.spyOn(window, 'showErrorMessage');
        jest.spyOn(showIssue, 'showIssue').mockRejectedValue(new Error('something failed'));

        await expect(
            action.handle(Uri.parse('https://some-uri/openJiraIssue?key=ABC-123&site=this.site.net')),
        ).rejects.toThrow();

        expect(window.showErrorMessage).toHaveBeenCalled();
    });
});
