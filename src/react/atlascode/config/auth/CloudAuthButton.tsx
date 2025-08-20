import { Button } from '@mui/material';
import React, { useContext } from 'react';

import { AuthInfoState, emptyUserInfo, Product, ProductJira } from '../../../../atlclients/authInfo';
import { ConfigControllerContext } from '../configController';

type CloudAuthButtonProps = {
    product: Product;
};

export const CloudAuthButton: React.FunctionComponent<CloudAuthButtonProps> = ({ product }) => {
    const loginText = `Login with OAuth`;
    const controller = useContext(ConfigControllerContext);

    const handleCloudProd = () => {
        const hostname = product.key === ProductJira.key ? 'atlassian.net' : 'bitbucket.org';
        controller.login({ host: hostname, product: product }, { user: emptyUserInfo, state: AuthInfoState.Valid });
    };

    return (
        <Button id="settings-login-cloud-button" color="primary" variant="contained" onClick={() => handleCloudProd()}>
            {loginText}
        </Button>
    );
};
