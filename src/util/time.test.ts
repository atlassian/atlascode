import { ConnectionTimeout, Time } from './time';

describe('Time utilities', () => {
    describe('Time enum', () => {
        it('should have correct time values in milliseconds', () => {
            expect(Time.SECONDS).toBe(1000);
            expect(Time.MINUTES).toBe(60000);
            expect(Time.HOURS).toBe(3600000);
            expect(Time.DAYS).toBe(86400000);
            expect(Time.WEEKS).toBe(604800000);
            expect(Time.MONTHS).toBe(2592000000);
            expect(Time.FOREVER).toBe(Infinity);
        });

        it('should calculate correct time relationships', () => {
            expect(Time.MINUTES).toBe(60 * Time.SECONDS);
            expect(Time.HOURS).toBe(60 * Time.MINUTES);
            expect(Time.DAYS).toBe(24 * Time.HOURS);
            expect(Time.WEEKS).toBe(7 * Time.DAYS);
        });
    });

    describe('ConnectionTimeout', () => {
        it('should be 30 seconds in milliseconds', () => {
            expect(ConnectionTimeout).toBe(30 * Time.SECONDS);
            expect(ConnectionTimeout).toBe(30000);
        });
    });
});
