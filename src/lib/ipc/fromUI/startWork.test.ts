import { StartWorkActionType } from './startWork';

describe('StartWork IPC Types', () => {
    it('should have GetRovoDevPreference action type', () => {
        expect(StartWorkActionType.GetRovoDevPreference).toBe('getRovoDevPreference');
    });

    it('should have UpdateRovoDevPreference action type', () => {
        expect(StartWorkActionType.UpdateRovoDevPreference).toBe('updateRovoDevPreference');
    });

    it('should have OpenRovoDev action type', () => {
        expect(StartWorkActionType.OpenRovoDev).toBe('openRovoDev');
    });

    it('should have GetPushBranchPreference action type', () => {
        expect(StartWorkActionType.GetPushBranchPreference).toBe('getPushBranchPreference');
    });

    it('should have UpdatePushBranchPreference action type', () => {
        expect(StartWorkActionType.UpdatePushBranchPreference).toBe('updatePushBranchPreference');
    });

    it('should have all required action types defined', () => {
        const requiredActions = [
            'GetRovoDevPreference',
            'UpdateRovoDevPreference',
            'OpenRovoDev',
            'GetPushBranchPreference',
            'UpdatePushBranchPreference',
        ];

        requiredActions.forEach((action) => {
            expect(StartWorkActionType).toHaveProperty(action);
            expect(typeof StartWorkActionType[action as keyof typeof StartWorkActionType]).toBe('string');
        });
    });
});
