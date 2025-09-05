import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import FilterListIcon from '@mui/icons-material/FilterList';
import InputIcon from '@mui/icons-material/Input';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import NotificationsOffIcon from '@mui/icons-material/NotificationsOff';
import { Grid, IconButton, ListItemSecondaryAction, Switch, Tooltip, Typography } from '@mui/material';
import React, { memo } from 'react';

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
            <Tooltip title="Filter">
                <FilterListIcon fontSize="small" />
            </Tooltip>
        ) : (
            <Tooltip title="JQL">
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
                            <Tooltip title={`Edit ${name}`}>
                                <IconButton id={id} edge="end" aria-label="edit" onClick={handleEdit} size="large">
                                    <EditIcon fontSize="small" color="inherit" />
                                </IconButton>
                            </Tooltip>
                        )}
                        <Tooltip title={`Delete ${name}`}>
                            <IconButton id={id} edge="end" aria-label="delete" onClick={handleDelete} size="large">
                                <DeleteIcon fontSize="small" color="inherit" />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Inlclude in issue notifications">
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
