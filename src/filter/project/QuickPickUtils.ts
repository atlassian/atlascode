import { MinimalIssue, Project } from '@atlassianlabs/jira-pi-common-models';
import { DetailedSiteInfo } from 'src/atlclients/authInfo';
import { QuickPickItem } from 'vscode';

export interface QuickPickProject extends QuickPickItem {
    project: Project;
}

export interface QuickPickIssue extends QuickPickItem {
    issue: MinimalIssue<DetailedSiteInfo>;
}

export const QuickPickUtils = {
    getDefaultProjectOptions(previousSelectedItems: QuickPickProject[]): QuickPickProject[] {
        const defaultOptions: QuickPickProject[] = [];

        const existingKeys = new Set(defaultOptions.map((item) => item.project?.key));

        for (const previousItem of previousSelectedItems) {
            const projectKey = previousItem.project?.key;
            if (projectKey && !existingKeys.has(projectKey)) {
                defaultOptions.push(previousItem);
                existingKeys.add(projectKey);
            }
        }
        return defaultOptions;
    },

    mapIssuesToQuickPickItems(issues: MinimalIssue<DetailedSiteInfo>[]): QuickPickIssue[] {
        return issues.map((issue) => {
            const projectKey = issue.key ? issue.key.substring(0, issue.key.indexOf('-')) : 'Unknown';
            return {
                label: `${issue.key}: ${issue.summary || 'No summary'}`,
                description: issue.status?.name || 'Unknown Status',
                detail: `Project: ${projectKey}`,
                issue,
            };
        });
    },

    mapProjectsToQuickPickItems(projects: Project[]): QuickPickProject[] {
        return projects.map((project) => ({
            label: project.name || project.key || 'Unknown Project',
            description: project.key || '',
            detail: project.projectTypeKey || 'Standard',
            project,
        }));
    },

    mergeItemsWithPersistent(persistentItems: QuickPickProject[], newItems: QuickPickProject[]): QuickPickProject[] {
        const existingKeys = new Set(
            persistentItems.map((item) => item.project?.key).filter((key): key is string => key !== null),
        );
        const additionalItems = newItems.filter((item) => {
            const key = item.project?.key;
            return key && !existingKeys.has(key);
        });
        return [...persistentItems, ...additionalItems];
    },

    extractFilterParameters(selectedProjects: readonly QuickPickProject[]) {
        const projects = selectedProjects.filter((item) => item.project?.key);

        return {
            projects,
        };
    },

    isValidFilter(params: { projects: QuickPickProject[] }): boolean {
        return params.projects.length > 0;
    },

    formatProjectNames(selectedProjects: readonly QuickPickProject[]): string {
        return selectedProjects.map((p) => p.label).join(', ');
    },
};
