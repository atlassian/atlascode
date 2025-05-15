import * as http from 'http';
import { Disposable } from 'vscode';
import { server } from 'websocket';

export class UIWebsocket implements Disposable {
    private _port: number;
    private _srv: http.Server | undefined;
    private _ws: server | undefined;
    private _clients: any[] = [];

    constructor(port: number) {
        this._port = port;
    }

    public start(messageHandler: (e: any) => any): void {
        const port = this._port;
        const clients = this._clients;
        this._srv = http.createServer(function (request, response) {
            // process HTTP request. Since we're writing just WebSockets
            // server we don't have to implement anything.
        });
        this._srv.listen(this._port, function () {
            console.log(new Date() + ` UI Websocket listening on port ${port}`);
        });

        this._ws = new server({ httpServer: this._srv });

        this._ws.on('request', function (request) {
            console.log(new Date() + ` Connection from origin ${request.origin}.`);
            const connection = request.accept(undefined, request.origin);
            // we need to know client index to remove them on 'close' event
            const index = clients.push(connection) - 1;
            console.log(new Date() + ' Connection accepted.');

            // user sent some message
            connection.on('message', (message) => {
                console.log(new Date() + ` got message ${message}.`);
                if (message.type === 'utf8' && message.utf8Data) {
                    try {
                        const json = JSON.parse(message.utf8Data);
                        messageHandler(json);
                    } catch (e) {
                        console.log('error parsing message', e);
                    }
                }
            });

            connection.on('close', (code: number, desc: string) => {
                console.log(new Date() + ` Peer ${connection.remoteAddress} disconnected.`);
                // remove user from the list of connected clients
                clients.splice(index, 1);
            });
        });
    }

    public send(message: any) {
        const json = JSON.stringify({ type: 'message', data: message });
        this._clients.forEach((client) => {
            client.sendUTF(json);
        });
    }

    public dispose() {
        try {
            if (this._ws) {
                console.log(new Date() + ` shutting down websocket`);
                this._ws.shutDown();
            }

            if (this._srv) {
                console.log(new Date() + ` shutting down websocket http`);
                this._srv.close();
            }
        } catch {
            //ignore
        }
    }
}
