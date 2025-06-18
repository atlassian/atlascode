import { differenceInDays, format, formatDistanceToNow, parseISO } from 'date-fns';

interface FormatTimeOptions {
    prefix?: string;
    daysPreference?: number;
}

export function toDate(dateString: string | number | undefined): Date | null {
    if (!dateString) {
        return null;
    }

    let date: Date;

    if (typeof dateString === 'number') {
        date = new Date(dateString);
    } else {
        date = parseISO(dateString);
    }

    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return date;
}

export function formatTime(dateString: string | number | undefined, options: FormatTimeOptions = {}): string {
    const date = toDate(dateString);
    if (!date) {
        return '';
    }

    if (options.daysPreference !== undefined) {
        const daysDifference = differenceInDays(new Date(), date);
        if (daysDifference >= options.daysPreference) {
            return format(date, 'yyyy-MM-dd');
        }
    }

    return `${options.prefix ? `${options.prefix} ` : ''}${formatDistanceToNow(date, { addSuffix: true })}`;
}

export function toISOString(dateString: string | number | undefined): string | null {
    const date = toDate(dateString);
    if (!date) {
        return null;
    }

    return date.toISOString();
}
