import { decode } from 'base64-arraybuffer-es6';
import { expansionCastTo, FileReaderMock } from 'testsutil';

import { FileWithContent, readFilesContentAsync } from './files';

(global.FileReader as any) = FileReaderMock;

const fileContentFor = (file: string) => {
    switch (file) {
        case 'fileName1.txt':
            return btoa('hello');
        case 'fileName2.txt':
            return btoa('ciao');
        case 'fileName3.txt':
            return btoa('hola');
        default:
            throw new Error(`Invalid filename ${file}`);
    }
};

describe('files.ts', () => {
    beforeEach(() => {
        FileReaderMock.clearMocks();
    });

    it('should read the content of a single file and assign it to the fileContent property', async () => {
        const mockedFile = expansionCastTo<FileWithContent>({ name: 'fileName1.txt' });
        FileReaderMock.mockResult(mockedFile.name, decode(fileContentFor(mockedFile.name)));

        const result = await readFilesContentAsync([mockedFile]);

        expect(result).toHaveLength(1);
        expect(result[0].fileContent).toBeDefined();
        expect(result[0].fileContent).toEqual(fileContentFor(mockedFile.name));

        // the returned files are just the original ones enhanced with the new property
        expect(result[0]).toBe(mockedFile);
    });

    it('should read the content of multiple files', async () => {
        const mockedFiles = [
            expansionCastTo<FileWithContent>({ name: 'fileName1.txt' }),
            expansionCastTo<FileWithContent>({ name: 'fileName2.txt' }),
            expansionCastTo<FileWithContent>({ name: 'fileName3.txt' }),
        ];

        for (const file of mockedFiles) {
            FileReaderMock.mockResult(file.name, decode(fileContentFor(file.name)));
        }

        const result = await readFilesContentAsync(mockedFiles);

        expect(result).toHaveLength(3);
        for (const file of result) {
            expect(file.fileContent).toBeDefined();
            expect(file.fileContent).toEqual(fileContentFor(file.name));
        }
    });

    it("throws an error if the file can't be read", async () => {
        const mockedFile = expansionCastTo<FileWithContent>({ name: 'fileName1.txt' });
        FileReaderMock.mockError(mockedFile.name, new Error('This is a custom error'));

        await expect(readFilesContentAsync([mockedFile])).rejects.toThrow('This is a custom error');
    });

    it("it produces an error if the underlying FileReader doesn't provide one", async () => {
        const mockedFile = expansionCastTo<FileWithContent>({ name: 'fileName1.txt' });
        FileReaderMock.mockError(mockedFile.name, undefined as any);

        await expect(readFilesContentAsync([mockedFile])).rejects.toThrow('Error occurred reading file: fileName1.txt');
    });

    it("everything fails if a single file can't be read", async () => {
        const mockedFiles = [
            expansionCastTo<FileWithContent>({ name: 'fileName1.txt' }),
            expansionCastTo<FileWithContent>({ name: 'fileName2.txt' }),
            expansionCastTo<FileWithContent>({ name: 'fileName3.txt' }),
        ];

        FileReaderMock.mockResult('fileName1.txt', decode(fileContentFor('fileName1.txt')));
        FileReaderMock.mockError('fileName2.txt', new Error('This is a custom error'));
        FileReaderMock.mockResult('fileName3.txt', decode(fileContentFor('fileName3.txt')));

        await expect(readFilesContentAsync(mockedFiles)).rejects.toThrow('This is a custom error');
    });
});
