import { token } from '@atlaskit/tokens';
import Tooltip from '@atlaskit/tooltip';
import { makeStyles } from '@material-ui/core';
import React from 'react';

const useStyles = makeStyles({
    branchTag: {
        lineHeight: 'normal',
        backgroundColor: token('color.background.input'),
        borderRadius: 3,
        color: token('color.text.subtle'),
        display: 'inline-block',
        padding: token('space.050'),
        verticalAlign: 'middle',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        maxWidth: 180, // From Bitbucket UI
        '&:hover': {
            backgroundColor: token('color.background.input.hovered'),
        },
        '&:focus': {
            backgroundColor: token('color.background.input.pressed'),
        },
    },
});

export function BranchTag({ branchName }: { branchName: string }) {
    const classes = useStyles();
    return (
        <Tooltip content={branchName}>
            <span className={classes.branchTag}>{branchName}</span>
        </Tooltip>
    );
}
