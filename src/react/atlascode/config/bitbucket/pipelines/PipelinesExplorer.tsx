import { ToggleWithLabel } from '@atlassianlabs/guipi-core-components';
import { Box, Grid, makeStyles, Switch, Theme, Tooltip, Typography } from '@material-ui/core';
import React, { memo, useCallback, useContext, useEffect, useState } from 'react';
import { ConfigSection } from '../../../../../lib/ipc/models/config';
import { IntervalInput } from '../../../common/IntervalInput';
import { useBorderBoxStyles } from '../../../common/useBorderBoxStyles';
import { ConfigControllerContext } from '../../configController';
import { PipelinesExplorerOptions } from './PipelineExplorerOptions';
import { PipelineFilterListEditor } from './PipelineFilterListEditor';
import * as l10n from '@vscode/l10n';

type PipelinesExplorerProps = {
    enabled: boolean;
    monitorEnabled: boolean;
    hideEmpty: boolean;
    hideFiltered: boolean;
    refreshInterval: number;
    filters: string[];
};

const useStyles = makeStyles(
    (theme: Theme) =>
        ({
            indent: {
                marginLeft: theme.spacing(3),
            },
        }) as const,
);

export const PipelinesExplorer: React.FunctionComponent<PipelinesExplorerProps> = memo(
    ({ enabled, hideEmpty, hideFiltered, monitorEnabled, refreshInterval, filters }) => {
        const classes = useStyles();
        const boxClass = useBorderBoxStyles();
        const controller = useContext(ConfigControllerContext);

        const [changes, setChanges] = useState<{ [key: string]: any }>({});

        const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
            const changes = Object.create(null);
            changes[`${ConfigSection.Bitbucket}.${e.target.value}`] = e.target.checked;
            setChanges(changes);
        }, []);

        const handleInterval = useCallback((n: number) => {
            const changes = Object.create(null);
            changes[`${ConfigSection.Bitbucket}.pipelines.refreshInterval`] = n;
            setChanges(changes);
        }, []);

        useEffect(() => {
            if (Object.keys(changes).length > 0) {
                controller.updateConfig(changes);
                setChanges({});
            }
        }, [changes, controller]);

        return (
            <Grid container direction="column" spacing={2}>
                <PipelinesExplorerOptions
                    enableItem={
                        <Grid item>
                            <ToggleWithLabel
                                control={
                                    <Tooltip title={l10n.t('Enable pipelines Explorer')}>
                                        <Switch
                                            color="primary"
                                            size="small"
                                            value="pipelines.explorerEnabled"
                                            checked={enabled}
                                            onChange={handleChange}
                                        />
                                    </Tooltip>
                                }
                                label={l10n.t('Enable pipelines Explorer')}
                                spacing={1}
                                variant="body1"
                            />
                        </Grid>
                    }
                    monitorItem={
                        <Grid item>
                            <ToggleWithLabel
                                control={
                                    <Tooltip title="Enable notifications">
                                        <Switch
                                            className={classes.indent}
                                            disabled={!enabled}
                                            color="primary"
                                            size="small"
                                            value="pipelines.monitorEnabled"
                                            checked={monitorEnabled}
                                            onChange={handleChange}
                                        />
                                    </Tooltip>
                                }
                                label={l10n.t('Show notifications when new Bitbucket pipelines are created')}
                                spacing={1}
                                variant="body1"
                            />
                        </Grid>
                    }
                    hideEmptyItem={
                        <Grid item>
                            <ToggleWithLabel
                                control={
                                    <Tooltip title={l10n.t('Show empty pipelines')}>
                                        <Switch
                                            className={classes.indent}
                                            disabled={!enabled}
                                            color="primary"
                                            size="small"
                                            checked={hideEmpty}
                                            value="pipelines.hideEmpty"
                                            onChange={handleChange}
                                        />
                                    </Tooltip>
                                }
                                label={l10n.t('Hide Bitbucket pipelines with no results')}
                                spacing={1}
                                variant="body1"
                            />
                        </Grid>
                    }
                    hideFilteredItem={
                        <Grid item>
                            <ToggleWithLabel
                                control={
                                    <Tooltip title={l10n.t('Enable filters')}>
                                        <Switch
                                            className={classes.indent}
                                            disabled={!enabled}
                                            color="primary"
                                            size="small"
                                            checked={hideFiltered}
                                            value="pipelines.hideFiltered"
                                            onChange={handleChange}
                                        />
                                    </Tooltip>
                                }
                                label={l10n.t('Show only Bitbucket pipelines matching the filters below')}
                                spacing={1}
                                variant="body1"
                            />
                        </Grid>
                    }
                    intervalItem={
                        <Grid item>
                            <Grid container direction="row" spacing={1} alignItems="center">
                                <Grid item>
                                    <IntervalInput
                                        className={classes.indent}
                                        interval={refreshInterval}
                                        max={120}
                                        label={l10n.t('Refresh interval:')}
                                        enabled={enabled}
                                        units="minutes"
                                        onChange={handleInterval}
                                    />
                                </Grid>
                                <Grid item>
                                    <Typography variant="subtitle2">
                                        {l10n.t('(setting to 0 disables auto-refresh)')}
                                    </Typography>
                                </Grid>
                            </Grid>
                        </Grid>
                    }
                />
                <Grid item>
                    <Box marginTop={2}>
                        <Typography variant="h4">{l10n.t('Pipeline Filters')}</Typography>

                        <Box className={boxClass.box} marginTop={1} paddingBottom={2}>
                            <PipelineFilterListEditor enabled={hideFiltered} filters={filters} />
                        </Box>
                    </Box>
                </Grid>
            </Grid>
        );
    },
);
