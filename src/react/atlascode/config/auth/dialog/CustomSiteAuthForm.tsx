import { ToggleWithLabel } from '@atlassianlabs/guipi-core-components';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { Box, Grid, IconButton, Radio, RadioGroup, Switch, Tab, Tabs, TextField } from '@mui/material';
import React from 'react';
import { BasicAuthInfo } from 'src/atlclients/authInfo';
import { SiteWithAuthInfo } from 'src/lib/ipc/toUI/config';
import { FIELD_NAMES } from 'src/react/atlascode/constants';
import { clearFieldsAndWatches } from 'src/react/atlascode/util/authFormUtils';

import { TabPanel } from './TabPanel';

export type CustomSiteAuthFormProps = {
    defaultSiteWithAuth: SiteWithAuthInfo;
    defaultContextPathEnabled: boolean;
    defaultSSLEnabled: boolean;
    watches: any;
    register: any;
    errors: any;
    registerRequiredString: any;
    authFormState: any;
    updateState: any;
    updateWatches: (updates: Record<string, string>) => void;
    preventClickDefault: any;
    defaultSSLType: string;
    authTypeTabIndex: number;
    setAuthTypeTabIndex: (index: number) => void;
};

export const CustomSiteAuthForm = ({
    defaultSiteWithAuth,
    defaultContextPathEnabled,
    defaultSSLEnabled,
    watches,
    register,
    errors,
    registerRequiredString,
    authFormState,
    updateState,
    updateWatches,
    preventClickDefault,
    defaultSSLType,
    authTypeTabIndex,
    setAuthTypeTabIndex,
}: CustomSiteAuthFormProps) => {
    return (
        <React.Fragment>
            <Grid item>
                <ToggleWithLabel
                    control={
                        <Switch
                            name="contextPathEnabled"
                            defaultChecked={defaultContextPathEnabled}
                            size="small"
                            color="primary"
                            id="contextPathEnabled"
                            inputRef={register}
                            onChange={(e) => {
                                if (!e.target.checked) {
                                    clearFieldsAndWatches(updateWatches, { contextPath: '' }, [
                                        FIELD_NAMES.CONTEXT_PATH,
                                    ]);
                                }
                            }}
                        />
                    }
                    spacing={1}
                    variant="body1"
                    label="Use context path"
                />
            </Grid>
            {watches.contextPathEnabled && (
                <Box marginLeft={3}>
                    <Grid item>
                        <TextField
                            required
                            autoFocus
                            size="small"
                            id="contextPath"
                            name="contextPath"
                            label="Context path"
                            defaultValue={defaultSiteWithAuth.site.contextPath}
                            helperText={
                                errors.contextPath
                                    ? errors.contextPath
                                    : 'The context path your server is mounted at (e.g. /issues or /jira)'
                            }
                            fullWidth
                            error={!!errors.contextPath}
                            inputRef={registerRequiredString}
                        />
                    </Grid>
                </Box>
            )}
            <Tabs
                value={authTypeTabIndex}
                onChange={(event: React.ChangeEvent<{}>, value: any) => {
                    setAuthTypeTabIndex(value);
                }}
            >
                <Tab label="Username and Password" />
                <Tab label="Personal Access Token" />
            </Tabs>
            <TabPanel value={authTypeTabIndex} index={0}>
                <Grid item>
                    <TextField
                        required
                        size="small"
                        id="username"
                        name="username"
                        label="Username"
                        defaultValue={(defaultSiteWithAuth.auth as BasicAuthInfo).username}
                        helperText={errors.username ? errors.username : undefined}
                        fullWidth
                        error={!!errors.username}
                        inputRef={registerRequiredString}
                    />
                </Grid>
                <Grid item>
                    <TextField
                        required
                        size="small"
                        id="password"
                        name="password"
                        label="Password"
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
            </TabPanel>
            <TabPanel value={authTypeTabIndex} index={1}>
                <Grid item>
                    <TextField
                        required
                        type="password"
                        size="small"
                        id="personalAccessToken"
                        name="personalAccessToken"
                        label="Personal Access Token"
                        defaultValue={''}
                        helperText={errors.personalAccessToken ? errors.personalAccessToken : undefined}
                        fullWidth
                        error={!!errors.personalAccessToken}
                        inputRef={registerRequiredString}
                    />
                </Grid>
            </TabPanel>
            <Grid item>
                <ToggleWithLabel
                    control={
                        <Switch
                            defaultChecked={defaultSSLEnabled}
                            name="customSSLEnabled"
                            size="small"
                            color="primary"
                            id="customSSLEnabled"
                            value="customSSLEnabled"
                            inputRef={register}
                            onChange={(e) => {
                                if (!e.target.checked) {
                                    clearFieldsAndWatches(
                                        updateWatches,
                                        { sslCertPaths: '', pfxPath: '', pfxPassphrase: '' },
                                        [FIELD_NAMES.SSL_CERT_PATHS, FIELD_NAMES.PFX_PATH, FIELD_NAMES.PFX_PASSPHRASE],
                                    );
                                }
                            }}
                        />
                    }
                    spacing={1}
                    variant="body1"
                    label="Use Custom SSL Settings"
                />
            </Grid>
            {watches.customSSLEnabled && (
                <Box marginLeft={3}>
                    <Grid item>
                        <RadioGroup id="customSSLType" name="customSSLType" defaultValue={defaultSSLType}>
                            <ToggleWithLabel
                                control={
                                    <Radio
                                        inputRef={register}
                                        size="small"
                                        color="primary"
                                        value="customServerSSL"
                                        onChange={(e) => {
                                            if (e.target.value === 'customServerSSL') {
                                                clearFieldsAndWatches(
                                                    updateWatches,
                                                    { pfxPath: '', pfxPassphrase: '' },
                                                    [FIELD_NAMES.PFX_PATH, FIELD_NAMES.PFX_PASSPHRASE],
                                                );
                                            }
                                        }}
                                    />
                                }
                                spacing={1}
                                label="Use custom CA certificate(s) (e.g. a self-signed cert)"
                                variant="body1"
                            />
                            <ToggleWithLabel
                                control={
                                    <Radio
                                        inputRef={register}
                                        value="customClientSSL"
                                        color="primary"
                                        size="small"
                                        onChange={(e) => {
                                            if (e.target.value === 'customClientSSL') {
                                                clearFieldsAndWatches(updateWatches, { sslCertPaths: '' }, [
                                                    FIELD_NAMES.SSL_CERT_PATHS,
                                                ]);
                                            }
                                        }}
                                    />
                                }
                                spacing={1}
                                label="Use custom client-side certificates (CA certificates bundled in PKCS#12 (pfx)"
                                variant="body1"
                            />
                        </RadioGroup>
                    </Grid>
                </Box>
            )}
            {watches.customSSLEnabled && watches.customSSLType === 'customServerSSL' && (
                <Box marginLeft={3}>
                    <Grid item>
                        <TextField
                            required
                            size="small"
                            id="sslCertPaths"
                            name="sslCertPaths"
                            label="sslCertPaths"
                            defaultValue={defaultSiteWithAuth.site.customSSLCertPaths}
                            helperText={
                                errors.sslCertPaths
                                    ? errors.sslCertPaths
                                    : 'The full absolute path to your custom certificates separated by commas'
                            }
                            fullWidth
                            error={!!errors.sslCertPaths}
                            inputRef={registerRequiredString}
                        />
                    </Grid>
                </Box>
            )}
            {watches.customSSLEnabled && watches.customSSLType === 'customClientSSL' && (
                <Box marginLeft={3}>
                    <Grid item>
                        <TextField
                            required
                            size="small"
                            id="pfxPath"
                            name="pfxPath"
                            label="pfxPath"
                            defaultValue={defaultSiteWithAuth.site.pfxPath}
                            helperText={
                                errors.pfxPath ? errors.pfxPath : 'The full absolute path to your custom pfx file'
                            }
                            fullWidth
                            error={!!errors.pfxPath}
                            inputRef={registerRequiredString}
                        />
                    </Grid>
                    <Grid item>
                        <TextField
                            size="small"
                            id="pfxPassphrase"
                            name="pfxPassphrase"
                            label="PFX passphrase"
                            type={authFormState.showPFXPassphrase ? 'text' : 'password'}
                            helperText="The passphrase used to decrypt the pfx file (if required)"
                            fullWidth
                            defaultValue={defaultSiteWithAuth.site.pfxPassphrase}
                            inputRef={register}
                            InputProps={{
                                endAdornment: (
                                    <IconButton
                                        onClick={() =>
                                            updateState({
                                                ...authFormState,
                                                showPFXPassphrase: !authFormState.showPFXPassphrase,
                                            })
                                        }
                                        onMouseDown={preventClickDefault}
                                        size="large"
                                    >
                                        {authFormState.showPFXPassphrase ? (
                                            <Visibility fontSize="small" />
                                        ) : (
                                            <VisibilityOff fontSize="small" />
                                        )}
                                    </IconButton>
                                ),
                            }}
                        />
                    </Grid>
                </Box>
            )}
        </React.Fragment>
    );
};
