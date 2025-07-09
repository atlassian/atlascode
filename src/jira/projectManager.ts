import { emptyProject, Project } from '@atlassianlabs/jira-pi-common-models';
import axios, { AxiosInstance } from 'axios';
import { AxiosUserAgent } from 'src/constants';
import { ConnectionTimeout } from 'src/util/time';
import { Disposable } from 'vscode';

import { DetailedSiteInfo } from '../atlclients/authInfo';
import { Container } from '../container';
import { Logger } from '../logger';
import { getAgent } from './jira-client/providers';

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

type ProjectWithPermission = {
    id: number;
    key: string;
};

type ProjectPermissions = 'CREATE_ISSUES';

export class JiraProjectManager extends Disposable {
    private axiosInstance: AxiosInstance;
    constructor() {
        super(() => this.dispose());
        this.axiosInstance = axios.create({
            timeout: ConnectionTimeout,
            headers: {
                'User-Agent': AxiosUserAgent,
                'Accept-Encoding': 'gzip, deflate',
            },
        });
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

    private async getProjectsKeysWithProvidedPermission(
        site: DetailedSiteInfo,
        permission: ProjectPermissions,
    ): Promise<Set<string>> {
        const authInfos = (await Container.credentialManager.getAuthInfo(site)) as { access: string } | undefined;
        const agent = getAgent(site);
        if (authInfos && authInfos.access) {
            const permissionsRes = await this.axiosInstance(`${site.baseApiUrl}/api/3/permissions/project`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    Authorization: `Bearer ${authInfos.access}`,
                },
                data: {
                    permissions: [permission],
                },
                ...agent,
            });

            return new Set(permissionsRes.data.projects.map((p: ProjectWithPermission) => p.key));
        }
        return new Set();
    }

    public async filterProjectsByCreateIssuePermission(
        site: DetailedSiteInfo,
        projectsList: Project[],
    ): Promise<Project[]> {
        const projectsWithPermission = await this.getProjectsKeysWithProvidedPermission(site, 'CREATE_ISSUES');
        const checkedProjects = projectsList.filter((project) => {
            const hasCreateIssuePermission = projectsWithPermission.has(project.key);
            return hasCreateIssuePermission;
        });
        return checkedProjects;
    }
}
