import { CssBaseline, ThemeProvider } from '@material-ui/core';
import React, { useCallback, useEffect, useState } from 'react';
import * as ReactDOM from 'react-dom';
import useConstant from 'use-constant';
import AtlGlobalStyles from './atlascode/common/AtlGlobalStyles';
import { AtlLoader } from './atlascode/common/AtlLoader';
import { ErrorControllerContext, ErrorStateContext, useErrorController } from './atlascode/common/errorController';
import { PMFControllerContext, PMFStateContext, usePMFController } from './atlascode/common/pmf/pmfController';
import { atlascodeTheme } from './atlascode/theme/atlascodeTheme';
import { attachImageErrorHandler } from './imageErrorHandler';
import { computeStyles, VSCodeStylesContext } from './vscode/theme/styles';
import { createVSCodeTheme } from './vscode/theme/vscodeTheme';

// @ts-ignore
// __webpack_public_path__ is used to set the public path for the js files - https://webpack.js.org/guides/public-path/
// eslint-disable-next-line no-var
declare var __webpack_public_path__: string;
// eslint-disable-next-line no-unused-vars
__webpack_public_path__ = `${document.baseURI!}build/`;

const routes: Record<string, any> = {
    atlascodeSettingsV2: React.lazy(
        () => import(/* webpackChunkName: "atlascodeSettingsV2" */ './atlascode/config/ConfigPage'),
    ),
    atlascodeOnboardingV2: React.lazy(
        () => import(/* webpackChunkName: "atlascodeOnboardingV2" */ './atlascode/onboarding/OnboardingPage'),
    ),
    bitbucketIssuePageV2: React.lazy(
        () => import(/* webpackChunkName: "bitbucketIssuePageV2" */ './atlascode/bbissue/BitbucketIssuePage'),
    ),
    createBitbucketIssuePageV2: React.lazy(
        () =>
            import(/* webpackChunkName: "createBitbucketIssuePageV2" */ './atlascode/bbissue/CreateBitbucketIssuePage'),
    ),
    welcomePageV2: React.lazy(() => import(/* webpackChunkName: "welcomePageV2" */ './atlascode/welcome/Welcome')),
    startWorkPageV2: React.lazy(
        () => import(/* webpackChunkName: "startWorkPageV2" */ './atlascode/startwork/StartWorkPage'),
    ),
    pipelineSummaryV2: React.lazy(
        () => import(/* webpackChunkName: "pipelineSummaryV2" */ './atlascode/pipelines/PipelineSummaryPage'),
    ),
    pullRequestDetailsPageV2: React.lazy(
        () =>
            import(/* webpackChunkName: "pullRequestDetailsPageV2" */ './atlascode/pullrequest/PullRequestDetailsPage'),
    ),
    createPullRequestPageV2: React.lazy(
        () => import(/* webpackChunkName: "createPullRequestPageV2" */ './atlascode/pullrequest/CreatePullRequestPage'),
    ),
};

const view = document.getElementById('reactView') as HTMLElement;
const root = document.getElementById('root') as HTMLElement;

attachImageErrorHandler();

const App = () => {
    const Page = routes[view.getAttribute('content')!];
    const [errorState, errorController] = useErrorController();
    const [pmfState, pmfController] = usePMFController();
    const [vscStyles, setVscStyles] = useState(computeStyles());
    const [currentTheme, setCurrentTheme] = useState(atlascodeTheme(createVSCodeTheme(vscStyles), false));
    const onColorThemeChanged = useCallback(() => {
        const newStyles = computeStyles();
        setVscStyles(newStyles);
        setCurrentTheme(atlascodeTheme(createVSCodeTheme(newStyles), false));
    }, []);
    const themeObserver = useConstant<MutationObserver>(() => {
        const observer = new MutationObserver(onColorThemeChanged);
        observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
        return observer;
    });

    useEffect(() => {
        return () => {
            themeObserver.disconnect();
        };
    }, [themeObserver]);

    return (
        <React.Suspense fallback={<AtlLoader />}>
            <VSCodeStylesContext.Provider value={vscStyles}>
                <ThemeProvider theme={currentTheme}>
                    <ErrorControllerContext.Provider value={errorController}>
                        <ErrorStateContext.Provider value={errorState}>
                            <PMFControllerContext.Provider value={pmfController}>
                                <PMFStateContext.Provider value={pmfState}>
                                    <CssBaseline />
                                    <AtlGlobalStyles />
                                    <Page />
                                </PMFStateContext.Provider>
                            </PMFControllerContext.Provider>
                        </ErrorStateContext.Provider>
                    </ErrorControllerContext.Provider>
                </ThemeProvider>
            </VSCodeStylesContext.Provider>
        </React.Suspense>
    );
};

ReactDOM.render(<App />, root);
