import { Avatar, Grid, MenuItem, TextField, TextFieldProps } from '@material-ui/core';
import React, { useCallback } from 'react';

import { JiraIcon } from '../../icons/JiraIcon';

export interface Site {
    id: string;
    name: string;
    avatarUrl: string;
}

type SiteSelectorProps<T extends Site> = TextFieldProps & {
    sites: T[];
    onSiteChange?: (newSite: T) => void;
};

function useSelect<T extends Site>(props: SiteSelectorProps<T>): JSX.Element {
    const { sites, onSiteChange, onChange, name, id, ...rest } = props;

    const changeHandler = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            if (onSiteChange) {
                const siteId = event.target.value;
                const found = sites.find((s) => s.id === siteId);
                if (found) {
                    onSiteChange(found);
                }
            }

            if (onChange) {
                onChange(event);
            }
        },
        [onChange, onSiteChange, sites],
    );

    return (
        <TextField select name={name} id={id} SelectProps={{ name, id }} onChange={changeHandler} {...rest}>
            {sites.map((site) => {
                return (
                    <MenuItem key={site.id} value={site.id}>
                        <Grid container spacing={1} alignItems="center">
                            <Grid item>
                                <Avatar src={site.avatarUrl}>
                                    <JiraIcon />
                                </Avatar>
                            </Grid>
                            <Grid item>{site.name}</Grid>
                        </Grid>
                    </MenuItem>
                );
            })}
        </TextField>
    );
}

export const SiteSelector = useSelect;
