import { ConfigSection, ConfigSubSection } from '../../../../lib/ipc/models/config';
import { Fade, Grid } from '@material-ui/core';
import React, { useMemo } from 'react';

import { AuthPanel } from '../auth/AuthPanel';
import { CommonPanelProps } from '../../common/commonPanelProps';
import { JiraExplorerPanel } from './subpanels/JiraExplorerPanel';
import { JiraHoversPanel } from './subpanels/JiraHoversPanel';
import { JiraTriggersPanel } from './subpanels/JiraTriggersPanel';
import { ProductJira } from '../../../../atlclients/authInfo';
import { SiteWithAuthInfo } from '../../../../lib/ipc/toUI/config';
import { StartWorkPanel } from '../../common/StartWorkPanel';
import { StatusBarPanel } from '../../common/StatusBarPanel';
import * as l10n from '@vscode/l10n';

type JiraPanelProps = CommonPanelProps & {
    config: { [key: string]: any };
    sites: SiteWithAuthInfo[];
    isRemote: boolean;
    onSubsectionChange: (subSection: ConfigSubSection, expanded: boolean) => void;
};

export const JiraPanel: React.FunctionComponent<JiraPanelProps> = ({
    visible,
    selectedSubSections,
    onSubsectionChange,
    config,
    sites,
    isRemote,
}) => {
    const siteInfos = useMemo(() => {
        return sites.map((swa) => {
            return swa.site;
        });
    }, [sites]);

    return (
        <>
            <Fade in={visible}>
                <div hidden={!visible || config['jira.enabled']}>{l10n.t('Enable Jira features to see settings')}</div>
            </Fade>

            <Fade in={visible}>
                <div hidden={!visible || !config['jira.enabled']} role="tabpanel">
                    <Grid container spacing={3} direction="column">
                        <Grid item>
                            <AuthPanel
                                visible={visible}
                                expanded={selectedSubSections.includes(ConfigSubSection.Auth)}
                                onSubsectionChange={onSubsectionChange}
                                isRemote={isRemote}
                                sites={sites}
                                product={ProductJira}
                                section={ConfigSection.Jira}
                            />
                        </Grid>
                        <Grid item>
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
                        </Grid>
                        <Grid item>
                            <JiraHoversPanel
                                visible={visible}
                                expanded={selectedSubSections.includes(ConfigSubSection.Hovers)}
                                onSubsectionChange={onSubsectionChange}
                                enabled={config[`${ConfigSection.Jira}.hover.enabled`]}
                            />
                        </Grid>
                        <Grid item>
                            <JiraTriggersPanel
                                visible={visible}
                                expanded={selectedSubSections.includes(ConfigSubSection.Triggers)}
                                onSubsectionChange={onSubsectionChange}
                                enabled={config[`${ConfigSection.Jira}.todoIssues.enabled`]}
                                triggers={config[`${ConfigSection.Jira}.todoIssues.triggers`]}
                            />
                        </Grid>
                        <Grid item>
                            <StartWorkPanel
                                visible={visible}
                                expanded={selectedSubSections.includes(ConfigSubSection.StartWork)}
                                onSubsectionChange={onSubsectionChange}
                                customPrefixes={config[`${ConfigSection.Jira}.startWorkBranchTemplate.customPrefixes`]}
                                customTemplate={config[`${ConfigSection.Jira}.startWorkBranchTemplate.customTemplate`]}
                            />
                        </Grid>
                        <Grid item>
                            <StatusBarPanel
                                visible={visible}
                                expanded={selectedSubSections.includes(ConfigSubSection.Status)}
                                onSubsectionChange={onSubsectionChange}
                                configSection={ConfigSection.Jira}
                                productName={ProductJira.name}
                                enabled={config[`${ConfigSection.Jira}.statusbar.enabled`]}
                                showProduct={config[`${ConfigSection.Jira}.statusbar.showProduct`]}
                                showUser={config[`${ConfigSection.Jira}.statusbar.showUser`]}
                                showLogin={config[`${ConfigSection.Jira}.statusbar.showLogin`]}
                            />
                        </Grid>
                    </Grid>
                </div>
            </Fade>
        </>
    );
};
