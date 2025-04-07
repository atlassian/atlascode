import { v4 } from 'uuid';

import { analyticsClient } from '../analytics-node-client/src/client.min.js';
import { TrackEvent } from '../analytics-node-client/src/types';

class AnalyticsPlatform {
    private static nodeJsPlatformMapping: Record<string, string> = {
        aix: 'desktop',
        android: 'android',
        darwin: 'mac',
        freebsd: 'desktop',
        linux: 'linux',
        openbsd: 'desktop',
        sunos: 'desktop',
        win32: 'windows',
        cygwin: 'windows',
    };

    static for(p: string): string {
        return this.nodeJsPlatformMapping[p] || 'unknown';
    }
}

function handleUninstall() {
    require('macaddress').one((error: any, macAddress: any) => {
        if (error || !macAddress) {
            macAddress = v4();
        }

        const { version } = require('../../package.json');
        const machineId = require('crypto').createHash('sha256').update(macAddress, 'utf8').digest('hex');

        const e = {
            tenantIdType: null,
            anonymousId: machineId,
            trackEvent: {
                origin: 'desktop',
                platform: AnalyticsPlatform.for(process.platform),
                action: 'uninstalled',
                actionSubject: 'atlascode',
                source: 'vscode',
            },
        } as TrackEvent;

        const c = analyticsClient({
            origin: 'desktop',
            env: 'prod',
            product: 'externalProductIntegrations',
            subproduct: 'atlascode',
            version: version,
            deviceId: machineId,
        });
        c.sendTrackEvent(e);
    });
}

handleUninstall();
