import { Fade, Grid } from '@material-ui/core';
import React from 'react';

import { ConfigV3Section, ConfigV3SubSection } from '../../../../../lib/ipc/models/config';
import { SiteWithAuthInfo } from '../../../../../lib/ipc/toUI/config';
import { CommonPanelProps } from '../../../common/commonPanelProps';
import { JiraExplorerJqlPanel } from './subpanels/customJql/JiraExplorerJqlPanel';
import { StartWorkPanel } from './subpanels/startWork/StartWorkPanel';

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
    const siteInfos = React.useMemo(() => {
        return sites.map((swa) => {
            return swa.site;
        });
    }, [sites]);

    return (
        <>
            <Fade in={visible}>
                <div hidden={!visible} role="tabpanel">
                    <Grid container spacing={3} direction="column">
                        <Grid item>
                            <JiraExplorerJqlPanel
                                visible={visible}
                                expanded={selectedSubSections.includes(ConfigV3SubSection.Issues)}
                                onSubsectionChange={onSubsectionChange}
                                sites={siteInfos}
                                jqlList={config[`${ConfigV3Section.Jira}.jqlList`]}
                                enabled={config[`${ConfigV3Section.Jira}.explorer.enabled`]}
                            />
                        </Grid>
                        <Grid item>
                            <StartWorkPanel
                                visible={visible}
                                expanded={selectedSubSections.includes(ConfigV3SubSection.StartWork)}
                                onSubsectionChange={onSubsectionChange}
                                customPrefixes={
                                    config[`${ConfigV3Section.Jira}.startWorkBranchTemplate.customPrefixes`]
                                }
                                customTemplate={
                                    config[`${ConfigV3Section.Jira}.startWorkBranchTemplate.customTemplate`]
                                }
                            />
                        </Grid>
                    </Grid>
                </div>
            </Fade>
        </>
    );
};
