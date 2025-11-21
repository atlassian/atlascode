import { User } from '@atlassianlabs/jira-pi-common-models';
import { DetailedSiteInfo } from 'src/atlclients/authInfo';
import { Container } from 'src/container';

export class JiraUserService {
    static async searchUsersFromAllSites(query: string, sites: DetailedSiteInfo[]): Promise<User[]> {
        const usersSearchPromises = sites.map((site) => this.searchUsersFromSite(site, query));
        const results = await Promise.all(usersSearchPromises);
        const users = results.flat();

        const uniqueUsers = new Map(users.map((user) => [user.accountId, user]));

        return Array.from(uniqueUsers.values());
    }

    private static async searchUsersFromSite(site: DetailedSiteInfo, query: string): Promise<User[]> {
        try {
            const client = await Container.clientManager.jiraClient(site);
            const projects = await Container.jiraProjectManager.getProjects(site);
            if (projects.length === 0) {
                return [];
            }
            const users = await client.findUsersAssignableToProject(projects[0].key, query);

            return users.flat();
        } catch (err) {
            console.error(`Error searching users in site ${site.name}: ${err}`);
            return [];
        }
    }
}
