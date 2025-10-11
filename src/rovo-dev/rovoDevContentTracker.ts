import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import { workspace } from 'vscode';

import { RovoDevApiClient } from './rovoDevApiClient';

// Tracks file content changes to determine if files have actually been modified by Rovo Dev
// This helps avoid showing files as modified when changes have been reverted

export class RovoDevContentTracker {
    private readonly contentCache = new Map<string, { hash: string; mtime: number }>();
    private readonly cacheExpiryMs = 30000;

    constructor(private readonly rovoDevApiClient: RovoDevApiClient | undefined) {}

    // Calculates SHA-256 hash of a file's content. Works with any file type - text, binary, images, etc.
    private async calculateFileHash(filePath: string): Promise<string> {
        try {
            const buffer = await fs.readFile(filePath);
            return createHash('sha256').update(buffer).digest('hex');
        } catch {
            // If file doesn't exist or can't be read, return empty hash
            return '';
        }
    }

    // Checks if a file has content changes compared to its cached version
    public async hasContentChanges(filePath: string): Promise<boolean> {
        if (!this.rovoDevApiClient) {
            // If no API client, assume file is modified (fallback to original behavior)
            return true;
        }
        try {
            const cachedFilePath = await this.rovoDevApiClient.getCacheFilePath(filePath);
            const [currentHash, cachedHash] = await Promise.all([
                this.getFileHash(filePath),
                this.getFileHash(cachedFilePath, true),
            ]);
            return currentHash !== cachedHash;
        } catch {
            return true;
        }
    }

    public async filterFilesWithChanges(filePaths: string[]): Promise<string[]> {
        const results = await Promise.allSettled(
            filePaths.map(async (filePath) => ({
                filePath,
                hasChanges: await this.hasContentChanges(filePath),
            })),
        );

        return results
            .filter(
                (result): result is PromiseFulfilledResult<{ filePath: string; hasChanges: boolean }> =>
                    result.status === 'fulfilled' && result.value.hasChanges,
            )
            .map((result) => result.value.filePath);
    }

    public async wasModifiedByRovoDev(filePath: string): Promise<boolean> {
        if (!this.rovoDevApiClient) {
            return false;
        }
        try {
            await this.rovoDevApiClient.getCacheFilePath(filePath);
            return true;
        } catch {
            return false;
        }
    }

    // Gets the hash of a file, caching results to avoid unnecessary re-calculations
    private async getFileHash(filePath: string, isPathAbsolute: boolean = false): Promise<string> {
        const fullPath = this.resolveFullPath(filePath, isPathAbsolute);
        const cacheKey = fullPath;

        try {
            // Check if we have a fresh memory of this file's hash
            const cached = this.contentCache.get(cacheKey);
            if (cached && this.isCacheStillFresh(cached.mtime)) {
                const stats = await fs.stat(fullPath);
                // If file hasn't been modified since we cached it, use our memory
                if (stats.mtimeMs === cached.mtime) {
                    return cached.hash;
                }
            }
            // Calculate fresh hash and remember it
            const hash = await this.calculateFileHash(fullPath);
            const stats = await fs.stat(fullPath);

            this.contentCache.set(cacheKey, {
                hash,
                mtime: stats.mtimeMs,
            });

            return hash;
        } catch {
            return '';
        }
    }

    // Resolves the full path for a file, handling both absolute and relative paths
    private resolveFullPath(filePath: string, isPathAbsolute: boolean): string {
        if (isPathAbsolute) {
            return filePath;
        }

        const workspaceFolders = workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            throw new Error('No workspace folder found');
        }
        return `${workspaceFolders[0].uri.fsPath}/${filePath}`;
    }

    private isCacheStillFresh(cachedTime: number): boolean {
        return Date.now() - cachedTime < this.cacheExpiryMs;
    }

    // Creates a snapshot of the current file content hash
    public async createContentSnapshot(filePath: string): Promise<string> {
        return this.getFileHash(filePath);
    }

    // Compares current file content with a previously created snapshot
    public async hasContentChangedSinceSnapshot(filePath: string, snapshot: string): Promise<boolean> {
        try {
            const currentHash = await this.getFileHash(filePath);
            return currentHash !== snapshot;
        } catch {
            // If we can't read the file, assume it has changed
            return true;
        }
    }

    // Clears the cache
    public clearMemory(): void {
        this.contentCache.clear();
    }

    public getCacheStats(): { size: number; hitRate?: number } {
        return {
            size: this.contentCache.size,
        };
    }

    // Disposes of the content tracker
    public dispose(): void {
        this.contentCache.clear();
    }
}
