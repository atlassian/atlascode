import { safeWaitFor, waitFor } from './waitFor';

jest.mock('timers/promises', () => ({
    setTimeout: jest.fn().mockResolvedValue(undefined),
}));

describe('waitFor', () => {
    it('resolves when condition is met', async () => {
        let value = 0;
        const check = () => ++value;
        const condition = (v: number) => v >= 3;
        const result = await waitFor({ condition, check, timeout: 1000, interval: 10 });
        expect(result).toBe(3);
    });

    it('throws if timeout occurs before condition is met', async () => {
        let value = 0;
        const check = () => ++value;
        const condition = (v: number) => v >= 100;
        await expect(waitFor({ condition, check, timeout: 50, interval: 10 })).rejects.toThrow('failed');
    });

    it('throws if aborted', async () => {
        let value = 0;
        const check = () => ++value;
        const condition = (v: number) => v >= 3;
        const abortIf = () => value === 2;
        await expect(waitFor({ condition, check, timeout: 1000, interval: 10, abortIf })).rejects.toThrow('aborted');
    });
});

describe('safeWaitFor', () => {
    it('returns result when condition is met', async () => {
        let value = 0;
        const check = () => ++value;
        const condition = (v: number) => v >= 2;
        const result = await safeWaitFor({ condition, check, timeout: 1000, interval: 10 });
        expect(result).toBe(2);
    });

    it('returns undefined if timeout occurs', async () => {
        let value = 0;
        const check = () => ++value;
        const condition = (v: number) => v >= 100;
        const result = await safeWaitFor({ condition, check, timeout: 50, interval: 10 });
        expect(result).toBeUndefined();
    });

    it('returns undefined if aborted', async () => {
        let value = 0;
        const check = () => ++value;
        const condition = (v: number) => v >= 3;
        const abortIf = () => value === 2;
        const result = await safeWaitFor({ condition, check, timeout: 1000, interval: 10, abortIf });
        expect(result).toBeUndefined();
    });
});
