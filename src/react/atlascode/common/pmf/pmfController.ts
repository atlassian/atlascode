import { defaultStateGuard, ReducerAction } from '@atlassianlabs/guipi-core-controller';
import { createContext, useCallback, useMemo, useReducer } from 'react';
import { CommonAction, CommonActionType } from '../../../../lib/ipc/fromUI/common';
import { PMFData } from '../../../../lib/ipc/models/common';
import { PostMessageFunc } from '../../messagingApi';

export enum PMFDismissal {
    LATER = 'later',
    NEVER = 'never',
}

interface PMFControllerApi {
    showPMFBanner: () => void;
    dismissPMFBanner: (howLong: PMFDismissal, postMessageFunc: PostMessageFunc<CommonAction>) => void;
    showPMFSurvey: (postMessageFunc: PostMessageFunc<CommonAction>) => void;
    submitPMFSurvey: (pmfData: PMFData, postMessageFunc: PostMessageFunc<CommonAction>) => void;
}

const emptyPMFController: PMFControllerApi = {
    showPMFBanner: () => {},
    showPMFSurvey: (postMessageFunc: PostMessageFunc<CommonAction>) => {},
    submitPMFSurvey: (pmfData: PMFData, postMessageFunc: PostMessageFunc<CommonAction>) => {},
    dismissPMFBanner: (howLong: PMFDismissal, postMessageFunc: PostMessageFunc<CommonAction>) => {},
};

type PMFState = {
    isPMFBannerOpen: boolean;
    isPMFSurveyOpen: boolean;
};

const emptyPMFState: PMFState = {
    isPMFBannerOpen: false,
    isPMFSurveyOpen: false,
};

enum PMFActionType {
    ShowPMFBanner = 'showPMFBanner',
    ShowPMFSurvey = 'showPMFSurvey',
    SubmitPMFSurvey = 'submitPMFSurvey',
    DismissPMFBanner = 'dismissPMFBanner',
}

type PMFAction =
    | ReducerAction<PMFActionType.ShowPMFBanner>
    | ReducerAction<PMFActionType.ShowPMFSurvey>
    | ReducerAction<PMFActionType.SubmitPMFSurvey>
    | ReducerAction<PMFActionType.DismissPMFBanner>;

function pmfReducer(state: PMFState, action: PMFAction): PMFState {
    switch (action.type) {
        case PMFActionType.ShowPMFBanner: {
            return {
                ...state,
                isPMFBannerOpen: true,
            };
        }
        case PMFActionType.ShowPMFSurvey: {
            return {
                isPMFBannerOpen: false,
                isPMFSurveyOpen: true,
            };
        }
        case PMFActionType.SubmitPMFSurvey: {
            return {
                isPMFBannerOpen: false,
                isPMFSurveyOpen: false,
            };
        }
        case PMFActionType.DismissPMFBanner: {
            return {
                isPMFBannerOpen: false,
                isPMFSurveyOpen: false,
            };
        }

        default:
            return defaultStateGuard(state, action);
    }
}

export function usePMFController(): [PMFState, PMFControllerApi] {
    const [state, dispatch] = useReducer(pmfReducer, emptyPMFState);

    const showBanner = useCallback(() => {
        dispatch({ type: PMFActionType.ShowPMFBanner });
    }, []);

    const showSurvey = useCallback((postMessageFunc: PostMessageFunc<CommonAction>) => {
        dispatch({ type: PMFActionType.ShowPMFSurvey });
        postMessageFunc({ type: CommonActionType.OpenPMFSurvey });
    }, []);

    const submitSurvey = useCallback((pmfData: PMFData, postMessageFunc: PostMessageFunc<CommonAction>) => {
        dispatch({ type: PMFActionType.SubmitPMFSurvey });
        postMessageFunc({ type: CommonActionType.SubmitPMF, pmfData: pmfData });
    }, []);

    const dismissBanner = useCallback((howLong: PMFDismissal, postMessageFunc: PostMessageFunc<CommonAction>) => {
        dispatch({ type: PMFActionType.DismissPMFBanner });

        if (howLong === PMFDismissal.LATER) {
            postMessageFunc({ type: CommonActionType.DismissPMFLater });
        } else {
            postMessageFunc({ type: CommonActionType.DismissPMFNever });
        }
    }, []);

    const controllerApi = useMemo<PMFControllerApi>((): PMFControllerApi => {
        return {
            showPMFBanner: showBanner,
            showPMFSurvey: showSurvey,
            submitPMFSurvey: submitSurvey,
            dismissPMFBanner: dismissBanner,
        };
    }, [showBanner, showSurvey, submitSurvey, dismissBanner]);

    return [state, controllerApi];
}

export const PMFControllerContext = createContext(emptyPMFController);

export const PMFStateContext = createContext(emptyPMFState);
