export enum Time {
    SECONDS = 1000,
    MINUTES = 60000,
    HOURS = 3600000,
    DAYS = 86400000,
    WEEKS = 604800000,
    MONTHS = 2592000000,
    FOREVER = Infinity,
}

export const ConnectionTimeout = 30 * Time.SECONDS;
export const OnJiraEditedRefreshDelay = 4 * Time.SECONDS;
