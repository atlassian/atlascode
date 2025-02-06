import { Box, Fade, Grid, makeStyles, Theme, Typography } from '@material-ui/core';
import React from 'react';
import { ConfigSubSection } from '../../../../lib/ipc/models/config';
import { CommonPanelProps } from '../../common/commonPanelProps';
import { GenConnectPanel } from './subpanels/GenConnectPanel';
import { GenDebugPanel } from './subpanels/GenDebugPanel';
import { GenMiscPanel } from './subpanels/GenMiscPanel';
import * as l10n from '@vscode/l10n';

type GeneralPanelProps = CommonPanelProps & {
    config: { [key: string]: any };
    onSubsectionChange: (subSection: ConfigSubSection, expanded: boolean) => void;
};

const useStyles = makeStyles(
    (theme: Theme) =>
        ({
            root: {
                fontSize: theme.typography.pxToRem(12),
                fontStyle: 'italic',
            },
        }) as const,
);

export const GeneralPanel: React.FunctionComponent<GeneralPanelProps> = ({
    visible,
    selectedSubSections,
    onSubsectionChange,
    config,
}) => {
    const classes = useStyles();

    return (
        <>
            <Fade in={visible}>
                <div hidden={!visible || !config['bitbucket.enabled']} role="tabpanel">
                    <Grid container spacing={3} direction="column">
                        <Grid item>
                            <GenMiscPanel
                                visible={visible}
                                expanded={selectedSubSections.includes(ConfigSubSection.Misc)}
                                onSubsectionChange={onSubsectionChange}
                                showWelcome={config['showWelcomeOnInstall']}
                                helpExplorerEnabled={config['helpExplorerEnabled']}
                                outputLevel={config['outputLevel']}
                            />
                        </Grid>
                        <Grid item>
                            <GenConnectPanel
                                visible={visible}
                                expanded={selectedSubSections.includes(ConfigSubSection.Misc)}
                                onSubsectionChange={onSubsectionChange}
                                enableHttpsTunnel={config['enableHttpsTunnel']}
                                offlineMode={config['offlineMode']}
                                onlineCheckerUrls={config['onlineCheckerUrls']}
                            />
                        </Grid>
                        <Grid item>
                            <GenDebugPanel
                                visible={visible}
                                expanded={selectedSubSections.includes(ConfigSubSection.Misc)}
                                onSubsectionChange={onSubsectionChange}
                                enableCurl={config['enableCurlLogging']}
                                enableCharles={config['enableCharles']}
                                charlesCertPath={config['charlesCertPath']}
                                charlesDebugOnly={config['charlesDebugOnly']}
                                showCreateIssueProblems={config['jira.showCreateIssueProblems']}
                            />
                            <Box marginTop={5}>
                                <Typography variant="subtitle1" className={classes.root}>
                                    {l10n.t(
                                        'Note: This extension collects telemetry data, which is used to help understand how to improve the product.',
                                    )}
                                </Typography>
                                <Typography variant="subtitle1" className={classes.root}>
                                    {l10n.t(
                                        'For example, this usage data helps to debug issues, such as slow start-up times, and to prioritize new features.',
                                    )}
                                </Typography>
                                <Typography variant="subtitle1" className={classes.root}>
                                    {l10n.t(
                                        "If you don't wish to send usage data to Atlassian, you can set the telemetry.enableTelemetry user setting to false, and restart VS Code.",
                                    )}
                                </Typography>
                            </Box>
                        </Grid>
                        <Grid item></Grid>
                    </Grid>
                </div>
            </Fade>
        </>
    );
};
