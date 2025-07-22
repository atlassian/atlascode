import { emptyProject, Project } from '@atlassianlabs/jira-pi-common-models';
import { Disposable } from 'vscode';

import { DetailedSiteInfo } from '../atlclients/authInfo';
import { Container } from '../container';
import { Logger } from '../logger';

type OrderBy =
    | 'category'
    | '-category'
    | '+category'
    | 'key'
    | '-key'
    | '+key'
    | 'name'
    | '-name'
    | '+name'
    | 'owner'
    | '-owner'
    | '+owner';

export type ProjectPermissions = 'CREATE_ISSUES';

export class JiraProjectManager extends Disposable {
    constructor() {
        super(() => this.dispose());
    }

    dispose() {}

    public async getProjectForKey(site: DetailedSiteInfo, projectKey: string): Promise<Project | undefined> {
        if (projectKey.trim() === '') {
            return undefined;
        }

        try {
            const client = await Container.clientManager.jiraClient(site);
            return await client.getProject(projectKey);
        } catch {
            //continue
        }

        return undefined;
    }

    public async getFirstProject(site: DetailedSiteInfo): Promise<Project> {
        try {
            const projects = await this.getProjects(site);
            if (projects.length > 0) {
                return projects[0];
            }
        } catch {
            //continue
        }

        return emptyProject;
    }

    async getProjects(site: DetailedSiteInfo, orderBy?: OrderBy, query?: string): Promise<Project[]> {
        let foundProjects: Project[] = [];

        try {
            const client = await Container.clientManager.jiraClient(site);
            const order = orderBy !== undefined ? orderBy : 'key';
            foundProjects = await client.getProjects(query, order);
        } catch (e) {
            Logger.debug(`Failed to fetch projects ${e}`);
        }

        return foundProjects;
    }

    public async checkProjectPermission(
        site: DetailedSiteInfo,
        projectKey: string,
        permission: ProjectPermissions,
    ): Promise<Boolean> {
        const client = await Container.clientManager.jiraClient(site);
        const url = site.baseApiUrl + '/api/2/mypermissions';
        const auth = await client.authorizationProvider('GET', url);
        const response = await client.transportFactory().get(url, {
            headers: {
                Authorization: auth,
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            method: 'GET',
            params: {
                projectKey: projectKey,
                permissions: permission,
            },
        });

        return response.data?.permissions[permission]?.havePermission ?? false;
    }

    public async filterProjectsByPermission(
        site: DetailedSiteInfo,
        projectsList: Project[],
        permission: ProjectPermissions,
    ): Promise<Project[]> {
        const size = 50;
        let cursor = 0;
        const projectsWithPermission: Project[] = [];

        while (cursor < projectsList.length) {
            const projectsSlice = projectsList.slice(cursor, cursor + size);
            await Promise.all(
                projectsSlice.map(async (project) => {
                    const hasCreateIssuePermission = await this.checkProjectPermission(site, project.key, permission);
                    if (hasCreateIssuePermission) {
                        projectsWithPermission.push(project);
                    }
                }),
            );
            cursor += size;
        }

        return projectsWithPermission;
    }
}
