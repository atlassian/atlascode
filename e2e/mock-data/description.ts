import { DescriptionObject } from 'e2e/helpers/types';

const createDescription = (baseUrl: string) => ({
    fields: {
        description: `Track and resolve bugs related to the user interface.\n\n![Test Image](${baseUrl}/secure/attachment/10001/test.jpg)`,
    },
    renderedFields: {
        description: `<p>Track and resolve bugs related to the user interface.</p><p><img src="${baseUrl}/secure/attachment/10001/test.jpg" alt="Test Image" data-testid="description-image" /></p>`,
    },
});

export const description = {
    cloud: createDescription('https://mockedteams.atlassian.net'),
    dc: createDescription('https://jira.mockeddomain.com'),
};

export const updatedDescription = (newDescription: string): DescriptionObject => ({
    fields: {
        description: newDescription,
    },
    renderedFields: {
        description: `<p>${newDescription}</p>`,
    },
});
