const regex1 = / src="\/[^"]+/g;
const regex2 = / src='\/[^']+/g;

export function replaceRelativeURLsWithAbsolute(renderedHtml: string, baseApiUrl: string): string | undefined {
    if (!renderedHtml || !baseApiUrl) {
        return renderedHtml;
    }

    // substring(7) because we need to get the relative url without the first '/'
    return renderedHtml
        .replace(regex1, (x) => ` src=\"${new URL(x.substring(7), baseApiUrl).href}`)
        .replace(regex2, (x) => ` src=\'${new URL(x.substring(7), baseApiUrl).href}`);
}
