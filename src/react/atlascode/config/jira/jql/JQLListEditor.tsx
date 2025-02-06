import { DragReorderList } from '@atlassianlabs/guipi-core-components';
import { Box, darken, Grid, lighten, makeStyles, Paper, Theme, Typography } from '@material-ui/core';
import DragIndicatorIcon from '@material-ui/icons/DragIndicator';
import equal from 'fast-deep-equal/es6';
import React, { memo, useCallback, useContext, useEffect, useState } from 'react';
import { unstable_trace as trace } from 'scheduler/tracing';
import { DetailedSiteInfo } from '../../../../../atlclients/authInfo';
import { JQLEntry } from '../../../../../config/model';
import { ConfigControllerContext } from '../../configController';
import { useFilterDialog } from '../filters/useFilterDialog';
import { JQLListItem } from './JQLListItem';
import { JQLSpeedDial } from './JQLSpeedDial';
import { useJqlEditDialog } from './useJqlEditDialog';
import * as l10n from '@vscode/l10n';

const reorder = (jqlList: JQLEntry[], oldIndex: number, newIndex: number): JQLEntry[] => {
    const result = [...jqlList];
    const [removed] = result.splice(oldIndex, 1);
    result.splice(newIndex, 0, removed);

    return result;
};
type JQLListEditorProps = {
    disabled?: boolean;
    jqlList: JQLEntry[];
    sites: DetailedSiteInfo[];
};

const useStyles = makeStyles(
    (theme: Theme) =>
        ({
            root: {
                flexGrow: 1,
            },
            paper: {
                backgroundColor:
                    theme.palette.type === 'dark'
                        ? lighten(theme.palette.background.paper, 0.05)
                        : darken(theme.palette.background.paper, 0.05),
            },
        }) as const,
);

export const JQLListEditor: React.FunctionComponent<JQLListEditorProps> = memo(({ sites, jqlList }) => {
    const classes = useStyles();
    const controller = useContext(ConfigControllerContext);
    const [internalList, setInternalList] = useState<JQLEntry[]>(jqlList);
    const [dirtyList, setDirtyList] = useState<boolean>(false);
    const [editingId, setEditingId] = useState<string | undefined>(undefined);

    const publishChanges = useCallback(
        (inputList: JQLEntry[]) => {
            const changes = Object.create(null);
            changes['jira.jqlList'] = inputList;
            controller.updateConfig(changes);
        },
        [controller],
    );

    const handleJQLSave = useCallback((newEntry: JQLEntry) => {
        setInternalList((oldList) => {
            const index = oldList.findIndex((entry: JQLEntry) => {
                return entry.id === newEntry.id;
            });

            setDirtyList(true);

            if (index < 0) {
                return [...oldList, newEntry];
            } else {
                const newList = [...oldList];
                newList[index] = newEntry;
                return newList;
            }
        });
    }, []);

    const handleFilterSave = useCallback((newFilters: JQLEntry[]) => {
        setInternalList((oldList) => {
            const currentFilterIds = oldList.map((j) => j.filterId);

            const newEntries = newFilters.filter((f) => !currentFilterIds.includes(f.filterId));

            if (newEntries.length > 0) {
                setDirtyList(true);
                return [...oldList, ...newEntries];
            }

            return oldList;
        });
    }, []);

    const { openJqlDialog, jqlDialog } = useJqlEditDialog(sites, handleJQLSave);
    const { openFilterDialog, filterDialog } = useFilterDialog(sites, handleFilterSave);

    const handleReorder = useCallback((oldIndex: number, newIndex: number) => {
        setInternalList((oldList) => {
            setDirtyList(true);
            return reorder(oldList, oldIndex, newIndex);
        });
    }, []);

    const toggleEnabled = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        trace('enabled button click', performance.now(), () => {
            setInternalList((oldList) => {
                const item = oldList.find((i: JQLEntry) => i.id === event.target.id);
                if (item) {
                    item.enabled = event.target.checked;
                    setDirtyList(true);
                    return [...oldList];
                }
                return oldList;
            });
        });
    }, []);

    const toggleMonitor = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        trace('monitor button click', performance.now(), () => {
            setInternalList((oldList) => {
                const item = oldList.find((i: JQLEntry) => i.id === event.target.id);
                if (item) {
                    setDirtyList(true);
                    item.monitor = event.target.checked;
                    return [...oldList];
                }
                return oldList;
            });
        });
    }, []);

    const handleDelete = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
        setInternalList((oldList) => {
            const index = oldList.findIndex((i: JQLEntry) => i.id === event.currentTarget.id);
            if (index >= 0) {
                setDirtyList(true);
                oldList.splice(index, 1);
                return [...oldList];
            }
            return oldList;
        });
    }, []);

    const handleEdit = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
        setEditingId(event.currentTarget.id);
    }, []);

    useEffect(() => {
        if (editingId) {
            const index = internalList.findIndex((i: JQLEntry) => i.id === editingId);
            if (index >= 0) {
                openJqlDialog(true, internalList[index]);
            }
            setEditingId(undefined);
        }
    }, [editingId, internalList, openJqlDialog]);

    useEffect(() => {
        if (dirtyList) {
            publishChanges(internalList);
            setDirtyList(false);
        }
    }, [dirtyList, internalList, publishChanges]);

    useEffect(() => {
        setInternalList((oldList) => {
            if (!equal(oldList, jqlList)) {
                return jqlList;
            }

            return oldList;
        });
    }, [jqlList]);

    return (
        <div className={classes.root}>
            <Grid container direction="column" spacing={1}>
                <Grid item>
                    <Paper className={classes.paper}>
                        <DragReorderList
                            onReorder={handleReorder}
                            dragIcon={
                                <span>
                                    <DragIndicatorIcon color="disabled" />
                                </span>
                            }
                            listItems={
                                internalList.length > 0
                                    ? internalList.map((item, i) => {
                                          return (
                                              <JQLListItem
                                                  key={item.id}
                                                  id={item.id}
                                                  name={item.name}
                                                  enabled={item.enabled}
                                                  monitor={item.monitor}
                                                  filterId={item.filterId}
                                                  toggleEnabled={toggleEnabled}
                                                  toggleMonitor={toggleMonitor}
                                                  handleEdit={handleEdit}
                                                  handleDelete={handleDelete}
                                              />
                                          );
                                      })
                                    : [
                                          <Box width="100%">
                                              <Typography align="center">{l10n.t('No entries found.')}</Typography>
                                          </Box>,
                                      ]
                            }
                        />
                    </Paper>
                </Grid>
                <Grid item>
                    <Box marginRight={4}>
                        <JQLSpeedDial openJqlDialog={openJqlDialog} openFilterDialog={openFilterDialog} />
                    </Box>
                </Grid>
            </Grid>
            {jqlDialog}
            {filterDialog}
        </div>
    );
});
