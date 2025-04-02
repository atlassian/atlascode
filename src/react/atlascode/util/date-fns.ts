import { formatDistanceToNow, parseISO } from 'date-fns';

interface FormatTimeOptions {
    prefix?: string;
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
    return `${options.prefix ? `${options.prefix} ` : ''}${formatDistanceToNow(date, { addSuffix: true })}`;
}
