import { Box, Button, Container, lighten, makeStyles, Step, StepLabel, Stepper, Theme } from '@material-ui/core';
import React, { useCallback, useEffect, useState } from 'react';
import {
    AuthInfo,
    AuthInfoState,
    emptyUserInfo,
    ProductBitbucket,
    ProductJira,
    SiteInfo,
} from '../../../atlclients/authInfo';
import { AuthDialog } from '../config/auth/dialog/AuthDialog';
import { AuthDialogControllerContext, useAuthDialog } from '../config/auth/useAuthDialog';
import LandingPage from './LandingPage';
import { OnboardingControllerContext, useOnboardingController } from './onboardingController';
import ProductSelector from './ProductSelector';
import { SimpleSiteAuthenticator } from './SimpleSiteAuthenticator';
import { AtlascodeErrorBoundary } from '../common/ErrorBoundary';
import { AnalyticsView } from '../../../analyticsTypes';
import { CommonMessageType } from '../../../lib/ipc/toUI/common';
import { OnboardingActionType } from '../../../lib/ipc/fromUI/onboarding';
import { JiraOnboarding } from './JiraOnboarding';
import { BitbucketOnboarding } from './BitbucketOnboarding';
import { Experiments } from '../../../util/featureFlags/features';

const useStyles = makeStyles((theme: Theme) => ({
    root: {
        width: '100%',
        marginTop: theme.spacing(3),
    },
    button: {
        marginRight: theme.spacing(1),
    },
    backButton: {
        marginRight: theme.spacing(1),
        color: theme.palette.type === 'dark' ? lighten(theme.palette.text.primary, 1) : theme.palette.text.primary,
        '&:hover': {
            color: theme.palette.type === 'dark' ? lighten(theme.palette.text.primary, 1) : 'white',
        },
    },
    pageContent: {
        marginTop: theme.spacing(5),
        marginBottom: theme.spacing(4),
    },
}));

const jiraValueSet = {
    cloud: 'jira-setup-radio-cloud',
    server: 'jira-setup-radio-server',
    none: 'jira-setup-radio-none',
};
const bitbucketValueSet = {
    cloud: 'bitbucket-setup-radio-cloud',
    server: 'bitbucket-setup-radio-server',
    none: 'bitbucket-setup-radio-none',
};

