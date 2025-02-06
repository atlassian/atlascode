import { SiteSelector } from '@atlassianlabs/guipi-jira-components';
import { FilterSearchResult } from '@atlassianlabs/jira-pi-common-models';
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Grid,
    Typography,
} from '@material-ui/core';
import React, { useCallback, useEffect, useState } from 'react';
import { v4 } from 'uuid';
import { DetailedSiteInfo, emptySiteInfo } from '../../../../../atlclients/authInfo';
import { JQLEntry } from '../../../../../config/model';
import { FilterSearchResultsTable } from './FilterSearchResultsTable';
import * as l10n from '@vscode/l10n';

export type FilterSearchDialogProps = {
    open: boolean;
    sites: DetailedSiteInfo[];
    onCancel: () => void;
    onSave: (jqlEntries: JQLEntry[]) => void;
};

export const FilterSearchDialog: React.FunctionComponent<FilterSearchDialogProps> = ({
    open,
    sites,
    onCancel,
    onSave,
}) => {
    const [site, setSite] = useState(Array.isArray(sites) && sites.length > 0 ? sites[0] : emptySiteInfo);
    const [selectedFilters, setSelectedFilters] = useState<FilterSearchResult[]>([]);

    const handleSiteChange = useCallback((site: DetailedSiteInfo) => {
        setSite(site);
    }, []);

    const handleSelectedFilters = useCallback((filters: FilterSearchResult[]) => {
        setSelectedFilters(filters);
    }, []);

    const handleSave = useCallback(() => {
        const entries: JQLEntry[] = selectedFilters.map((f) => {
            return {
                id: v4(),
                siteId: site.id,
                filterId: f.id,
                name: f.name,
                query: f.jql,
                enabled: true,
                monitor: true,
            };
        });

        onSave(entries);
    }, [selectedFilters, onSave, site]);

    useEffect(() => {
        if (sites.length > 0) {
            setSite(sites[0]);
        }
    }, [sites]);

    return (
        <Dialog fullWidth maxWidth="md" open={open} onClose={onCancel}>
            <DialogTitle>
                <Typography variant="h4">{l10n.t('Filter Search')}</Typography>
            </DialogTitle>
            <DialogContent>
                <DialogContentText>{l10n.t('Import Filters')}</DialogContentText>
                <Grid container direction="column" spacing={2}>
                    <Grid item>
                        <SiteSelector
                            name="site"
                            value={site.id}
                            label={l10n.t('Select a site')}
                            required
                            sites={sites}
                            fullWidth
                            onSiteChange={handleSiteChange}
                        />
                    </Grid>
                    <Grid item>
                        <FilterSearchResultsTable site={site} onSelected={handleSelectedFilters} />
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleSave} variant="contained" color="primary" disabled={selectedFilters.length < 1}>
                    Import Filters
                </Button>
                <Button onClick={onCancel} color="primary">
                    Cancel
                </Button>
            </DialogActions>
            <Box marginBottom={3} />
        </Dialog>
    );
};
