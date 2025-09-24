import { addDays, addMonths, addWeeks, format, isAfter, isBefore, parseISO, subMonths } from 'date-fns';
import { ExtensionContext } from 'vscode';

const PmfStatsKey = 'pmfStats';
const FormatYYYYMMDD = 'yyyy-MM-dd';
const FormatISO = 'yyyy-MM-dd[T]HH:mm:ssXXX';

type PmfStatsData = {
    lastSurveyed: string;
    snoozeUntil: string;
    activityByDay: {
        [k: string]: number;
    };
    lastFirstTimeExperienceCheck?: string; // Track when we last checked for first-time experience
};

const fallbackData: PmfStatsData = {
    lastSurveyed: format(subMonths(new Date(), 6), FormatYYYYMMDD),
    snoozeUntil: format(new Date(), FormatISO),
    activityByDay: {},
};

export class PmfStats {
    constructor(private extensionContext: ExtensionContext) {
        this.cleanupOldEntries();
    }

    shouldShowSurvey(): boolean {
        const currentState = this.extensionContext.globalState.get<PmfStatsData>(PmfStatsKey, fallbackData);

        const now = new Date();

        if (isAfter(addMonths(parseISO(currentState.lastSurveyed), 3), now)) {
            return false;
        }

        if (isAfter(parseISO(currentState.snoozeUntil), now)) {
            return false;
        }

        const daysActiveInLastTwoWeeks = Object.keys(currentState.activityByDay)
            .filter((key) => isAfter(addWeeks(parseISO(key), 2), now))
            .reduce((prevSum, currKey) => prevSum + currentState.activityByDay[currKey], 0);

        return daysActiveInLastTwoWeeks >= 3;
    }

    async snoozeSurvey() {
        const currentState = this.extensionContext.globalState.get<PmfStatsData>(PmfStatsKey, fallbackData);

        const now = new Date();

        currentState.snoozeUntil = format(addDays(now, 1), FormatISO);
        await this.extensionContext.globalState.update(PmfStatsKey, currentState);
    }

    async touchSurveyed() {
        const currentState = this.extensionContext.globalState.get<PmfStatsData>(PmfStatsKey, fallbackData);

        const now = new Date();
        const today = format(now, FormatYYYYMMDD);

        currentState.lastSurveyed = today;
        await this.extensionContext.globalState.update(PmfStatsKey, currentState);
    }

    async touchActivity() {
        const currentState = this.extensionContext.globalState.get<PmfStatsData>(PmfStatsKey, fallbackData);

        const now = new Date();
        const today = format(now, FormatYYYYMMDD);

        if (!currentState.activityByDay[today]) {
            currentState.activityByDay[today] = 1;
            await this.extensionContext.globalState.update(PmfStatsKey, currentState);
        }
    }

    async cleanupOldEntries() {
        const currentState = this.extensionContext.globalState.get<PmfStatsData>(PmfStatsKey, fallbackData);

        const now = new Date();

        Object.keys(currentState.activityByDay)
            .filter((key) => isBefore(addWeeks(parseISO(key), 2), now))
            .forEach((key) => delete currentState.activityByDay[key]);

        await this.extensionContext.globalState.update(PmfStatsKey, currentState);
    }

    /**
     * Check if user has been inactive for 90 days
     */
    hasBeenInactiveFor90Days(): boolean {
        const currentState = this.extensionContext.globalState.get<PmfStatsData>(PmfStatsKey, fallbackData);
        const now = new Date();
        const ninetyDaysAgo = addDays(now, -90);

        // Check if any activity exists in the last 90 days
        const hasRecentActivity = Object.keys(currentState.activityByDay).some((dateKey) => {
            const activityDate = parseISO(dateKey);
            return isAfter(activityDate, ninetyDaysAgo);
        });

        return !hasRecentActivity;
    }

    /**
     * Check if we should trigger the first-time experience
     * - Only once per week maximum
     */
    shouldTriggerFirstTimeExperience(): boolean {
        const currentState = this.extensionContext.globalState.get<PmfStatsData>(PmfStatsKey, fallbackData);
        const now = new Date();

        // If we've never checked before, we can trigger
        if (!currentState.lastFirstTimeExperienceCheck) {
            return true;
        }

        const lastCheck = parseISO(currentState.lastFirstTimeExperienceCheck);
        const oneWeekAgo = addDays(now, -7);

        // Only trigger if it's been more than a week since last check
        return isBefore(lastCheck, oneWeekAgo);
    }

    /**
     * Record that we've checked for first-time experience
     */
    async touchFirstTimeExperienceCheck() {
        const currentState = this.extensionContext.globalState.get<PmfStatsData>(PmfStatsKey, fallbackData);
        const now = new Date();

        currentState.lastFirstTimeExperienceCheck = format(now, FormatYYYYMMDD);
        await this.extensionContext.globalState.update(PmfStatsKey, currentState);
    }
}
