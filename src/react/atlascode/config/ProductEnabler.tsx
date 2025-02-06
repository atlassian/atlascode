import { Grid, Switch, Tooltip } from '@material-ui/core';
import React, { useCallback } from 'react';
import * as l10n from '@vscode/l10n';

export type ProductEnablerProps = {
    label: string;
    enabled: boolean;
    onToggle: (enabled: boolean) => void;
};

export const ProductEnabler: React.FunctionComponent<ProductEnablerProps> = ({ label, enabled, onToggle }) => {
    const stopProp = useCallback((event: React.MouseEvent<HTMLElement>) => {
        event.stopPropagation();
    }, []);

    const toggleProduct = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            onToggle(event.target.checked);
        },
        [onToggle],
    );

    return (
        <Grid container justify="center" alignItems="center" spacing={1}>
            <Grid item>
                <Tooltip title={enabled ? l10n.t('Disable {0} features', label) : l10n.t('Enable {0} features', label)}>
                    <Switch
                        color="primary"
                        size="small"
                        checked={enabled}
                        onClick={stopProp}
                        onChange={toggleProduct}
                    />
                </Tooltip>
            </Grid>
            <Grid item>
                <span>{label}</span>
            </Grid>
        </Grid>
    );
};
