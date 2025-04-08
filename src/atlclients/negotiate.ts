import { IPC } from 'node-ipc';
import { pid, uptime } from 'process';
import { Memento } from 'vscode';

import { Logger } from '../logger';
import { DetailedSiteInfo } from './authInfo';

const RESPONSIBLE_PID_KEY = 'rulingPid';
const PING_MESSAGE = `atlascode-ping`;
const ACK_MESSAGE = `atlascode-ack`;
const MAX_ROUNDS = 3;
const TIMEOUT = 5000;
const READ_DELAY = 5000;
const LAUNCH_DELAY_SECONDS = 20;

/*
    To avoid race conditions we need to ensure that only one workspace is responsible for refreshing tokens. When a workspace is opened
    it writes its process ID to the global state. When it comes time to refresh tokens all processes will send a message to the refreshing
    process via IPC to make sure it's still active. If it is no further action is taken (that process is resposnible for refreshing tokens).
    If it doesn't respond all processes will try and write their PID to the global configuration and another round of messages will 
    be sent to ensure that the responsible process is responding.
*/

export function startListening(requestSite: (site: DetailedSiteInfo) => void) {
    const ipc = new IPC();

    ipc.config.id = `atlascode-${pid}`;
    ipc.config.retry = 1500;
    ipc.config.silent = true;
    ipc.serve(() => {
        ipc.server.on(PING_MESSAGE, (message: any, socket: any) => {
            const tag = Math.floor(Math.random() * 1000);

            const site: DetailedSiteInfo = JSON.parse(message);
            Logger.debug(`${tag}: Received ping for site ${site.baseApiUrl}`);
            try {
                requestSite(site);
            } catch (e) {
                Logger.debug(e.stack);
                Logger.error(e, `${tag} something failed while trying to update`);
            }
            Logger.debug(`${tag}: done requesting site`);
            ipc.server.emit(socket, ACK_MESSAGE);
            Logger.debug(`${tag}: done responding`);
        });
    });
    ipc.server.start();

    Logger.debug(`${ipc.config.id} is listening`);
}

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export class Negotiator {
    constructor(private globalState: Memento) {}

    public thisIsTheResponsibleProcess(): boolean {
        const responsiblePid: number = this.globalState.get(RESPONSIBLE_PID_KEY) || 0;
        const isResponsible = pid === responsiblePid;
        Logger.debug(`Is responsible process: ${isResponsible}`);
        return isResponsible;
    }

    public async requestTokenRefreshForSite(site: string): Promise<boolean> {
        // Give any other workspace enough time to wake up before trying to establish who's in charge
        const lifettime = uptime();
        if (lifettime < LAUNCH_DELAY_SECONDS) {
            Logger.debug(`Waiting ${LAUNCH_DELAY_SECONDS} seconds before starting negotiations`);
            await sleep(Math.floor((LAUNCH_DELAY_SECONDS - lifettime) * 1000));
            Logger.debug(`We've waited long enough.`);
        }

        Logger.debug(`Checking to see if we're the responsible pid`);
        for (let round = 0; round < MAX_ROUNDS; round++) {
            Logger.debug(`Starting round ${round} of negotiations`);
            const result = await this.negotiationRound(site);
            if (result !== undefined) {
                Logger.debug(`responsible pid? ${result}`);
                return result;
            }
        }
        Logger.error(new Error(`Failed to negotiate a responsible PID after ${MAX_ROUNDS} rounds`));
        return false;
    }

    async negotiationRound(site: string): Promise<boolean | undefined> {
        const responsiblePid: number = this.globalState.get(RESPONSIBLE_PID_KEY) || 0;

        if (pid === responsiblePid) {
            Logger.debug(`This process is in charge of refreshing credentials.`);
            return true;
        }

        Logger.debug(`Pinging ${responsiblePid}`);
        const responsibleProcessIsAlive = await this.sendSiteRequest(pid, responsiblePid, site);

        if (responsibleProcessIsAlive) {
            Logger.debug(`${responsiblePid} responded.`);
            return false;
        }

        Logger.debug(`${responsiblePid} failed to respond. Negitiating new responsible process.`);
        this.globalState.update(RESPONSIBLE_PID_KEY, pid);
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                const isResponsibleProcess = pid === this.globalState.get(RESPONSIBLE_PID_KEY);
                Logger.debug(`After delay is responsible process: ${isResponsibleProcess}`);
                resolve(isResponsibleProcess);
            }, READ_DELAY);
        });
    }

    async sendSiteRequest(myPort: number, theirPort: number, site: string): Promise<boolean> {
        const ipc = new IPC();
        const myAddress = `atlascode-${myPort}`;
        const theirAddress = `atlascode-${theirPort}`;

        const tag = Math.floor(Math.random() * 1000);
        Logger.debug(`${tag}: my pid: ${myPort} responsible pid: ${theirPort}`);

        Logger.debug(`Attempting to ping ${theirAddress}`);
        ipc.config.id = myAddress;
        ipc.config.retry = 6000; // Make sure it's more than timeout.
        ipc.config.silent = true;
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                Logger.debug(`${tag}: Timed out waiting on ${theirAddress}`);
                ipc.disconnect(theirAddress);
                resolve(false);
            }, TIMEOUT);

            ipc.connectTo(theirAddress, () => {
                ipc.of[theirAddress].on('connect', () => {
                    ipc.of[theirAddress].emit(PING_MESSAGE, site);
                });
                ipc.of[theirAddress].on(ACK_MESSAGE, () => {
                    clearTimeout(timeout);
                    Logger.debug(`${tag}: ${theirPort} acked`);
                    ipc.disconnect(theirAddress);
                    resolve(true);
                });
            });
        });
    }
}
