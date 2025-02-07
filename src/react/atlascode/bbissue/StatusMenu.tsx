import { CircularProgress, Grid, MenuItem, TextField, Theme, useTheme } from '@material-ui/core';
import React, { useCallback, useState } from 'react';
import Lozenge from '../common/Lozenge';

type StatusMenuProps = {
    status: string;
    onChange: (value: string) => Promise<void>;
    fullWidth?: boolean;
    label?: string;
    variant?: 'filled' | 'outlined' | 'standard';
};

const StatusRenderer: Record<string, JSX.Element> = {
    new: <Lozenge appearance="new" label="new" />,
    open: <Lozenge appearance="inprogress" label="open" />,
    resolved: <Lozenge appearance="success" label="resolved" />,
    'on hold': <Lozenge appearance="default" label="on hold" />,
    invalid: <Lozenge appearance="moved" label="invalid" />,
    duplicate: <Lozenge appearance="default" label="duplicate" />,
    wontfix: <Lozenge appearance="removed" label="wontfix" />,
    closed: <Lozenge appearance="default" label="closed" />,
};

const StatusMenu: React.FC<StatusMenuProps> = (props: StatusMenuProps) => {
    const handleChange = useCallback(
        async (event: React.ChangeEvent<{ name?: string | undefined; value: string }>) => {
            if (event?.target?.value && event?.target?.value === props.status) {
                return;
            }
            try {
                setLoading(true);
                if (event?.target?.value) {
                    setLoadingStatus(event.target.value);
                    await props.onChange(event.target.value);
                }
            } finally {
                setLoading(false);
            }
        },
        [props],
    );

    const theme = useTheme<Theme>();
    const [loading, setLoading] = useState(false);
    const [loadingStatus, setLoadingStatus] = useState(props.status);

    return (
        <TextField
            fullWidth={props.fullWidth}
            label={props.label}
            select
            variant={props.variant ?? 'standard'}
            size="small"
            value={loading ? loadingStatus : props.status}
            onChange={handleChange}
        >
            {Object.keys(StatusRenderer).map((status) => (
                <MenuItem key={status} value={status}>
                    <Grid container spacing={1} alignItems="center">
                        <Grid item>{StatusRenderer[status]}</Grid>
                        <Grid item hidden={!loading}>
                            <CircularProgress size={theme.typography.fontSize} />
                        </Grid>
                    </Grid>
                </MenuItem>
            ))}
        </TextField>
    );
};

export default StatusMenu;
