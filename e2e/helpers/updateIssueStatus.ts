export function updateIssueStatus(issueJson: any, newStatusName: string) {
    const parsedBody = JSON.parse(issueJson.response.body);
    const updated = structuredClone(parsedBody);

    // Update the status name in fields.status.name
    updated.fields.status.name = newStatusName;

    // Also update the statusCategory name to match (common pattern in Jira)
    if (updated.fields.status.statusCategory) {
        updated.fields.status.statusCategory.name = newStatusName;
    }

    // Update the top-level statusCategory if it exists
    if (updated.fields.statusCategory) {
        updated.fields.statusCategory.name = newStatusName;
    }

    return updated;
}
