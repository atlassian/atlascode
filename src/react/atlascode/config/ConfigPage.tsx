import {
    AppBar,
    Badge,
    Box,
    Container,
    Grid,
    Paper,
    Tab,
    Tabs,
    Theme,
    Toolbar,
    Tooltip,
    Typography,
    makeStyles,
} from '@material-ui/core';
import { AuthDialogControllerContext, useAuthDialog } from './auth/useAuthDialog';
import { ConfigControllerContext, useConfigController } from './configController';
import { ConfigSection, ConfigSubSection, ConfigTarget } from '../../../lib/ipc/models/config';
import React, { useCallback, useEffect, useState } from 'react';

import { AuthDialog } from './auth/dialog/AuthDialog';
import { BitbucketPanel } from './bitbucket/BitbucketPanel';
import { ErrorDisplay } from '../common/ErrorDisplay';
import { ExplorePanel } from './explore/ExplorePanel';
import { GeneralPanel } from './general/GeneralPanel';
import { JiraPanel } from './jira/JiraPanel';
import { PMFDisplay } from '../common/pmf/PMFDisplay';
import PersonIcon from '@material-ui/icons/Person';
import { ProductEnabler } from './ProductEnabler';
import { RefreshButton } from '@atlassianlabs/guipi-core-components';
import { SidebarButtons } from './SidebarButtons';
import ToggleButton from '@material-ui/lab/ToggleButton';
import ToggleButtonGroup from '@material-ui/lab/ToggleButtonGroup';
import WorkIcon from '@material-ui/icons/Work';
import equal from 'fast-deep-equal/es6';
import { AtlascodeErrorBoundary } from '../common/ErrorBoundary';
import { AnalyticsView } from 'src/analyticsTypes';
import * as l10n from '@vscode/l10n';

const useStyles = makeStyles(
    (theme: Theme) =>
        ({
            title: {
                flexGrow: 0,
                marginRight: theme.spacing(3),
                whiteSpace: 'nowrap',
            },
            targetSelectLabel: {
                marginLeft: theme.spacing(1),
                marginRight: theme.spacing(1),
                whiteSpace: 'nowrap',
            },
            grow: {
                flexGrow: 1,
            },
            paper100: {
                overflow: 'hidden',
                height: '100%',
            },
            paperOverflow: {
                overflow: 'hidden',
            },
        }) as const,
);

type SectionWithSubsections = {
    [key: string]: ConfigSubSection[];
};

const emptySubsections: SectionWithSubsections = {
    [ConfigSection.Jira]: [],
    [ConfigSection.Bitbucket]: [],
    [ConfigSection.General]: [],
};

