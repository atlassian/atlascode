import { Uri } from 'vscode';
import { isAcceptedBySuffix } from './uriHandlerAction';

describe('isAcceptedBySuffix', () => {
    const suffix = 'myCoolPath';
    const check = (uriString: string) => isAcceptedBySuffix(Uri.parse(uriString), suffix);

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
