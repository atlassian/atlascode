import { ToggleWithLabel } from '@atlassianlabs/guipi-core-components';
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Grid,
    IconButton,
    Radio,
    RadioGroup,
    Switch,
    Tab,
    Tabs,
    TextField,
    Typography,
} from '@material-ui/core';
import Visibility from '@material-ui/icons/Visibility';
import VisibilityOff from '@material-ui/icons/VisibilityOff';
import React, { memo, useCallback, useState } from 'react';
import {
    AuthInfo,
    AuthInfoState,
    BasicAuthInfo,
    emptyAuthInfo,
    emptyUserInfo,
    PATAuthInfo,
    Product,
    ProductJira,
    SiteInfo,
} from '../../../../atlclients/authInfo';
import { emptySiteWithAuthInfo, SiteWithAuthInfo } from '../../../../lib/ipc/toUI/config';
import { useFormValidation } from '../../common/form/useFormValidation';
import { validateRequiredString, validateStartsWithProtocol } from '../../util/fieldValidators';
export type AuthDialogProps = {
    open: boolean;
    doClose: () => void;
    onExited: () => void;
    save: (site: SiteInfo, auth: AuthInfo) => void;
    product: Product;
    authEntry?: SiteWithAuthInfo;
};

type FormFields = {
    baseUrl: string;
    contextPathEnabled: boolean;
    customSSLType: string;
    contextPath: string;
    username: string;
    password: string;
    personalAccessToken: string;
    customSSLEnabled: boolean;
    sslCertPaths: string;
    pfxPath: string;
    pfxPassphrase: string;
};

interface AuthFormState {
    showPassword: boolean;
    showPFXPassphrase: boolean;
}

const emptyAuthFormState: AuthFormState = {
    showPassword: false,
    showPFXPassphrase: false,
};

const normalizeContextPath = (cPath: string): string | undefined => {
    if (!cPath || cPath.trim() === '' || cPath.trim() === '/') {
        return undefined;
    }

    return ('/' + cPath) // Make sure there's at least one leading slash
        .replace(/\/+/g, '/') // Make sure there are no duplicated slashes anywhere
        .replace(/\/+$/g, ''); // Make sure there's no trailing slash
};

const isCustomUrl = (data?: string) => {
    if (!data) {
        return false;
    }

    try {
        const url = new URL(data);

        return (
            !url.hostname.endsWith('atlassian.net') &&
            !url.hostname.endsWith('jira.com') &&
            // Commented out to allow for testing flow of AXON-32 PR: https://github.com/atlassian/atlascode/pull/54/files
            // !url.hostname.endsWith('jira-dev.com') &&
            !url.hostname.endsWith('bitbucket.org') &&
            !url.hostname.endsWith('bb-inf.net')
        );
    } catch (e) {
        return false;
    }
};

interface TabPanelProps {
    children?: React.ReactNode;
    dir?: string;
    index: any;
    value: any;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`full-width-tabpanel-${index}`}
            aria-labelledby={`full-width-tab-${index}`}
            {...other}
        >
            {value === index && <Box p={3}>{children}</Box>}
        </div>
    );
}

