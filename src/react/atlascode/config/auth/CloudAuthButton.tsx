import { Button } from '@material-ui/core';
import CloudIcon from '@material-ui/icons/Cloud';
import React, { useContext } from 'react';
import { AuthInfoState, emptyUserInfo, Product, ProductJira } from '../../../../atlclients/authInfo';
import { ConfigControllerContext } from '../configController';
import * as l10n from '@vscode/l10n';

type CloudAuthButtonProps = {
    product: Product;
};

export const CloudAuthButton: React.FunctionComponent<CloudAuthButtonProps> = ({ product }) => {
    const loginText = l10n.t('Login to {0} Cloud', product.name);
    const controller = useContext(ConfigControllerContext);

    const handleCloudProd = () => {
        const hostname = product.key === ProductJira.key ? 'atlassian.net' : 'bitbucket.org';
        controller.login({ host: hostname, product: product }, { user: emptyUserInfo, state: AuthInfoState.Valid });
    };

    return (
        <Button
            id="settings-login-cloud-button"
            variant="contained"
            color="primary"
            startIcon={<CloudIcon />}
            onClick={() => handleCloudProd()}
        >
            {loginText}
        </Button>
    );
};
