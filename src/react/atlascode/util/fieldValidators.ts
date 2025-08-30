export function validateUrl(name: string, value?: string): string | undefined {
    const url = tryParseURL(value);
    if (!url || (url.protocol !== 'http:' && url.protocol !== 'https:')) {
        return `${name} must be a valid URL`;
    }

    return undefined;
}

function tryParseURL(url: string | undefined): URL | null {
    if (url) {
        try {
            return URL.parse(url) || URL.parse('https://' + url);
        } catch {}
    }
    return null;
}

export function validateRequiredString(name: string, value?: string): string | undefined {
    return value !== undefined && value.trim().length > 0 ? undefined : `${name} is required`;
}
