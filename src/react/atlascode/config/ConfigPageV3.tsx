import { RefreshButton } from '@atlassianlabs/guipi-core-components';
import {
    AppBar,
    Badge,
    Box,
    Container,
    Grid,
    makeStyles,
    Paper,
    Tab,
    Tabs,
    Theme,
    Toolbar,
    Tooltip,
    Typography,
} from '@material-ui/core';
import PersonIcon from '@material-ui/icons/Person';
import WorkIcon from '@material-ui/icons/Work';
import ToggleButton from '@material-ui/lab/ToggleButton';
import ToggleButtonGroup from '@material-ui/lab/ToggleButtonGroup';
import equal from 'fast-deep-equal/es6';
import React, { useCallback, useEffect, useState } from 'react';
import { AnalyticsView } from 'src/analyticsTypes';

import { ConfigTarget, ConfigV3Section, ConfigV3SubSection } from '../../../lib/ipc/models/config';
import { AtlascodeErrorBoundary } from '../common/ErrorBoundary';
import { ErrorDisplay } from '../common/ErrorDisplay';
import { PMFDisplay } from '../common/pmf/PMFDisplay';
import { AdvancedConfigsPanel } from './advancedConfigs/advancedConfigsPanel';
import { AuthDialog } from './auth/dialog/AuthDialog';
import { AuthDialogControllerContext, useAuthDialog } from './auth/useAuthDialog';
import { ConfigControllerContext, useConfigController } from './configControllerV3';
import { ExplorePanel } from './exploreV3/ExplorePanel';
import { AuthenicationPanel } from './generalAuth/AuthenicationPanel';
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
    [key: string]: ConfigV3SubSection[];
};

const emptySubsections: SectionWithSubsections = {
    [ConfigV3Section.Auth]: [],
    [ConfigV3Section.AdvancedConfig]: [],
};

const ConfigPageV3: React.FunctionComponent = () => {
    const classes = useStyles();
    const [state, controller] = useConfigController();
    const [changes, setChanges] = useState<{ [key: string]: any }>({});
    const [internalTarget, setInternalTarget] = useState<ConfigTarget>(state.target);
    const [openSection, setOpenSection] = useState<ConfigV3Section>(() => state.openSection);
    const [openSubsections, setOpenSubsections] = useState<SectionWithSubsections>(() => {
        return { ...emptySubsections, [state.openSection]: state.openSubSections };
    });

    const { authDialogController, authDialogOpen, authDialogProduct, authDialogEntry } = useAuthDialog();
    const handleTabChange = useCallback((event: React.ChangeEvent<{}>, section: ConfigV3Section) => {
        setOpenSection(section);
    }, []);

    const handleSubsectionChange = useCallback(
        (subSection: ConfigV3SubSection, expanded: boolean) => {
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

    const handleCompleteSectionChange = useCallback((section: ConfigV3Section, subSection: ConfigV3SubSection) => {
        setOpenSection(section);
        setOpenSubsections((oldSections) => {
            const newSections = { ...oldSections };
            newSections[section] = [...oldSections[section], subSection];
            return newSections;
        });
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
                                    Atlassian Settings
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
                                        value={ConfigV3Section.Auth}
                                        label="Authenications"
                                    />
                                    <Tab
                                        id="simple-tab-1"
                                        aria-controls="simple-tabpanel-1"
                                        value={ConfigV3Section.AdvancedConfig}
                                        label="Advanced Configurations"
                                    />
                                    <Tab
                                        id="simple-tab-2"
                                        aria-controls="simple-tabpanel-2"
                                        value={ConfigV3Section.Explore}
                                        label="Explore"
                                    />
                                </Tabs>
                                <div className={classes.grow} />
                                <Typography variant="subtitle1" classes={{ root: classes.targetSelectLabel }}>
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
                                <RefreshButton loading={state.isSomethingLoading} onClick={controller.refresh} />
                            </Toolbar>
                        </AppBar>
                        <Grid container spacing={1}>
                            <Grid item xs={12} md={9} lg={10} xl={10}>
                                <Paper className={classes.paper100}>
                                    <ErrorDisplay />
                                    <PMFDisplay postMessageFunc={controller.postMessage} />
                                    <Box margin={2}>
                                        <AuthenicationPanel
                                            visible={openSection === ConfigV3Section.Auth}
                                            selectedSubSections={openSubsections[ConfigV3Section.Auth]}
                                            onSubsectionChange={handleSubsectionChange}
                                            config={state.config!}
                                            jiraSites={state.jiraSites}
                                            bitbucketSites={state.bitbucketSites}
                                            isRemote={state.isRemote}
                                        />
                                        <AdvancedConfigsPanel
                                            visible={openSection === ConfigV3Section.AdvancedConfig}
                                            selectedSubSections={openSubsections[ConfigV3Section.AdvancedConfig]}
                                            onSubsectionChange={handleSubsectionChange}
                                            config={state.config!}
                                            sites={state.jiraSites}
                                            isRemote={state.isRemote}
                                        />
                                        <ExplorePanel
                                            visible={openSection === ConfigV3Section.Explore}
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

export default ConfigPageV3;
