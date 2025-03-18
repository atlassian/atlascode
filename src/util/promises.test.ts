import { PromiseRacer } from './promises';

describe('PromiseRacer', () => {
    it('should return the first settled promise (resolved)', async () => {
        const promises = [
            new Promise<number>((resolve) => setTimeout(() => resolve(1), 100)),
            new Promise<number>((resolve) => setTimeout(() => resolve(2), 50)),
            new Promise<number>((resolve) => setTimeout(() => resolve(3), 150)),
        ];

        const racer = new PromiseRacer(promises);
        const result = await racer.next();
        expect(result).toEqual(2);
    });

    it('should return the first settled promise (rejected)', async () => {
        const promises = [
            new Promise<number>((resolve) => setTimeout(() => resolve(1), 100)),
            new Promise<number>((_, reject) => setTimeout(() => reject(new Error('Error 2')), 50)),
            new Promise<number>((resolve) => setTimeout(() => resolve(3), 150)),
        ];

        const racer = new PromiseRacer(promises);
        try {
            await racer.next();
        } catch (error) {
            expect(error.message).toEqual('Error 2');
        }
    });

    it('should throw an error if no promises are provided', async () => {
        const racer = new PromiseRacer([]);
        expect(racer.isEmpty()).toBeTruthy();
        try {
            await racer.next();
        } catch (error) {
            expect(error.message).toEqual('The collection of promises is empty');
        }
    });

    it('should return promises in the order they resolve', async () => {
        const promises = [
            new Promise<number>((_, reject) => setTimeout(() => reject(new Error('Error 1')), 100)),
            new Promise<number>((resolve) => setTimeout(() => resolve(2), 50)),
            new Promise<number>((resolve) => setTimeout(() => resolve(3), 150)),
        ];

        const racer = new PromiseRacer(promises);
        expect(racer.isEmpty()).toBeFalsy();

        const result1 = await racer.next();
        expect(result1).toEqual(2);

        try {
            await racer.next();
        } catch (error) {
            expect(error.message).toEqual('Error 1');
        }

        const result3 = await racer.next();
        expect(result3).toEqual(3);

        expect(racer.isEmpty()).toBeTruthy();
    });
});
