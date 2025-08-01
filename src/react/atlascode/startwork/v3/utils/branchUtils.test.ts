import { getAllBranches, getDefaultSourceBranch } from './branchUtils';

describe('branchUtils', () => {
    const mockRepoData = {
        localBranches: [
            { name: 'main', type: 0 },
            { name: 'develop', type: 0 },
            { name: 'feature/test', type: 0 },
        ],
        remoteBranches: [
            { name: 'origin/main', type: 1, remote: 'origin' },
            { name: 'origin/develop', type: 1, remote: 'origin' },
        ],
        developmentBranch: 'develop',
    } as any;

    describe('getAllBranches', () => {
        it('should return empty array when no repoData', () => {
            const result = getAllBranches(undefined);
            expect(result).toEqual([]);
        });

        it('should return all branches when repoData exists', () => {
            const result = getAllBranches(mockRepoData);
            expect(result).toHaveLength(5);
            expect(result.map((b) => b.name)).toEqual([
                'main',
                'develop',
                'feature/test',
                'origin/main',
                'origin/develop',
            ]);
        });
    });

    describe('getDefaultSourceBranch', () => {
        it('should return empty string when no repoData', () => {
            const result = getDefaultSourceBranch(undefined);
            expect(result).toBe('');
        });

        it('should return development branch when available', () => {
            const result = getDefaultSourceBranch(mockRepoData);
            expect(result).toBe('develop');
        });

        it('should return first local branch when no development branch', () => {
            const repoDataWithoutDev = {
                ...mockRepoData,
                developmentBranch: undefined,
            };
            const result = getDefaultSourceBranch(repoDataWithoutDev);
            expect(result).toBe('main');
        });

        it('should return first local branch when development branch not found', () => {
            const repoDataWithNonExistentDev = {
                ...mockRepoData,
                developmentBranch: 'non-existent',
            };
            const result = getDefaultSourceBranch(repoDataWithNonExistentDev);
            expect(result).toBe('main');
        });

        it('should return empty string when no local branches', () => {
            const repoDataWithoutLocalBranches = {
                ...mockRepoData,
                localBranches: [],
            };
            const result = getDefaultSourceBranch(repoDataWithoutLocalBranches);
            expect(result).toBe('');
        });
    });
});
