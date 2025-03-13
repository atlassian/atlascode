const rProtocol = /^((https?):)?\/\/.+$/i;

export function validateStartsWithProtocol(name: string, value?: string): string | undefined {
    return value !== undefined && rProtocol.test(value) ? undefined : `${name} must be a valid URL`;
}

export function validateRequiredString(name: string, value?: string): string | undefined {
    return value !== undefined && value.trim().length > 0 ? undefined : `${name} is required`;
}
