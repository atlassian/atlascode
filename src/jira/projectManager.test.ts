import { emptyProject, Project } from '@atlassianlabs/jira-pi-common-models';
import { expansionCastTo } from 'testsutil';

import { DetailedSiteInfo } from '../atlclients/authInfo';
import { Container } from '../container';
import { Logger } from '../logger';
import { JiraProjectManager } from './projectManager';

// Mock dependencies
jest.mock('../container');
jest.mock('../logger');

describe('JiraProjectManager', () => {
    // Mock data
    const mockSiteDetails = expansionCastTo<DetailedSiteInfo>({
        id: 'site-1',
        name: 'Test Site',
    });

    const mockProject1 = expansionCastTo<Project>({
        id: 'project-1',
        key: 'PROJ1',
        name: 'Project One',
        simplified: false,
    });

    const mockProject2 = expansionCastTo<Project>({
        id: 'project-2',
        key: 'PROJ2',
        name: 'Project Two',
        simplified: false,
    });

    const mockProjects: Project[] = [mockProject1, mockProject2];

    const mockJiraClient = {
        getProject: jest.fn(),
        getProjects: jest.fn(),
    };

    let projectManager: JiraProjectManager;

    // Setup before each test
    beforeEach(() => {
        jest.clearAllMocks();

        // Setup Container mock
        (Container.clientManager as any) = {
            jiraClient: jest.fn().mockResolvedValue(mockJiraClient),
        };

        projectManager = new JiraProjectManager();
    });

    describe('getProjectForKey', () => {
        it('should return undefined for empty project key', async () => {
            const result = await projectManager.getProjectForKey(mockSiteDetails, '');
            expect(result).toBeUndefined();
        });

        it('should return project for valid project key', async () => {
            mockJiraClient.getProject.mockResolvedValueOnce(mockProject1);

            const result = await projectManager.getProjectForKey(mockSiteDetails, 'PROJ1');

            expect(Container.clientManager.jiraClient).toHaveBeenCalledWith(mockSiteDetails);
            expect(mockJiraClient.getProject).toHaveBeenCalledWith('PROJ1');
            expect(result).toEqual(mockProject1);
        });

        it('should return undefined when an error occurs', async () => {
            mockJiraClient.getProject.mockRejectedValueOnce(new Error('Test error'));

            const result = await projectManager.getProjectForKey(mockSiteDetails, 'PROJ1');

            expect(Container.clientManager.jiraClient).toHaveBeenCalledWith(mockSiteDetails);
            expect(mockJiraClient.getProject).toHaveBeenCalledWith('PROJ1');
            expect(result).toBeUndefined();
        });
    });

    describe('getFirstProject', () => {
        it('should return first project when projects exist', async () => {
            mockJiraClient.getProjects.mockResolvedValueOnce(mockProjects);

            const result = await projectManager.getFirstProject(mockSiteDetails);

            expect(Container.clientManager.jiraClient).toHaveBeenCalledWith(mockSiteDetails);
            expect(mockJiraClient.getProjects).toHaveBeenCalledWith(undefined, 'key');
            expect(result).toEqual(mockProject1);
        });

        it('should return empty project when no projects exist', async () => {
            mockJiraClient.getProjects.mockResolvedValueOnce([]);

            const result = await projectManager.getFirstProject(mockSiteDetails);

            expect(Container.clientManager.jiraClient).toHaveBeenCalledWith(mockSiteDetails);
            expect(mockJiraClient.getProjects).toHaveBeenCalledWith(undefined, 'key');
            expect(result).toEqual(emptyProject);
        });

        it('should return empty project when an error occurs', async () => {
            mockJiraClient.getProjects.mockRejectedValueOnce(new Error('Test error'));

            const result = await projectManager.getFirstProject(mockSiteDetails);

            expect(Container.clientManager.jiraClient).toHaveBeenCalledWith(mockSiteDetails);
            expect(result).toEqual(emptyProject);
        });
    });

    describe('getProjects', () => {
        it('should return projects with default ordering', async () => {
            mockJiraClient.getProjects.mockResolvedValueOnce(mockProjects);

            const result = await projectManager.getProjects(mockSiteDetails);

            expect(Container.clientManager.jiraClient).toHaveBeenCalledWith(mockSiteDetails);
            expect(mockJiraClient.getProjects).toHaveBeenCalledWith(undefined, 'key');
            expect(result).toEqual(mockProjects);
        });

        it('should return projects with custom ordering', async () => {
            mockJiraClient.getProjects.mockResolvedValueOnce(mockProjects);

            const result = await projectManager.getProjects(mockSiteDetails, 'name');

            expect(Container.clientManager.jiraClient).toHaveBeenCalledWith(mockSiteDetails);
            expect(mockJiraClient.getProjects).toHaveBeenCalledWith(undefined, 'name');
            expect(result).toEqual(mockProjects);
        });

        it('should return projects with search query', async () => {
            mockJiraClient.getProjects.mockResolvedValueOnce([mockProject1]);

            const result = await projectManager.getProjects(mockSiteDetails, 'key', 'PROJ1');

            expect(Container.clientManager.jiraClient).toHaveBeenCalledWith(mockSiteDetails);
            expect(mockJiraClient.getProjects).toHaveBeenCalledWith('PROJ1', 'key');
            expect(result).toEqual([mockProject1]);
        });

        it('should return empty array and log error when an error occurs', async () => {
            const testError = new Error('Test error');
            mockJiraClient.getProjects.mockRejectedValueOnce(testError);

            const result = await projectManager.getProjects(mockSiteDetails);

            expect(Container.clientManager.jiraClient).toHaveBeenCalledWith(mockSiteDetails);
            expect(result).toEqual([]);
            expect(Logger.debug).toHaveBeenCalledWith(`Failed to fetch projects ${testError}`);
        });
    });
});
