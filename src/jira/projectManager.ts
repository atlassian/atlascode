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
            // For Jira Cloud we use /rest/api/2/project/search with native pagination
            if (site.isCloud) {
                try {
                    return await this.cloudProjectSearch(site, orderBy, maxResults, startAt, query, action);
                } catch (e) {
                    Logger.info(e, `Failed to fetch paginated projects for Jira Cloud, trying legacy approach`);
                    // Fall through to legacy approach
                }
            }

            // Legacy approach
            // For Jira Data Center we use old approach
            // If cloud failed, we fall back to this
            const allProjects = await this.getProjects(site, orderBy, query);
            const filteredProjects = await this.filterProjectsByPermission(site, allProjects, 'CREATE_ISSUES');

            return {
                projects: filteredProjects,
                total: filteredProjects.length,
                hasMore: false,
            };
        } catch (e) {
            Logger.error(e, `Failed to fetch paginated projects`);
            return {
                projects: [],
                total: 0,
                hasMore: false,
            };
        }
    }

    private async cloudProjectSearch(
        site: DetailedSiteInfo,
        orderBy: string | undefined,
        maxResults: number,
        startAt: number,
        query: string | undefined,
        action: string | undefined,
    ) {
        const client = await Container.clientManager.jiraClient(site);
        const order = orderBy ?? 'key';
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
        const isLast = response.data?.isLast ?? false;
        const hasMore = !isLast;

        return {
            projects,
            total,
            hasMore,
        };
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
