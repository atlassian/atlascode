export function OnMessageEventPromise(eventName: string, timeout: number, nonce: string): Promise<any> {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            window.removeEventListener('message', issueListener);
            clearTimeout(timer);
            reject(new Error(`timeout waiting for event ${eventName}`));
        }, timeout);

        const issueListener = (e: MessageEvent) => {
            if (e.data.type === 'error' && e.data.nonce === nonce) {
                window.removeEventListener('message', issueListener);
                clearTimeout(timer);
                reject(e.data.reason);
            } else if (e.data.type === eventName && e.data.nonce === nonce) {
                window.removeEventListener('message', issueListener);
                clearTimeout(timer);
                resolve(e.data);
            }
        };

        window.addEventListener('message', issueListener);
    });
}
