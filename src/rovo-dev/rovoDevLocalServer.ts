import express, { Request, Response } from 'express';
import * as http from 'http';
import { Logger } from 'src/logger';
import { Disposable } from 'vscode';

import { RovoDevTelemetryProvider } from './rovoDevTelemetryProvider';

export const ROVODEV_LOCAL_SERVER_PORT = process.env.ROVODEV_LOCAL_SERVER_PORT
    ? parseInt(process.env.ROVODEV_LOCAL_SERVER_PORT, 10)
    : 9999;

/**
 * A local HTTP server that allows external services (e.g. DevAI Sandbox) to send prompts
 * to the Rovo Dev chat UI via AtlasCode.
 */
export class RovoDevLocalServer implements Disposable {
    private _server: http.Server | undefined;

    constructor(
        private readonly _invokeRovoDevAsk: (prompt: string) => Promise<boolean>,
        private readonly _isAgentRunning: () => boolean,
        private readonly _telemetryProvider: RovoDevTelemetryProvider,
    ) {}

    public start(): void {
        const app = express();
        app.use(express.json());

        app.get('/rovodev/health', (_req: Request, res: Response) => {
            res.status(200).json({ status: 'ok', agentBusy: this._isAgentRunning() });
        });

        app.post('/rovodev/chat', async (req: Request, res: Response) => {
            const message: string | undefined = req.body?.message;

            if (!message || typeof message !== 'string' || message.trim() === '') {
                this._sendAnalytics('invalid_request');
                res.status(400).json({ success: false, error: 'message is required' });
                return;
            }

            Logger.debug(`RovoDevLocalServer: received prompt via /rovodev/chat`);

            // Check if the agent is already running before attempting to send the prompt.
            // This prevents a second request from corrupting the chat UI with a 409 error.
            if (this._isAgentRunning()) {
                this._sendAnalytics('agent_busy');
                res.status(409).json({ success: false, error: 'agent_busy' });
                return;
            }

            try {
                // Await until the chat has been triggered (webview ready, auth checked, prompt dispatched),
                // but not until the full agent response completes — streaming is fire-and-forget.
                const triggered = await this._invokeRovoDevAsk(message.trim());
                if (triggered) {
                    this._sendAnalytics('triggered');
                    res.status(202).json({ success: true });
                } else {
                    this._sendAnalytics('provider_not_ready');
                    res.status(503).json({ success: false, error: 'provider_not_ready' });
                }
            } catch (err: unknown) {
                this._telemetryProvider.logError(
                    err instanceof Error ? err : new Error('RovoDevLocalServer: unexpected throw', { cause: err }),
                    'RovoDevLocalServer: error invoking RovoDev ask',
                );
                this._sendAnalytics('error');
                res.status(500).json({ success: false, error: 'internal_error' });
            }
        });

        this._server = http.createServer(app);
        this._server.listen(ROVODEV_LOCAL_SERVER_PORT, '127.0.0.1', () => {
            Logger.debug(`RovoDevLocalServer: listening on http://127.0.0.1:${ROVODEV_LOCAL_SERVER_PORT}`);
        });

        this._server.on('error', (err: NodeJS.ErrnoException) => {
            if (err.code === 'EADDRINUSE') {
                Logger.debug(
                    `RovoDevLocalServer: port ${ROVODEV_LOCAL_SERVER_PORT} already in use, skipping server start.`,
                );
            } else {
                Logger.debug(`RovoDevLocalServer: server error: ${err.message}`);
            }
        });
    }

    private _sendAnalytics(
        result: 'triggered' | 'agent_busy' | 'provider_not_ready' | 'error' | 'invalid_request',
    ): void {
        void this._telemetryProvider.fireTelemetryEvent({
            action: 'rovoDevLocalServerPromptReceived',
            subject: 'atlascode',
            attributes: { result },
        });
    }

    public dispose(): void {
        if (this._server) {
            this._server.close(() => {
                Logger.debug('RovoDevLocalServer: server stopped.');
            });
            this._server = undefined;
        }
    }
}
