import { Container } from './container';

describe('Container.isRovoDevEnabled', () => {
    it('should have isRovoDevEnabled property', () => {
        expect(Container).toHaveProperty('isRovoDevEnabled');
    });

    it('should return a falsy value for isRovoDevEnabled when not initialized', () => {
        const result = Container.isRovoDevEnabled;
        expect(result).toBeFalsy();
    });

    it('should be accessible as a static getter', () => {
        expect(() => Container.isRovoDevEnabled).not.toThrow();
    });

    it('should return false when not initialized', () => {
        const result = Container.isRovoDevEnabled;
        expect(result).toBeFalsy();
    });
});
