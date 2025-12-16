import fs from 'fs';

export function getFsPromise(code: (callback: fs.NoParamCallback) => void): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        const callback: fs.NoParamCallback = (err) => (err ? reject(err) : resolve());
        try {
            code(callback);
        } catch (error) {
            reject(error);
        }
    });
}
