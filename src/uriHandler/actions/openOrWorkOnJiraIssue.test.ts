import { describe } from '@jest/globals';
import { expansionCastTo } from 'testsutil';
import { Uri, window } from 'vscode';

import { DetailedSiteInfo } from '../../atlclients/authInfo';
import * as showIssue from '../../commands/jira/showIssue';
import * as startWorkOnIssue from '../../commands/jira/startWorkOnIssue';
import { Container } from '../../container';
import { OpenOrWorkOnJiraIssueUriHandler } from './openOrWorkOnJiraIssue';

jest.mock('../../commands/jira/showIssue', () => ({
    showIssue: () => Promise.resolve(),
}));
jest.mock('../../commands/jira/startWorkOnIssue', () => ({
    startWorkOnIssue: () => Promise.resolve(),
}));
jest.mock('../../container', () => ({
    Container: {
        siteManager: {
            getSitesAvailable: () => [],
        },
    },
}));

describe('OpenOrWorkOnJiraIssueUriHandler', () => {
    let action: OpenOrWorkOnJiraIssueUriHandler;

    afterEach(() => {
        jest.clearAllMocks();
        jest.restoreAllMocks();
    });

    describe.each(['openJiraIssue', 'startWorkOnJira'])('common', (suffix: 'openJiraIssue' | 'startWorkOnJira') => {
        beforeEach(() => {
            action = new OpenOrWorkOnJiraIssueUriHandler(suffix);
        });

        it('isAccepted only accepts URIs ending with the right suffix', () => {
            expect(action.isAccepted(Uri.parse(`https://some-uri/${suffix}`))).toBeTruthy();
            expect(action.isAccepted(Uri.parse('https://some-uri/otherThing'))).toBeFalsy();
        });

        it('handle throws if required query params are missing', async () => {
            await expect(action.handle(Uri.parse(`https://some-uri/${suffix}`))).rejects.toThrow();
        });

        it('if the site is not found (1), it opens a message that prompts for authentication', async () => {
            jest.spyOn(Container.siteManager, 'getSitesAvailable').mockReturnValue([]);
            jest.spyOn(window, 'showInformationMessage');

            await action.handle(Uri.parse(`https://some-uri/${suffix}?key=ABC-123&site=this.site.net`));

            expect(window.showInformationMessage).toHaveBeenCalled();
        });

        it('if the site is not found (2), it opens a message that prompts for authentication', async () => {
            const siteInfo = expansionCastTo<DetailedSiteInfo>({ host: 'another.site.net' });
            jest.spyOn(Container.siteManager, 'getSitesAvailable').mockReturnValue([siteInfo]);
            jest.spyOn(window, 'showInformationMessage');

            await action.handle(Uri.parse(`https://some-uri/${suffix}?key=ABC-123&site=this.site.net`));

            expect(window.showInformationMessage).toHaveBeenCalled();
        });
    });

    describe('openJiraIssue', () => {
        it('if the site is found, it invokes the `showIssue` function', async () => {
            const siteInfo = expansionCastTo<DetailedSiteInfo>({ host: 'this.site.net' });
            jest.spyOn(Container.siteManager, 'getSitesAvailable').mockReturnValue([siteInfo]);
            jest.spyOn(showIssue, 'showIssue');

            action = new OpenOrWorkOnJiraIssueUriHandler('openJiraIssue');
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

            action = new OpenOrWorkOnJiraIssueUriHandler('openJiraIssue');
            await expect(
                action.handle(Uri.parse('https://some-uri/openJiraIssue?key=ABC-123&site=this.site.net')),
            ).rejects.toThrow();

            expect(window.showErrorMessage).toHaveBeenCalled();
        });
    });

    describe('startWorkOnJira', () => {
        it('if the site is found, it invokes the `showIssue` function', async () => {
            const siteInfo = expansionCastTo<DetailedSiteInfo>({ host: 'this.site.net' });
            jest.spyOn(Container.siteManager, 'getSitesAvailable').mockReturnValue([siteInfo]);
            jest.spyOn(startWorkOnIssue, 'startWorkOnIssue');

            action = new OpenOrWorkOnJiraIssueUriHandler('startWorkOnJira');
            await action.handle(Uri.parse('https://some-uri/startWorkOnJira?key=ABC-123&site=this.site.net'));

            expect(startWorkOnIssue.startWorkOnIssue).toHaveBeenCalledWith(
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
            jest.spyOn(startWorkOnIssue, 'startWorkOnIssue').mockRejectedValue(new Error('something failed'));

            action = new OpenOrWorkOnJiraIssueUriHandler('startWorkOnJira');
            await expect(
                action.handle(Uri.parse('https://some-uri/startWorkOnJira?key=ABC-123&site=this.site.net')),
            ).rejects.toThrow();

            expect(window.showErrorMessage).toHaveBeenCalled();
        });
    });
});
