import { AuthInfoState, DetailedSiteInfo, Product, ProductJira, emptyUserInfo } from '../../../../atlclients/authInfo';
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
    makeStyles,
} from '@material-ui/core';
import React, { useContext } from 'react';

import CloudIcon from '@material-ui/icons/Cloud';
import { ConfigControllerContext } from '../configController';
import DeleteIcon from '@material-ui/icons/Delete';
import DomainIcon from '@material-ui/icons/Domain';
import EditIcon from '@material-ui/icons/Edit';
import ErrorIcon from '@material-ui/icons/Error';
import { JiraIcon } from '@atlassianlabs/guipi-jira-components';
import { SiteWithAuthInfo } from '../../../../lib/ipc/toUI/config';
import clsx from 'clsx';
import { uid } from 'react-uid';
import { useBorderBoxStyles } from '../../common/useBorderBoxStyles';
import * as l10n from '@vscode/l10n';

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
                    <Typography align="center">{l10n.t('No sites found.')}</Typography>
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
                            <Tooltip title={l10n.t('Credential Error')}>
                                <IconButton edge="end" aria-label="error" onClick={() => edit(swa)}>
                                    <ErrorIcon fontSize="small" color="inherit" />
                                </IconButton>
                            </Tooltip>
                        )}
                        {!swa.site.isCloud && (
                            <IconButton edge="end" aria-label="edit" onClick={() => edit(swa)}>
                                <EditIcon fontSize="small" color="inherit" />
                            </IconButton>
                        )}
                        <IconButton edge="end" aria-label="delete" onClick={() => logout(swa.site)}>
                            <DeleteIcon fontSize="small" color="inherit" />
                        </IconButton>
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
        const site = siteWithAuth.site;
        if (site.isCloud) {
            controller.logout(site);
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
