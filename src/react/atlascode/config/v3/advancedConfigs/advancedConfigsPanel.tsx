import { Fade, Grid } from '@material-ui/core';
import React from 'react'; // , { useMemo }

import { ConfigV3Section, ConfigV3SubSection } from '../../../../../lib/ipc/models/config';
import { SiteWithAuthInfo } from '../../../../../lib/ipc/toUI/config';
import { CommonPanelProps } from '../../../common/commonPanelProps';
import { StartWorkPanel } from './subpanels/StartWork/StartWorkPanel';
// import { JiraExplorerPanel } from './subpanels/JiraExplorerPanel';

type AdvancedConfigsProps = CommonPanelProps & {
    config: { [key: string]: any };
    sites: SiteWithAuthInfo[];
    isRemote: boolean;
    onSubsectionChange: (subSection: ConfigV3SubSection, expanded: boolean) => void;
};

export const AdvancedConfigsPanel: React.FunctionComponent<AdvancedConfigsProps> = ({
    visible,
    selectedSubSections,
    onSubsectionChange,
    config,
    sites,
    isRemote,
}) => {
    // const siteInfos = useMemo(() => { // Uncomment this for Jira Filters and CustomJql
    //     return sites.map((swa) => {
    //         return swa.site;
    //     });
    // }, [sites]);

    return (
        <>
            <Fade in={visible}>
                <Grid container spacing={3} direction="column">
                    {/* <Grid item>
                        <JiraExplorerPanel
                            visible={visible}
                            expanded={selectedSubSections.includes(ConfigSubSection.Issues)}
                            onSubsectionChange={onSubsectionChange}
                            sites={siteInfos}
                            jqlList={config[`${ConfigSection.Jira}.jqlList`]}
                            enabled={config[`${ConfigSection.Jira}.explorer.enabled`]}
                            nestSubtasks={config[`${ConfigSection.Jira}.explorer.nestSubtasks`]}
                            fetchAllQueryResults={config[`${ConfigSection.Jira}.explorer.fetchAllQueryResults`]}
                            monitorEnabled={config[`${ConfigSection.Jira}.explorer.monitorEnabled`]}
                            refreshInterval={config[`${ConfigSection.Jira}.explorer.refreshInterval`]}
                        />
                    </Grid> */}
                    <Grid item>
                        <StartWorkPanel
                            visible={visible}
                            expanded={selectedSubSections.includes(ConfigV3SubSection.StartWork)}
                            onSubsectionChange={onSubsectionChange}
                            customPrefixes={config[`${ConfigV3Section.Jira}.startWorkBranchTemplate.customPrefixes`]}
                            customTemplate={config[`${ConfigV3Section.Jira}.startWorkBranchTemplate.customTemplate`]}
                        />
                    </Grid>
                </Grid>
            </Fade>
        </>
    );
};
