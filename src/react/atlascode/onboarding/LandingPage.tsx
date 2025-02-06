import { JiraIcon } from '@atlassianlabs/guipi-jira-components';
import { Button, Grid, lighten, makeStyles, Theme, Typography } from '@material-ui/core';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import React, { useCallback, useContext, useState } from 'react';
import { KnownLinkID } from '../../../lib/ipc/models/common';
import { ConfigSection, ConfigSubSection } from '../../../lib/ipc/models/config';
import { SiteWithAuthInfo } from '../../../lib/ipc/toUI/config';
import BitbucketIcon from '../icons/BitbucketIcon';
import DemoButton from './DemoButton';
import { DemoDialog } from './DemoDialog';
import { OnboardingControllerContext } from './onboardingController';
import * as l10n from '@vscode/l10n';

const useStyles = makeStyles((theme: Theme) => ({
    landingPageButton: {
        width: '100%',
        height: '100%',
        textTransform: 'none',
        background: theme.palette.background.paper,
        fontSize: 50,
        color: theme.palette.type === 'dark' ? lighten(theme.palette.text.primary, 1) : theme.palette.text.primary,
        '&:hover': {
            color: theme.palette.type === 'dark' ? lighten(theme.palette.text.primary, 1) : 'white',
        },
    },
    landingPageTextColor: {
        color: theme.palette.type === 'dark' ? lighten(theme.palette.text.primary, 1) : theme.palette.text.primary,
    },
    addSitesIcon: {
        marginTop: 28, //Adjust icon down because it's off center
        fontSize: 50,
        color: '#0052CC', //Blue
    },
}));

export type LandingPageProps = {
    bitbucketEnabled: boolean;
    bitbucketSites: SiteWithAuthInfo[];
    jiraEnabled: boolean;
    jiraSites: SiteWithAuthInfo[];
};

