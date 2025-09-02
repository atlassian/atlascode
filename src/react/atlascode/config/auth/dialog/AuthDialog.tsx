import {
    Autocomplete,
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Grid,
    TextField,
    Typography,
} from '@mui/material';
import React, { memo, useCallback, useMemo, useState } from 'react';
import { AuthFormType } from 'src/react/atlascode/constants';
import { isCustomUrl } from 'src/react/atlascode/util/authFormUtils';

import {
    AuthInfo,
    AuthInfoState,
    BasicAuthInfo,
    emptyAuthInfo,
    emptyUserInfo,
    isOAuthInfo,
    PATAuthInfo,
    Product,
    ProductJira,
    SiteInfo,
} from '../../../../../atlclients/authInfo';
import { emptySiteWithAuthInfo, SiteWithAuthInfo } from '../../../../../lib/ipc/toUI/config';
import { useFormValidation } from '../../../common/form/useFormValidation';
import { validateRequiredString, validateUrl } from '../../../util/fieldValidators';
import { CustomSiteAuthForm } from './CustomSiteAuthForm';
import { JiraBasicAuthForm } from './JiraApiTokenAuthForm';
import { emptyAuthFormState, FormFields } from './types';

export type AuthDialogProps = {
    open: boolean;
    doClose: () => void;
    onExited: () => void;
    save: (site: SiteInfo, auth: AuthInfo) => void;
    product: Product;
    authEntry: SiteWithAuthInfo | undefined;
    allSitesWithAuth: SiteWithAuthInfo[];
};