export const AuthDialog: React.FunctionComponent<AuthDialogProps> = memo(
    ({ open, doClose, onExited, save, product, authEntry }) => {
        const [authFormState, updateState] = useState(emptyAuthFormState);
        const [authTypeTabIndex, setAuthTypeTabIndex] = useState(0);

        const defaultSiteWithAuth = authEntry ? authEntry : emptySiteWithAuthInfo;

        const defaultSSLType =
            defaultSiteWithAuth.site.pfxPath !== undefined && defaultSiteWithAuth.site.pfxPath !== ''
                ? 'customClientSSL'
                : 'customServerSSL';
        const defaultContextPathEnabled =
            defaultSiteWithAuth.site.contextPath !== undefined && defaultSiteWithAuth.site.contextPath !== '';

        const defaultSSLEnabled =
            defaultSiteWithAuth.site.customSSLCertPaths !== undefined &&
            defaultSiteWithAuth.site.customSSLCertPaths !== '';

        const { register, watches, handleSubmit, errors, isValid } = useFormValidation<FormFields>({
            baseUrl: defaultSiteWithAuth.site.baseLinkUrl,
            contextPathEnabled: defaultContextPathEnabled,
            customSSLEnabled: defaultSSLEnabled,
            customSSLType: defaultSSLType,
        });

        const helperText =
            product.key === ProductJira.key
                ? 'You can enter a cloud or server url like https://jiracloud.atlassian.net or https://jira.mydomain.com'
                : 'You can enter a cloud or server url like https://bitbucket.org or https://bitbucket.mydomain.com';

        const handleSave = useCallback(
            (data: any) => {
                const customSSLCerts =
                    data.customSSLEnabled && data.customSSLType === 'customServerSSL' ? data.sslCertPaths : undefined;
                const pfxCert =
                    data.customSSLEnabled && data.customSSLType === 'customClientSSL' ? data.pfxPath : undefined;
                const pfxPassphrase =
                    data.customSSLEnabled && data.customSSLType === 'customClientSSL' ? data.pfxPassphrase : undefined;
                const contextPath = data.contextPathEnabled ? normalizeContextPath(data.contextPath) : undefined;

                const url = new URL(data.baseUrl);

                const siteInfo: SiteInfo = {
                    host: url.host,
                    protocol: url.protocol,
                    product: product,
                    customSSLCertPaths: customSSLCerts,
                    pfxPath: pfxCert,
                    pfxPassphrase: pfxPassphrase,
                    contextPath: contextPath,
                };

                if (!isCustomUrl(data.baseUrl)) {
                    save(siteInfo, emptyAuthInfo);
                } else if (data.personalAccessToken) {
                    const authInfo: PATAuthInfo = {
                        token: data.personalAccessToken,
                        user: emptyUserInfo,
                        state: AuthInfoState.Valid,
                    };
                    save(siteInfo, authInfo);
                } else {
                    const authInfo: BasicAuthInfo = {
                        username: data.username,
                        password: data.password,
                        user: emptyUserInfo,
                        state: AuthInfoState.Valid,
                    };
                    save(siteInfo, authInfo);
                }

                updateState(emptyAuthFormState);
                setAuthTypeTabIndex(0);
                doClose();
            },
            [doClose, product, save],
        );

        const preventClickDefault = useCallback(
            (event: React.MouseEvent<HTMLButtonElement>) => event.preventDefault(),
            [],
        );

        const registerUrl = useCallback(register(validateStartsWithProtocol), []); // eslint-disable-line react-hooks/exhaustive-deps
        const registerRequiredString = useCallback(register(validateRequiredString), []); // eslint-disable-line react-hooks/exhaustive-deps
        return (
            <Dialog fullWidth maxWidth="md" open={open} onExited={onExited}>
                <DialogTitle>
                    <Typography variant="h4">Authenticate</Typography>
                </DialogTitle>
                <DialogContent>
                    <DialogContentText>{`Add ${product.name} Site`}</DialogContentText>
                    <Grid container direction="column" spacing={2}>
                        <Grid item>
                            <TextField
                                name="baseUrl"
                                defaultValue={defaultSiteWithAuth.site.baseLinkUrl}
                                required
                                autoFocus
                                autoComplete="off"
                                margin="dense"
                                id="baseUrl"
                                label="Base URL"
                                helperText={errors.baseUrl ? errors.baseUrl : helperText}
                                fullWidth
                                inputRef={registerUrl}
                                error={!!errors.baseUrl}
                            />
                        </Grid>
                        {!errors.baseUrl && isCustomUrl(watches.baseUrl) && (
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
                                        label="Use context path"
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
                                            margin="dense"
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
                                            margin="dense"
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
                                            label="Personal Access Token"
                                            defaultValue={''}
                                            helperText={
                                                errors.personalAccessToken ? errors.personalAccessToken : undefined
                                            }
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
                                        label="Use Custom SSL Settings"
                                    />
                                </Grid>

                                {watches.customSSLEnabled && (
                                    <Box marginLeft={3}>
                                        <Grid item>
                                            <RadioGroup
                                                id="customSSLType"
                                                name="customSSLType"
                                                defaultValue={defaultSSLType}
                                            >
                                                <ToggleWithLabel
                                                    control={
                                                        <Radio
                                                            inputRef={register}
                                                            size="small"
                                                            color="primary"
                                                            value="customServerSSL"
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
                                                margin="dense"
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
                                                margin="dense"
                                                id="pfxPath"
                                                name="pfxPath"
                                                label="pfxPath"
                                                defaultValue={defaultSiteWithAuth.site.pfxPath}
                                                helperText={
                                                    errors.pfxPath
                                                        ? errors.pfxPath
                                                        : 'The full absolute path to your custom pfx file'
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
                        )}
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button disabled={!isValid} onClick={handleSubmit(handleSave)} variant="contained" color="primary">
                        Save Site
                    </Button>
                    <Button onClick={doClose} color="primary">
                        Cancel
                    </Button>
                </DialogActions>
                <Box marginBottom={2} />
            </Dialog>
        );
    },
);
