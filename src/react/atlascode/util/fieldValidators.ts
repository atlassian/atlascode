export function validateUrl(name: string, value?: string): string | undefined {
    const url = tryParseURL(value);
    if (!url || (url.protocol !== 'http:' && url.protocol !== 'https:')) {
        return `${name} must be a valid URL`;
    }

    return undefined;
}

function tryParseURL(url: string | undefined): URL | null {
    if (!url) {
        return null;
    }

    // Use URL.parse() if available
    if (typeof URL.parse === 'function') {
        return URL.parse(url) || URL.parse('https://' + url);
    }

    // Fallback for older environments where URL.parse doesn't exist
    try {
        return new URL(url);
    } catch {
        try {
            return new URL('https://' + url);
        } catch {
            return null;
        }
    }
}

export function validateRequiredString(name: string, value?: string): string | undefined {
    return value !== undefined && value.trim().length > 0 ? undefined : `${name} is required`;
}
