import { Grid, Link, LinkProps, Typography } from '@material-ui/core';
import * as React from 'react';

type IconLinkProps = LinkProps & {
    startIcon?: any;
    endIcon?: any;
};

export const IconLink: React.FunctionComponent<IconLinkProps> = ({ startIcon, endIcon, children, ...rest }) => {
    return (
        <Link {...rest}>
            <Grid container spacing={1} direction="row" alignItems="center">
                {startIcon && <Grid item>{startIcon}</Grid>}
                <Grid item>
                    <Typography>{children}</Typography>
                </Grid>
                {endIcon && <Grid item>{endIcon}</Grid>}
            </Grid>
        </Link>
    );
};
