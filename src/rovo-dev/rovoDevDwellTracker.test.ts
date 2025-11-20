import { expansionCastTo } from 'testsutil';
import * as vscode from 'vscode';

import { RovoDevDwellTracker } from './rovoDevDwellTracker';

jest.useFakeTimers();

describe('RovoDevDwellTracker', () => {
    let mockTelemetry: any;
    const fireTelemetryEvent = jest.fn();

    const mockApiClient: any = {
        getCacheFilePath: jest.fn(),
    };

    const getCurrentPromptId = () => 'prompt-123';

    const makeEditor = (path: string) => ({
        document: {
            uri: { fsPath: path, toString: () => `file://${path}`, scheme: 'file' },
            isUntitled: false,
        },
    });

    beforeEach(() => {
        jest.clearAllMocks();
        expansionCastTo<any>(vscode.window).activeTextEditor = undefined;

        mockTelemetry = {
            fireTelemetryEvent,
        };
    });

    it('fires telemetry after dwell when file has a Rovo Dev cache', async () => {
        mockApiClient.getCacheFilePath.mockResolvedValue('/tmp/cache.txt');
        expansionCastTo<any>(vscode.window).activeTextEditor = makeEditor('/workspace/fileA.ts');

        const tracker = new RovoDevDwellTracker(mockTelemetry, getCurrentPromptId, mockApiClient, 1000);

        await jest.advanceTimersByTimeAsync(1100);

        expect(fireTelemetryEvent).toHaveBeenCalledWith({
            action: 'viewed',
            subject: 'aiResult',
            attributes: {
                promptId: 'prompt-123',
                dwellMs: 1000,
                xid: 'rovodev-sessions',
                singleInstrumentationID: 'prompt-123',
                aiFeatureName: 'rovodevSessions',
                proactiveGeneratedAI: 0,
                userGeneratedAI: 1,
                isAIFeature: 1,
            },
        });

        tracker.dispose();
    });

    it('does not fire telemetry if cache lookup fails', async () => {
        mockApiClient.getCacheFilePath.mockRejectedValue(new Error('no cache'));
        expansionCastTo<any>(vscode.window).activeTextEditor = makeEditor('/workspace/fileB.ts');

        const tracker = new RovoDevDwellTracker(mockTelemetry, getCurrentPromptId, mockApiClient, 1000);

        await jest.advanceTimersByTimeAsync(1100);

        expect(fireTelemetryEvent).not.toHaveBeenCalled();

        tracker.dispose();
    });

    it('does not fire telemetry when no active promptId', async () => {
        mockApiClient.getCacheFilePath.mockResolvedValue('/tmp/cache.txt');
        expansionCastTo<any>(vscode.window).activeTextEditor = makeEditor('/workspace/fileC.ts');

        const tracker = new RovoDevDwellTracker(mockTelemetry, () => '', mockApiClient, 1000);

        await jest.advanceTimersByTimeAsync(1100);

        expect(fireTelemetryEvent).not.toHaveBeenCalled();

        tracker.dispose();
    });
});
