import { ReducerAction } from '@atlassianlabs/guipi-core-controller';

import { CommonAction } from './common';

export enum WelcomeActionType {
    OpenSettings = 'openSettings',
}

export type WelcomeAction = ReducerAction<WelcomeActionType.OpenSettings> | CommonAction;
