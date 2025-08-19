import { Grid, Input, Slider, Theme, Typography } from '@mui/material';
import { makeStyles } from '@mui/styles';
import clsx from 'clsx';
import React, { memo, useCallback, useEffect, useMemo } from 'react';

type IntervalInputProps = {
    interval: number;
    enabled?: boolean;
    max: number;
    label: string;
    units?: 'seconds' | 'minutes' | 'hours';
    onChange?: (interval: number) => void;
    className?: string;
};

const useStyles = makeStyles(
    (theme: Theme) =>
        ({
            root: {
                width: 250,
            },
            input: {
                width: 48,
            },
            label: {
                '&$disabled': {
                    color: theme.palette.text.disabled,
                },
            },
            disabled: {},
        }) as const,
);

export const IntervalInput: React.FunctionComponent<IntervalInputProps> = memo(
    ({ interval, enabled, max, label, units, onChange, className }) => {
        const classes = useStyles();
        const [value, setValue] = React.useState(interval);
        const [newInterval, setNewInterval] = React.useState<number | undefined>(undefined);
        const unit = useMemo(() => (units !== undefined ? units : 'seconds'), [units]);

        const setValueAndInterval = useCallback(
            (n: number) => {
                setValue(n);
                setNewInterval(n);
            },
            [setValue, setNewInterval],
        );

        useEffect(() => {
            setValue(interval);
        }, [interval]);

        useEffect(() => {
            if (onChange && newInterval !== undefined) {
                onChange(newInterval);
            }
        }, [onChange, newInterval]);

        return (
            <Grid className={className} container spacing={4} alignItems="center">
                <Grid item>
                    <Typography component="span" className={clsx(classes.label, { [classes.disabled]: !enabled })}>
                        {label}
                    </Typography>
                </Grid>
                <Grid item>
                    <div className={classes.root}>
                        <Grid container spacing={2} alignItems="center">
                            <Grid item xs>
                                <Slider
                                    max={max}
                                    disabled={!enabled}
                                    value={typeof value === 'number' ? value : 0}
                                    valueLabelDisplay="auto"
                                    getAriaValueText={(v, i) => {
                                        return `${v}`;
                                    }}
                                    onChange={(e, v) => {
                                        if (typeof v === 'number') {
                                            setValue(v);
                                        }
                                    }}
                                    onChangeCommitted={(e, v) => {
                                        if (typeof v === 'number') {
                                            setNewInterval(v);
                                        }
                                    }}
                                />
                            </Grid>
                            <Grid item>
                                <Input
                                    disabled={!enabled}
                                    className={classes.input}
                                    value={value}
                                    size="small"
                                    onChange={(e) =>
                                        setValueAndInterval(e.target.value === '' ? 0 : Number(e.target.value))
                                    }
                                    onBlur={() => {
                                        if (value < 0) {
                                            setValueAndInterval(0);
                                        } else if (value > max) {
                                            setValueAndInterval(max);
                                        }
                                    }}
                                    inputProps={{
                                        step: 5,
                                        min: 0,
                                        max: max,
                                        type: 'number',
                                    }}
                                />
                            </Grid>
                            <Grid item>
                                <Typography
                                    variant="caption"
                                    className={clsx(classes.label, { [classes.disabled]: !enabled })}
                                >
                                    {unit}
                                </Typography>
                            </Grid>
                        </Grid>
                    </div>
                </Grid>
            </Grid>
        );
    },
);
