import { encodePathParts } from './bbUtils';

describe('bbUtils', () => {
    describe('encodePathParts', () => {
        it('should encode path parts with special characters', () => {
            const path = 'folder/sub folder/file with spaces.txt';
            const result = encodePathParts(path);
            expect(result).toBe('folder/sub%20folder/file%20with%20spaces.txt');
        });

        it('should handle paths with special URL characters', () => {
            const path = 'folder/sub&folder/file?param=value.txt';
            const result = encodePathParts(path);
            expect(result).toBe('folder/sub%26folder/file%3Fparam%3Dvalue.txt');
        });

        it('should handle empty path parts', () => {
            const path = 'folder//subfolder';
            const result = encodePathParts(path);
            expect(result).toBe('folder//subfolder');
        });

        it('should handle single folder name', () => {
            const path = 'folder name';
            const result = encodePathParts(path);
            expect(result).toBe('folder%20name');
        });

        it('should handle empty string', () => {
            const path = '';
            const result = encodePathParts(path);
            expect(result).toBe('');
        });

        it('should handle null/undefined input', () => {
            expect(encodePathParts(null as any)).toBe(undefined);
            expect(encodePathParts(undefined as any)).toBe(undefined);
        });

        it('should handle paths with unicode characters', () => {
            const path = 'folder/测试文件/файл.txt';
            const result = encodePathParts(path);
            expect(result).toBe('folder/%E6%B5%8B%E8%AF%95%E6%96%87%E4%BB%B6/%D1%84%D0%B0%D0%B9%D0%BB.txt');
        });
    });
});
