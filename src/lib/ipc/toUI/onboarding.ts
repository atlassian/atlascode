import { ReducerAction } from '@atlassianlabs/guipi-core-controller';
import { flatten } from 'flatten-anything';

import { emptyConfig } from '../../../config/model';
import { ConfigTarget, FlattenedConfig } from '../models/config';

export enum OnboardingMessageType {
    Init = 'init',
    Update = 'configUpdate',
    SitesUpdate = 'sitesAvailableUpdate',
    LoginResponse = 'loginResponse',
}

export type OnboardingMessage =
    | ReducerAction<OnboardingMessageType.Init, OnboardingInitMessage>
    | ReducerAction<OnboardingMessageType.Update, OnboardingInitMessage>
    | ReducerAction<OnboardingMessageType.SitesUpdate, SitesUpdateMessage>
    | ReducerAction<OnboardingMessageType.LoginResponse>;

export type OnboardingResponse = any;

export interface OnboardingInitMessage {
    jiraSitesConfigured: boolean;
    bitbucketSitesConfigured: boolean;
    config: FlattenedConfig;
    target: ConfigTarget;
}

export const emptyOnboardingInitMessage: OnboardingInitMessage = {
    jiraSitesConfigured: false,
    bitbucketSitesConfigured: false,
    config: flatten(emptyConfig),
    target: ConfigTarget.User,
};

export interface SitesUpdateMessage {
    jiraSitesConfigured: boolean;
    bitbucketSitesConfigured: boolean;
}
