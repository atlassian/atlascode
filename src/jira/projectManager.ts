import { emptyProject, Project } from '@atlassianlabs/jira-pi-common-models';
import { Disposable } from 'vscode';

import { DetailedSiteInfo } from '../atlclients/authInfo';
import { ProjectsPagination } from '../constants';
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

    override dispose() {}

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

    async getProjectsPaginated(
        site: DetailedSiteInfo,
        maxResults: number = ProjectsPagination.pageSize,
        startAt: number = ProjectsPagination.startAt,
        orderBy?: OrderBy,
        query?: string,
        action?: 'view' | 'browse' | 'edit' | 'create',
    ): Promise<{ projects: Project[]; total: number; hasMore: boolean }> {
        try {
            const client = await Container.clientManager.jiraClient(site);
            const order = orderBy !== undefined ? orderBy : 'key';
            const url = site.baseApiUrl + '/rest/api/2/project/search';
            const auth = await client.authorizationProvider('GET', url);

            const queryParams: {
                maxResults: number;
                startAt: number;
                orderBy: string;
                query?: string;
                action?: string;
            } = {
                maxResults,
                startAt,
                orderBy: order,
            };

            if (query) {
                queryParams.query = query;
            }

            if (action) {
                queryParams.action = action;
            }

            const response = await client.transportFactory().get(url, {
                headers: {
                    Authorization: auth,
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                method: 'GET',
                params: queryParams,
            });

            const projects = response.data?.values || [];
            const total = response.data?.total || 0;
            const hasMore = startAt + maxResults < total;

            return {
                projects,
                total,
                hasMore,
            };
        } catch (e) {
            Logger.debug(`Failed to fetch paginated projects ${e}`);
            return {
                projects: [],
                total: 0,
                hasMore: false,
            };
        }
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
