import { MinimalIssue, User } from '@atlassianlabs/jira-pi-common-models';
import { DetailedSiteInfo, ProductJira } from 'src/atlclients/authInfo';

import { QuickPickUser, QuickPickUtils } from './QuickPickUtils';

const createMockSite = (id: string, host: string): DetailedSiteInfo => ({
    id,
    host,
    name: `Site ${id}`,
    avatarUrl: `https://${host}/avatar.png`,
    baseLinkUrl: `https://${host}`,
    baseApiUrl: `https://${host}/rest/api/3`,
    isCloud: true,
    credentialId: `cred-${id}`,
    userId: `user-${id}`,
    product: ProductJira,
});

const createMockUser = (accountId: string, displayName: string, email: string): User => ({
    accountId,
    displayName,
    emailAddress: email,
    active: true,
    self: `https://test.atlassian.net/rest/api/3/user?accountId=${accountId}`,
    avatarUrls: {
        '48x48': `https://test.atlassian.net/avatar/${accountId}`,
        '24x24': `https://test.atlassian.net/avatar/${accountId}`,
        '16x16': `https://test.atlassian.net/avatar/${accountId}`,
        '32x32': `https://test.atlassian.net/avatar/${accountId}`,
    },
    timeZone: 'UTC',
    key: undefined,
});

const createMockIssue = (key: string, summary: string, site: DetailedSiteInfo): MinimalIssue<DetailedSiteInfo> => ({
    key,
    summary,
    id: key,
    self: `${site.baseApiUrl}/issue/${key}`,
    created: new Date(),
    updated: new Date(),
    description: '',
    descriptionHtml: '',
    siteDetails: site,
    status: { name: 'To Do' } as any,
    priority: { name: 'High' } as any,
    issuetype: { name: 'Bug' } as any,
    subtasks: [],
    issuelinks: [],
    transitions: [],
    isEpic: false,
    epicLink: '',
    epicName: '',
    epicChildren: [],
});

