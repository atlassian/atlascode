import { Grid, Switch, Tooltip } from '@mui/material';
import React, { useCallback } from 'react';

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
        <Grid container justifyContent="center" alignItems="center" spacing={1}>
            <Grid item>
                <Tooltip title={enabled ? `Disable ${label} features` : `Enable ${label} features`}>
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
