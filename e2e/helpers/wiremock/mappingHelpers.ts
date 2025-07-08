import type { APIRequestContext } from '@playwright/test';

/**
 * Helper function to set up WireMock mapping
 */
export const setupWireMockMapping = async (request: APIRequestContext, method: string, body: any, urlPath: string) => {
    const response = await request.post('http://wiremock-mockedteams:8080/__admin/mappings', {
        data: {
            request: {
                method,
                urlPath,
            },
            response: {
                status: 200,
                body: JSON.stringify(body),
                headers: {
                    'Content-Type': 'application/json',
                },
            },
        },
    });
    return await response.json();
};

/**
 * Helper function to clean up WireMock mapping
 */
export const cleanupWireMockMapping = async (request: APIRequestContext, mappingId: string) => {
    await request.delete(`http://wiremock-mockedteams:8080/__admin/mappings/${mappingId}`);
};
