import { CssBaseline, ThemeProvider } from '@material-ui/core';
import React, { useCallback, useEffect, useState } from 'react';
import * as ReactDOM from 'react-dom';
import useConstant from 'use-constant';

import { UIWSPort } from '../lib/ipc/models/ports';
import AtlGlobalStyles from './atlascode/common/AtlGlobalStyles';
import { AtlLoader } from './atlascode/common/AtlLoader';
import { ErrorControllerContext, ErrorStateContext, useErrorController } from './atlascode/common/errorController';
import { atlascodeTheme } from './atlascode/theme/atlascodeTheme';
import { computeStyles, VSCodeStylesContext } from './vscode/theme/styles';
import { createVSCodeTheme } from './vscode/theme/vscodeTheme';

declare global {
    // eslint-disable-next-line no-unused-vars
    interface Window {
        acquireVsCodeApi: () => any;
    }
}

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

const ports: Record<string, number> = {
    atlascodeSettingsV2: UIWSPort.Settings,
    atlascodeOnboardingV2: UIWSPort.Onboarding,
    bitbucketIssuePageV2: UIWSPort.BitbucketIssuePage,
    createBitbucketIssuePageV2: UIWSPort.CreateBitbucketIssuePage,
    welcomePageV2: UIWSPort.WelcomePage,
    startWorkPageV2: UIWSPort.StartWork,
    pipelineSummaryV2: UIWSPort.PipelineSummary,
    pullRequestDetailsPageV2: UIWSPort.PullRequestDetailsPage,
    createPullRequestPageV2: UIWSPort.CreatePullRequest,
    createIssueScreenV2: UIWSPort.CreateJiraIssuePage,
};

class VsCodeApi {
    private conn: WebSocket;
    constructor(callback: () => void, wsport: number) {
        this.conn = new WebSocket(`ws://127.0.0.1:${wsport}`);
        this.conn.onopen = function (): void {
            callback();
        };
        this.conn.onerror = function (error): void {
            console.error('websocket error', error);
        };
        // most important part - incoming messages
        this.conn.onmessage = function (message): void {
            try {
                const json = JSON.parse(message.data);
                window.postMessage(json.data, '*');
            } catch {
                console.error('Invalid JSON: ', message.data);
                return;
            }
        };
    }
    public postMessage(msg: {}): void {
        this.conn.send(JSON.stringify(msg));
    }
    public setState(state: {}): void {}
    public getState(): {} {
        return {};
    }
}

const view = document.getElementById('reactView') as HTMLElement;
const root = document.getElementById('root') as HTMLElement;

const App = (): JSX.Element => {
    const Page = routes[view.getAttribute('content')!];
    const [errorState, errorController] = useErrorController();
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
                            <CssBaseline />
                            <AtlGlobalStyles />
                            <Page />
                        </ErrorStateContext.Provider>
                    </ErrorControllerContext.Provider>
                </ThemeProvider>
            </VSCodeStylesContext.Provider>
        </React.Suspense>
    );
};

const _vscapi = new VsCodeApi(() => {
    ReactDOM.render(<App />, root);
}, ports[view.getAttribute('content')!]);

window['acquireVsCodeApi'] = (): VsCodeApi => {
    return _vscapi;
};
