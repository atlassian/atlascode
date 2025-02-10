import * as html from './html';

describe('html util', () => {
    describe('fix relative URLs in html', () => {
        it('replaceRelativeURLsWithAbsolute correctly replaces the relative URL', () => {
            const baseUrl = 'https://www.domain.com/path1/path2/path3';
            const htmlText = '<p><label>/imgs/test.png</label><img src="/imgs/test.png" /></p>';

            const expectedHtml =
                '<p><label>/imgs/test.png</label><img src="https://www.domain.com/path1/path2/imgs/test.png" /></p>';

            const fixedHtml = html.replaceRelativeURLsWithAbsolute(htmlText, baseUrl);
            expect(fixedHtml).toBe(expectedHtml);
        });

        it('replaceRelativeURLsWithAbsolute correctly replaces all relative URLs', () => {
            const baseUrl = 'https://www.domain.com/path1/path2/path3';
            const htmlText =
                '<p>' +
                '<label>/imgs/test1.png</label><img src="/imgs/test1.png" />' +
                '<label>/imgs/test2.png</label><img src="/imgs/test2.png" />' +
                "<label>/imgs/test3.png</label><img src='/imgs/test3.png' />" +
                "<label>/imgs/test4.png</label><img src='/imgs/test4.png' />" +
                '</p>';

            const expectedHtml =
                '<p>' +
                '<label>/imgs/test1.png</label><img src="https://www.domain.com/path1/path2/imgs/test1.png" />' +
                '<label>/imgs/test2.png</label><img src="https://www.domain.com/path1/path2/imgs/test2.png" />' +
                "<label>/imgs/test3.png</label><img src='https://www.domain.com/path1/path2/imgs/test3.png' />" +
                "<label>/imgs/test4.png</label><img src='https://www.domain.com/path1/path2/imgs/test4.png' />" +
                '</p>';

            const fixedHtml = html.replaceRelativeURLsWithAbsolute(htmlText, baseUrl);
            expect(fixedHtml).toBe(expectedHtml);
        });

        it("replaceRelativeURLsWithAbsolute doesn't replaces absolute URLs", () => {
            const baseUrl = 'https://www.domain.com/path1/path2/path3';
            const htmlText = '<p><label>/imgs/test.png</label><img src="https://www.domain.com/imgs/test.png" /></p>';

            const fixedHtml = html.replaceRelativeURLsWithAbsolute(htmlText, baseUrl);
            expect(fixedHtml).toBe(htmlText);
        });

        it("if there aren't relative URLs, nothing changes", () => {
            const baseUrl = 'https://www.domain.com/path1/path2/path3';
            const htmlText = '<p><label>hello</label></p>';

            const fixedHtml = html.replaceRelativeURLsWithAbsolute(htmlText, baseUrl);
            expect(fixedHtml).toBe(htmlText);
        });

        it('last segment of the path is ignored unless it ends with a /', () => {
            const htmlText = '<img src="/imgs/test.png" />';

            expect(html.replaceRelativeURLsWithAbsolute(htmlText, 'https://www.domain.com/path1/path2')).toBe(
                '<img src="https://www.domain.com/path1/imgs/test.png" />',
            );
            expect(html.replaceRelativeURLsWithAbsolute(htmlText, 'https://www.domain.com/path1/path2/')).toBe(
                '<img src="https://www.domain.com/path1/path2/imgs/test.png" />',
            );
        });

        it('nullables are correctly handled', () => {
            expect(html.replaceRelativeURLsWithAbsolute('', 'https://www.domain.com/')).toBe('');
            expect(html.replaceRelativeURLsWithAbsolute(null!, 'https://www.domain.com/')).toBe(null);
            expect(html.replaceRelativeURLsWithAbsolute(undefined!, 'https://www.domain.com/')).toBe(undefined);

            expect(html.replaceRelativeURLsWithAbsolute('<p></p>', '')).toBe('<p></p>');
            expect(html.replaceRelativeURLsWithAbsolute('<p></p>', null!)).toBe('<p></p>');
            expect(html.replaceRelativeURLsWithAbsolute('<p></p>', undefined!)).toBe('<p></p>');
        });
    });
});
