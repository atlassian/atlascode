import { expansionCastTo } from './miscFunctions';

export class FileReaderMock {
    private static mappings: Record<string, string | ArrayBuffer | DOMException> = {};

    public static clearMocks(): void {
        this.mappings = {};
    }

    public static mockResult(fileName: string, result: string | ArrayBuffer): void {
        this.mappings[fileName] = result;
    }

    public static mockError(fileName: string, error: Error): void {
        this.mappings[fileName] = error as DOMException;
    }

    //------

    public error: DOMException | null = null;
    public result: string | ArrayBuffer | null = null;

    public onerror!: ((ev: ProgressEvent<FileReader>) => any) | null;
    public onloadend!: ((ev: ProgressEvent<FileReader>) => any) | null;

    public readAsArrayBuffer(file: File): void {
        new Promise<void>((resolve) => {
            const result = FileReaderMock.mappings[file.name];

            // `instanceof Error` here is not a mistake - DOMException extends Error, and we want this mock
            // to work with generic Errors too.
            if (typeof result === 'undefined' || result instanceof Error) {
                this.error = result;
                this.onerror?.(expansionCastTo<ProgressEvent<FileReader>>({}));
            } else {
                this.result = result;
                this.onloadend?.(expansionCastTo<ProgressEvent<FileReader>>({}));
            }

            resolve();
        });
    }
}