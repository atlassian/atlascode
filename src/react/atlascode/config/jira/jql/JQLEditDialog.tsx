import { JqlAutocompleteRestData, JQLInput, SiteSelector, Suggestion } from '@atlassianlabs/guipi-jira-components';
import { JQLErrors } from '@atlassianlabs/jira-pi-common-models';
import {
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
} from '@material-ui/core';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { useAsync } from 'react-async-hook';
import { Controller, useForm } from 'react-hook-form';
import { v4 } from 'uuid';
import { DetailedSiteInfo, emptySiteInfo } from '../../../../../atlclients/authInfo';
import { JQLEntry } from '../../../../../config/model';
import { ConfigControllerContext } from '../../configController';
import { useJqlValidator } from './useJqlValidator';
import * as l10n from '@vscode/l10n';

export type JQLEditDialogProps = {
    open: boolean;
    sites: DetailedSiteInfo[];
    jqlEntry?: JQLEntry;
    onCancel: () => void;
    onSave: (jqlEntry: JQLEntry) => void;
};

type FormFields = {
    name: string;
    site: string;
    jql: string;
};

const emptyJQLOptions: JqlAutocompleteRestData = {
    visibleFieldNames: [],
    visibleFunctionNames: [],
    jqlReservedWords: [],
};

export const JQLEditDialog: React.FunctionComponent<JQLEditDialogProps> = ({
    open,
    sites,
    jqlEntry,
    onCancel,
    onSave,
}) => {
    const controller = useContext(ConfigControllerContext);
    const [site, setSite] = useState(Array.isArray(sites) && sites.length > 0 ? sites[0] : emptySiteInfo);

    const jqlRestOptions = useAsync(async () => {
        return await controller.fetchJqlOptions(site);
    }, [site]);

    const { register, handleSubmit, errors, formState, control } = useForm<FormFields>({
        mode: 'onChange',
    });

    const validateJql = useJqlValidator(site);

    register('jql', {
        validate: async (value?: string) => {
            if (value) {
                const jqlErrors: JQLErrors = await validateJql(value);
                return jqlErrors.errors.length > 0 ? jqlErrors.errors.join(',') : undefined;
            }
            return undefined;
        },
    });

    const jqlFetcher = useCallback(
        async (
            fieldName: string,
            userInput: string,
            predicateName?: string,
            abortSignal?: AbortSignal,
        ): Promise<Suggestion[]> => {
            return await controller.fetchJqlSuggestions(site, fieldName, userInput, predicateName, abortSignal);
        },
        [controller, site],
    );

    const handleSiteChange = useCallback((site: DetailedSiteInfo) => {
        setSite(site);
    }, []);

    const handleSave = useCallback(
        (data: FormFields) => {
            var entry: JQLEntry = jqlEntry
                ? jqlEntry
                : { id: v4(), siteId: '', name: '', query: '', enabled: true, monitor: true };

            var newEntry = Object.assign({}, entry, {
                siteId: data.site,
                name: data.name,
                // [VSCODE-1282] Having to revert to jqlEntry as there's a bug with how default values are handled currently
                query: data.jql || jqlEntry?.query,
            });

            onSave(newEntry);
        },
        [jqlEntry, onSave],
    );

    useEffect(() => {
        if (sites.length > 0) {
            setSite(sites[0]);
        }
    }, [sites]);

    useEffect(() => {
        if (jqlEntry) {
            var foundSite = sites.find((s) => s.id === jqlEntry.siteId);
            if (foundSite) {
                setSite(foundSite);
            }
        }
    }, [jqlEntry, sites]);

    return (
        <Dialog fullWidth maxWidth="md" open={open} onClose={onCancel}>
            <DialogTitle>
                <Typography variant="h4">{l10n.t('JQL Editor')}</Typography>
            </DialogTitle>
            <DialogContent>
                <DialogContentText>{l10n.t('Configure JQL Entry')}</DialogContentText>
                <Grid container direction="column" spacing={2}>
                    <Grid item>
                        <TextField
                            required
                            id="name"
                            name="name"
                            label={l10n.t('Name')}
                            defaultValue={jqlEntry ? jqlEntry.name : ''}
                            helperText={errors.name ? errors.name.message : undefined}
                            fullWidth
                            error={!!errors.name}
                            inputRef={register({
                                required: 'Name is required',
                            })}
                        />
                    </Grid>
                    <Grid item>
                        <Controller
                            control={control}
                            name="site"
                            sites={sites}
                            defaultValue={site.id}
                            as={
                                <SiteSelector
                                    label={l10n.t('Select a site')}
                                    required
                                    error={!!errors.site}
                                    sites={sites}
                                    helperText={errors.site ? errors.site.message : ''}
                                    fullWidth
                                    onSiteChange={handleSiteChange}
                                />
                            }
                        />
                    </Grid>
                    <Grid item>
                        <div>
                            <Controller
                                control={control}
                                name="jql"
                                as={
                                    <JQLInput
                                        defaultValue={jqlEntry ? jqlEntry.query : ''}
                                        loading={jqlRestOptions.loading}
                                        disabled={jqlRestOptions.loading}
                                        required
                                        id="jql"
                                        name="jql"
                                        label={l10n.t('Enter JQL')}
                                        fullWidth
                                        jqlAutocompleteRestData={
                                            jqlRestOptions.result ? jqlRestOptions.result : emptyJQLOptions
                                        }
                                        suggestionFetcher={jqlFetcher}
                                        helperText={errors.jql ? errors.jql.message : undefined}
                                        error={!!errors.jql}
                                    />
                                }
                            />
                        </div>
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button
                    disabled={!formState.isValid}
                    onClick={handleSubmit(handleSave)}
                    variant="contained"
                    color="primary"
                >
                    Save JQL
                </Button>
                <Button onClick={onCancel} color="primary">
                    Cancel
                </Button>
            </DialogActions>
            <Box marginBottom={3} />
        </Dialog>
    );
};
