import { Box, Button, Grid } from '@mui/material';
import React, { useCallback, useContext, useEffect, useState } from 'react';

import { Product } from '../../../../atlclients/authInfo';
import { SiteWithAuthInfo } from '../../../../lib/ipc/toUI/config';
import { Features, useFeatureFlags } from '../../common/FeatureFlagContext';
import { ConfigControllerContext } from '../configController';
import { CloudAuthButton } from './CloudAuthButton';
import { SiteList } from './SiteList';
import { AuthDialogControllerContext } from './useAuthDialog';

type SiteAuthenticatorProps = {
    product: Product;
    isRemote: boolean;
    sites: SiteWithAuthInfo[];
    initiateApiTokenAuth: boolean;
};

const OPEN_DIALOG_TIMEOUT = 250;

export const SiteAuthenticator: React.FunctionComponent<SiteAuthenticatorProps> = ({
    product,
    isRemote,
    sites,
    initiateApiTokenAuth,
}) => {
    const [, setOpenDialogTimer] = useState<number | NodeJS.Timeout>(0);
    const [opened, setOpened] = useState(false);
    const authDialogController = useContext(AuthDialogControllerContext);
    const configController = useContext(ConfigControllerContext);

    const openProductAuth = useCallback(() => {
        authDialogController.openDialog(product, undefined, sites);
    }, [authDialogController, product, sites]);

    const remoteAuth = useCallback(() => {
        configController.remoteLogin();
    }, [configController]);

    const handleEdit = useCallback(
        (swa: SiteWithAuthInfo) => {
            authDialogController.openDialog(product, swa, []);
        },
        [authDialogController, product],
    );

    useEffect(() => {
        if (initiateApiTokenAuth && !opened) {
            setOpenDialogTimer((prev) => {
                clearTimeout(prev);
                return setTimeout(() => {
                    setOpened(true);
                    openProductAuth();
                }, OPEN_DIALOG_TIMEOUT);
            });
        }
    }, [
        authDialogController,
        opened,
        product,
        sites,
        initiateApiTokenAuth,
        setOpenDialogTimer,
        setOpened,
        openProductAuth,
    ]);

    // TODO AXON-46: feature flag this when closer to release
    const [isRemoteAuthButtonVisible] = React.useState(false);

    return (
        <Box flexGrow={1}>
            <Grid container direction="column" spacing={2}>
                <AuthContainer
                    isRemote={isRemote}
                    product={product}
                    openProductAuth={openProductAuth}
                    sites={sites}
                    handleEdit={handleEdit}
                    remoteAuth={remoteAuth}
                    isRemoteAuthButtonVisible={isRemoteAuthButtonVisible}
                />
            </Grid>
        </Box>
    );
};

interface AuthContainerProps {
    isRemote: boolean;
    product: Product;
    openProductAuth: () => void;
    sites: SiteWithAuthInfo[];
    handleEdit: (swa: SiteWithAuthInfo) => void;
    remoteAuth: () => void;
    isRemoteAuthButtonVisible: boolean;
}

const AuthContainer = ({
    isRemote,
    product,
    openProductAuth,
    sites,
    handleEdit,
    remoteAuth,
    isRemoteAuthButtonVisible,
}: AuthContainerProps) => {
    const { flags } = useFeatureFlags();
    const configController = useContext(ConfigControllerContext);

    return (
        <React.Fragment>
            <Grid item>
                <Grid container direction="column" spacing={2}>
                    <Grid item>
                        <Grid container spacing={2}>
                            {flags[Features.UseNewAuthFlow] && product.key === 'jira' ? (
                                // Only enabled for jira for now
                                <Grid item>
                                    <Button
                                        color="primary"
                                        variant="contained"
                                        onClick={configController.startAuthFlow}
                                    >
                                        Login to {product.name}
                                    </Button>
                                </Grid>
                            ) : !isRemote ? (
                                <React.Fragment>
                                    <Grid item>
                                        <CloudAuthButton product={product} />
                                    </Grid>
                                    <Grid item>
                                        <Button color="primary" variant="contained" onClick={openProductAuth}>
                                            Login with API Token
                                        </Button>
                                    </Grid>
                                    {isRemoteAuthButtonVisible && (
                                        <Grid item>
                                            <Button onClick={remoteAuth}>Remote Auth</Button>
                                        </Grid>
                                    )}
                                </React.Fragment>
                            ) : (
                                <React.Fragment>
                                    <Grid item>
                                        <Button color="primary" variant="contained" onClick={openProductAuth}>
                                            {`Login with API Token`}
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
};
