import { JiraIcon } from '@atlassianlabs/guipi-jira-components';
import CloudIcon from '@mui/icons-material/Cloud';
import DomainIcon from '@mui/icons-material/Domain';
import EditIcon from '@mui/icons-material/Edit';
import ErrorIcon from '@mui/icons-material/Error';
import LogoutIcon from '@mui/icons-material/Logout';
import {
    Avatar,
    Box,
    Divider,
    IconButton,
    List,
    ListItem,
    ListItemAvatar,
    ListItemIcon,
    ListItemSecondaryAction,
    ListItemText,
    Theme,
    Tooltip,
    Typography,
} from '@mui/material';
import { makeStyles } from '@mui/styles';
import clsx from 'clsx';
import React, { useContext } from 'react';
import { uid } from 'react-uid';

import {
    AuthInfoState,
    DetailedSiteInfo,
    emptyUserInfo,
    isOAuthInfo,
    Product,
    ProductJira,
} from '../../../../atlclients/authInfo';
import { SiteWithAuthInfo } from '../../../../lib/ipc/toUI/config';
import { useBorderBoxStyles } from '../../common/useBorderBoxStyles';
import { ConfigControllerContext } from '../configController';

type SiteListProps = {
    product: Product;
    sites: SiteWithAuthInfo[];
    editServer: (site: SiteWithAuthInfo) => void;
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

function generateListItems(
    product: Product,
    sites: SiteWithAuthInfo[],
    logout: (site: DetailedSiteInfo) => void,
    edit: (site: SiteWithAuthInfo) => void,
    iconClassName: string,
): JSX.Element[] {
    const fallbackImg = `images/${product.key}-icon.svg`;

    if (sites.length < 1) {
        return [
            <ListItem key="empty">
                <Box width="100%">
                    <Typography align="center">No sites found.</Typography>
                </Box>
            </ListItem>,
        ];
    }
    return sites.map((swa: SiteWithAuthInfo, i: number) => {
        const avatarUrl = swa.site.avatarUrl && swa.site.avatarUrl.length > 0 ? swa.site.avatarUrl : fallbackImg;

        return (
            <React.Fragment key={uid(swa, i)}>
                <ListItem key={swa.site.name}>
                    <ListItemIcon>
                        {swa.site.isCloud ? (
                            <CloudIcon fontSize="small" className={iconClassName} />
                        ) : (
                            <DomainIcon fontSize="small" className={iconClassName} />
                        )}
                    </ListItemIcon>
                    <ListItemAvatar>
                        <Avatar src={avatarUrl}>
                            <JiraIcon />
                        </Avatar>
                    </ListItemAvatar>
                    <ListItemText primary={swa.site.name} />
                    <ListItemSecondaryAction>
                        {swa.auth.state === AuthInfoState.Invalid && (
                            <Tooltip title="Credential Error">
                                <IconButton edge="end" aria-label="error" onClick={() => edit(swa)} size="large">
                                    <ErrorIcon fontSize="small" color="inherit" />
                                </IconButton>
                            </Tooltip>
                        )}
                        {!isOAuthInfo(swa.auth) && (
                            <Tooltip title="Edit">
                                <IconButton edge="end" aria-label="edit" onClick={() => edit(swa)} size="large">
                                    <EditIcon fontSize="small" color="inherit" />
                                </IconButton>
                            </Tooltip>
                        )}
                        <Tooltip title="Logout">
                            <IconButton edge="end" aria-label="delete" onClick={() => logout(swa.site)} size="large">
                                <LogoutIcon fontSize="small" color="inherit" />
                            </IconButton>
                        </Tooltip>
                    </ListItemSecondaryAction>
                </ListItem>
                {sites.length !== i + 1 && <Divider />}
            </React.Fragment>
        );
    });
}

export const SiteList: React.FunctionComponent<SiteListProps> = ({ sites, product, editServer }) => {
    const controller = useContext(ConfigControllerContext);
    const borderBox = useBorderBoxStyles();

    const classes = useStyles();

    const editOrLogout = (siteWithAuth: SiteWithAuthInfo) => {
        if (isOAuthInfo(siteWithAuth.auth)) {
            controller.logout(siteWithAuth.site);
            const hostname = product.key === ProductJira.key ? 'atlassian.net' : 'bitbucket.org';
            controller.login({ host: hostname, product: product }, { user: emptyUserInfo, state: AuthInfoState.Valid });
        } else {
            editServer(siteWithAuth);
        }
    };

    return (
        <div className={clsx(classes.root, borderBox.box)}>
            <List>{generateListItems(product, sites, controller.logout, editOrLogout, classes.iconStyle)}</List>
        </div>
    );
};
