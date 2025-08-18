import { Fade, Grid } from '@mui/material';
import React from 'react';

import { ProductBitbucket, ProductJira } from '../../../../atlclients/authInfo';
import { ConfigV3Section, ConfigV3SubSection } from '../../../../lib/ipc/models/config';
import { SiteWithAuthInfo } from '../../../../lib/ipc/toUI/config';
import { CommonPanelProps } from '../../common/commonPanelProps';
import { AuthPanel } from './AuthPanel';

type AuthenicationPanelProps = CommonPanelProps & {
    config: { [key: string]: any };
    jiraSites: SiteWithAuthInfo[];
    bitbucketSites: SiteWithAuthInfo[];
    isRemote: boolean;
    onSubsectionChange: (subSection: ConfigV3SubSection, expanded: boolean) => void;
};

export const AuthenicationPanel: React.FunctionComponent<AuthenicationPanelProps> = ({
    visible,
    selectedSubSections,
    onSubsectionChange,
    config,
    jiraSites,
    bitbucketSites,
    isRemote,
}) => {
    return (
        <>
            <Fade in={visible}>
                <div hidden={!visible} role="tabpanel">
                    <Grid container spacing={3} direction="column">
                        <Grid item>
                            <AuthPanel
                                visible={visible}
                                expanded={selectedSubSections.includes(ConfigV3SubSection.JiraAuth)}
                                onSubsectionChange={onSubsectionChange}
                                isRemote={isRemote}
                                sites={jiraSites}
                                product={ProductJira}
                                section={ConfigV3Section.Auth}
                            />
                        </Grid>
                        <Grid item>
                            <AuthPanel
                                visible={visible}
                                expanded={selectedSubSections.includes(ConfigV3SubSection.BbAuth)}
                                onSubsectionChange={onSubsectionChange}
                                isRemote={isRemote}
                                sites={bitbucketSites}
                                product={ProductBitbucket}
                                section={ConfigV3Section.Auth}
                            />
                        </Grid>
                    </Grid>
                </div>
            </Fade>
        </>
    );
};