export const OnboardingPage: React.FunctionComponent = () => {
    const classes = useStyles();
    const [changes, setChanges] = useState<{ [key: string]: any }>({});
    const [state, controller] = useOnboardingController();
    const { authDialogController, authDialogOpen, authDialogProduct, authDialogEntry } = useAuthDialog();
    const [activeStep, setActiveStep] = React.useState(0);
    const [useAuthUI, setUseAuthUI] = React.useState(false);
    const [jiraSignInText, setJiraSignInText] = useState('Sign In to Jira Cloud');
    const [bitbucketSignInText, setBitbucketSignInText] = useState('Sign In to Bitbucket Cloud');
    const [jiraSignInFlow, setJiraSignInFlow] = useState(jiraValueSet.cloud);
    const [bitbucketSignInFlow, setBitbucketSignInFlow] = useState(bitbucketValueSet.cloud);

    React.useEffect(() => {
        window.addEventListener('message', (event) => {
            const message = event.data;
            if (message.command === CommonMessageType.UpdateExperimentValues) {
                const experimentValue = message.experimentValues[Experiments.NewAuthUI];
                if (typeof experimentValue === 'string' && experimentValue.trim().toLowerCase() === 'new') {
                    setUseAuthUI(true);
                } else {
                    setUseAuthUI(false);
                }
            }
        });
    }, [controller]);

    function getSteps() {
        if (useAuthUI) {
            return ['Setup Jira', 'Setup BitBucket', 'Explore'];
        }

        return ['Select Products', 'Authenticate', 'Explore'];
    }
    const steps = getSteps();

    const handleNext = useCallback(() => {
        setActiveStep((prevActiveStep) => prevActiveStep + 1);
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

    const handleOpenSettings = useCallback((): void => {
        controller.openSettings();
    }, [controller]);

    const handleClosePage = useCallback((): void => {
        controller.closePage();
    }, [controller]);

    const handleLogin = useCallback(
        (site: SiteInfo, auth: AuthInfo): void => {
            controller.login(site, auth);
        },
        [controller],
    );

    const handleExit = useCallback((): void => {
        authDialogController.onExited();
    }, [authDialogController]);

    const handleCloseDialog = useCallback((): void => {
        authDialogController.close();
    }, [authDialogController]);

    useEffect(() => {
        if (Object.keys(changes).length > 0) {
            controller.updateConfig(changes);
            setChanges({});
        }
    }, [changes, controller]);

    const handleServerSignIn = useCallback(
        (product) => {
            authDialogController.openDialog(product, undefined);
        },
        [authDialogController],
    );

    const handleCloudSignIn = useCallback(
        (product) => {
            const hostname = product.key === ProductJira.key ? 'atlassian.net' : 'bitbucket.org';
            controller.login({ host: hostname, product: product }, { user: emptyUserInfo, state: AuthInfoState.Valid });
        },
        [controller],
    );

    const executeBitbucketSignInFlow = useCallback(() => {
        console.log(bitbucketSignInFlow);
        switch (bitbucketSignInFlow) {
            case bitbucketValueSet.cloud:
                handleCloudSignIn(ProductBitbucket);
                break;
            case bitbucketValueSet.server:
                handleServerSignIn(ProductBitbucket);
                break;
            case bitbucketValueSet.none:
                handleNext();
                break;
            default:
                controller.postMessage({
                    type: OnboardingActionType.Error,
                    error: new Error(`Invalid Bitbucket sign in flow ${bitbucketSignInFlow}`),
                });
                break;
        }
    }, [bitbucketSignInFlow, controller, handleCloudSignIn, handleNext, handleServerSignIn]);

    const executeJiraSignInFlow = useCallback(() => {
        switch (jiraSignInFlow) {
            case jiraValueSet.cloud:
                handleCloudSignIn(ProductJira);
                break;
            case jiraValueSet.server:
                handleServerSignIn(ProductJira);
                break;
            case jiraValueSet.none:
                handleNext();
                break;
            default:
                controller.postMessage({
                    type: OnboardingActionType.Error,
                    error: new Error(`Invalid Jira sign in flow ${jiraSignInFlow}`),
                });
                break;
        }
    }, [jiraSignInFlow, handleCloudSignIn, handleServerSignIn, handleNext, controller]);

    const handleJiraOptionChange = useCallback((value: string) => {
        setJiraSignInFlow(value);
        if (value === jiraValueSet.cloud) {
            setJiraSignInText('Sign in to Jira Cloud');
        } else if (value === jiraValueSet.server) {
            setJiraSignInText('Sign in to Jira Server');
        } else {
            setJiraSignInText('Next');
        }
    }, []);

    const handleBitbucketOptionChange = useCallback((value: string) => {
        setBitbucketSignInFlow(value);
        if (value === bitbucketValueSet.cloud) {
            setBitbucketSignInText('Sign in to Bitbucket Cloud');
        } else if (value === bitbucketValueSet.server) {
            setBitbucketSignInText('Sign in to Bitbucket Server');
        } else {
            setBitbucketSignInText('Next');
        }
    }, []);

    const handleBack = useCallback(() => {
        handleJiraOptionChange(jiraValueSet.cloud);
        handleBitbucketOptionChange(bitbucketValueSet.cloud);

        if (activeStep === 2) {
            setActiveStep((prevActiveStep) => prevActiveStep - 2);
        } else {
            setActiveStep((prevActiveStep) => prevActiveStep - 1);
        }
    }, [activeStep, handleBitbucketOptionChange, handleJiraOptionChange]);

    useEffect(() => {
        if (controller.isLoginComplete) {
            controller.setIsLoginComplete(false);
            handleNext();
        }
    }, [controller, handleNext]);

    const getStepContent = (step: number) => {
        switch (step) {
            case 0:
                return (
                    <ProductSelector
                        bitbucketToggleHandler={handleBitbucketToggle}
                        jiraToggleHandler={handleJiraToggle}
                        jiraEnabled={state.config['jira.enabled']}
                        bitbucketEnabled={state.config['bitbucket.enabled']}
                    />
                );
            case 1:
                return (
                    <SimpleSiteAuthenticator
                        enableBitbucket={state.config['bitbucket.enabled']}
                        enableJira={state.config['jira.enabled']}
                        bitbucketSites={state.bitbucketSites}
                        jiraSites={state.jiraSites}
                        onFinished={handleNext}
                    />
                );
            case 2:
                return (
                    <LandingPage
                        bitbucketEnabled={state.config['bitbucket.enabled']}
                        jiraEnabled={state.config['jira.enabled']}
                        bitbucketSites={state.bitbucketSites}
                        jiraSites={state.jiraSites}
                    />
                );
            default:
                return 'Unknown step';
        }
    };

    const oldAuthUI = (
        <div>
            <div className={classes.pageContent}>{getStepContent(activeStep)}</div>
            <div style={{ float: 'right', marginBottom: '30px' }}>
                <Button disabled={activeStep === 0} onClick={handleBack} className={classes.backButton}>
                    Back
                </Button>
                {activeStep !== 2 && (
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleNext}
                        className={classes.button}
                        disabled={!state.config['bitbucket.enabled'] && !state.config['jira.enabled']}
                    >
                        {activeStep === 1 ? 'Skip' : 'Next'}
                    </Button>
                )}
                {activeStep === 2 && (
                    <React.Fragment>
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={handleOpenSettings}
                            className={classes.button}
                        >
                            Open Extension Settings
                        </Button>
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={handleClosePage}
                            className={classes.button}
                        >
                            Finish
                        </Button>
                    </React.Fragment>
                )}
            </div>
        </div>
    );

    const authUI_v1 = (
        <div>
            {activeStep === 0 && (
                <JiraOnboarding
                    valueSet={jiraValueSet}
                    handleOptionChange={handleJiraOptionChange}
                    executeSetup={executeJiraSignInFlow}
                    signInText={jiraSignInText}
                />
            )}
            {activeStep === 1 && (
                <BitbucketOnboarding
                    valueSet={bitbucketValueSet}
                    handleOptionChange={handleBitbucketOptionChange}
                    executeSetup={executeBitbucketSignInFlow}
                    handleBack={handleBack}
                    signInText={bitbucketSignInText}
                />
            )}
            {activeStep === 2 && (
                <LandingPage
                    bitbucketEnabled={state.config['bitbucket.enabled']}
                    jiraEnabled={state.config['jira.enabled']}
                    bitbucketSites={state.bitbucketSites}
                    jiraSites={state.jiraSites}
                />
            )}
        </div>
    );

    return (
        <OnboardingControllerContext.Provider value={controller}>
            <AuthDialogControllerContext.Provider value={authDialogController}>
                <AtlascodeErrorBoundary
                    context={{ view: AnalyticsView.OnboardingPage }}
                    postMessageFunc={controller.postMessage}
                >
                    <Container maxWidth="xl">
                        <div className={classes.root}>
                            <Stepper activeStep={activeStep}>
                                {steps.map((label) => {
                                    const stepProps = {};
                                    const labelProps = {};
                                    return (
                                        <Step key={label} {...stepProps}>
                                            <StepLabel {...labelProps}>{label}</StepLabel>
                                        </Step>
                                    );
                                })}
                            </Stepper>
                            <Box
                                style={{
                                    display: 'flex',
                                    flex: '1 0 0',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '24px',
                                }}
                            >
                                {useAuthUI ? authUI_v1 : oldAuthUI}
                            </Box>
                        </div>
                    </Container>
                    <AuthDialog
                        product={authDialogProduct}
                        doClose={handleCloseDialog}
                        authEntry={authDialogEntry}
                        open={authDialogOpen}
                        save={handleLogin}
                        onExited={handleExit}
                    />
                </AtlascodeErrorBoundary>
            </AuthDialogControllerContext.Provider>
        </OnboardingControllerContext.Provider>
    );
};

export default OnboardingPage;
