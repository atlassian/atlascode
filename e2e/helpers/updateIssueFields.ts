export function updateIssueField(issueJson: any, updates: Record<string, any>) {
    const parsedBody = JSON.parse(issueJson.response.body);

    const updated = structuredClone(parsedBody);

    for (const [key, value] of Object.entries(updates)) {
        if (key === 'description') {
            updated.renderedFields.description = `<p>${value}</p>`;
            updated.fields.description = value;
        }
    }

    return updated;
}
