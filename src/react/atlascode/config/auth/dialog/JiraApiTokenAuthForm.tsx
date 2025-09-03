import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { Box, Grid, IconButton, Link, TextField } from '@mui/material';
import React, { useMemo } from 'react';
import { BasicAuthInfo } from 'src/atlclients/authInfo';
import { SiteWithAuthInfo } from 'src/lib/ipc/toUI/config';

import { AuthFormState } from './types';

type JiraBasicAuthFormProps = {
    defaultSiteWithAuth: SiteWithAuthInfo;
    errors: any;
    registerRequiredString: any;
    authFormState: AuthFormState;
    updateState: (state: AuthFormState) => void;
    preventClickDefault: (event: React.MouseEvent<HTMLButtonElement>) => void;
};

export const JiraBasicAuthForm = ({
    defaultSiteWithAuth,
    errors,
    registerRequiredString,
    authFormState,
    updateState,
    preventClickDefault,
}: JiraBasicAuthFormProps) => {
    const defaultSiteUsername = useMemo(
        () => (defaultSiteWithAuth.auth as BasicAuthInfo).username || defaultSiteWithAuth.auth.user.email,
        [defaultSiteWithAuth],
    );

    return (
        <React.Fragment>
            <Grid item>
                <TextField
                    required
                    size="small"
                    id="username"
                    name="username"
                    label="Email"
                    defaultValue={defaultSiteUsername}
                    helperText={errors.username ? errors.username : undefined}
                    fullWidth
                    error={!!errors.username}
                    inputRef={registerRequiredString}
                />
            </Grid>
            <Grid item>
                <Box fontSize="small">
                    <Link href="https://id.atlassian.com/manage-profile/security/api-tokens">Create an API Token</Link>
                </Box>
                <TextField
                    required
                    size="small"
                    id="password"
                    name="password"
                    label="API token"
                    defaultValue={(defaultSiteWithAuth.auth as BasicAuthInfo).password}
                    type={authFormState.showPassword ? 'text' : 'password'}
                    helperText={errors.password ? errors.password : undefined}
                    fullWidth
                    error={!!errors.password}
                    inputRef={registerRequiredString}
                    InputProps={{
                        endAdornment: (
                            <IconButton
                                onClick={() =>
                                    updateState({
                                        ...authFormState,
                                        showPassword: !authFormState.showPassword,
                                    })
                                }
                                onMouseDown={preventClickDefault}
                                size="large"
                            >
                                {authFormState.showPassword ? (
                                    <Visibility fontSize="small" />
                                ) : (
                                    <VisibilityOff fontSize="small" />
                                )}
                            </IconButton>
                        ),
                    }}
                />
            </Grid>
        </React.Fragment>
    );
};