describe('QuickPickUtils', () => {
    let mockSite1: DetailedSiteInfo;
    let mockUser1: User;
    let mockUser2: User;

    beforeEach(() => {
        mockSite1 = createMockSite('1', 'test1.atlassian.net');
        mockUser1 = createMockUser('user-1', 'John Doe', 'john@example.com');
        mockUser2 = createMockUser('user-2', 'Jane Smith', 'jane@example.com');
    });

    describe('getDefaultAssigneeOptions', () => {
        it('should include Unassigned option by default', () => {
            const result = QuickPickUtils.getDefaultAssigneeOptions([]);

            expect(result).toEqual(expect.arrayContaining([expect.objectContaining({ label: 'Unassigned' })]));
            expect(result.length).toBe(1);
        });

        it('should include previous selected items', () => {
            const previousItems: QuickPickUser[] = [
                {
                    label: 'John Doe',
                    description: 'john@example.com',
                    detail: 'Active',
                    user: mockUser1,
                },
            ];

            const result = QuickPickUtils.getDefaultAssigneeOptions(previousItems);

            expect(result).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ label: 'Unassigned' }),
                    expect.objectContaining({ label: 'John Doe' }),
                ]),
            );
            expect(result.length).toBe(2);
        });

        it('should exclude duplicate labels from previous items', () => {
            const previousItems: QuickPickUser[] = [
                {
                    label: 'Unassigned',
                    description: 'Duplicate',
                    detail: '',
                    user: null as any,
                },
                {
                    label: 'John Doe',
                    description: 'john@example.com',
                    detail: 'Active',
                    user: mockUser1,
                },
            ];

            const result = QuickPickUtils.getDefaultAssigneeOptions(previousItems);

            const unassignedCount = result.filter((item) => item.label === 'Unassigned').length;
            expect(unassignedCount).toBe(1);
            expect(result).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ label: 'Unassigned' }),
                    expect.objectContaining({ label: 'John Doe' }),
                ]),
            );
        });

        it('should handle multiple previous items', () => {
            const previousItems: QuickPickUser[] = [
                {
                    label: 'John Doe',
                    description: 'john@example.com',
                    detail: 'Active',
                    user: mockUser1,
                },
                {
                    label: 'Jane Smith',
                    description: 'jane@example.com',
                    detail: 'Active',
                    user: mockUser2,
                },
            ];

            const result = QuickPickUtils.getDefaultAssigneeOptions(previousItems);

            expect(result.length).toBe(3);
            expect(result).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ label: 'Unassigned' }),
                    expect.objectContaining({ label: 'John Doe' }),
                    expect.objectContaining({ label: 'Jane Smith' }),
                ]),
            );
        });
    });

    describe('mapIssuesToQuickPickItems', () => {
        it('should format issue label correctly', () => {
            const issue = createMockIssue('TEST-1', 'Test Issue', mockSite1);

            const result = QuickPickUtils.mapIssuesToQuickPickItems([issue]);

            expect(result[0].label).toBe('TEST-1: Test Issue');
            expect(result[0].description).toBe('To Do');
            expect(result[0].issue).toBe(issue);
        });

        it('should handle issues with missing summary', () => {
            const issueWithoutSummary = createMockIssue('TEST-1', '', mockSite1);
            delete (issueWithoutSummary as any).summary;

            const result = QuickPickUtils.mapIssuesToQuickPickItems([issueWithoutSummary]);

            expect(result[0].label).toContain('No summary');
        });

        it('should handle issues with missing status', () => {
            const issueWithoutStatus = createMockIssue('TEST-2', 'Test', mockSite1);
            delete (issueWithoutStatus as any).status;

            const result = QuickPickUtils.mapIssuesToQuickPickItems([issueWithoutStatus]);

            expect(result[0].description).toBe('Unknown Status');
        });

        it('should handle issues with assignee information', () => {
            const issueWithAssignee = createMockIssue('TEST-1', 'Test Issue', mockSite1);
            (issueWithAssignee as any).assignee = {
                displayName: 'John Doe',
                name: 'john',
            };

            const result = QuickPickUtils.mapIssuesToQuickPickItems([issueWithAssignee]);

            expect(result[0].detail).toBe('John Doe');
        });

        it('should use assignee name if displayName is not available', () => {
            const issueWithAssignee = createMockIssue('TEST-1', 'Test Issue', mockSite1);
            (issueWithAssignee as any).assignee = {
                name: 'john',
            };

            const result = QuickPickUtils.mapIssuesToQuickPickItems([issueWithAssignee]);

            expect(result[0].detail).toBe('john');
        });

        it('should show Unassigned when no assignee', () => {
            const issue = createMockIssue('TEST-1', 'Test Issue', mockSite1);

            const result = QuickPickUtils.mapIssuesToQuickPickItems([issue]);

            expect(result[0].detail).toBe('Unassigned');
        });

        it('should map multiple issues', () => {
            const issue1 = createMockIssue('TEST-1', 'Issue 1', mockSite1);
            const issue2 = createMockIssue('TEST-2', 'Issue 2', mockSite1);

            const result = QuickPickUtils.mapIssuesToQuickPickItems([issue1, issue2]);

            expect(result).toHaveLength(2);
            expect(result[0].label).toBe('TEST-1: Issue 1');
            expect(result[1].label).toBe('TEST-2: Issue 2');
        });
    });

    describe('mapUsersToQuickPickItems', () => {
        it('should map user properties correctly', () => {
            const result = QuickPickUtils.mapUsersToQuickPickItems([mockUser1]);

            expect(result[0].label).toBe('John Doe');
            expect(result[0].description).toBe('john@example.com');
            expect(result[0].detail).toBe('Active');
            expect(result[0].user).toBe(mockUser1);
        });

        it('should handle users with missing displayName', () => {
            const userWithoutName = createMockUser('user-1', '', 'test@example.com');
            delete (userWithoutName as any).displayName;

            const result = QuickPickUtils.mapUsersToQuickPickItems([userWithoutName]);

            expect(result[0].label).toBe('Unknown User');
        });

        it('should handle users with empty displayName', () => {
            const userWithEmptyName = createMockUser('user-1', '', 'test@example.com');

            const result = QuickPickUtils.mapUsersToQuickPickItems([userWithEmptyName]);

            expect(result[0].label).toBe('Unknown User');
        });

        it('should handle inactive users', () => {
            const inactiveUser = createMockUser('user-1', 'John Doe', 'john@example.com');
            inactiveUser.active = false;

            const result = QuickPickUtils.mapUsersToQuickPickItems([inactiveUser]);

            expect(result[0].detail).toBe('Inactive');
        });

        it('should handle users with undefined active property', () => {
            const userWithUndefinedActive = createMockUser('user-1', 'John Doe', 'john@example.com');
            delete (userWithUndefinedActive as any).active;

            const result = QuickPickUtils.mapUsersToQuickPickItems([userWithUndefinedActive]);

            expect(result[0].detail).toBe('Active');
        });

        it('should map multiple users', () => {
            const result = QuickPickUtils.mapUsersToQuickPickItems([mockUser1, mockUser2]);

            expect(result).toHaveLength(2);
            expect(result[0].label).toBe('John Doe');
            expect(result[1].label).toBe('Jane Smith');
        });
    });

    describe('mergeItemsWithPersistent', () => {
        it('should not add duplicate items', () => {
            const persistent: QuickPickUser[] = [
                {
                    label: 'John Doe',
                    description: 'john@example.com',
                    detail: 'Active',
                    user: mockUser1,
                },
            ];
            const newItems: QuickPickUser[] = [
                {
                    label: 'John Doe',
                    description: 'different@example.com',
                    detail: 'Active',
                    user: mockUser1,
                },
                {
                    label: 'Jane Smith',
                    description: 'jane@example.com',
                    detail: 'Active',
                    user: mockUser2,
                },
            ];

            const result = QuickPickUtils.mergeItemsWithPersistent(persistent, newItems);

            expect(result).toHaveLength(2);
            expect(result[0].label).toBe('John Doe');
            expect(result[1].label).toBe('Jane Smith');
        });

        it('should preserve persistent items order', () => {
            const persistent: QuickPickUser[] = [
                {
                    label: 'User 1',
                    description: 'user1@example.com',
                    detail: 'Active',
                    user: mockUser1,
                },
                {
                    label: 'User 2',
                    description: 'user2@example.com',
                    detail: 'Active',
                    user: mockUser2,
                },
            ];
            const newItems: QuickPickUser[] = [
                {
                    label: 'User 3',
                    description: 'user3@example.com',
                    detail: 'Active',
                    user: mockUser1,
                },
            ];

            const result = QuickPickUtils.mergeItemsWithPersistent(persistent, newItems);

            expect(result).toHaveLength(3);
            expect(result[0].label).toBe('User 1');
            expect(result[1].label).toBe('User 2');
            expect(result[2].label).toBe('User 3');
        });

        it('should return persistent items when new items are empty', () => {
            const persistent: QuickPickUser[] = [
                {
                    label: 'John Doe',
                    description: 'john@example.com',
                    detail: 'Active',
                    user: mockUser1,
                },
            ];

            const result = QuickPickUtils.mergeItemsWithPersistent(persistent, []);

            expect(result).toEqual(persistent);
        });

        it('should return new items when persistent items are empty', () => {
            const newItems: QuickPickUser[] = [
                {
                    label: 'John Doe',
                    description: 'john@example.com',
                    detail: 'Active',
                    user: mockUser1,
                },
            ];

            const result = QuickPickUtils.mergeItemsWithPersistent([], newItems);

            expect(result).toEqual(newItems);
        });
    });

    describe('extractFilterParameters', () => {
        it('should correctly identify Unassigned option', () => {
            const items: QuickPickUser[] = [
                {
                    label: 'Unassigned',
                    description: 'Filter by unassigned issues',
                    detail: 'Shows only issues with no assignee',
                    user: null as any,
                },
            ];

            const result = QuickPickUtils.extractFilterParameters(items);

            expect(result.hasUnassigned).toBe(true);
            expect(result.regularUsers).toHaveLength(0);
        });

        it('should filter out Unassigned from regular users', () => {
            const items: QuickPickUser[] = [
                {
                    label: 'John Doe',
                    description: 'john@example.com',
                    detail: 'Active',
                    user: mockUser1,
                },
                {
                    label: 'Unassigned',
                    description: 'Filter by unassigned issues',
                    detail: 'Shows only issues with no assignee',
                    user: null as any,
                },
            ];

            const result = QuickPickUtils.extractFilterParameters(items);

            expect(result.hasUnassigned).toBe(true);
            expect(result.regularUsers).toHaveLength(1);
            expect(result.regularUsers[0].label).toBe('John Doe');
        });

        it('should return only regular users when Unassigned is not selected', () => {
            const items: QuickPickUser[] = [
                {
                    label: 'John Doe',
                    description: 'john@example.com',
                    detail: 'Active',
                    user: mockUser1,
                },
                {
                    label: 'Jane Smith',
                    description: 'jane@example.com',
                    detail: 'Active',
                    user: mockUser2,
                },
            ];

            const result = QuickPickUtils.extractFilterParameters(items);

            expect(result.hasUnassigned).toBe(false);
            expect(result.regularUsers).toHaveLength(2);
        });

        it('should filter out items without user property', () => {
            const items: QuickPickUser[] = [
                {
                    label: 'John Doe',
                    description: 'john@example.com',
                    detail: 'Active',
                    user: mockUser1,
                },
                {
                    label: 'Invalid Item',
                    description: 'invalid',
                    detail: '',
                    user: null as any,
                },
            ];

            const result = QuickPickUtils.extractFilterParameters(items);

            expect(result.regularUsers).toHaveLength(1);
            expect(result.regularUsers[0].label).toBe('John Doe');
        });

        it('should handle empty array', () => {
            const result = QuickPickUtils.extractFilterParameters([]);

            expect(result.hasUnassigned).toBe(false);
            expect(result.regularUsers).toHaveLength(0);
        });
    });

    describe('isValidFilter', () => {
        it('should return true when hasUnassigned is true', () => {
            const result = QuickPickUtils.isValidFilter({
                hasUnassigned: true,
                regularUsers: [],
            });

            expect(result).toBe(true);
        });

        it('should return true when regularUsers has items', () => {
            const result = QuickPickUtils.isValidFilter({
                hasUnassigned: false,
                regularUsers: [
                    {
                        label: 'John Doe',
                        description: 'john@example.com',
                        detail: 'Active',
                        user: mockUser1,
                    },
                ],
            });

            expect(result).toBe(true);
        });

        it('should return true when both hasUnassigned and regularUsers are set', () => {
            const result = QuickPickUtils.isValidFilter({
                hasUnassigned: true,
                regularUsers: [
                    {
                        label: 'John Doe',
                        description: 'john@example.com',
                        detail: 'Active',
                        user: mockUser1,
                    },
                ],
            });

            expect(result).toBe(true);
        });

        it('should return false when both are empty', () => {
            const result = QuickPickUtils.isValidFilter({
                hasUnassigned: false,
                regularUsers: [],
            });

            expect(result).toBe(false);
        });
    });

    describe('formatUserNames', () => {
        it('should format single user name', () => {
            const users: QuickPickUser[] = [
                {
                    label: 'John Doe',
                    description: 'john@example.com',
                    detail: 'Active',
                    user: mockUser1,
                },
            ];

            const result = QuickPickUtils.formatUserNames(users);

            expect(result).toBe('John Doe');
        });

        it('should format multiple user names', () => {
            const users: QuickPickUser[] = [
                {
                    label: 'John Doe',
                    description: 'john@example.com',
                    detail: 'Active',
                    user: mockUser1,
                },
                {
                    label: 'Jane Smith',
                    description: 'jane@example.com',
                    detail: 'Active',
                    user: mockUser2,
                },
            ];

            const result = QuickPickUtils.formatUserNames(users);

            expect(result).toBe('John Doe, Jane Smith');
        });

        it('should format three user names', () => {
            const mockUser3 = createMockUser('user-3', 'Bob Johnson', 'bob@example.com');
            const users: QuickPickUser[] = [
                {
                    label: 'John Doe',
                    description: 'john@example.com',
                    detail: 'Active',
                    user: mockUser1,
                },
                {
                    label: 'Jane Smith',
                    description: 'jane@example.com',
                    detail: 'Active',
                    user: mockUser2,
                },
                {
                    label: 'Bob Johnson',
                    description: 'bob@example.com',
                    detail: 'Active',
                    user: mockUser3,
                },
            ];

            const result = QuickPickUtils.formatUserNames(users);

            expect(result).toBe('John Doe, Jane Smith, Bob Johnson');
        });

        it('should return empty string for empty array', () => {
            const result = QuickPickUtils.formatUserNames([]);

            expect(result).toBe('');
        });
    });
});
