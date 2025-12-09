export type RovoDevEnv = 'IDE' | 'Boysenberry';

export const RovoDevPerfEvents = {
    timeToFirstByte: 'api.rovodev.chat.response.timeToFirstByte',
    timeToFirstMessage: 'api.rovodev.chat.response.timeToFirstMessage',
    timeToTechPlan: 'api.rovodev.chat.response.timeToTechPlan',
    timeToLastMessage: 'api.rovodev.chat.response.timeToLastMessage',
    timeToRender: 'api.rovodev.chat.response.timeToRender',
} as const;

export type RovoDevPerfEvent = (typeof RovoDevPerfEvents)[keyof typeof RovoDevPerfEvents];

export type RovoDevCommonParams = {
    rovoDevEnv: RovoDevEnv;
    appInstanceId: string;
    rovoDevSessionId: string;
    rovoDevPromptId: string;
};
