import { addDays, addMonths, addWeeks, format, isAfter, isBefore, parseISO, subMonths } from 'date-fns';
import { ExtensionContext } from 'vscode';

import { PmfStats } from './pmfStats';

// Mock date-fns functions
jest.mock('date-fns', () => ({
    addDays: jest.fn(),
    addMonths: jest.fn(),
    addWeeks: jest.fn(),
    format: jest.fn(),
    isAfter: jest.fn(),
    isBefore: jest.fn(),
    parseISO: jest.fn(),
    subMonths: jest.fn(),
}));

const mockAddDays = addDays as jest.MockedFunction<typeof addDays>;
const mockAddMonths = addMonths as jest.MockedFunction<typeof addMonths>;
const mockAddWeeks = addWeeks as jest.MockedFunction<typeof addWeeks>;
const mockFormat = format as jest.MockedFunction<typeof format>;
const mockIsAfter = isAfter as jest.MockedFunction<typeof isAfter>;
const mockIsBefore = isBefore as jest.MockedFunction<typeof isBefore>;
const mockParseISO = parseISO as jest.MockedFunction<typeof parseISO>;
const mockSubMonths = subMonths as jest.MockedFunction<typeof subMonths>;

describe('PmfStats', () => {
    let mockExtensionContext: ExtensionContext;
    let pmfStats: PmfStats;
    let mockGlobalStateGet: jest.MockedFunction<any>;
    let mockGlobalStateUpdate: jest.MockedFunction<any>;

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock ExtensionContext
        mockGlobalStateGet = jest.fn();
        mockGlobalStateUpdate = jest.fn();
        mockExtensionContext = {
            globalState: {
                get: mockGlobalStateGet,
                update: mockGlobalStateUpdate,
            },
        } as any;

        // Setup default mocks
        mockFormat.mockReturnValue('2025-07-02');
        mockSubMonths.mockReturnValue(new Date('2025-01-02'));
        mockAddDays.mockReturnValue(new Date('2025-07-03'));
        mockAddMonths.mockReturnValue(new Date('2025-10-02'));
        mockAddWeeks.mockReturnValue(new Date('2025-07-16'));
        mockParseISO.mockReturnValue(new Date('2025-07-02'));
        mockIsAfter.mockReturnValue(false);
        mockIsBefore.mockReturnValue(false);

        // Mock the fallback data
        const fallbackData = {
            lastSurveyed: '2025-01-02',
            snoozeUntil: '2025-07-02T10:00:00+00:00',
            activityByDay: {},
        };
        mockGlobalStateGet.mockReturnValue(fallbackData);
    });

    describe('constructor', () => {
        it('should create instance and call cleanupOldEntries', () => {
            const cleanupSpy = jest.spyOn(PmfStats.prototype, 'cleanupOldEntries').mockImplementation();

            pmfStats = new PmfStats(mockExtensionContext);

            expect(cleanupSpy).toHaveBeenCalledTimes(1);
            cleanupSpy.mockRestore();
        });
    });

    describe('shouldShowSurvey', () => {
        beforeEach(() => {
            jest.spyOn(PmfStats.prototype, 'cleanupOldEntries').mockImplementation();
            pmfStats = new PmfStats(mockExtensionContext);
        });

        it('should return false if less than 3 months since last survey', () => {
            const mockState = {
                lastSurveyed: '2025-06-01',
                snoozeUntil: '2025-07-01T10:00:00+00:00',
                activityByDay: {
                    '2025-06-20': 1,
                    '2025-06-21': 1,
                    '2025-06-22': 1,
                },
            };

            mockGlobalStateGet.mockReturnValue(mockState);
            mockParseISO.mockReturnValueOnce(new Date('2025-06-01'));
            mockAddMonths.mockReturnValueOnce(new Date('2025-09-01'));
            mockIsAfter.mockReturnValueOnce(true); // Survey was recent

            const result = pmfStats.shouldShowSurvey();

            expect(result).toBe(false);
        });

        it('should return true if all conditions are met', () => {
            const mockState = {
                lastSurveyed: '2025-01-01',
                snoozeUntil: '2025-07-01T10:00:00+00:00',
                activityByDay: {
                    '2025-06-20': 1,
                    '2025-06-21': 1,
                    '2025-06-22': 1,
                },
            };

            mockGlobalStateGet.mockReturnValue(mockState);
            // Mock for last surveyed check
            mockParseISO.mockReturnValueOnce(new Date('2025-01-01'));
            mockAddMonths.mockReturnValueOnce(new Date('2025-04-01'));
            mockIsAfter.mockReturnValueOnce(false); // Survey is old enough

            // Mock for snooze check
            mockParseISO.mockReturnValueOnce(new Date('2025-07-01T10:00:00+00:00'));
            mockIsAfter.mockReturnValueOnce(false); // Not snoozed

            // Mock activity filtering - simulate 3 active days
            mockParseISO.mockReturnValueOnce(new Date('2025-06-20'));
            mockAddWeeks.mockReturnValueOnce(new Date('2025-07-04'));
            mockIsAfter.mockReturnValueOnce(true);
            mockParseISO.mockReturnValueOnce(new Date('2025-06-21'));
            mockAddWeeks.mockReturnValueOnce(new Date('2025-07-05'));
            mockIsAfter.mockReturnValueOnce(true);
            mockParseISO.mockReturnValueOnce(new Date('2025-06-22'));
            mockAddWeeks.mockReturnValueOnce(new Date('2025-07-06'));
            mockIsAfter.mockReturnValueOnce(true);

            const result = pmfStats.shouldShowSurvey();

            expect(result).toBe(true);
        });

        it('should return false if survey is snoozed', () => {
            const mockState = {
                lastSurveyed: '2025-01-01',
                snoozeUntil: '2025-07-03T10:00:00+00:00',
                activityByDay: {
                    '2025-06-20': 1,
                    '2025-06-21': 1,
                    '2025-06-22': 1,
                },
            };

            mockGlobalStateGet.mockReturnValue(mockState);
            mockParseISO.mockReturnValueOnce(new Date('2025-01-01'));
            mockAddMonths.mockReturnValueOnce(new Date('2025-04-01'));
            mockIsAfter.mockReturnValueOnce(false); // Survey is old enough
            mockParseISO.mockReturnValueOnce(new Date('2025-07-03T10:00:00+00:00'));
            mockIsAfter.mockReturnValueOnce(true); // Still snoozed

            const result = pmfStats.shouldShowSurvey();

            expect(result).toBe(false);
        });

        it('should return false if less than 3 active days in last two weeks', () => {
            const mockState = {
                lastSurveyed: '2025-01-01',
                snoozeUntil: '2025-07-01T10:00:00+00:00',
                activityByDay: {
                    '2025-06-20': 1,
                    '2025-06-21': 1,
                },
            };

            mockGlobalStateGet.mockReturnValue(mockState);
            mockParseISO.mockReturnValueOnce(new Date('2025-01-01'));
            mockAddMonths.mockReturnValueOnce(new Date('2025-04-01'));
            mockIsAfter.mockReturnValueOnce(false); // Survey is old enough
            mockParseISO.mockReturnValueOnce(new Date('2025-07-01T10:00:00+00:00'));
            mockIsAfter.mockReturnValueOnce(false); // Not snoozed

            // Mock activity filtering - only 2 active days
            mockParseISO.mockReturnValueOnce(new Date('2025-06-20'));
            mockAddWeeks.mockReturnValueOnce(new Date('2025-07-04'));
            mockIsAfter.mockReturnValueOnce(true);
            mockParseISO.mockReturnValueOnce(new Date('2025-06-21'));
            mockAddWeeks.mockReturnValueOnce(new Date('2025-07-05'));
            mockIsAfter.mockReturnValueOnce(true);

            const result = pmfStats.shouldShowSurvey();

            expect(result).toBe(false);
        });

        it('should handle edge case with exactly 3 active days', () => {
            const mockState = {
                lastSurveyed: '2025-01-01',
                snoozeUntil: '2025-07-01T10:00:00+00:00',
                activityByDay: {
                    '2025-06-20': 1,
                    '2025-06-21': 1,
                    '2025-06-22': 1,
                },
            };

            mockGlobalStateGet.mockReturnValue(mockState);
            mockParseISO.mockReturnValueOnce(new Date('2025-01-01'));
            mockAddMonths.mockReturnValueOnce(new Date('2025-04-01'));
            mockIsAfter.mockReturnValueOnce(false); // Survey is old enough
            mockParseISO.mockReturnValueOnce(new Date('2025-07-01T10:00:00+00:00'));
            mockIsAfter.mockReturnValueOnce(false); // Not snoozed

            // Mock activity filtering - exactly 3 active days
            mockParseISO.mockReturnValueOnce(new Date('2025-06-20'));
            mockAddWeeks.mockReturnValueOnce(new Date('2025-07-04'));
            mockIsAfter.mockReturnValueOnce(true);
            mockParseISO.mockReturnValueOnce(new Date('2025-06-21'));
            mockAddWeeks.mockReturnValueOnce(new Date('2025-07-05'));
            mockIsAfter.mockReturnValueOnce(true);
            mockParseISO.mockReturnValueOnce(new Date('2025-06-22'));
            mockAddWeeks.mockReturnValueOnce(new Date('2025-07-06'));
            mockIsAfter.mockReturnValueOnce(true);

            const result = pmfStats.shouldShowSurvey();

            expect(result).toBe(true);
        });
    });

    describe('snoozeSurvey', () => {
        beforeEach(() => {
            jest.spyOn(PmfStats.prototype, 'cleanupOldEntries').mockImplementation();
            pmfStats = new PmfStats(mockExtensionContext);
        });

        it('should snooze survey for 1 day', async () => {
            const mockState = {
                lastSurveyed: '2025-01-01',
                snoozeUntil: '2025-07-01T10:00:00+00:00',
                activityByDay: {},
            };

            mockGlobalStateGet.mockReturnValue(mockState);
            mockAddDays.mockReturnValueOnce(new Date('2025-07-03'));
            mockFormat.mockReturnValueOnce('2025-07-03T10:00:00+00:00');

            await pmfStats.snoozeSurvey();

            expect(mockGlobalStateUpdate).toHaveBeenCalledWith('pmfStats', {
                ...mockState,
                snoozeUntil: '2025-07-03T10:00:00+00:00',
            });
        });
    });

    describe('touchSurveyed', () => {
        beforeEach(() => {
            jest.spyOn(PmfStats.prototype, 'cleanupOldEntries').mockImplementation();
            pmfStats = new PmfStats(mockExtensionContext);
        });

        it('should update last surveyed date to today', async () => {
            const mockState = {
                lastSurveyed: '2025-01-01',
                snoozeUntil: '2025-07-01T10:00:00+00:00',
                activityByDay: {},
            };

            mockGlobalStateGet.mockReturnValue(mockState);
            mockFormat.mockReturnValueOnce('2025-07-02');

            await pmfStats.touchSurveyed();

            expect(mockGlobalStateUpdate).toHaveBeenCalledWith('pmfStats', {
                ...mockState,
                lastSurveyed: '2025-07-02',
            });
        });
    });

    describe('touchActivity', () => {
        beforeEach(() => {
            jest.spyOn(PmfStats.prototype, 'cleanupOldEntries').mockImplementation();
            pmfStats = new PmfStats(mockExtensionContext);
        });

        it('should add activity for today if not already tracked', async () => {
            const mockState = {
                lastSurveyed: '2025-01-01',
                snoozeUntil: '2025-07-01T10:00:00+00:00',
                activityByDay: {},
            };

            mockGlobalStateGet.mockReturnValue(mockState);
            mockFormat.mockReturnValueOnce('2025-07-02');

            await pmfStats.touchActivity();

            expect(mockGlobalStateUpdate).toHaveBeenCalledWith('pmfStats', {
                ...mockState,
                activityByDay: {
                    '2025-07-02': 1,
                },
            });
        });

        it('should not update activity if already tracked for today', async () => {
            const mockState = {
                lastSurveyed: '2025-01-01',
                snoozeUntil: '2025-07-01T10:00:00+00:00',
                activityByDay: {
                    '2025-07-02': 1,
                },
            };

            mockGlobalStateGet.mockReturnValue(mockState);
            mockFormat.mockReturnValueOnce('2025-07-02');

            await pmfStats.touchActivity();

            expect(mockGlobalStateUpdate).not.toHaveBeenCalled();
        });
    });

    describe('cleanupOldEntries', () => {
        it('should remove activity entries older than 2 weeks', async () => {
            const mockState = {
                lastSurveyed: '2025-01-01',
                snoozeUntil: '2025-07-01T10:00:00+00:00',
                activityByDay: {
                    '2025-06-10': 1, // Old entry
                    '2025-06-20': 1, // Recent entry
                    '2025-07-01': 1, // Recent entry
                },
            };

            mockGlobalStateGet.mockReturnValue(mockState);

            // Mock date parsing for cleanup
            mockParseISO.mockReturnValueOnce(new Date('2025-06-10'));
            mockAddWeeks.mockReturnValueOnce(new Date('2025-06-24'));
            mockIsBefore.mockReturnValueOnce(true); // Old entry

            mockParseISO.mockReturnValueOnce(new Date('2025-06-20'));
            mockAddWeeks.mockReturnValueOnce(new Date('2025-07-04'));
            mockIsBefore.mockReturnValueOnce(false); // Recent entry

            mockParseISO.mockReturnValueOnce(new Date('2025-07-01'));
            mockAddWeeks.mockReturnValueOnce(new Date('2025-07-15'));
            mockIsBefore.mockReturnValueOnce(false); // Recent entry

            // Create a fresh instance, but mock the constructor cleanup
            const cleanupSpy = jest.spyOn(PmfStats.prototype, 'cleanupOldEntries').mockImplementation();
            const pmfStats = new PmfStats(mockExtensionContext);
            cleanupSpy.mockRestore();

            jest.clearAllMocks();

            await pmfStats.cleanupOldEntries();

            // Check that update was called with the cleaned up state
            expect(mockGlobalStateUpdate).toHaveBeenCalledWith(
                'pmfStats',
                expect.objectContaining({
                    activityByDay: {
                        '2025-06-20': 1,
                        '2025-07-01': 1,
                    },
                }),
            );
        });

        it('should handle empty activity data', async () => {
            const mockState = {
                lastSurveyed: '2025-01-01',
                snoozeUntil: '2025-07-01T10:00:00+00:00',
                activityByDay: {},
            };

            mockGlobalStateGet.mockReturnValue(mockState);

            // Create a fresh instance, but mock the constructor cleanup
            const cleanupSpy = jest.spyOn(PmfStats.prototype, 'cleanupOldEntries').mockImplementation();
            const pmfStats = new PmfStats(mockExtensionContext);
            cleanupSpy.mockRestore();

            jest.clearAllMocks();

            await pmfStats.cleanupOldEntries();

            expect(mockGlobalStateUpdate).toHaveBeenCalledWith('pmfStats', mockState);
        });
    });

    describe('hasBeenInactiveFor90Days', () => {
        beforeEach(() => {
            jest.spyOn(PmfStats.prototype, 'cleanupOldEntries').mockImplementation();
            pmfStats = new PmfStats(mockExtensionContext);
        });

        it('should return true when no activity exists in the last 90 days', () => {
            const mockState = {
                lastSurveyed: '2025-01-01',
                snoozeUntil: '2025-07-01T10:00:00+00:00',
                activityByDay: {
                    '2025-01-01': 1,
                    '2025-02-01': 1,
                },
            };

            mockGlobalStateGet.mockReturnValue(mockState);
            mockAddDays.mockReturnValue(new Date('2025-04-16T10:00:00Z'));
            mockParseISO.mockImplementation((dateStr) => new Date(dateStr));
            mockIsAfter.mockReturnValue(false);

            const result = pmfStats.hasBeenInactiveFor90Days();

            expect(result).toBe(true);
        });

        it('should return false when recent activity exists within 90 days', () => {
            const mockState = {
                lastSurveyed: '2025-01-01',
                snoozeUntil: '2025-07-01T10:00:00+00:00',
                activityByDay: {
                    '2025-01-01': 1,
                    '2025-07-10': 1,
                },
            };

            mockGlobalStateGet.mockReturnValue(mockState);
            mockAddDays.mockReturnValue(new Date('2025-04-16T10:00:00Z'));
            mockParseISO.mockImplementation((dateStr) => new Date(dateStr));
            mockIsAfter.mockImplementation((date1, date2) => {
                return (date1 as Date).getTime() > (date2 as Date).getTime();
            });

            const result = pmfStats.hasBeenInactiveFor90Days();

            expect(result).toBe(false);
        });

        it('should return true when no activity data exists', () => {
            const mockState = {
                lastSurveyed: '2025-01-01',
                snoozeUntil: '2025-07-01T10:00:00+00:00',
                activityByDay: {},
            };

            mockGlobalStateGet.mockReturnValue(mockState);

            const result = pmfStats.hasBeenInactiveFor90Days();

            expect(result).toBe(true);
        });
    });

    describe('shouldTriggerFirstTimeExperience', () => {
        beforeEach(() => {
            jest.spyOn(PmfStats.prototype, 'cleanupOldEntries').mockImplementation();
            pmfStats = new PmfStats(mockExtensionContext);
        });

        it('should return true when never checked before', () => {
            const mockState = {
                lastSurveyed: '2025-01-01',
                snoozeUntil: '2025-07-01T10:00:00+00:00',
                activityByDay: {},
            };

            mockGlobalStateGet.mockReturnValue(mockState);

            const result = pmfStats.shouldTriggerFirstTimeExperience();

            expect(result).toBe(true);
        });

        it('should return false when checked within the last week', () => {
            const mockState = {
                lastSurveyed: '2025-01-01',
                snoozeUntil: '2025-07-01T10:00:00+00:00',
                activityByDay: {},
                lastFirstTimeExperienceCheck: '2025-07-12',
            };

            mockGlobalStateGet.mockReturnValue(mockState);
            mockParseISO.mockImplementation((dateStr) => new Date(dateStr));
            mockAddDays.mockReturnValue(new Date('2025-07-08T10:00:00Z'));
            mockIsBefore.mockReturnValue(false);

            const result = pmfStats.shouldTriggerFirstTimeExperience();

            expect(result).toBe(false);
        });

        it('should return true when checked more than a week ago', () => {
            const mockState = {
                lastSurveyed: '2025-01-01',
                snoozeUntil: '2025-07-01T10:00:00+00:00',
                activityByDay: {},
                lastFirstTimeExperienceCheck: '2025-07-05',
            };

            mockGlobalStateGet.mockReturnValue(mockState);
            mockParseISO.mockImplementation((dateStr) => new Date(dateStr));
            mockAddDays.mockReturnValue(new Date('2025-07-08T10:00:00Z'));
            mockIsBefore.mockReturnValue(true);
            const result = pmfStats.shouldTriggerFirstTimeExperience();

            expect(result).toBe(true);
        });
    });

    describe('touchFirstTimeExperienceCheck', () => {
        beforeEach(() => {
            jest.spyOn(PmfStats.prototype, 'cleanupOldEntries').mockImplementation();
            pmfStats = new PmfStats(mockExtensionContext);
        });

        it('should update lastFirstTimeExperienceCheck with current date', async () => {
            const mockState = {
                lastSurveyed: '2025-01-01',
                snoozeUntil: '2025-07-01T10:00:00+00:00',
                activityByDay: {},
            };

            mockGlobalStateGet.mockReturnValue(mockState);
            mockFormat.mockReturnValueOnce('2025-07-15');

            await pmfStats.touchFirstTimeExperienceCheck();

            expect(mockGlobalStateUpdate).toHaveBeenCalledWith('pmfStats', {
                ...mockState,
                lastFirstTimeExperienceCheck: '2025-07-15',
            });
        });
    });
});