export const LandingPage: React.FunctionComponent<LandingPageProps> = ({
    bitbucketEnabled,
    bitbucketSites,
    jiraEnabled,
    jiraSites,
}) => {
    const classes = useStyles();
    const controller = useContext(OnboardingControllerContext);
    const [modalVisibility, setModalVisibility] = useState(false);
    const [modalTitle, setModalTitle] = useState('');
    const [modalGifLink, setModalGifLink] = useState('');
    const [modalAction, setModalAction] = useState(() => () => {});

    const handleDemoButtonClick = useCallback((gifLink: string, modalTitle: string, action: () => void) => {
        setModalTitle(modalTitle);
        setModalGifLink(gifLink);
        setModalAction(() => action);
        setModalVisibility(true);
    }, []);

    const handleModalClose = useCallback(() => {
        setModalVisibility(false);
    }, []);

    const handleModalAction = useCallback(() => {
        modalAction();
    }, [modalAction]);

    return (
        <React.Fragment>
            <DemoDialog
                modalTitle={modalTitle}
                modalGifLink={modalGifLink}
                modalVisibility={modalVisibility}
                onClose={handleModalClose}
                action={handleModalAction}
            />
            <Grid container spacing={3} direction="row" justify="center">
                <Grid item xs={12}>
                    <Typography variant="h1" align="center">
                        {l10n.t("You're ready to get started!")}{' '}
                        {<CheckCircleIcon fontSize={'large'} htmlColor={'#07b82b'} />}
                    </Typography>
                </Grid>

                <Grid item xs={12}>
                    <Typography variant="h3" align="center">
                        {l10n.t(
                            'With Atlassian for VS Code, you can create and view issues, start work on issues, create pull requests, do code reviews, start builds, get build statuses and more!',
                        )}{' '}
                    </Typography>
                    <Typography variant="h3" align="center" style={{ marginBottom: '25px' }}>
                        <b>{l10n.t('Press the buttons below to try out a common action!')}</b>
                    </Typography>
                </Grid>
                <Grid container xs={12} direction="row" justify="center" spacing={3}>
                    <Grid
                        hidden={!(jiraEnabled && jiraSites.length > 0)}
                        item
                        lg={3}
                        md={5}
                        sm={6}
                        xs={12}
                        alignItems={'flex-end'}
                    >
                        <DemoButton
                            gifLink="https://product-integrations-cdn.atl-paas.net/atlascode/CreateJiraIssue.gif"
                            description={l10n.t('Create a Jira issue')}
                            productIcon={<JiraIcon style={{ float: 'right', color: '#0052CC' }} />}
                            action={controller.createJiraIssue}
                            onClick={handleDemoButtonClick}
                        />
                    </Grid>
                    <Grid
                        hidden={!(jiraEnabled && jiraSites.length > 0)}
                        item
                        lg={3}
                        md={5}
                        sm={6}
                        xs={12}
                        alignItems={'flex-end'}
                    >
                        <DemoButton
                            gifLink="https://product-integrations-cdn.atl-paas.net/atlascode/ReviewJiraIssue.gif"
                            description={l10n.t('View a Jira issue')}
                            productIcon={<JiraIcon style={{ float: 'right', color: '#0052CC' }} />}
                            action={controller.viewJiraIssue}
                            onClick={handleDemoButtonClick}
                        />
                    </Grid>
                    <Grid
                        hidden={!(bitbucketEnabled && bitbucketSites.length > 0)}
                        item
                        lg={3}
                        md={5}
                        sm={6}
                        xs={12}
                        alignItems={'flex-end'}
                    >
                        <DemoButton
                            gifLink="https://product-integrations-cdn.atl-paas.net/atlascode/CreatePullRequest.gif"
                            description={l10n.t('Create a pull request')}
                            productIcon={
                                <BitbucketIcon color={'primary'} style={{ float: 'right', color: '#0052CC' }} />
                            }
                            action={controller.createPullRequest}
                            onClick={handleDemoButtonClick}
                        />
                    </Grid>
                    <Grid
                        hidden={!(bitbucketEnabled && bitbucketSites.length > 0)}
                        item
                        lg={3}
                        md={5}
                        sm={6}
                        xs={12}
                        alignItems={'flex-end'}
                    >
                        <DemoButton
                            gifLink="https://product-integrations-cdn.atl-paas.net/atlascode/ReviewAndApprovePullRequest.gif"
                            description={l10n.t('Review a pull request')}
                            productIcon={
                                <BitbucketIcon color={'primary'} style={{ float: 'right', color: '#0052CC' }} />
                            }
                            action={controller.viewPullRequest}
                            onClick={handleDemoButtonClick}
                        />
                    </Grid>
                </Grid>
                <Grid item xs={12}>
                    <Typography variant="h1" align="center" style={{ marginTop: '50px' }}>
                        {l10n.t('Need to add more sites?')}
                    </Typography>
                </Grid>
                <Grid item xs={12}>
                    <Typography variant="h3" align="center" style={{ marginBottom: '25px' }}>
                        {l10n.t("Need to authenticate with multiple sites? We've got you covered.")}
                    </Typography>
                </Grid>
                <Grid container xs={12} direction="row" justify="center" spacing={2}>
                    <Grid item hidden={!jiraEnabled} lg={5} md={8} sm={12} xs={12} alignItems={'flex-end'}>
                        <Button
                            className={classes.landingPageButton}
                            variant="contained"
                            color="primary"
                            onClick={() => controller.openSettings(ConfigSection.Jira, ConfigSubSection.Auth)}
                        >
                            <Grid container direction="row" alignItems="center" justify="center" spacing={1}>
                                <Grid item>{l10n.t('Add Jira Sites')}</Grid>
                                <Grid item>{<JiraIcon fontSize={'inherit'} className={classes.addSitesIcon} />}</Grid>
                            </Grid>
                        </Button>
                    </Grid>

                    <Grid item hidden={!bitbucketEnabled} lg={5} md={8} sm={12} xs={12} alignItems={'flex-end'}>
                        <Button
                            className={classes.landingPageButton}
                            variant="contained"
                            color="primary"
                            onClick={() => controller.openSettings(ConfigSection.Bitbucket, ConfigSubSection.Auth)}
                        >
                            <Grid container direction="row" alignItems="center" justify="center" spacing={1}>
                                <Grid item>{l10n.t('Add Bitbucket Sites')}</Grid>
                                <Grid item>
                                    {<BitbucketIcon fontSize={'inherit'} className={classes.addSitesIcon} />}
                                </Grid>
                            </Grid>
                        </Button>
                    </Grid>
                    <Grid item xs={12}>
                        <Typography variant="h1" align="center" style={{ marginTop: '50px' }}>
                            {l10n.t('Supercharge your workflow!')}
                        </Typography>
                    </Grid>
                    <Grid item xs={12}>
                        <Typography variant="h3" align="center" style={{ marginBottom: '25px' }}>
                            {l10n.t(
                                'Do you use Slack, Google Sheets, Excel, Teams, or Outlook? Check out our other Integrations!',
                            )}
                        </Typography>
                    </Grid>
                    <Grid container xs={12} direction="row" alignItems="center" justify="center">
                        <Grid item lg={5} md={8} sm={12} xs={12}>
                            <Button
                                onClick={() => controller.openLink(KnownLinkID.Integrations)}
                                className={classes.landingPageButton}
                            >
                                {l10n.t('More Integrations')}
                            </Button>
                        </Grid>
                    </Grid>
                </Grid>
            </Grid>
        </React.Fragment>
    );
};

export default LandingPage;
