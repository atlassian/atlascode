import { differenceInDays, format, formatDistanceToNow, parseISO } from 'date-fns';

interface FormatTimeOptions {
    prefix?: string;
    daysPreference?: number;
}

export function formatTime(dateString: string | number | undefined, options: FormatTimeOptions = {}): string {
    if (!dateString) {
        return '';
    }

    let date: Date;

    if (typeof dateString === 'number') {
        date = new Date(dateString);
    } else {
        date = parseISO(dateString);
    }

    if (Number.isNaN(date.getTime())) {
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
