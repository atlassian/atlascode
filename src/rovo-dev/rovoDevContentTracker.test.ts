import { promises as fs } from 'fs';
import { Stats } from 'fs';

import { RovoDevApiClient } from './rovoDevApiClient';
import { RovoDevContentTracker } from './rovoDevContentTracker';

jest.mock('fs', () => ({
    promises: {
        readFile: jest.fn(),
        stat: jest.fn(),
    },
}));

jest.mock('vscode', () => ({
    workspace: {
        workspaceFolders: [
            {
                uri: {
                    fsPath: '/test/workspace',
                },
            },
        ],
    },
}));

const mockFs = fs as jest.Mocked<typeof fs>;

// Helper to create mock file stats
const createMockStats = (mtimeMs: number): Partial<Stats> => ({
    mtimeMs,
});

describe('RovoDevContentTracker', () => {
    let mockApiClient: jest.Mocked<Pick<RovoDevApiClient, 'getCacheFilePath'>>;
    let contentTracker: RovoDevContentTracker;

    beforeEach(() => {
        jest.clearAllMocks();

        mockApiClient = {
            getCacheFilePath: jest.fn(),
        };

        contentTracker = new RovoDevContentTracker(mockApiClient as unknown as RovoDevApiClient);
    });

    describe('hasContentChanges', () => {
        it('should return true when file content differs from cached version', async () => {
            const filePath = 'test.txt';
            const cachedPath = '/cache/test.txt';

            mockApiClient.getCacheFilePath.mockResolvedValue(cachedPath);
            mockFs.readFile
                .mockResolvedValueOnce(Buffer.from('current content')) // current file
                .mockResolvedValueOnce(Buffer.from('original content')); // cached file
            mockFs.stat
                .mockResolvedValueOnce(createMockStats(Date.now()) as Stats) // current file stats
                .mockResolvedValueOnce(createMockStats(Date.now()) as Stats); // cached file stats

            const result = await contentTracker.hasContentChanges(filePath);

            expect(result).toBe(true);
            expect(mockApiClient.getCacheFilePath).toHaveBeenCalledWith(filePath);
            expect(mockFs.readFile).toHaveBeenCalledWith('/test/workspace/test.txt');
            expect(mockFs.readFile).toHaveBeenCalledWith(cachedPath);
        });

        it('should return false when file content is same as cached version', async () => {
            const filePath = 'test.txt';
            const cachedPath = '/cache/test.txt';

            mockApiClient.getCacheFilePath.mockResolvedValue(cachedPath);
            mockFs.readFile
                .mockResolvedValueOnce(Buffer.from('same content')) // current file
                .mockResolvedValueOnce(Buffer.from('same content')); // cached file
            mockFs.stat
                .mockResolvedValueOnce(createMockStats(Date.now()) as Stats) // current file stats
                .mockResolvedValueOnce(createMockStats(Date.now()) as Stats); // cached file stats

            const result = await contentTracker.hasContentChanges(filePath);

            expect(result).toBe(false);
        });

        it('should return true when no cached version exists', async () => {
            const filePath = 'test.txt';

            mockApiClient.getCacheFilePath.mockRejectedValue(new Error('No cached version'));

            const result = await contentTracker.hasContentChanges(filePath);

            expect(result).toBe(true);
        });

        it('should return true when no API client is available', async () => {
            const contentTrackerWithoutApi = new RovoDevContentTracker(undefined);

            const result = await contentTrackerWithoutApi.hasContentChanges('test.txt');

            expect(result).toBe(true);
        });

        it('should work with binary files (images, etc.)', async () => {
            const filePath = 'image.png';
            const cachedPath = '/cache/image.png';

            // Create mock binary data (simulating different image files)
            const currentImageData = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x01]); // PNG header + data
            const cachedImageData = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x02]); // PNG header + different data

            mockApiClient.getCacheFilePath.mockResolvedValue(cachedPath);
            mockFs.readFile
                .mockResolvedValueOnce(currentImageData) // current image
                .mockResolvedValueOnce(cachedImageData); // cached image
            mockFs.stat
                .mockResolvedValueOnce(createMockStats(Date.now()) as Stats)
                .mockResolvedValueOnce(createMockStats(Date.now()) as Stats);

            const result = await contentTracker.hasContentChanges(filePath);

            expect(result).toBe(true); // Different binary content should be detected
            expect(mockFs.readFile).toHaveBeenCalledWith('/test/workspace/image.png'); // No UTF-8 encoding
            expect(mockFs.readFile).toHaveBeenCalledWith(cachedPath);
        });
    });

    describe('filterFilesWithChanges', () => {
        it('should filter files to only include those with changes', async () => {
            const filePaths = ['file1.txt', 'file2.txt', 'file3.txt'];

            // Mock hasContentChanges to return different results
            jest.spyOn(contentTracker, 'hasContentChanges')
                .mockResolvedValueOnce(true) // file1.txt has changes
                .mockResolvedValueOnce(false) // file2.txt no changes
                .mockResolvedValueOnce(true); // file3.txt has changes

            const result = await contentTracker.filterFilesWithChanges(filePaths);

            expect(result).toEqual(['file1.txt', 'file3.txt']);
        });

        it('should handle errors gracefully and exclude failed files', async () => {
            const filePaths = ['file1.txt', 'file2.txt'];

            jest.spyOn(contentTracker, 'hasContentChanges')
                .mockResolvedValueOnce(true) // file1.txt has changes
                .mockRejectedValueOnce(new Error('Failed to check')); // file2.txt fails

            const result = await contentTracker.filterFilesWithChanges(filePaths);

            expect(result).toEqual(['file1.txt']);
        });
    });

    describe('wasModifiedByRovoDev', () => {
        it('should return true when file has cached version', async () => {
            const filePath = 'test.txt';

            mockApiClient.getCacheFilePath.mockResolvedValue('/cache/test.txt');

            const result = await contentTracker.wasModifiedByRovoDev(filePath);

            expect(result).toBe(true);
        });

        it('should return false when file has no cached version', async () => {
            const filePath = 'test.txt';

            mockApiClient.getCacheFilePath.mockRejectedValue(new Error('No cached version'));

            const result = await contentTracker.wasModifiedByRovoDev(filePath);

            expect(result).toBe(false);
        });

        it('should return false when no API client is available', async () => {
            const contentTrackerWithoutApi = new RovoDevContentTracker(undefined);

            const result = await contentTrackerWithoutApi.wasModifiedByRovoDev('test.txt');

            expect(result).toBe(false);
        });
    });

    describe('dispose', () => {
        it('should clear the memory cache when disposed', async () => {
            const filePath = 'test.txt';

            // First, populate the cache by reading a file
            mockApiClient.getCacheFilePath.mockResolvedValue('/cache/test.txt');
            mockFs.readFile
                .mockResolvedValueOnce(Buffer.from('current content'))
                .mockResolvedValueOnce(Buffer.from('cached content'));
            mockFs.stat
                .mockResolvedValueOnce(createMockStats(Date.now()) as Stats)
                .mockResolvedValueOnce(createMockStats(Date.now()) as Stats);

            await contentTracker.hasContentChanges(filePath);

            // Verify cache has content
            let stats = contentTracker.getCacheStats();
            expect(stats.size).toBeGreaterThan(0);

            // Dispose and verify cache is cleared
            contentTracker.dispose();
            stats = contentTracker.getCacheStats();
            expect(stats.size).toBe(0);
        });

        it('should not throw error when disposing empty cache', () => {
            expect(() => {
                contentTracker.dispose();
            }).not.toThrow();
        });
    });
});
