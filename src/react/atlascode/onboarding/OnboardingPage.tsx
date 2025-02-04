import { Button, Container, lighten, makeStyles, Step, StepLabel, Stepper, Theme, Typography } from '@material-ui/core';
import React, { useCallback, useEffect, useState } from 'react';
import { AuthInfo, AuthInfoState, emptyUserInfo, ProductBitbucket, ProductJira, SiteInfo } from '../../../atlclients/authInfo';
import { AuthDialog } from '../config/auth/dialog/AuthDialog';
import { AuthDialogControllerContext, useAuthDialog } from '../config/auth/useAuthDialog';
import LandingPage from './LandingPage';
import { OnboardingControllerContext, useOnboardingController } from './onboardingController';
import ProductSelector from './ProductSelector';
import { SimpleSiteAuthenticator } from './SimpleSiteAuthenticator';
import { AtlascodeErrorBoundary } from '../common/ErrorBoundary';
import { AnalyticsView } from 'src/analyticsTypes';
import { Features } from 'src/util/featureFlags';
import { CommonMessageType } from 'src/lib/ipc/toUI/common';

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



export const OnboardingPage: React.FunctionComponent = () => {
    const classes = useStyles();
    const [changes, setChanges] = useState<{ [key: string]: any }>({});
    const [state, controller] = useOnboardingController();
    const { authDialogController, authDialogOpen, authDialogProduct, authDialogEntry } = useAuthDialog();
    const [activeStep, setActiveStep] = React.useState(0);
    const [useAuthUI, setUseAuthUI] = React.useState(false);
    const [jiraSignInText, setJiraSignInText] = useState('Sign In to Jira Cloud');
    const [bitbucketSignInText, setBitbucketSignInText] = useState('Sign In to Bitbucket Cloud');
    const [jiraSignInFlow, setJiraSignInFlow] = useState('jira-setup-radio-cloud');
    const [bitbucketSignInFlow, setBitbucketSignInFlow] = useState('bitbucket-setup-radio-cloud');

    React.useEffect(() => {
        window.addEventListener('message', (event) => {
            const message = event.data;
            if (message.command === CommonMessageType.UpdateFeatureFlags) {
                const featureValue = message.featureFlags[Features.EnableAuthUI];
                console.log(
                    `FeatureGates: received by OnboardingPage - ${Features.EnableAuthUI} -> ${featureValue}`,
                );
                setUseAuthUI(featureValue);
            }
        });
    }, []);
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

    const handleBack = useCallback(() => {
        if (activeStep === 2) {
            setActiveStep((prevActiveStep) => prevActiveStep - 2);
        } else {
            setActiveStep((prevActiveStep) => prevActiveStep - 1);
        }
    }, [activeStep]);

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


    const executeBitbucketSignInFlow = () => {
        console.log(bitbucketSignInFlow);
        switch (bitbucketSignInFlow) {
            case 'bitbucket-setup-radio-cloud':
                handleCloudSignIn(ProductBitbucket);
                break;
            case 'bitbucket-setup-radio-server':
                break;
            case 'bitbucket-setup-radio-none':
                break;
            default:
                console.log('Invalid Bitbucket sign in flow: %s', bitbucketSignInFlow);
                break;
        }
    };


    const handleCloudSignIn = useCallback((product) => {
            const hostname = product.key === ProductJira.key ? 'atlassian.net' : 'bitbucket.org';
            controller.login({ host: hostname, product: product }, { user: emptyUserInfo, state: AuthInfoState.Valid });
        }, [controller]);

    
    const executeJiraSignInFlow = () => {
        console.log(jiraSignInFlow);
        switch (jiraSignInFlow) {
            case 'jira-setup-radio-cloud':
                handleCloudSignIn(ProductJira);
                break;
            case 'jira-setup-radio-server':
                break;
            case 'jira-setup-radio-none':
                break;
            default:
                console.log('Invalid Jira sign in flow: %s', jiraSignInFlow);
                break;
        }
    };

    const handleJiraOptionChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;
        setJiraSignInFlow(value);
        if (value === 'jira-setup-radio-cloud') {
            setJiraSignInText('Sign in to Jira Cloud');
        } else if (value === 'jira-setup-radio-server') {
            setJiraSignInText('Sign in to Jira Server');
        } else {
            setJiraSignInText('Next');
        }
    }, []);

    const handleBitbucketOptionChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;
        setBitbucketSignInFlow(value);
        if (value === 'bitbucket-setup-radio-cloud') {
            setBitbucketSignInText('Sign in to Bitbucket Cloud');
        } else if (value === 'bitbucket-setup-radio-server') {
            setBitbucketSignInText('Sign in to Bitbucket Server');
        } else {
            setBitbucketSignInText('Next');
        }
    }, []);

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

    const oldAuthUI = <div>
        <div className={classes.pageContent}>{getStepContent(activeStep)}</div>
        <div style={{ float: 'right', marginBottom: '30px' }}>
            <Button
                disabled={activeStep === 0}
                onClick={handleBack}
                className={classes.backButton}
            >
                Back
            </Button>
            {activeStep !== 2 && (
                <Button
                    variant="contained"
                    color="primary"
                    onClick={handleNext}
                    className={classes.button}
                    disabled={!state.config['bitbucket.enabled'] &&
                        !state.config['jira.enabled']}
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
    </div>;

    const authUI_v1 = (
        <div>
            {activeStep === 0 && (
                <div className={classes.pageContent}>
                    <Typography variant="h5">What version of Jira do you use?</Typography>
                    <div>
                        <input type="radio" id="jiraOption1" name="jira" value="jira-setup-radio-cloud" checked={jiraSignInFlow === 'jira-setup-radio-cloud'} onChange={handleJiraOptionChange} />
                        <label htmlFor="jiraOption1">Cloud</label>
                    </div>
                    <div>
                        <input type="radio" id="jiraOption2" name="jira" value="jira-setup-radio-server" checked={jiraSignInFlow === 'jira-setup-radio-server'} onChange={handleJiraOptionChange} />
                        <label htmlFor="jiraOption2">Server</label>
                    </div>
                    <div>
                        <input type="radio" id="jiraOption3" name="jira" value="jira-setup-radio-none" checked={jiraSignInFlow === 'jira-setup-radio-none'} onChange={handleJiraOptionChange} />
                        <label htmlFor="jiraOption3">I don't have Jira</label>
                    </div>
                    <Button variant="contained" color="primary" onClick={() => {
                        executeJiraSignInFlow();
                        handleNext();
                    }}>
                        {jiraSignInText}
                    </Button>
                </div>
            )}
            {activeStep === 1 && (
                <div className={classes.pageContent}>
                    <Typography variant="h5">Setup BitBucket</Typography>
                    <div>
                        <input type="radio" id="bitbucketOption1" name="bitbucket" value="bitbucket-setup-radio-cloud" checked={bitbucketSignInFlow === 'bitbucket-setup-radio-cloud'} onChange={handleBitbucketOptionChange} />
                        <label htmlFor="bitbucketOption1">Cloud</label>
                    </div>
                    <div>
                        <input type="radio" id="bitbucketOption2" name="bitbucket" value="bitbucket-setup-radio-server" checked={bitbucketSignInFlow === 'bitbucket-setup-radio-server'} onChange={handleBitbucketOptionChange} />
                        <label htmlFor="bitbucketOption2">Server</label>
                    </div>
                    <div>
                        <input type="radio" id="bitbucketOption3" name="bitbucket" value="bitbucket-setup-radio-none" checked={bitbucketSignInFlow === 'bitbucket-setup-radio-none'} onChange={handleBitbucketOptionChange} />
                        <label htmlFor="bitbucketOption3">I don't have BitBucket</label>
                    </div>
                    <Button variant="contained" color="primary" onClick={() => {
                        executeBitbucketSignInFlow();
                        handleNext();
                    }}>
                        {bitbucketSignInText}
                    </Button>
                    <Button onClick={handleBack} className={classes.backButton}>
                        Back
                    </Button>
                </div>
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
                            <div>
                                {useAuthUI ? (
                                    authUI_v1
                                ) : (
                                    oldAuthUI
                                )}
                            </div>
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
