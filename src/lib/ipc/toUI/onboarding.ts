import { ReducerAction } from '@atlassianlabs/guipi-core-controller';
import { flatten } from 'flatten-anything';
import { emptyConfig } from '../../../config/model';
import { ConfigTarget, FlattenedConfig } from '../models/config';
import { SiteWithAuthInfo } from './config';

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
    config: FlattenedConfig;
    jiraSites: SiteWithAuthInfo[];
    bitbucketSites: SiteWithAuthInfo[];
    isRemote: boolean;
    target: ConfigTarget;
}

export const emptyOnboardingInitMessage: OnboardingInitMessage = {
    config: flatten(emptyConfig),
    jiraSites: [],
    bitbucketSites: [],
    isRemote: false,
    target: ConfigTarget.User,
};

export interface ConfigUpdateMessage {
    config: FlattenedConfig;
    target: ConfigTarget;
}

export interface SitesUpdateMessage {
    jiraSites: SiteWithAuthInfo[];
    bitbucketSites: SiteWithAuthInfo[];
}
