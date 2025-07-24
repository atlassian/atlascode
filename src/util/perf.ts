const NS_PER_SEC = 1e9;
const NS_PER_MSEC = 1e6;

const markers: Record<string, [number, number]> = {};

function mark(marker: string): void {
    markers[marker] = process.hrtime();
}

function measure(marker: string): number {
    const time = markers[marker];
    if (!time) {
        return NaN;
    }

    const diff = process.hrtime(time);
    const ns = diff[0] * NS_PER_SEC + diff[1];
    const ms = ns / NS_PER_MSEC;
    return Math.trunc(ms);
}

function clear(marker: string): void {
    delete markers[marker];
}

export default {
    mark,
    measure,
    clear,
};
