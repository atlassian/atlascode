import * as vscode from 'vscode';

import { DetailedSiteInfo, ProductJira } from '../../atlclients/authInfo';
import { Container } from '../../container';
import { Logger } from '../../logger';

export async function quickLoginToJira(): Promise<void> {
    try {
        Logger.debug('Quick login to Jira command triggered');

        const sites = Container.siteManager.getSitesAvailable(ProductJira);

        if (sites.length === 0) {
            // No sites configured, show onboarding
            const result = await vscode.window.showInformationMessage(
                'No Jira sites configured. Would you like to add one?',
                'Add Jira Site',
                'Cancel',
            );

            if (result === 'Add Jira Site') {
                await vscode.commands.executeCommand('atlascode.showOnboardingPage');
            }
            return;
        }

        // Check if any sites are already authenticated
        const authPromises = sites.map(async (site) => {
            const authInfo = await Container.credentialManager.getAuthInfo(site);
            return { site, isAuthenticated: !!authInfo };
        });

        const siteAuthStatus = await Promise.all(authPromises);
        const authenticatedSites = siteAuthStatus.filter((s) => s.isAuthenticated);
        const unauthenticatedSites = siteAuthStatus.filter((s) => !s.isAuthenticated);

        if (authenticatedSites.length > 0 && unauthenticatedSites.length === 0) {
            // All sites are authenticated
            vscode.window.showInformationMessage('All Jira sites are already authenticated!');
            return;
        }

        let siteToAuth: DetailedSiteInfo;

        if (unauthenticatedSites.length === 1) {
            // Only one unauthenticated site, use it directly
            siteToAuth = unauthenticatedSites[0].site;
        } else {
            // Multiple unauthenticated sites, let user choose
            const quickPickItems = unauthenticatedSites.map(({ site }) => ({
                label: site.name || site.host,
                description: site.host,
                detail: site.isCloud ? 'Jira Cloud' : 'Jira Server/Data Center',
                site: site,
            }));

            const selected = await vscode.window.showQuickPick(quickPickItems, {
                placeHolder: 'Select a Jira site to authenticate with',
                canPickMany: false,
            });

            if (!selected) {
                return; // User cancelled
            }

            siteToAuth = selected.site;
        }

        // Trigger authentication for the selected site
        Logger.debug(`Triggering authentication for site: ${siteToAuth.host}`);

        try {
            await Container.credentialManager.userInitiatedOAuthFlow(siteToAuth);
            vscode.window.showInformationMessage(
                `Successfully authenticated with ${siteToAuth.name || siteToAuth.host}!`,
            );
        } catch (error) {
            Logger.error(error, `Failed to authenticate with ${siteToAuth.host}`);
            vscode.window.showErrorMessage(
                `Failed to authenticate with ${siteToAuth.name || siteToAuth.host}. Please try again.`,
            );
        }
    } catch (error) {
        Logger.error(error, 'Failed to execute quick login to Jira');
        vscode.window.showErrorMessage('Failed to execute quick login. Please try again.');
    }
}
