import { ToggleWithLabel } from '@atlassianlabs/guipi-core-components';
import { Box, Checkbox, Grid, Switch } from '@material-ui/core';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { ConfigSection } from '../../../lib/ipc/models/config';
import { ConfigControllerContext } from './configController';
import * as l10n from '@vscode/l10n';

type StatusBarProps = {
    configSection: ConfigSection;
    productName: string;
    enabled: boolean;
    showProduct: boolean;
    showUser: boolean;
    showLogin: boolean;
};

export const StatusBar: React.FunctionComponent<StatusBarProps> = ({
    configSection,
    productName,
    enabled,
    showProduct,
    showUser,
    showLogin,
}) => {
    const controller = useContext(ConfigControllerContext);

    const [changes, setChanges] = useState<{ [key: string]: any }>({});

    const handleChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const changes = Object.create(null);
            changes[`${configSection}.${e.target.value}`] = e.target.checked;
            setChanges(changes);
        },
        [configSection],
    );

    const disabled = !enabled;

    useEffect(() => {
        if (Object.keys(changes).length > 0) {
            controller.updateConfig(changes);
            setChanges({});
        }
    }, [changes, controller]);

    return (
        <Grid container direction="column">
            <Grid item>
                <ToggleWithLabel
                    control={
                        <Switch
                            size="small"
                            color="primary"
                            id="statusbar.enabled"
                            value="statusbar.enabled"
                            checked={enabled}
                            onChange={handleChange}
                        />
                    }
                    label={l10n.t('Enable {0} Status Bar', productName)}
                    spacing={1}
                    variant="body1"
                />
            </Grid>
            <Box marginLeft={2}>
                <Grid item>
                    <ToggleWithLabel
                        control={
                            <Checkbox
                                disabled={disabled}
                                size="small"
                                color="primary"
                                id="showProduct"
                                value="statusbar.showProduct"
                                checked={showProduct}
                                onChange={handleChange}
                            />
                        }
                        spacing={1}
                        variant="body1"
                        label={l10n.t('Show product name')}
                    />
                </Grid>
                <Grid item>
                    <ToggleWithLabel
                        control={
                            <Checkbox
                                size="small"
                                disabled={disabled}
                                color="primary"
                                id="showUser"
                                value="statusbar.showUser"
                                checked={showUser}
                                onChange={handleChange}
                            />
                        }
                        spacing={1}
                        variant="body1"
                        label={l10n.t("Show user's name")}
                    />
                </Grid>
                <Grid item>
                    <ToggleWithLabel
                        control={
                            <Checkbox
                                size="small"
                                disabled={disabled}
                                color="primary"
                                id="showLogin"
                                value="statusbar.showLogin"
                                checked={showLogin}
                                onChange={handleChange}
                            />
                        }
                        spacing={1}
                        variant="body1"
                        label={l10n.t('Show login button when not authenticated')}
                    />
                </Grid>
            </Box>
        </Grid>
    );
};
