import express, { Request, Response } from 'express';
import * as http from 'http';
import { Logger } from 'src/logger';
import { Disposable } from 'vscode';

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
        private readonly _invokeRovoDevAsk: (prompt: string) => Promise<void>,
        private readonly _isAgentRunning: () => boolean,
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
                res.status(400).json({ success: false, error: 'message is required' });
                return;
            }

            Logger.debug(`RovoDevLocalServer: received prompt via /rovodev/chat`);

            // Check if the agent is already running before attempting to send the prompt.
            // This prevents a second request from corrupting the chat UI with a 409 error.
            if (this._isAgentRunning()) {
                res.status(409).json({ success: false, error: 'agent_busy' });
                return;
            }

            try {
                await this._invokeRovoDevAsk(message.trim());
                res.status(202).json({ success: true });
            } catch (err: any) {
                Logger.debug(`RovoDevLocalServer: error invoking RovoDev ask: ${err}`);
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

    public dispose(): void {
        if (this._server) {
            this._server.close(() => {
                Logger.debug('RovoDevLocalServer: server stopped.');
            });
            this._server = undefined;
        }
    }
}
