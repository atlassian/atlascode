import { Uri } from 'vscode';

import { SimpleCallbackAction } from './simpleCallback';

describe('OpenSettingsUriHandlerAction', () => {
    const suffix = 'cool-callback';
    const callback = jest.fn();
    const action = new SimpleCallbackAction(suffix, callback);

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('isAccepted', () => {
        it('only accepts URIs ending with openSettings', () => {
            expect(action.isAccepted(Uri.parse(`https://some-uri/${suffix}`))).toBe(true);
            expect(action.isAccepted(Uri.parse('https://some-uri/otherThing'))).toBe(false);
        });
    });

    describe('handle', () => {
        it('calls the callback', async () => {
            await action.handle(Uri.parse('https://some-uri/openSettings'));
            expect(callback).toHaveBeenCalled();
        });
    });
});
