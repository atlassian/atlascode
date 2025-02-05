import { arrayBufferToBase64 } from './bufferTransformers';

export interface FileWithContent extends File {
    /** base64-encoded file content */
    fileContent: string | undefined;
}

export function readFilesContentAsync(files: File[]): Promise<FileWithContent[]> {
    const promise = new Promise<any>((resolve) => {
        let doneCount = 0;
        for (let i = 0; i < files.length; ++i) {
            const index = i;
            const reader = new FileReader();
            reader.onloadend = (event) => {
                (files[index] as FileWithContent).fileContent = arrayBufferToBase64(reader.result as ArrayBuffer);
                if (++doneCount === files.length) {
                    resolve(files);
                }
            };
            reader.readAsArrayBuffer(files[index]);
        }
    });

    return promise;
}
