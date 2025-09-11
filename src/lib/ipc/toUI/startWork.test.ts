import { emptyStartWorkInitMessage, StartWorkMessageType } from './startWork';

describe('StartWork ToUI Types', () => {
    it('should have RovoDevPreferenceResponse message type', () => {
        expect(StartWorkMessageType.RovoDevPreferenceResponse).toBe('rovoDevPreferenceResponse');
    });

    it('should have emptyStartWorkInitMessage with isRovoDevEnabled field', () => {
        expect(emptyStartWorkInitMessage).toHaveProperty('isRovoDevEnabled');
        expect(emptyStartWorkInitMessage.isRovoDevEnabled).toBe(false);
    });

    it('should include required fields in emptyStartWorkInitMessage', () => {
        const requiredFields = ['issue', 'repoData', 'isRovoDevEnabled'];

        requiredFields.forEach((field) => {
            expect(emptyStartWorkInitMessage).toHaveProperty(field);
        });
    });

    it('should have correct default values in emptyStartWorkInitMessage', () => {
        expect(emptyStartWorkInitMessage.repoData).toEqual([]);
        expect(emptyStartWorkInitMessage.isRovoDevEnabled).toBe(false);
    });

    it('should handle StartWorkMessageType enum values', () => {
        expect(typeof StartWorkMessageType.RovoDevPreferenceResponse).toBe('string');
        expect(StartWorkMessageType.RovoDevPreferenceResponse).toBeTruthy();
    });
});
