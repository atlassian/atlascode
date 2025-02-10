const regex1 = / src="\/[^"]+/g;
const regex2 = / src='\/[^']+/g;

export function replaceRelativeURLsWithAbsolute(renderedHtml: string, baseApiUrl: string): string | undefined {
    if (!renderedHtml || !baseApiUrl) {
        return renderedHtml;
    }

    // The regex is searching for anything starting with ' src="/' which is 7 chars long,
    // and we need to get the relative URL without including its first /, so anything after those 7 characters.
    // Therefore, substring(7).
    return renderedHtml
        .replace(regex1, (x) => ` src=\"${new URL(x.substring(7), baseApiUrl).href}`)
        .replace(regex2, (x) => ` src=\'${new URL(x.substring(7), baseApiUrl).href}`);
}
