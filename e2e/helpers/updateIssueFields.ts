export function updateIssueField(issueJson: any, updates: Record<string, any>) {
    const parsedBody = JSON.parse(issueJson.response.body);

    const updated = structuredClone(parsedBody);

    for (const [key, value] of Object.entries(updates)) {
        if (key === 'description') {
            updated.renderedFields.description = `<p>${value}</p>`;
            updated.fields.description = value;
        } else if (key === 'comment') {
            const comment = {
                id: '10001',
                self: 'https://mockedteams.atlassian.net/rest/api/2/issue/10001/comment/10001',
                author: {
                    self: 'https://mockedteams.atlassian.net/rest/api/2/user?accountId=712020%3A13354d79-beaa-49d6-a55f-b9510892e3f4',
                    accountId: '712020:13354d79-beaa-49d6-a55f-b9510892e3f4',
                    emailAddress: 'mock@atlassian.code',
                    avatarUrls: {
                        '48x48':
                            'https://secure.gravatar.com/avatar/3c1286d428ff8f7167844ee661f0aef0?d=https%3A%2F%2Favatar-management--avatars.us-west-2.staging.public.atl-paas.net%2Finitials%2FMM-3.png',
                        '24x24':
                            'https://secure.gravatar.com/avatar/3c1286d428ff8f7167844ee661f0aef0?d=https%3A%2F%2Favatar-management--avatars.us-west-2.staging.public.atl-paas.net%2Finitials%2FMM-3.png',
                        '16x16':
                            'https://secure.gravatar.com/avatar/3c1286d428ff8f7167844ee661f0aef0?d=https%3A%2F%2Favatar-management--avatars.us-west-2.staging.public.atl-paas.net%2Finitials%2FMM-3.png',
                        '32x32':
                            'https://secure.gravatar.com/avatar/3c1286d428ff8f7167844ee661f0aef0?d=https%3A%2F%2Favatar-management--avatars.us-west-2.staging.public.atl-paas.net%2Finitials%2FMM-3.png',
                    },
                    displayName: 'Mocked McMock',
                    active: true,
                    timeZone: 'America/Los_Angeles',
                    accountType: 'atlassian',
                },
                body: value,
                updateAuthor: {
                    self: 'https://mockedteams.atlassian.net/rest/api/2/user?accountId=712020%3A13354d79-beaa-49d6-a55f-b9510892e3f4',
                    accountId: '712020:13354d79-beaa-49d6-a55f-b9510892e3f4',
                    emailAddress: 'mock@atlassian.code',
                    avatarUrls: {
                        '48x48':
                            'https://secure.gravatar.com/avatar/3c1286d428ff8f7167844ee661f0aef0?d=https%3A%2F%2Favatar-management--avatars.us-west-2.staging.public.atl-paas.net%2Finitials%2FMM-3.png',
                        '24x24':
                            'https://secure.gravatar.com/avatar/3c1286d428ff8f7167844ee661f0aef0?d=https%3A%2F%2Favatar-management--avatars.us-west-2.staging.public.atl-paas.net%2Finitials%2FMM-3.png',
                        '16x16':
                            'https://secure.gravatar.com/avatar/3c1286d428ff8f7167844ee661f0aef0?d=https%3A%2F%2Favatar-management--avatars.us-west-2.staging.public.atl-paas.net%2Finitials%2FMM-3.png',
                        '32x32':
                            'https://secure.gravatar.com/avatar/3c1286d428ff8f7167844ee661f0aef0?d=https%3A%2F%2Favatar-management--avatars.us-west-2.staging.public.atl-paas.net%2Finitials%2FMM-3.png',
                    },
                    displayName: 'Mocked McMock',
                    active: true,
                    timeZone: 'America/Los_Angeles',
                    accountType: 'atlassian',
                },
                created: '2025-01-10T12:00:00.000-0800',
                updated: '2025-01-10T12:00:00.000-0800',
                visibility: {
                    type: 'role',
                    value: 'Administrators',
                },
            };

            updated.renderedFields.comment.comments.push(comment);
            updated.renderedFields.comment.total = 1;
            updated.renderedFields.comment.maxResults = 1;
            updated.renderedFields.comment.startAt = 0;
        }
    }

    return updated;
}
