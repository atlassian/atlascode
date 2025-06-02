import { expansionCastTo } from 'testsutil';

import { OnMessageEventPromise } from './reactpromise';

(global.window as any) = {
    addEventListener: () => {},
    removeEventListener: () => {},
};

describe('OnMessageEventPromise', () => {
    beforeEach(() => {
        jest.spyOn(global, 'setTimeout').mockImplementation(() => 100 as any);
        jest.spyOn(global, 'clearTimeout').mockImplementation(() => {});
        jest.spyOn(window, 'addEventListener').mockImplementation(() => {});
        jest.spyOn(window, 'removeEventListener').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.restoreAllMocks();
    });

    it('returns a promise, which register to window.addEventListener', () => {
        const promise = OnMessageEventPromise('thisname', 123, 'nonce456');
        expect(promise).toBeDefined();
        expect(promise.then).toBeDefined();
        expect(promise.catch).toBeDefined();

        expect(window.addEventListener).toHaveBeenCalledWith('message', expect.any(Function));
    });

    it('at timeout, it unregisters from window and it rejects the promise', async () => {
        let timeoutCallback: () => void = undefined!;
        jest.spyOn(global, 'setTimeout').mockImplementation((callback) => {
            timeoutCallback = callback;
            return 101 as any;
        });

        const promise = OnMessageEventPromise('thisname', 123, 'nonce456');
        timeoutCallback();

        await expect(promise).rejects.toThrow(`timeout waiting for event thisname`);

        expect(window.removeEventListener).toHaveBeenCalled();
    });

    it("when a window event arrives with the same name, it's captured and the promise resolves with the event's data", async () => {
        let windowCallback: (e: MessageEvent) => void = undefined!;
        jest.spyOn(window, 'addEventListener').mockImplementation((name, callback) => {
            if (name === 'message') {
                windowCallback = callback as any;
            }
        });

        const promise = OnMessageEventPromise('thisname', 123, 'nonce456');
        expect(windowCallback).toBeDefined();

        const data = { type: 'thisname', nonce: 'nonce456' };
        windowCallback(expansionCastTo<MessageEvent<any>>({ data }));

        expect(window.removeEventListener).toHaveBeenCalled();
        expect(global.clearTimeout).toHaveBeenCalled();

        const value = await promise;
        expect(value).toBe(data);
    });

    it('when a window event arrives with another name, nothing happens', () => {
        let windowCallback: (e: MessageEvent) => void = undefined!;
        jest.spyOn(window, 'addEventListener').mockImplementation((name, callback) => {
            if (name === 'message') {
                windowCallback = callback as any;
            }
        });

        OnMessageEventPromise('thisname', 123, 'nonce456');
        expect(windowCallback).toBeDefined();

        const data = { type: 'anothername', nonce: 'nonce456' };
        windowCallback(expansionCastTo<MessageEvent<any>>({ data }));

        expect(window.removeEventListener).not.toHaveBeenCalled();
        expect(global.clearTimeout).not.toHaveBeenCalled();
    });

    it('when a window event arrives with a different nonce, nothing happens', () => {
        let windowCallback: (e: MessageEvent) => void = undefined!;
        jest.spyOn(window, 'addEventListener').mockImplementation((name, callback) => {
            if (name === 'message') {
                windowCallback = callback as any;
            }
        });

        OnMessageEventPromise('thisname', 123, 'nonce456');
        expect(windowCallback).toBeDefined();

        const data = { type: 'thisname', nonce: 'nonce111' };
        windowCallback(expansionCastTo<MessageEvent<any>>({ data }));

        expect(window.removeEventListener).not.toHaveBeenCalled();
        expect(global.clearTimeout).not.toHaveBeenCalled();
    });

    it("when a window event arrives with the name 'error', it's captured and the promise rejects", async () => {
        let windowCallback: (e: MessageEvent) => void = undefined!;
        jest.spyOn(window, 'addEventListener').mockImplementation((name, callback) => {
            if (name === 'message') {
                windowCallback = callback as any;
            }
        });

        const promise = OnMessageEventPromise('thisname', 123, 'nonce456');
        expect(windowCallback).toBeDefined();

        const data = { type: 'error', nonce: 'nonce456', reason: new Error('something failed lol') };
        windowCallback(expansionCastTo<MessageEvent<any>>({ data }));

        await expect(promise).rejects.toThrow(`something failed lol`);

        expect(window.removeEventListener).toHaveBeenCalled();
    });

    it("when a window event arrives with the name 'error' but different nonce, nothing happens", async () => {
        let windowCallback: (e: MessageEvent) => void = undefined!;
        jest.spyOn(window, 'addEventListener').mockImplementation((name, callback) => {
            if (name === 'message') {
                windowCallback = callback as any;
            }
        });

        OnMessageEventPromise('thisname', 123, 'nonce456');
        expect(windowCallback).toBeDefined();

        const data = { type: 'error', nonce: 'nonce112', reason: new Error('something failed lol') };
        windowCallback(expansionCastTo<MessageEvent<any>>({ data }));

        expect(window.removeEventListener).not.toHaveBeenCalled();
        expect(global.clearTimeout).not.toHaveBeenCalled();
    });
});
