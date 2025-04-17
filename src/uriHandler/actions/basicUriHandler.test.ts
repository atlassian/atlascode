import { Uri } from 'vscode';

import { BasicUriHandler } from './basicUriHandler';

class UriHandlerActionTest extends BasicUriHandler {
    constructor(prefix: string) {
        super(prefix, () => Promise.resolve());
    }
}

describe('UriHandlerAction', () => {
    describe('isAccepted', () => {
        const suffix = 'myCoolPath';
        const check = (uriString: string) => new UriHandlerActionTest(suffix).isAccepted(Uri.parse(uriString));

        it('returns true if the URI path ends with the suffix', () => {
            // Regular URI
            expect(check(`https://some-uri/${suffix}`)).toBe(true);
            // Query is OK
            expect(check(`https://some-uri/${suffix}?cloneUrl=...&ref=...&refType=...`)).toBe(true);
            // No check on the host
            expect(check(`https://some-other-uri/${suffix}`)).toBe(true);
        });

        it('returns false if the URI path does not end with the suffix', () => {
            // No extra path
            expect(check(`https://some-uri/${suffix}/somethingExtra`)).toBe(false);
            // No other suffix
            expect(check(`https://some-uri/somethingElse`)).toBe(false);
        });
    });

    describe('handle', () => {
        it('calls the callback', async () => {
            const action = new UriHandlerActionTest('test');
            jest.spyOn(action, 'handle');

            await action.handle(Uri.parse('https://some-uri/openSettings'));
            expect(action.handle).toHaveBeenCalled();
        });
    });
});
