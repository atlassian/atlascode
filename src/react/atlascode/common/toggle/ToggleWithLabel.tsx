import { Grid, Typography } from '@material-ui/core';
import * as React from 'react';
type Variant =
    | 'h1'
    | 'h2'
    | 'h3'
    | 'h4'
    | 'h5'
    | 'h6'
    | 'subtitle1'
    | 'subtitle2'
    | 'body1'
    | 'body2'
    | 'caption'
    | 'button'
    | 'overline'
    | 'inherit'
    | undefined;

type Spacing = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | undefined;
type ToggleWithLabelProps = {
    control: JSX.Element;
    label: string;
    spacing?: Spacing;
    variant?: Variant;
};

export const ToggleWithLabel: React.FunctionComponent<ToggleWithLabelProps> = ({
    control,
    label,
    spacing,
    variant,
}) => {
    return (
        <Grid container direction="row" spacing={spacing} alignItems="center">
            <Grid item>{control}</Grid>
            <Grid item>
                <Typography variant={variant}>{label}</Typography>
            </Grid>
        </Grid>
    );
};
