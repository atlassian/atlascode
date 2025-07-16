export const createSearchResponse = (includeBts1: boolean = false) => ({
    expand: 'names,schema',
    startAt: 0,
    maxResults: 50,
    total: includeBts1 ? 5 : 4,
    issues: [
        {
            key: 'BTS-5',
            fields: {
                summary: 'Fix Database Connection Errors',
            },
        },
        {
            key: 'BTS-4',
            fields: {
                summary: 'Resolve API Timeout Issues',
            },
        },
        ...(includeBts1
            ? [
                  {
                      key: 'BTS-1',
                      fields: {
                          summary: 'User Interface Bugs',
                      },
                  },
              ]
            : []),
        {
            key: 'BTS-3',
            fields: {
                summary: 'Improve Dropdown Menu Responsiveness',
            },
        },
        {
            key: 'BTS-6',
            fields: {
                summary: 'Fix Button Alignment Issue',
            },
        },
    ],
});
