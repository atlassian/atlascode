export type FormattedError = {
    [key: string]: unknown;
    title?: string;
    errorMessages?: string[];
};
export function formatError(e: any, title?: string): FormattedError | string {
    if (e.response) {
        if (e.response.data && e.response.data !== '') {
            return title ? { ...e.response.data, ...{ title: title } } : e.response.data;
        }
    } else if (e.message && e.stderr) {
        // git errors
        return title
            ? { title: title, errorMessages: [e.message, e.stderr] }
            : { title: e.message, errorMessages: [e.stderr] };
    } else if (e.message) {
        return title ? { title: title, errorMessages: [e.message] } : e.message;
    }

    return title ? { title: title, errorMessages: [`${e}`] } : e;
}
