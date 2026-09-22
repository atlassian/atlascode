import { RefreshButton } from '@atlassianlabs/guipi-core-components';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import PersonIcon from '@mui/icons-material/Person';
import WorkIcon from '@mui/icons-material/Work';
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
    ToggleButton,
    ToggleButtonGroup,
    Toolbar,
    Tooltip,
    Typography,
} from '@mui/material';
import IconButton from '@mui/material/IconButton';
import { makeStyles } from '@mui/styles';
import equal from 'fast-deep-equal/es6';
import React, { useCallback, useEffect, useState } from 'react';
import { AnalyticsView } from 'src/analyticsTypes';

import { ConfigSection, ConfigSubSection, ConfigTarget } from '../../../lib/ipc/models/config';
import { AtlascodeErrorBoundary } from '../common/ErrorBoundary';
import { ErrorDisplay } from '../common/ErrorDisplay';
import { FeatureFlagProvider } from '../common/FeatureFlagContext';
import { PMFDisplay } from '../common/pmf/PMFDisplay';
import { AuthDialog } from './auth/dialog/AuthDialog';
import { AuthDialogControllerContext, useAuthDialog } from './auth/useAuthDialog';
import { BitbucketPanel } from './bitbucket/BitbucketPanel';
import { ConfigControllerContext, useConfigController } from './configController';
import { ExplorePanel } from './explore/ExplorePanel';
import { GeneralPanel } from './general/GeneralPanel';
import { JiraPanel } from './jira/JiraPanel';
import { ProductEnabler } from './ProductEnabler';
import { SidebarButtons } from './SidebarButtons';

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

    const { authDialogController, authDialogOpen, authDialogProduct, authDialogEntry, allSitesWithAuth } =
        useAuthDialog();
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

    const sections = [ConfigSection.Jira, ConfigSection.Bitbucket, ConfigSection.General, ConfigSection.Explore];

    const handlePrev = () => {
        const idx = sections.indexOf(openSection);
        if (idx > 0) {
            handleTabChange({} as React.ChangeEvent<{}>, sections[idx - 1]);
        }
    };

    const handleNext = () => {
        const idx = sections.indexOf(openSection);
        if (idx < sections.length - 1) {
            handleTabChange({} as React.ChangeEvent<{}>, sections[idx + 1]);
        }
    };

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
            <FeatureFlagProvider>
                <AuthDialogControllerContext.Provider value={authDialogController}>
                    <AtlascodeErrorBoundary
                        context={{ view: AnalyticsView.SettingsPage }}
                        postMessageFunc={controller.postMessage}
                    >
                        <Container maxWidth="xl">
                            <AppBar position="relative">
                                <Toolbar sx={{ flexWrap: 'wrap', gap: 1 }}>
                                    <Typography variant="h3" sx={{ whiteSpace: 'nowrap', flexGrow: 0 }}>
                                        Atlassian Settings
                                    </Typography>

                                    {/* Large screen: show all tabs */}
                                    <Box
                                        sx={{
                                            display: { xs: 'none', lg: 'flex' },
                                            alignItems: 'center',
                                            gap: 1,
                                            flex: 1,
                                        }}
                                    >
                                        <Tabs
                                            value={openSection}
                                            onChange={handleTabChange}
                                            indicatorColor="primary"
                                            aria-label="settings sections"
                                        >
                                            <Tab
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
                                                value={ConfigSection.Bitbucket}
                                                label={
                                                    <ProductEnabler
                                                        label="Bitbucket"
                                                        enabled={state.config['bitbucket.enabled']}
                                                        onToggle={handleBitbucketToggle}
                                                    />
                                                }
                                            />
                                            <Tab value={ConfigSection.General} label="General" />
                                            <Tab value={ConfigSection.Explore} label="Explore" />
                                        </Tabs>
                                    </Box>

                                    {/* Small screen: arrow navigation */}
                                    <Box
                                        sx={{
                                            display: { xs: 'flex', lg: 'none' },
                                            alignItems: 'center',
                                            flex: 1,
                                            justifyContent: 'center',
                                        }}
                                    >
                                        <IconButton
                                            onClick={handlePrev}
                                            disabled={sections.indexOf(openSection) === 0}
                                            size="small"
                                        >
                                            <ChevronLeftIcon />
                                        </IconButton>
                                        <Box sx={{ minWidth: 140, textAlign: 'center' }}>
                                            {openSection === ConfigSection.Jira && (
                                                <ProductEnabler
                                                    label="Jira"
                                                    enabled={state.config['jira.enabled']}
                                                    onToggle={handleJiraToggle}
                                                />
                                            )}
                                            {openSection === ConfigSection.Bitbucket && (
                                                <ProductEnabler
                                                    label="Bitbucket"
                                                    enabled={state.config['bitbucket.enabled']}
                                                    onToggle={handleBitbucketToggle}
                                                />
                                            )}
                                            {openSection === ConfigSection.General && (
                                                <Typography variant="subtitle1">General</Typography>
                                            )}
                                            {openSection === ConfigSection.Explore && (
                                                <Typography variant="subtitle1">Explore</Typography>
                                            )}
                                        </Box>
                                        <IconButton
                                            onClick={handleNext}
                                            disabled={sections.indexOf(openSection) === sections.length - 1}
                                            size="small"
                                        >
                                            <ChevronRightIcon />
                                        </IconButton>
                                    </Box>

                                    {/* Save settings — always right */}
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 'auto' }}>
                                        <Typography
                                            variant="subtitle1"
                                            sx={{ whiteSpace: 'nowrap', display: { xs: 'none', lg: 'block' } }}
                                        >
                                            Save settings to:{' '}
                                        </Typography>
                                        <ToggleButtonGroup
                                            color="primary"
                                            size="small"
                                            value={internalTarget}
                                            exclusive
                                            onChange={handleTargetChange}
                                        >
                                            <Tooltip title="User settings">
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
                                            <Tooltip title="Workspace settings">
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
                                        <RefreshButton
                                            loading={state.isSomethingLoading}
                                            onClick={controller.refresh}
                                        />
                                    </Box>
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
                                                initiateJiraApiTokenAuth={
                                                    openSection === ConfigSection.Jira &&
                                                    openSubsections[ConfigSection.Jira] &&
                                                    !!state.initiateApiTokenAuth
                                                }
                                            />
                                            <BitbucketPanel
                                                visible={openSection === ConfigSection.Bitbucket}
                                                selectedSubSections={openSubsections[ConfigSection.Bitbucket]}
                                                onSubsectionChange={handleSubsectionChange}
                                                config={state.config!}
                                                sites={state.bitbucketSites}
                                                isRemote={state.isRemote}
                                                initiateBitbucketApiTokenAuth={
                                                    openSection === ConfigSection.Bitbucket &&
                                                    openSubsections[ConfigSection.Bitbucket] &&
                                                    !!state.initiateApiTokenAuth
                                                }
                                            />
                                            <GeneralPanel
                                                visible={openSection === ConfigSection.General}
                                                selectedSubSections={openSubsections[ConfigSection.General]}
                                                onSubsectionChange={handleSubsectionChange}
                                                config={state.config!}
                                                machineId={state.machineId}
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
                            allSitesWithAuth={allSitesWithAuth}
                        />
                    </AtlascodeErrorBoundary>
                </AuthDialogControllerContext.Provider>
            </FeatureFlagProvider>
        </ConfigControllerContext.Provider>
    );
};

export default ConfigPage;
