import perf from './perf';

describe('perf', () => {
    beforeEach(() => {
        // Clear all markers before each test to ensure clean state
        jest.clearAllMocks();
    });

    describe('mark', () => {
        it('should create a marker with the given name', () => {
            const markerName = 'test-marker';

            expect(() => perf.mark(markerName)).not.toThrow();
        });

        it('should create multiple markers with different names', () => {
            expect(() => {
                perf.mark('marker1');
                perf.mark('marker2');
                perf.mark('marker3');
            }).not.toThrow();
        });

        it('should overwrite existing marker with same name', () => {
            const markerName = 'duplicate-marker';

            perf.mark(markerName);

            // Wait a bit to ensure some time passes
            const start = Date.now();
            while (Date.now() - start < 5) {
                // Busy wait for ~5ms
            }

            const firstMeasurement = perf.measure(markerName);

            // Mark again to reset the timer
            perf.mark(markerName);
            const secondMeasurement = perf.measure(markerName);

            // First measurement should be greater since time passed before marking again
            expect(firstMeasurement).toBeGreaterThan(0);
            expect(secondMeasurement).toBeGreaterThanOrEqual(0);
            expect(secondMeasurement).toBeLessThanOrEqual(firstMeasurement);
        });
    });

    describe('measure', () => {
        it('should return a number for existing marker', () => {
            const markerName = 'existing-marker';
            perf.mark(markerName);

            const result = perf.measure(markerName);

            expect(typeof result).toBe('number');
            expect(result).toBeGreaterThanOrEqual(0);
        });

        it('should return NaN for non-existing marker', () => {
            const result = perf.measure('non-existing-marker');

            expect(result).toBeNaN();
        });

        it('should return elapsed time in milliseconds', () => {
            const markerName = 'time-marker';
            perf.mark(markerName);

            // Wait a small amount of time (in a real scenario this would be actual work)
            const start = Date.now();
            while (Date.now() - start < 10) {
                // Busy wait for ~10ms
            }

            const elapsed = perf.measure(markerName);

            expect(elapsed).toBeGreaterThan(0);
            expect(elapsed).toBeLessThan(1000); // Should be less than 1 second
        });

        it('should return integer values (truncated)', () => {
            const markerName = 'truncation-marker';
            perf.mark(markerName);

            const result = perf.measure(markerName);

            expect(Number.isInteger(result) || Number.isNaN(result)).toBe(true);
        });

        it('should be able to measure same marker multiple times', () => {
            const markerName = 'repeated-measure';
            perf.mark(markerName);

            const firstMeasure = perf.measure(markerName);
            const secondMeasure = perf.measure(markerName);

            expect(firstMeasure).toBeGreaterThanOrEqual(0);
            expect(secondMeasure).toBeGreaterThanOrEqual(firstMeasure);
        });
    });

    describe('clear', () => {
        it('should remove existing marker', () => {
            const markerName = 'marker-to-clear';
            perf.mark(markerName);

            // Verify marker exists
            expect(perf.measure(markerName)).not.toBeNaN();

            perf.clear(markerName);

            // Verify marker is removed
            expect(perf.measure(markerName)).toBeNaN();
        });

        it('should not throw when clearing non-existing marker', () => {
            expect(() => perf.clear('non-existing-marker')).not.toThrow();
        });

        it('should only clear the specified marker', () => {
            perf.mark('marker1');
            perf.mark('marker2');
            perf.mark('marker3');

            perf.clear('marker2');

            expect(perf.measure('marker1')).not.toBeNaN();
            expect(perf.measure('marker2')).toBeNaN();
            expect(perf.measure('marker3')).not.toBeNaN();
        });
    });

    describe('integration scenarios', () => {
        it('should handle complete mark-measure-clear cycle', () => {
            const markerName = 'integration-test';

            // Mark
            perf.mark(markerName);

            // Measure
            const measurement = perf.measure(markerName);
            expect(measurement).toBeGreaterThanOrEqual(0);
            expect(Number.isInteger(measurement)).toBe(true);

            // Clear
            perf.clear(markerName);
            expect(perf.measure(markerName)).toBeNaN();
        });

        it('should handle multiple concurrent markers', () => {
            const markers = ['concurrent1', 'concurrent2', 'concurrent3'];

            // Mark all
            markers.forEach((marker) => perf.mark(marker));

            // Measure all
            const measurements = markers.map((marker) => perf.measure(marker));
            measurements.forEach((measurement) => {
                expect(measurement).toBeGreaterThanOrEqual(0);
            });

            // Clear some
            perf.clear(markers[0]);
            perf.clear(markers[2]);

            // Verify state
            expect(perf.measure(markers[0])).toBeNaN();
            expect(perf.measure(markers[1])).not.toBeNaN();
            expect(perf.measure(markers[2])).toBeNaN();
        });

        it('should handle marker name edge cases', () => {
            const edgeCaseNames = [
                '',
                ' ',
                'very-long-marker-name-with-lots-of-characters-and-special-symbols-123-!@#',
                '🚀🎯⭐', // Unicode/emoji
                'marker.with.dots',
                'marker_with_underscores',
                'UPPERCASE',
                'mixedCase',
            ];

            edgeCaseNames.forEach((markerName) => {
                expect(() => {
                    perf.mark(markerName);
                    const measurement = perf.measure(markerName);
                    expect(measurement).toBeGreaterThanOrEqual(0);
                    perf.clear(markerName);
                    expect(perf.measure(markerName)).toBeNaN();
                }).not.toThrow();
            });
        });
    });
});