const ConfigPage: React.FunctionComponent = () => {
    const classes = useStyles();
    const [state, controller] = useConfigController();
    const [changes, setChanges] = useState<{ [key: string]: any }>({});
    const [internalTarget, setInternalTarget] = useState<ConfigTarget>(state.target);
    const [openSection, setOpenSection] = useState<ConfigSection>(() => state.openSection);
    const [openSubsections, setOpenSubsections] = useState<SectionWithSubsections>(() => {
        return { ...emptySubsections, [state.openSection]: state.openSubSections };
    });

    const { authDialogController, authDialogOpen, authDialogProduct, authDialogEntry } = useAuthDialog();
    const handleTabChange = useCallback((event: React.ChangeEvent<{}>, section: ConfigSection) => {
        setOpenSection(section);
    }, []);

    const handleSubsectionChange = useCallback(
        (subSection: ConfigSubSection, expanded: boolean) => {
            setOpenSubsections((oldSections) => {
                const newSections = { ...oldSections };

                if (expanded) {
                    newSections[openSection] = [...oldSections[openSection], subSection];
                    return newSections;
                }
                const newSubSections = [...oldSections[openSection]];
                const idx = newSubSections.findIndex((sub) => sub === subSection);
                if (idx > -1) {
                    newSubSections.splice(idx, 1);
                    newSections[openSection] = newSubSections;
                    return newSections;
                }

                return oldSections;
            });
        },
        [openSection],
    );

    const handleCompleteSectionChange = useCallback((section: ConfigSection, subSection: ConfigSubSection) => {
        setOpenSection(section);
        setOpenSubsections((oldSections) => {
            const newSections = { ...oldSections };
            newSections[section] = [...oldSections[section], subSection];
            return newSections;
        });
    }, []);

    const handleJiraToggle = useCallback((enabled: boolean): void => {
        const changes = Object.create(null);
        changes['jira.enabled'] = enabled;
        setChanges(changes);
    }, []);

    const handleBitbucketToggle = useCallback((enabled: boolean): void => {
        const changes = Object.create(null);
        changes['bitbucket.enabled'] = enabled;
        setChanges(changes);
    }, []);

    const handleTargetChange = useCallback((event: React.MouseEvent<HTMLElement>, newTarget: ConfigTarget) => {
        if (newTarget) {
            setInternalTarget(newTarget);
        }
    }, []);

    useEffect(() => {
        if (Object.keys(changes).length > 0) {
            controller.updateConfig(changes);
            setChanges({});
        }
    }, [changes, controller]);

    useEffect(() => {
        controller.setConfigTarget(internalTarget);
    }, [internalTarget, controller]);

    useEffect(() => {
        setOpenSection((oldSection) => {
            if (state.openSection !== oldSection) {
                return state.openSection;
            }

            return oldSection;
        });
    }, [state.openSection]);

    useEffect(() => {
        setOpenSubsections((oldSubSections) => {
            if (!equal(state.openSubSections, oldSubSections)) {
                return { ...emptySubsections, [state.openSection]: state.openSubSections };
            }

            return oldSubSections;
        });
    }, [state.openSection, state.openSubSections]);

    return (
        <ConfigControllerContext.Provider value={controller}>
            <AuthDialogControllerContext.Provider value={authDialogController}>
                <AtlascodeErrorBoundary
                    context={{ view: AnalyticsView.SettingsPage }}
                    postMessageFunc={controller.postMessage}
                >
                    <Container maxWidth="xl">
                        <AppBar position="relative">
                            <Toolbar>
                                <Typography variant="h3" className={classes.title}>
                                    {l10n.t('Atlassian Settings')}
                                </Typography>
                                <Tabs
                                    value={openSection}
                                    onChange={handleTabChange}
                                    aria-label="simple tabs example"
                                    indicatorColor="primary"
                                    variant="scrollable"
                                    scrollButtons="on"
                                >
                                    <Tab
                                        id="simple-tab-0"
                                        aria-controls="simple-tabpanel-0"
                                        value={ConfigSection.Jira}
                                        label={
                                            <ProductEnabler
                                                label="Jira"
                                                enabled={state.config['jira.enabled']}
                                                onToggle={handleJiraToggle}
                                            />
                                        }
                                    />
                                    <Tab
                                        id="simple-tab-1"
                                        aria-controls="simple-tabpanel-1"
                                        value={ConfigSection.Bitbucket}
                                        label={
                                            <ProductEnabler
                                                label="Bitbucket"
                                                enabled={state.config['bitbucket.enabled']}
                                                onToggle={handleBitbucketToggle}
                                            />
                                        }
                                    />
                                    <Tab
                                        id="simple-tab-2"
                                        aria-controls="simple-tabpanel-2"
                                        value={ConfigSection.General}
                                        label={l10n.t('General')}
                                    />
                                    <Tab
                                        id="simple-tab-3"
                                        aria-controls="simple-tabpanel-3"
                                        value={ConfigSection.Explore}
                                        label={l10n.t('Explore')}
                                    />
                                </Tabs>
                                <div className={classes.grow} />
                                <Typography variant="subtitle1" classes={{ root: classes.targetSelectLabel }}>
                                    {l10n.t('Save settings to:')}{' '}
                                </Typography>
                                <ToggleButtonGroup
                                    color="primary"
                                    size="small"
                                    value={internalTarget}
                                    exclusive
                                    onChange={handleTargetChange}
                                >
                                    <Tooltip title={l10n.t('User settings')}>
                                        <ToggleButton
                                            key={1}
                                            value={ConfigTarget.User}
                                            selected={internalTarget !== ConfigTarget.User}
                                            disableRipple={internalTarget === ConfigTarget.User}
                                        >
                                            <Badge
                                                color="primary"
                                                variant="dot"
                                                invisible={internalTarget !== ConfigTarget.User}
                                            >
                                                <PersonIcon />
                                            </Badge>
                                        </ToggleButton>
                                    </Tooltip>
                                    <Tooltip title={l10n.t('Workspace settings')}>
                                        <ToggleButton
                                            key={2}
                                            value={ConfigTarget.Workspace}
                                            selected={internalTarget !== ConfigTarget.Workspace}
                                            disableRipple={internalTarget === ConfigTarget.Workspace}
                                        >
                                            <Badge
                                                color="primary"
                                                variant="dot"
                                                invisible={internalTarget !== ConfigTarget.Workspace}
                                            >
                                                <WorkIcon />
                                            </Badge>
                                        </ToggleButton>
                                    </Tooltip>
                                </ToggleButtonGroup>
                                <RefreshButton loading={state.isSomethingLoading} onClick={controller.refresh} />
                            </Toolbar>
                        </AppBar>
                        <Grid container spacing={1}>
                            <Grid item xs={12} md={9} lg={10} xl={10}>
                                <Paper className={classes.paper100}>
                                    <ErrorDisplay />
                                    <PMFDisplay postMessageFunc={controller.postMessage} />
                                    <Box margin={2}>
                                        <JiraPanel
                                            visible={openSection === ConfigSection.Jira}
                                            selectedSubSections={openSubsections[ConfigSection.Jira]}
                                            onSubsectionChange={handleSubsectionChange}
                                            config={state.config!}
                                            sites={state.jiraSites}
                                            isRemote={state.isRemote}
                                        />
                                        <BitbucketPanel
                                            visible={openSection === ConfigSection.Bitbucket}
                                            selectedSubSections={openSubsections[ConfigSection.Bitbucket]}
                                            onSubsectionChange={handleSubsectionChange}
                                            config={state.config!}
                                            sites={state.bitbucketSites}
                                            isRemote={state.isRemote}
                                        />
                                        <GeneralPanel
                                            visible={openSection === ConfigSection.General}
                                            selectedSubSections={openSubsections[ConfigSection.General]}
                                            onSubsectionChange={handleSubsectionChange}
                                            config={state.config!}
                                        />
                                        <ExplorePanel
                                            visible={openSection === ConfigSection.Explore}
                                            config={state.config!}
                                            sectionChanger={handleCompleteSectionChange}
                                        />
                                    </Box>
                                </Paper>
                            </Grid>
                            <Grid item xs={12} md={3} lg={2} xl={2}>
                                <Paper className={classes.paperOverflow}>
                                    <Box margin={2}>
                                        <SidebarButtons feedbackUser={state.feedbackUser} />
                                    </Box>
                                </Paper>
                            </Grid>
                        </Grid>
                    </Container>
                    <AuthDialog
                        product={authDialogProduct}
                        doClose={authDialogController.close}
                        authEntry={authDialogEntry}
                        open={authDialogOpen}
                        save={controller.login}
                        onExited={authDialogController.onExited}
                    />
                </AtlascodeErrorBoundary>
            </AuthDialogControllerContext.Provider>
        </ConfigControllerContext.Provider>
    );
};

export default ConfigPage;
