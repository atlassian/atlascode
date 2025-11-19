import * as fs from 'fs';
import * as path from 'path';
import { Uri, window, workspace } from 'vscode';

import { addRecommendedExtensionTriggeredEvent } from '../analytics';
import { Container } from '../container';
import { Logger } from '../logger';
import { addAtlascodeAsRecommendedExtension } from './addRecommendedExtension';

jest.mock('fs');
jest.mock('path');
jest.mock('vscode');
jest.mock('../analytics');
jest.mock('../container');
jest.mock('../logger');

const mockFs = fs as jest.Mocked<typeof fs>;
const mockPath = path as jest.Mocked<typeof path>;
const mockWindow = window as jest.Mocked<typeof window>;
const mockWorkspace = workspace as jest.Mocked<typeof workspace>;
const mockAddRecommendedExtensionTriggeredEvent = addRecommendedExtensionTriggeredEvent as jest.MockedFunction<
    typeof addRecommendedExtensionTriggeredEvent
>;
const mockContainer = Container as jest.Mocked<typeof Container>;
const mockLogger = Logger as jest.Mocked<typeof Logger>;

describe('addAtlascodeAsRecommendedExtension', () => {
    const mockWorkspaceFolder = {
        uri: { fsPath: '/test/workspace' },
        name: 'test',
        index: 0,
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockPath.join.mockImplementation((...paths) => paths.join('/'));
        mockAddRecommendedExtensionTriggeredEvent.mockResolvedValue({} as any);
        Object.defineProperty(mockContainer, 'analyticsClient', {
            value: { sendTrackEvent: jest.fn() },
            writable: true,
            configurable: true,
        });
    });

    it('should show error when no workspace folder is open', async () => {
        Object.defineProperty(mockWorkspace, 'workspaceFolders', {
            value: undefined,
            writable: true,
            configurable: true,
        });

        await addAtlascodeAsRecommendedExtension();

        expect(mockWindow.showErrorMessage).toHaveBeenCalledWith(
            'No workspace folder is open. Please open a workspace or folder first.',
        );
    });

    it('should create .vscode directory if it does not exist', async () => {
        Object.defineProperty(mockWorkspace, 'workspaceFolders', {
            value: [mockWorkspaceFolder],
            writable: true,
            configurable: true,
        });
        mockFs.existsSync.mockReturnValueOnce(false).mockReturnValueOnce(false);
        mockFs.mkdirSync.mockImplementation();
        mockFs.writeFileSync.mockImplementation();
        mockWindow.showInformationMessage.mockResolvedValue(undefined);

        await addAtlascodeAsRecommendedExtension();

        expect(mockFs.mkdirSync).toHaveBeenCalledWith('/test/workspace/.vscode', { recursive: true });
        expect(mockLogger.info).toHaveBeenCalledWith('Created .vscode directory');
    });

    it('should create new extensions.json when file does not exist', async () => {
        Object.defineProperty(mockWorkspace, 'workspaceFolders', {
            value: [mockWorkspaceFolder],
            writable: true,
            configurable: true,
        });
        mockFs.existsSync.mockReturnValueOnce(true).mockReturnValueOnce(false);
        mockFs.writeFileSync.mockImplementation();
        mockWindow.showInformationMessage.mockResolvedValue(undefined);

        await addAtlascodeAsRecommendedExtension();

        const expectedConfig = {
            recommendations: ['atlassian.atlascode'],
        };
        expect(mockFs.writeFileSync).toHaveBeenCalledWith(
            '/test/workspace/.vscode/extensions.json',
            JSON.stringify(expectedConfig, null, 4),
            'utf8',
        );
    });

    it('should read existing extensions.json and add recommendation', async () => {
        const existingConfig = {
            recommendations: ['other.extension'],
        };
        Object.defineProperty(mockWorkspace, 'workspaceFolders', {
            value: [mockWorkspaceFolder],
            writable: true,
            configurable: true,
        });
        mockFs.existsSync.mockReturnValue(true);
        mockFs.readFileSync.mockReturnValue(JSON.stringify(existingConfig));
        mockFs.writeFileSync.mockImplementation();
        mockWindow.showInformationMessage.mockResolvedValue(undefined);

        await addAtlascodeAsRecommendedExtension();

        const expectedConfig = {
            recommendations: ['other.extension', 'atlassian.atlascode'],
        };
        expect(mockFs.writeFileSync).toHaveBeenCalledWith(
            '/test/workspace/.vscode/extensions.json',
            JSON.stringify(expectedConfig, null, 4),
            'utf8',
        );
    });

    it('should show info message when extension is already recommended', async () => {
        const existingConfig = {
            recommendations: ['atlassian.atlascode'],
        };
        Object.defineProperty(mockWorkspace, 'workspaceFolders', {
            value: [mockWorkspaceFolder],
            writable: true,
            configurable: true,
        });
        mockFs.existsSync.mockReturnValue(true);
        mockFs.readFileSync.mockReturnValue(JSON.stringify(existingConfig));

        await addAtlascodeAsRecommendedExtension();

        expect(mockWindow.showInformationMessage).toHaveBeenCalledWith(
            'Atlassian extension is already in the recommended extensions list.',
        );
        expect(mockFs.writeFileSync).not.toHaveBeenCalled();
    });

    it('should handle JSON parse error', async () => {
        Object.defineProperty(mockWorkspace, 'workspaceFolders', {
            value: [mockWorkspaceFolder],
            writable: true,
            configurable: true,
        });
        mockFs.existsSync.mockReturnValue(true);
        mockFs.readFileSync.mockReturnValue('invalid json');

        await addAtlascodeAsRecommendedExtension();

        expect(mockLogger.error).toHaveBeenCalled();
        expect(mockWindow.showErrorMessage).toHaveBeenCalledWith(
            'Failed to parse existing extensions.json file. Please check its syntax.',
        );
    });

    it('should handle file write error', async () => {
        Object.defineProperty(mockWorkspace, 'workspaceFolders', {
            value: [mockWorkspaceFolder],
            writable: true,
            configurable: true,
        });
        mockFs.existsSync.mockReturnValue(false);
        mockFs.writeFileSync.mockImplementation(() => {
            throw new Error('Write error');
        });

        await addAtlascodeAsRecommendedExtension();

        expect(mockLogger.error).toHaveBeenCalled();
        expect(mockWindow.showErrorMessage).toHaveBeenCalledWith(
            'Failed to write extensions.json file. Please check file permissions.',
        );
    });

    it('should open extensions.json file when user chooses Yes', async () => {
        const mockDoc = {};
        Object.defineProperty(mockWorkspace, 'workspaceFolders', {
            value: [mockWorkspaceFolder],
            writable: true,
            configurable: true,
        });
        mockFs.existsSync.mockReturnValue(false);
        mockFs.writeFileSync.mockImplementation();

        const openTextDocumentMock = jest.fn().mockResolvedValue(mockDoc);
        const showTextDocumentMock = jest.fn().mockResolvedValue({});

        Object.defineProperty(mockWorkspace, 'openTextDocument', {
            value: openTextDocumentMock,
            writable: true,
            configurable: true,
        });

        Object.defineProperty(mockWindow, 'showTextDocument', {
            value: showTextDocumentMock,
            writable: true,
            configurable: true,
        });

        mockWindow.showInformationMessage.mockResolvedValueOnce(undefined).mockResolvedValueOnce('Yes' as any);

        await addAtlascodeAsRecommendedExtension();

        expect(openTextDocumentMock).toHaveBeenCalledWith(Uri.file('/test/workspace/.vscode/extensions.json'));
        expect(showTextDocumentMock).toHaveBeenCalledWith(mockDoc);
    });

    it('should track analytics event', async () => {
        const mockEvent = { eventName: 'test' };
        mockAddRecommendedExtensionTriggeredEvent.mockResolvedValue(mockEvent as any);
        Object.defineProperty(mockWorkspace, 'workspaceFolders', {
            value: [mockWorkspaceFolder],
            writable: true,
            configurable: true,
        });
        mockFs.existsSync.mockReturnValue(false);
        mockFs.writeFileSync.mockImplementation();
        mockWindow.showInformationMessage.mockResolvedValue(undefined);

        await addAtlascodeAsRecommendedExtension('test-source');

        expect(mockAddRecommendedExtensionTriggeredEvent).toHaveBeenCalledWith('test-source');
        expect(mockContainer.analyticsClient.sendTrackEvent).toHaveBeenCalledWith(mockEvent);
    });

    it('should handle general errors', async () => {
        Object.defineProperty(mockWorkspace, 'workspaceFolders', {
            value: [mockWorkspaceFolder],
            writable: true,
            configurable: true,
        });
        mockPath.join.mockImplementation(() => {
            throw new Error('Path error');
        });

        await addAtlascodeAsRecommendedExtension();

        expect(mockLogger.error).toHaveBeenCalled();
        expect(mockWindow.showErrorMessage).toHaveBeenCalledWith(
            'Failed to add recommended extension. Please see the output channel for details.',
        );
    });

    it('should not open file when user chooses No', async () => {
        Object.defineProperty(mockWorkspace, 'workspaceFolders', {
            value: [mockWorkspaceFolder],
            writable: true,
            configurable: true,
        });
        mockFs.existsSync.mockReturnValue(false);
        mockFs.writeFileSync.mockImplementation();

        const openTextDocumentMock = jest.fn();
        Object.defineProperty(mockWorkspace, 'openTextDocument', {
            value: openTextDocumentMock,
            writable: true,
            configurable: true,
        });

        mockWindow.showInformationMessage.mockResolvedValueOnce(undefined).mockResolvedValueOnce('No' as any);

        await addAtlascodeAsRecommendedExtension();

        expect(openTextDocumentMock).not.toHaveBeenCalled();
    });

    it('should handle empty recommendations array', async () => {
        const existingConfig = {
            recommendations: [],
        };
        Object.defineProperty(mockWorkspace, 'workspaceFolders', {
            value: [mockWorkspaceFolder],
            writable: true,
            configurable: true,
        });
        mockFs.existsSync.mockReturnValue(true);
        mockFs.readFileSync.mockReturnValue(JSON.stringify(existingConfig));
        mockFs.writeFileSync.mockImplementation();
        mockWindow.showInformationMessage.mockResolvedValue(undefined);

        await addAtlascodeAsRecommendedExtension();

        const expectedConfig = {
            recommendations: ['atlassian.atlascode'],
        };
        expect(mockFs.writeFileSync).toHaveBeenCalledWith(
            '/test/workspace/.vscode/extensions.json',
            JSON.stringify(expectedConfig, null, 4),
            'utf8',
        );
    });

    it('should handle extensions.json with other properties', async () => {
        const existingConfig = {
            recommendations: ['other.extension'],
            unwantedRecommendations: ['unwanted.extension'],
        };
        Object.defineProperty(mockWorkspace, 'workspaceFolders', {
            value: [mockWorkspaceFolder],
            writable: true,
            configurable: true,
        });
        mockFs.existsSync.mockReturnValue(true);
        mockFs.readFileSync.mockReturnValue(JSON.stringify(existingConfig));
        mockFs.writeFileSync.mockImplementation();
        mockWindow.showInformationMessage.mockResolvedValue(undefined);

        await addAtlascodeAsRecommendedExtension();

        const expectedConfig = {
            recommendations: ['other.extension', 'atlassian.atlascode'],
            unwantedRecommendations: ['unwanted.extension'],
        };
        expect(mockFs.writeFileSync).toHaveBeenCalledWith(
            '/test/workspace/.vscode/extensions.json',
            JSON.stringify(expectedConfig, null, 4),
            'utf8',
        );
    });

    it('should handle mkdir error gracefully', async () => {
        Object.defineProperty(mockWorkspace, 'workspaceFolders', {
            value: [mockWorkspaceFolder],
            writable: true,
            configurable: true,
        });
        mockFs.existsSync.mockReturnValue(false);
        mockFs.mkdirSync.mockImplementation(() => {
            throw new Error('Permission denied');
        });

        await addAtlascodeAsRecommendedExtension();

        expect(mockLogger.error).toHaveBeenCalled();
        expect(mockWindow.showErrorMessage).toHaveBeenCalledWith(
            'Failed to add recommended extension. Please see the output channel for details.',
        );
    });

    it('should handle file read error', async () => {
        Object.defineProperty(mockWorkspace, 'workspaceFolders', {
            value: [mockWorkspaceFolder],
            writable: true,
            configurable: true,
        });
        mockFs.existsSync.mockReturnValue(true);
        mockFs.readFileSync.mockImplementation(() => {
            throw new Error('Read error');
        });

        await addAtlascodeAsRecommendedExtension();

        expect(mockLogger.error).toHaveBeenCalled();
        expect(mockWindow.showErrorMessage).toHaveBeenCalledWith(
            'Failed to parse existing extensions.json file. Please check its syntax.',
        );
    });

    it('should use default source when not provided', async () => {
        const mockEvent = { eventName: 'test' };
        mockAddRecommendedExtensionTriggeredEvent.mockResolvedValue(mockEvent as any);
        Object.defineProperty(mockWorkspace, 'workspaceFolders', {
            value: [mockWorkspaceFolder],
            writable: true,
            configurable: true,
        });
        mockFs.existsSync.mockReturnValue(false);
        mockFs.writeFileSync.mockImplementation();
        mockWindow.showInformationMessage.mockResolvedValue(undefined);

        await addAtlascodeAsRecommendedExtension();

        expect(mockAddRecommendedExtensionTriggeredEvent).toHaveBeenCalledWith('commandPalette');
    });

    it('should handle extension already in middle of recommendations list', async () => {
        const existingConfig = {
            recommendations: ['first.extension', 'atlassian.atlascode', 'last.extension'],
        };
        Object.defineProperty(mockWorkspace, 'workspaceFolders', {
            value: [mockWorkspaceFolder],
            writable: true,
            configurable: true,
        });
        mockFs.existsSync.mockReturnValue(true);
        mockFs.readFileSync.mockReturnValue(JSON.stringify(existingConfig));

        await addAtlascodeAsRecommendedExtension();

        expect(mockWindow.showInformationMessage).toHaveBeenCalledWith(
            'Atlassian extension is already in the recommended extensions list.',
        );
        expect(mockFs.writeFileSync).not.toHaveBeenCalled();
    });
});
