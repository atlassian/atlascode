import { ToggleWithLabel } from '@atlassianlabs/guipi-core-components';
import { Grid, makeStyles, Switch, Theme, Typography } from '@material-ui/core';
import React, { memo, useCallback, useContext, useEffect, useState } from 'react';
import { ConfigSection } from '../../../../lib/ipc/models/config';
import { IntervalInput } from '../../common/IntervalInput';
import { ConfigControllerContext } from '../configController';
import * as l10n from '@vscode/l10n';

type BitbucketIssuesProps = {
    enabled: boolean;
    notifications: boolean;
    jiraButton: boolean;
    refreshInterval: number;
};

const useStyles = makeStyles(
    (theme: Theme) =>
        ({
            indent: {
                marginLeft: theme.spacing(3),
            },
        }) as const,
);

export const BitbucketIssues: React.FunctionComponent<BitbucketIssuesProps> = memo(
    ({ enabled, notifications, jiraButton, refreshInterval }) => {
        const classes = useStyles();
        const controller = useContext(ConfigControllerContext);

        const [changes, setChanges] = useState<{ [key: string]: any }>({});

        const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
            const changes = Object.create(null);
            changes[`${ConfigSection.Bitbucket}.${e.target.value}`] = e.target.checked;
            setChanges(changes);
        }, []);

        const handleInterval = useCallback((n: number) => {
            const changes = Object.create(null);
            changes[`${ConfigSection.Bitbucket}.issues.refreshInterval`] = n;
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
                <Grid item>
                    <ToggleWithLabel
                        control={
                            <Switch
                                size="small"
                                color="primary"
                                id="bbIssuesExplorerEnabled"
                                value="issues.explorerEnabled"
                                checked={enabled}
                                onChange={handleChange}
                            />
                        }
                        label={l10n.t('Enable Bitbucket issues explorer')}
                        spacing={1}
                        variant="body1"
                    />
                </Grid>
                <Grid item>
                    <ToggleWithLabel
                        control={
                            <Switch
                                className={classes.indent}
                                size="small"
                                color="primary"
                                id="bbIssuesMonitor"
                                value="issues.monitorEnabled"
                                checked={notifications}
                                disabled={!enabled}
                                onChange={handleChange}
                            />
                        }
                        label={l10n.t('Show notifications when new Bitbucket issues are created')}
                        spacing={1}
                        variant="body1"
                    />
                </Grid>
                <Grid item>
                    <ToggleWithLabel
                        control={
                            <Switch
                                className={classes.indent}
                                size="small"
                                color="primary"
                                id="bbCreateJiraIssues"
                                value="issues.createJiraEnabled"
                                checked={jiraButton}
                                disabled={!enabled}
                                onChange={handleChange}
                            />
                        }
                        label={l10n.t('Show Create Jira Issue button on Bitbucket issue screens')}
                        spacing={1}
                        variant="body1"
                    />
                </Grid>
                <Grid item>
                    <Grid container direction="row" spacing={1} alignItems="center">
                        <Grid item>
                            <IntervalInput
                                className={classes.indent}
                                interval={refreshInterval}
                                max={120}
                                label="Refresh explorer every:"
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
            </Grid>
        );
    },
);
