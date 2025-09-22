import { setTimeout } from 'timers/promises';

class WaitForError<T> extends Error {
    constructor(
        msg: string,
        public readonly value: T | undefined,
    ) {
        super(msg);
    }
}

function isWaitForError<T>(error: Error): error is WaitForError<T> {
    return error instanceof WaitForError;
}

/**
 * Polls the provided `check` function every `interval` milliseconds until the callback `condition` returns true, or the timeout time `timeout` occurrs.
 * @param args
 * - `condition` The condition to wait for
 * - `check` The check to perform at the given interval time.
 * - `timeout` The timeout, in milliseconds, after which we give up.
 * - `interval` The interval in milliseconds.
 * - `abortIf` An optional callback, executed between intervals, that causes this wait to abort prematurely if its condition verifies.
 * @returns The last value returned by `check` when the `condition` satisfies.
 * @throws If `abortIf` returns true, or the `timeout` occurs.
 */
export async function waitFor<T>({
    condition,
    check,
    timeout,
    interval,
    abortIf,
}: {
    condition: (value: T | undefined) => Promise<boolean> | boolean;
    check: () => Promise<T> | T;
    timeout: number;
    interval: number;
    abortIf?: () => boolean;
}): Promise<T> {
    if (abortIf?.()) {
        throw new WaitForError('aborted', undefined);
    }

    let result = await check();
    let checkPassed = await condition(result);

    while (!checkPassed && timeout) {
        await setTimeout(interval);
        timeout -= interval;

        if (abortIf?.()) {
            throw new WaitForError('aborted', result);
        }

        result = await check();
        checkPassed = await condition(result);
    }

    if (!checkPassed) {
        throw new WaitForError('failed', result);
    }

    return result;
}

/**
 * Safe version of `waitFor` - returns undefined instead of throwing exceptions.
 * Polls the provided `check` function every `interval` milliseconds until the callback `condition` returns true, or the timeout time `timeout` occurrs.
 * @param args
 * - `condition` The condition to wait for
 * - `check` The check to perform at the given interval time.
 * - `timeout` The timeout, in milliseconds, after which we give up.
 * - `interval` The interval in milliseconds.
 * - `abortIf` An optional callback, executed between intervals, that causes this wait to abort prematurely if its condition verifies.
 * @returns The last value returned by `check` when any termination condition triggered, or undefined if `check` was never invoked.
 */
export async function safeWaitFor<T>(...args: Parameters<typeof waitFor<T>>) {
    try {
        return await waitFor(...args);
    } catch (error) {
        if (isWaitForError<T>(error)) {
            return error.value;
        } else {
            return undefined;
        }
    }
}
