import { Box, Button, Grid, Typography } from '@material-ui/core';
import React, { memo, useCallback, useContext } from 'react';

import { AuthDialogControllerContext } from './useAuthDialog';
import { CloudAuthButton } from './CloudAuthButton';
import DomainIcon from '@material-ui/icons/Domain';
import { Product, ProductJira } from '../../../../atlclients/authInfo';
import { SiteList } from './SiteList';
import { SiteWithAuthInfo } from '../../../../lib/ipc/toUI/config';
import { Features } from 'src/util/featureFlags';
import { CommonMessageType } from 'src/lib/ipc/toUI/common';

type SiteAuthenticatorProps = {
    product: Product;
    isRemote: boolean;
    sites: SiteWithAuthInfo[];
};

export const SiteAuthenticator: React.FunctionComponent<SiteAuthenticatorProps> = memo(
    ({ product, isRemote, sites }) => {
        const authDialogController = useContext(AuthDialogControllerContext);
        const openProductAuth = useCallback(() => {
            authDialogController.openDialog(product, undefined);
        }, [authDialogController, product]);

        const handleEdit = useCallback(
            (swa: SiteWithAuthInfo) => {
                authDialogController.openDialog(product, swa);
            },
            [authDialogController, product],
        );

        const [useNewAuth, setUseNewAuth] = React.useState(false);
        React.useEffect(() => {
            window.addEventListener('message', (event) => {
                const message = event.data;
                if (message.command === CommonMessageType.UpdateFeatureFlags) {
                    const featureValue = message.featureFlags[Features.EnableRemoteAuthentication];
                    console.log(
                        `FeatureGates: received by SiteAuthenticator - ${Features.EnableRemoteAuthentication} -> ${featureValue}`,
                    );
                    setUseNewAuth(featureValue);
                }
            });
        }, []);

        return (
            <Box flexGrow={1}>
                <Grid container direction="column" spacing={2}>
                    {useNewAuth && product.key === ProductJira.key ? (
                        <AuthContainer
                            isRemote={isRemote}
                            product={product}
                            openProductAuth={openProductAuth}
                            sites={sites}
                            handleEdit={handleEdit}
                        />
                    ) : (
                        <LegacyAuthContainer
                            isRemote={isRemote}
                            product={product}
                            openProductAuth={openProductAuth}
                            sites={sites}
                            handleEdit={handleEdit}
                        />
                    )}
                </Grid>
            </Box>
        );
    },
);

interface AuthContainerProps {
    isRemote: boolean;
    product: Product;
    openProductAuth: () => void;
    sites: SiteWithAuthInfo[];
    handleEdit: (swa: SiteWithAuthInfo) => void;
}

const LegacyAuthContainer = ({ isRemote, product, openProductAuth, sites, handleEdit }: AuthContainerProps) => (
    <React.Fragment>
        <Grid item hidden={isRemote === false}>
            <Typography>
                <Box component="span" fontWeight="fontWeightBold">
                    ⚠️ Authentication cannot be done while running remotely
                </Box>
            </Typography>
            <Typography>
                To authenticate with a new site open this (or another) workspace locally. Accounts added when running
                locally <em>will</em> be accessible during remote development.
            </Typography>
        </Grid>
        <Grid item style={{ cursor: isRemote ? 'not-allowed' : 'default' }}>
            <Grid
                container
                direction="column"
                spacing={2}
                style={{
                    pointerEvents: isRemote ? 'none' : 'inherit',
                    opacity: isRemote ? 0.6 : 'inherit',
                }}
            >
                <Grid item>
                    <Grid container spacing={2}>
                        <Grid item>
                            <CloudAuthButton product={product} />
                        </Grid>
                        <Grid item>
                            <Button color="primary" startIcon={<DomainIcon />} onClick={openProductAuth}>
                                {`Add Custom ${product.name} Site`}
                            </Button>
                        </Grid>
                    </Grid>
                </Grid>
                <Grid item>
                    <SiteList product={product} sites={sites} editServer={handleEdit} />
                </Grid>
            </Grid>
        </Grid>
    </React.Fragment>
);

const AuthContainer = ({ isRemote, product, openProductAuth, sites, handleEdit }: AuthContainerProps) => (
    <React.Fragment>
        <Grid item>
            <Grid container direction="column" spacing={2}>
                <Grid item>
                    <Grid container spacing={2}>
                        {!isRemote && (
                            <React.Fragment>
                                <Grid item>
                                    <CloudAuthButton product={product} />
                                </Grid>
                                <Grid item>
                                    <Button color="primary" onClick={openProductAuth}>
                                        {`Other options...`}
                                    </Button>
                                </Grid>
                            </React.Fragment>
                        )}
                        {isRemote && (
                            <React.Fragment>
                                <Grid item>
                                    <Button color="primary" variant="contained" onClick={openProductAuth}>
                                        {`Login to ${product.name}`}
                                    </Button>
                                </Grid>
                            </React.Fragment>
                        )}
                    </Grid>
                </Grid>
                <Grid item>
                    <SiteList product={product} sites={sites} editServer={handleEdit} />
                </Grid>
            </Grid>
        </Grid>
    </React.Fragment>
);
