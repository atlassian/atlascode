import { Grid, IconButton, ListItemSecondaryAction, Switch, Tooltip, Typography } from '@material-ui/core';
import DeleteIcon from '@material-ui/icons/Delete';
import EditIcon from '@material-ui/icons/Edit';
import FilterListIcon from '@material-ui/icons/FilterList';
import InputIcon from '@material-ui/icons/Input';
import NotificationsActiveIcon from '@material-ui/icons/NotificationsActive';
import NotificationsOffIcon from '@material-ui/icons/NotificationsOff';
import React, { memo } from 'react';
import * as l10n from '@vscode/l10n';

type JQLListItemProps = {
    id: string;
    name: string;
    enabled: boolean;
    monitor: boolean;
    filterId?: string;
    toggleEnabled: (event: React.ChangeEvent<HTMLInputElement>) => void;
    toggleMonitor: (event: React.ChangeEvent<HTMLInputElement>) => void;
    handleEdit: (event: React.MouseEvent<HTMLButtonElement>) => void;
    handleDelete: (event: React.MouseEvent<HTMLButtonElement>) => void;
};

export const JQLListItem: React.FunctionComponent<JQLListItemProps> = memo(
    ({ id, name, enabled, monitor, filterId, toggleEnabled, toggleMonitor, handleEdit, handleDelete }) => {
        const enableTT = enabled ? `Disable ${name}` : `Enable ${name}`;
        const typeIcon = filterId ? (
            <Tooltip title={l10n.t('Filter')}>
                <FilterListIcon fontSize="small" />
            </Tooltip>
        ) : (
            <Tooltip title={l10n.t('JQL')}>
                <InputIcon fontSize="small" />
            </Tooltip>
        );
        return (
            <Grid container direction="row" spacing={1}>
                <Grid item>{typeIcon}</Grid>
                <Grid item>
                    <Tooltip title={enableTT}>
                        <Switch id={id} color="primary" checked={enabled} size="small" onChange={toggleEnabled} />
                    </Tooltip>
                </Grid>
                <Grid item>
                    <Typography>{name}</Typography>
                </Grid>
                <Grid item>
                    <ListItemSecondaryAction>
                        {!filterId && (
                            <Tooltip title={l10n.t('Edit {0}', name)}>
                                <IconButton id={id} edge="end" aria-label="edit" onClick={handleEdit}>
                                    <EditIcon fontSize="small" color="inherit" />
                                </IconButton>
                            </Tooltip>
                        )}
                        <Tooltip title={l10n.t('Delete {0}', name)}>
                            <IconButton id={id} edge="end" aria-label="delete" onClick={handleDelete}>
                                <DeleteIcon fontSize="small" color="inherit" />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title={l10n.t('Include in issue notifications')}>
                            <Switch
                                id={id}
                                color="primary"
                                checked={monitor}
                                size="small"
                                checkedIcon={<NotificationsActiveIcon fontSize="small" />}
                                icon={<NotificationsOffIcon fontSize="small" />}
                                onChange={toggleMonitor}
                            />
                        </Tooltip>
                    </ListItemSecondaryAction>
                </Grid>
            </Grid>
        );
    },
);
