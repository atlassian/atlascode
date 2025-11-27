import { Project } from '@atlassianlabs/jira-pi-common-models';
import { DetailedSiteInfo } from 'src/atlclients/authInfo';
import { Container } from 'src/container';

export class JiraProjectService {
    static async searchProjectsFromAllSites(query: string, sites: DetailedSiteInfo[]): Promise<Project[]> {
        const projectsSearchPromises = sites.map((site) => this.searchProjectsFromSite(site, query));
        const results = await Promise.all(projectsSearchPromises);
        const projects = results.flat();

        const uniqueProjects = new Map(projects.map((project) => [project.key, project]));

        return Array.from(uniqueProjects.values());
    }

    private static async searchProjectsFromSite(site: DetailedSiteInfo, query: string): Promise<Project[]> {
        try {
            const projects = await Container.jiraProjectManager.getProjects(site, 'name', query);
            return projects;
        } catch (err) {
            console.error(`Error searching projects in site ${site.name}: ${err}`);
            return [];
        }
    }
}