export const AuthDialog: React.FunctionComponent<AuthDialogProps> = memo(
    ({ open, doClose, onExited, save, product, authEntry, allSitesWithAuth }) => {
        const [authFormState, updateState] = useState(emptyAuthFormState);
        const [authTypeTabIndex, setAuthTypeTabIndex] = useState(0);

        const defaultSiteWithAuth = authEntry ? authEntry : emptySiteWithAuthInfo;

        const autocompleteSites = useMemo(() => {
            return allSitesWithAuth.filter((x) => isOAuthInfo(x.auth)).map((x) => x.site.baseLinkUrl);
        }, [allSitesWithAuth]);

        const defaultSSLType =
            defaultSiteWithAuth.site.pfxPath !== undefined && defaultSiteWithAuth.site.pfxPath !== ''
                ? 'customClientSSL'
                : 'customServerSSL';

        const defaultContextPathEnabled =
            defaultSiteWithAuth.site.contextPath !== undefined && defaultSiteWithAuth.site.contextPath !== '';

        const defaultSSLEnabled =
            defaultSiteWithAuth.site.customSSLCertPaths !== undefined &&
            defaultSiteWithAuth.site.customSSLCertPaths !== '';

        const initialFormValues = {
            baseUrl: defaultSiteWithAuth.site.baseLinkUrl,
            contextPathEnabled: defaultContextPathEnabled,
            contextPath: defaultSiteWithAuth.site.contextPath || '',
            customSSLEnabled: defaultSSLEnabled,
            customSSLType: defaultSSLType,
            sslCertPaths: defaultSiteWithAuth.site.customSSLCertPaths || '',
            pfxPath: defaultSiteWithAuth.site.pfxPath || '',
            pfxPassphrase: defaultSiteWithAuth.site.pfxPassphrase || '',
            username: (defaultSiteWithAuth.auth as BasicAuthInfo).username || '',
            password: (defaultSiteWithAuth.auth as BasicAuthInfo).password || '',
            personalAccessToken: (defaultSiteWithAuth.auth as PATAuthInfo).token || '',
        };

        const { register, watches, handleSubmit, errors, isValid, authFormType, updateWatches, authSiteFound } =
            useFormValidation<FormFields>(authTypeTabIndex, product, initialFormValues, allSitesWithAuth);

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

                switch (authFormType) {
                    case AuthFormType.JiraCloud:
                        const authInfo: BasicAuthInfo = {
                            username: data.username,
                            password: data.password,
                            user: emptyUserInfo,
                            state: AuthInfoState.Valid,
                        };
                        save(siteInfo, authInfo);
                        break;
                    case AuthFormType.CustomSite:
                        if (data.personalAccessToken) {
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
                        break;
                    default:
                        if (data.baseUrl && !isCustomUrl(data.baseUrl)) {
                            save(siteInfo, emptyAuthInfo);
                        }
                        break;
                }

                updateState(emptyAuthFormState);
                doClose();
            },
            [doClose, product, save, authFormType],
        );

        const handleCancel = useCallback(() => {
            updateWatches({
                contextPath: '',
                sslCertPaths: '',
                pfxPath: '',
                pfxPassphrase: '',
                contextPathEnabled: false,
                customSSLEnabled: false,
                customSSLType: 'customServerSSL',
                username: '',
                password: '',
                personalAccessToken: '',
                baseUrl: '',
            });

            doClose();
        }, [doClose, updateWatches]);

        const preventClickDefault = useCallback(
            (event: React.MouseEvent<HTMLButtonElement>) => event.preventDefault(),
            [],
        );

        const registerUrl = useCallback(register(validateUrl), []); // eslint-disable-line react-hooks/exhaustive-deps
        const registerRequiredString = useCallback(register(validateRequiredString), []); // eslint-disable-line react-hooks/exhaustive-deps

        return (
            <Dialog
                fullWidth
                maxWidth="md"
                open={open}
                TransitionProps={{
                    onExited,
                }}
            >
                <DialogTitle>
                    <Typography variant="h4">Authenticate</Typography>
                </DialogTitle>
                <DialogContent>
                    <DialogContentText>{`Add ${product.name} Site`}</DialogContentText>
                    <Grid container direction="column" spacing={2}>
                        <Grid item>
                            {autocompleteSites.length > 0 && (
                                <Autocomplete
                                    options={autocompleteSites}
                                    getOptionLabel={(option: string) => option}
                                    value={
                                        autocompleteSites.length === 1
                                            ? autocompleteSites[0]
                                            : defaultSiteWithAuth.site.baseLinkUrl
                                    }
                                    size="small"
                                    openOnFocus={autocompleteSites.length > 1}
                                    selectOnFocus
                                    blurOnSelect
                                    freeSolo
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            name="baseUrl"
                                            required
                                            autoFocus={autocompleteSites.length !== 1}
                                            id="baseUrl"
                                            label="Base URL"
                                            helperText={errors.baseUrl || helperText}
                                            inputRef={registerUrl}
                                            error={!!errors.baseUrl}
                                        />
                                    )}
                                />
                            )}
                            {autocompleteSites.length === 0 && (
                                <TextField
                                    name="baseUrl"
                                    defaultValue={defaultSiteWithAuth.site.baseLinkUrl}
                                    required
                                    autoFocus
                                    autoComplete="off"
                                    size="small"
                                    id="baseUrl"
                                    label="Base URL"
                                    helperText={errors.baseUrl || helperText}
                                    fullWidth
                                    inputRef={registerUrl}
                                    error={!!errors.baseUrl}
                                />
                            )}
                        </Grid>

                        {authFormType === AuthFormType.JiraCloud && (
                            // For Jira Cloud, show the API token form as the only option
                            <JiraBasicAuthForm
                                defaultSiteWithAuth={authSiteFound ?? defaultSiteWithAuth}
                                authFormState={authFormState}
                                updateState={updateState}
                                errors={errors}
                                registerRequiredString={registerRequiredString}
                                preventClickDefault={preventClickDefault}
                            />
                        )}

                        {authFormType === AuthFormType.CustomSite && (
                            // For custom sites, show the tabbed view with BasicAuth, PAT, and all the options
                            <CustomSiteAuthForm
                                defaultSiteWithAuth={authSiteFound ?? defaultSiteWithAuth}
                                defaultContextPathEnabled={defaultContextPathEnabled}
                                defaultSSLEnabled={defaultSSLEnabled}
                                watches={watches}
                                register={register}
                                errors={errors}
                                registerRequiredString={registerRequiredString}
                                authFormState={authFormState}
                                updateState={updateState}
                                updateWatches={updateWatches}
                                preventClickDefault={preventClickDefault}
                                defaultSSLType={defaultSSLType}
                                authTypeTabIndex={authTypeTabIndex}
                                setAuthTypeTabIndex={setAuthTypeTabIndex}
                            />
                        )}
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button
                        disabled={!isValid && authFormType !== AuthFormType.None}
                        onClick={handleSubmit(handleSave)}
                        variant="contained"
                        color="primary"
                    >
                        Save Site
                    </Button>
                    <Button onClick={handleCancel} color="primary">
                        Cancel
                    </Button>
                </DialogActions>
                <Box marginBottom={2} />
            </Dialog>
        );
    },
);

const normalizeContextPath = (cPath: string): string | undefined => {
    if (!cPath || cPath.trim() === '' || cPath.trim() === '/') {
        return undefined;
    }

    return ('/' + cPath) // Make sure there's at least one leading slash
        .replace(/\/+/g, '/') // Make sure there are no duplicated slashes anywhere
        .replace(/\/+$/g, ''); // Make sure there's no trailing slash
};
