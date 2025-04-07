import { ReducerAction } from '@atlassianlabs/guipi-core-controller';

import { emptyFeedbackUser, FeedbackUser } from '../models/common';

export enum WelcomeMessageType {
    Init = 'init',
}

export type WelcomeMessage = ReducerAction<WelcomeMessageType.Init, WelcomeInitMessage>;

export interface WelcomeInitMessage {
    feedbackUser: FeedbackUser;
}

export const emptyWelcomeInitMessage: WelcomeInitMessage = {
    feedbackUser: emptyFeedbackUser,
};
