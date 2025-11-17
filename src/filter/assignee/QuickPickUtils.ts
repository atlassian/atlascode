import { MinimalIssue, User } from '@atlassianlabs/jira-pi-common-models';
import { DetailedSiteInfo } from 'src/atlclients/authInfo';
import { QuickPickItem } from 'vscode';

export interface QuickPickUser extends QuickPickItem {
    user: User;
}

export interface QuickPickIssue extends QuickPickItem {
    issue: MinimalIssue<DetailedSiteInfo>;
}

export const QuickPickUtils = {
    getDefaultAssigneeOptions(previousSelectedItems: QuickPickUser[], currentUser: User | null): QuickPickUser[] {
        const defaultOptions: QuickPickUser[] = [];

        if (currentUser) {
            defaultOptions.push({
                label: currentUser.displayName || 'Current User',
                description: 'Filter by issues assigned to me',
                detail: 'Shows only issues assigned to the current user',
                user: currentUser,
            });
        }

        const existingLabels = new Set(defaultOptions.map((item) => item.label));

        for (const previousItem of previousSelectedItems) {
            if (!existingLabels.has(previousItem.label)) {
                defaultOptions.push(previousItem);
            }
        }
        return defaultOptions;
    },

    mapIssuesToQuickPickItems(issues: MinimalIssue<DetailedSiteInfo>[]): QuickPickIssue[] {
        return issues.map((issue) => {
            const assignee = (issue as any).assignee;
            const assigneeName = assignee?.displayName || assignee?.name || 'No assignee';
            return {
                label: `${issue.key}: ${issue.summary || 'No summary'}`,
                description: issue.status?.name || 'Unknown Status',
                detail: assigneeName,
                issue,
            };
        });
    },

    mapUsersToQuickPickItems(users: User[]): QuickPickUser[] {
        return users.map((user) => ({
            label: user.displayName || 'Unknown User',
            description: user.emailAddress || '',
            detail: user.active !== false ? 'Active' : 'Inactive',
            user,
        }));
    },

    mergeItemsWithPersistent(persistentItems: QuickPickUser[], newItems: QuickPickUser[]): QuickPickUser[] {
        const existingKeys = new Set(persistentItems.map((item) => item.label));
        const additionalItems = newItems.filter((item) => !existingKeys.has(item.label));
        return [...persistentItems, ...additionalItems];
    },

    extractFilterParameters(selectedUsers: readonly QuickPickUser[], currentUser: User | null) {
        const currentUserAccountId = currentUser?.accountId;
        const hasCurrentUser =
            currentUserAccountId !== undefined &&
            selectedUsers.some((item) => item.user?.accountId === currentUserAccountId);
        const regularUsers = selectedUsers.filter((item) => item.user && item.user.accountId !== currentUserAccountId);

        return {
            hasCurrentUser,
            regularUsers,
        };
    },

    isValidFilter(params: { hasCurrentUser: boolean; regularUsers: QuickPickUser[] }): boolean {
        return params.hasCurrentUser || params.regularUsers.length > 0;
    },

    formatUserNames(selectedUsers: readonly QuickPickUser[]): string {
        return selectedUsers.map((u) => u.label).join(', ');
    },
};
