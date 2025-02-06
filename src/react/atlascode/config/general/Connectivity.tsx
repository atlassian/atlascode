import { ToggleWithLabel } from '@atlassianlabs/guipi-core-components';
import { Grid, Switch } from '@material-ui/core';
import React, { memo, useCallback, useContext, useEffect, useState } from 'react';
import { ConfigControllerContext } from '../configController';
import * as l10n from '@vscode/l10n';

type ConnectivityProps = {
    enableHttpsTunnel: boolean;
    offlineMode: boolean;
    onlineCheckerUrls: string[];
};

export const Connectivity: React.FunctionComponent<ConnectivityProps> = memo(
    ({ enableHttpsTunnel, offlineMode, onlineCheckerUrls }) => {
        const controller = useContext(ConfigControllerContext);

        const [changes, setChanges] = useState<{ [key: string]: any }>({});
        const handleCheckedChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
            const changes = Object.create(null);
            changes[`${e.target.value}`] = e.target.checked;
            setChanges(changes);
        }, []);

        useEffect(() => {
            if (Object.keys(changes).length > 0) {
                controller.updateConfig(changes);
                setChanges({});
            }
        }, [changes, controller]);

        return (
            <Grid container direction="column" spacing={3}>
                <Grid item>
                    <ToggleWithLabel
                        control={
                            <Switch
                                size="small"
                                color="primary"
                                id="enableHttpsTunnel"
                                value="enableHttpsTunnel"
                                checked={enableHttpsTunnel}
                                onChange={handleCheckedChange}
                            />
                        }
                        label={l10n.t('Enable https tunneling for proxies that only have an http endpoint')}
                        spacing={1}
                        variant="body1"
                    />
                </Grid>
                <Grid item>
                    <ToggleWithLabel
                        control={
                            <Switch
                                size="small"
                                color="primary"
                                id="offlineMode"
                                value="offlineMode"
                                checked={offlineMode}
                                onChange={handleCheckedChange}
                            />
                        }
                        label={l10n.t(
                            'Enable offline mode if you are without an internet connection to minimize errors',
                        )}
                        spacing={1}
                        variant="body1"
                    />
                </Grid>
            </Grid>
        );
    },
);
