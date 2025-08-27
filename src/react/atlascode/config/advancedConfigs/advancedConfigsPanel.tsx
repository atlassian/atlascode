import { Box, Fade, Grid, Link, Theme, Typography } from '@mui/material';
import { makeStyles } from '@mui/styles';
import React from 'react';

import { ConfigSection, ConfigV3SubSection } from '../../../../lib/ipc/models/config';
import { SiteWithAuthInfo } from '../../../../lib/ipc/toUI/config';
import { CommonPanelProps } from '../../common/commonPanelProps';
import { ConfigControllerContext } from '../configController';
import { DebuggingPanel } from './subpanels/charlesDebug/DebuggingPanel';
import { JiraExplorerJqlPanel } from './subpanels/customJql/JiraExplorerJqlPanel';
import { StartWorkPanel } from './subpanels/startWork/StartWorkPanel';

type AdvancedConfigsProps = CommonPanelProps & {
    config: { [key: string]: any };
    sites: SiteWithAuthInfo[];
    isRemote: boolean;
    onSubsectionChange: (subSection: ConfigV3SubSection, expanded: boolean) => void;
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

export const AdvancedConfigsPanel: React.FunctionComponent<AdvancedConfigsProps> = ({
    visible,
    selectedSubSections,
    onSubsectionChange,
    config,
    sites,
    isRemote,
}) => {
    const siteInfos = React.useMemo(() => {
        return sites.map((swa) => {
            return swa.site;
        });
    }, [sites]);

    const classes = useStyles();
    const controller = React.useContext(ConfigControllerContext);

    return (
        <>
            <Fade in={visible}>
                <div hidden={!visible} role="tabpanel">
                    <Grid container spacing={3} direction="column">
                        <Grid item>
                            <Box>
                                <Typography variant="subtitle1" className={classes.root}>
                                    Note: We have simplified our settings to help users quickly interact with what they
                                    need. To find the different configurations you can customize, please refer to the{' '}
                                    <Link
                                        component="button"
                                        variant="subtitle1"
                                        onClick={() => controller.openNativeSettings()}
                                        className={classes.root}
                                    >
                                        Atlascode Extension User Settings
                                    </Link>
                                    .
                                </Typography>
                            </Box>
                        </Grid>
                        <Grid item>
                            <JiraExplorerJqlPanel
                                visible={visible}
                                expanded={selectedSubSections.includes(ConfigV3SubSection.Issues)}
                                onSubsectionChange={onSubsectionChange}
                                sites={siteInfos}
                                jqlList={config[`${ConfigSection.Jira}.jqlList`]}
                                enabled={config[`${ConfigSection.Jira}.explorer.enabled`]}
                            />
                        </Grid>
                        <Grid item>
                            <StartWorkPanel
                                visible={visible}
                                expanded={selectedSubSections.includes(ConfigV3SubSection.StartWork)}
                                onSubsectionChange={onSubsectionChange}
                                customPrefixes={config[`${ConfigSection.Jira}.startWorkBranchTemplate.customPrefixes`]}
                                customTemplate={config[`${ConfigSection.Jira}.startWorkBranchTemplate.customTemplate`]}
                            />
                        </Grid>
                        <Grid item>
                            <DebuggingPanel
                                visible={visible}
                                expanded={selectedSubSections.includes(ConfigV3SubSection.Misc)}
                                onSubsectionChange={onSubsectionChange}
                                enableCharles={config['enableCharles']}
                                charlesCertPath={config['charlesCertPath']}
                                charlesDebugOnly={config['charlesDebugOnly']}
                            />
                        </Grid>
                        <Grid item>
                            <Box marginTop={5}>
                                <Typography variant="subtitle1" className={classes.root}>
                                    Note: This extension collects telemetry data, which is used to help understand how
                                    to improve the product.
                                </Typography>
                                <Typography variant="subtitle1" className={classes.root}>
                                    For example, this usage data helps to debug issues, such as slow start-up times, and
                                    to prioritize new features.
                                </Typography>
                                <Typography variant="subtitle1" className={classes.root}>
                                    If you don't wish to send usage data to Atlassian, you can set the
                                    telemetry.enableTelemetry user setting to false, and restart VS Code.
                                </Typography>
                            </Box>
                        </Grid>
                    </Grid>
                </div>
            </Fade>
        </>
    );
};
