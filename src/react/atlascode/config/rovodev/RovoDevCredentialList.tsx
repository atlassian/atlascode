import LogoutIcon from '@mui/icons-material/Logout';
import { Box, IconButton, List, ListItem, ListItemText, Theme, Tooltip, Typography } from '@mui/material';
import { makeStyles } from '@mui/styles';
import clsx from 'clsx';
import React, { useCallback, useContext } from 'react';

import { ConfigActionType } from '../../../../lib/ipc/fromUI/config';
import { useBorderBoxStyles } from '../../common/useBorderBoxStyles';
import { ConfigControllerContext } from '../configController';

type RovoDevCredentialListProps = {
    rovoDevAuthInfo?: { user?: { email?: string } } | null;
};

const useStyles = makeStyles(
    (theme: Theme) =>
        ({
            root: {
                flexGrow: 1,
            },
            iconStyle: {
                color: theme.palette.grey[600],
            },
        }) as const,
);

export const RovoDevCredentialList: React.FunctionComponent<RovoDevCredentialListProps> = ({ rovoDevAuthInfo }) => {
    const controller = useContext(ConfigControllerContext);
    const borderBox = useBorderBoxStyles();
    const classes = useStyles();

    const handleLogout = useCallback(() => {
        // Post message to logout - need to add this action type
        controller.postMessage({
            type: ConfigActionType.LogoutRovoDev,
        });
    }, [controller]);

    const hasCredential = rovoDevAuthInfo && rovoDevAuthInfo.user && rovoDevAuthInfo.user.email;

    if (!hasCredential) {
        return (
            <div className={clsx(classes.root, borderBox.box)}>
                <List>
                    <ListItem>
                        <Box width="100%">
                            <Typography align="center">No Rovo Dev credential configured.</Typography>
                        </Box>
                    </ListItem>
                </List>
            </div>
        );
    }

    const email = rovoDevAuthInfo.user!.email!;

    return (
        <div className={clsx(classes.root, borderBox.box)}>
            <List>
                <ListItem>
                    <ListItemText primary={email} secondary="Rovo Dev" />
                    <Tooltip title="Logout">
                        <IconButton edge="end" aria-label="logout" onClick={handleLogout} size="large">
                            <LogoutIcon fontSize="small" color="inherit" />
                        </IconButton>
                    </Tooltip>
                </ListItem>
            </List>
        </div>
    );
};
