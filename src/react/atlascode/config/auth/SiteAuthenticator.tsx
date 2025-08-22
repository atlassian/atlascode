import { Box, Button, Grid } from '@mui/material';
import React, { memo, useCallback, useContext } from 'react';
import { useNewLoginFlow } from 'src/constants';
import { ConfigActionType } from 'src/lib/ipc/fromUI/config';

import { AuthInfoState, emptyUserInfo, Product } from '../../../../atlclients/authInfo';
import { SiteWithAuthInfo } from '../../../../lib/ipc/toUI/config';
import { ConfigControllerContext } from '../configController';
import { CloudAuthButton } from './CloudAuthButton';
import { SiteList } from './SiteList';
import { AuthDialogControllerContext } from './useAuthDialog';

type SiteAuthenticatorProps = {
    product: Product;
    isRemote: boolean;
    sites: SiteWithAuthInfo[];
};

export const SiteAuthenticator: React.FunctionComponent<SiteAuthenticatorProps> = memo(
    ({ product, isRemote, sites }) => {
        const authDialogController = useContext(AuthDialogControllerContext);
        const configController = useContext(ConfigControllerContext);
        const openProductAuth = useCallback(() => {
            authDialogController.openDialog(product, undefined);
        }, [authDialogController, product]);

        const remoteAuth = useCallback(() => {
            configController.remoteLogin();
        }, [configController]);

        const handleEdit = useCallback(
            (swa: SiteWithAuthInfo) => {
                authDialogController.openDialog(product, swa);
            },
            [authDialogController, product],
        );

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
    },
);

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
    const useNewFlow = product.key === 'jira' && useNewLoginFlow;

    return (
        <React.Fragment>
            <Grid item>
                <Grid container direction="column" spacing={2}>
                    <Grid item>
                        <Grid container spacing={2}>
                            {useNewFlow && (
                                <Grid item>
                                    <Button
                                        color="primary"
                                        variant="contained"
                                        onClick={() =>
                                            (window as any).__bruh_postMessage({
                                                type: ConfigActionType.Login,
                                                siteInfo: { product, host: '' },
                                                authInfo: {
                                                    user: emptyUserInfo,
                                                    state: AuthInfoState.Valid,
                                                },
                                            })
                                        }
                                    >
                                        {`🇨🇦 Wanna login eh buddy? 🇨🇦`}
                                    </Button>
                                </Grid>
                            )}
                            {!useNewFlow && !isRemote && (
                                <React.Fragment>
                                    <Grid item>
                                        <CloudAuthButton product={product} />
                                    </Grid>
                                    <Grid item>
                                        <Button color="primary" variant="contained" onClick={openProductAuth}>
                                            {`Login with API Token`}
                                        </Button>
                                    </Grid>
                                    {isRemoteAuthButtonVisible && (
                                        <Grid item>
                                            <Button onClick={remoteAuth}>Remote Auth</Button>
                                        </Grid>
                                    )}
                                </React.Fragment>
                            )}
                            {!useNewFlow && isRemote && (
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
