import { ToggleWithLabel } from '@atlassianlabs/guipi-core-components';
import { Box, Grid, IconButton, Radio, RadioGroup, Switch, Tab, Tabs, TextField } from '@material-ui/core';
import Visibility from '@material-ui/icons/Visibility';
import VisibilityOff from '@material-ui/icons/VisibilityOff';
import { SiteWithAuthInfo } from 'src/lib/ipc/toUI/config';
import React, { useState } from 'react';
import { TabPanel } from './TabPanel';
import { BasicAuthInfo } from 'src/atlclients/authInfo';
import * as l10n from '@vscode/l10n';

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
    preventClickDefault: any;
    defaultSSLType: string;
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
    preventClickDefault,
    defaultSSLType,
}: CustomSiteAuthFormProps) => {
    const [authTypeTabIndex, setAuthTypeTabIndex] = useState(0);

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
                        />
                    }
                    spacing={1}
                    variant="body1"
                    label={l10n.t('Use context path')}
                />
            </Grid>
            {watches.contextPathEnabled && (
                <Box marginLeft={3}>
                    <Grid item>
                        <TextField
                            required
                            autoFocus
                            margin="dense"
                            id="contextPath"
                            name="contextPath"
                            label="Context path"
                            defaultValue={defaultSiteWithAuth.site.contextPath}
                            helperText={
                                errors.contextPath
                                    ? errors.contextPath
                                    : l10n.t('The context path your server is mounted at (e.g. /issues or /jira)')
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
                <Tab label={l10n.t('Username and Password')} />
                <Tab label={l10n.t('Personal Access Token')} />
            </Tabs>
            <TabPanel value={authTypeTabIndex} index={0}>
                <Grid item>
                    <TextField
                        required
                        margin="dense"
                        id="username"
                        name="username"
                        label={l10n.t('Username')}
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
                        margin="dense"
                        id="password"
                        name="password"
                        label={l10n.t('Password')}
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
                        margin="dense"
                        id="personalAccessToken"
                        name="personalAccessToken"
                        label={l10n.t('Personal Access Token')}
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
                        />
                    }
                    spacing={1}
                    variant="body1"
                    label={l10n.t('Use Custom SSL Settings')}
                />
            </Grid>

            {watches.customSSLEnabled && (
                <Box marginLeft={3}>
                    <Grid item>
                        <RadioGroup id="customSSLType" name="customSSLType" defaultValue={defaultSSLType}>
                            <ToggleWithLabel
                                control={
                                    <Radio inputRef={register} size="small" color="primary" value="customServerSSL" />
                                }
                                spacing={1}
                                label={l10n.t('Use custom CA certificate(s) (e.g. a self-signed cert)')}
                                variant="body1"
                            />
                            <ToggleWithLabel
                                control={
                                    <Radio inputRef={register} value="customClientSSL" color="primary" size="small" />
                                }
                                spacing={1}
                                label={l10n.t(
                                    'Use custom client-side certificates (CA certificates bundled in PKCS#12 (pfx))',
                                )}
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
                            margin="dense"
                            id="sslCertPaths"
                            name="sslCertPaths"
                            label="sslCertPaths"
                            defaultValue={defaultSiteWithAuth.site.customSSLCertPaths}
                            helperText={
                                errors.sslCertPaths
                                    ? errors.sslCertPaths
                                    : l10n.t('The full absolute path to your custom certificates separated by commas')
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
                            margin="dense"
                            id="pfxPath"
                            name="pfxPath"
                            label="pfxPath"
                            defaultValue={defaultSiteWithAuth.site.pfxPath}
                            helperText={
                                errors.pfxPath
                                    ? errors.pfxPath
                                    : l10n.t('The full absolute path to your custom pfx file')
                            }
                            fullWidth
                            error={!!errors.pfxPath}
                            inputRef={registerRequiredString}
                        />
                    </Grid>
                    <Grid item>
                        <TextField
                            margin="dense"
                            id="pfxPassphrase"
                            name="pfxPassphrase"
                            label={l10n.t('PFX passphrase')}
                            type={authFormState.showPFXPassphrase ? 'text' : 'password'}
                            helperText={l10n.t('The passphrase used to decrypt the pfx file (if required)')}
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
