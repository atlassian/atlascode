import { encode } from 'base64-arraybuffer-es6';

export interface FileWithContent extends File {
    /** base64-encoded file content */
    fileContent: string | undefined;
}

function readFile(file: File): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(reader.error || new Error(`Error occurred reading file: ${file.name}`));
        reader.onloadend = () => resolve(encode(reader.result as ArrayBuffer));
        reader.readAsArrayBuffer(file);
    });
}

async function getFileWithContent(file: File): Promise<FileWithContent> {
    (file as FileWithContent).fileContent = await readFile(file);
    return file as FileWithContent;
}

export function readFilesContentAsync(files: File[]): Promise<FileWithContent[]> {
    return Promise.all(files.map((file) => getFileWithContent(file)));
}
