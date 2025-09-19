import { setTimeout } from 'timers/promises';

type ExecuteCheckReturnType<T> = { checkPassed: true; result: T } | { checkPassed: false };

const executeCheck = async <T>(
    check: () => Promise<T> | T,
    condition: (value: T | undefined) => Promise<boolean> | boolean,
): Promise<ExecuteCheckReturnType<T>> => {
    try {
        const result = await check();
        const passed = await condition(result);
        return passed ? { checkPassed: true, result } : { checkPassed: false };
    } catch {
        return { checkPassed: false };
    }
};

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
        throw new Error('aborted');
    }

    let checkOutcome = await executeCheck(check, condition);

    while (!checkOutcome.checkPassed && timeout) {
        await setTimeout(interval);
        timeout -= interval;

        if (abortIf?.()) {
            throw new Error('aborted');
        }

        checkOutcome = await executeCheck(check, condition);
    }

    if (!checkOutcome.checkPassed) {
        throw new Error('failed');
    }

    return checkOutcome.result;
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
 * @returns The last value returned by `check` when the `condition` satisfies, or undefined if either `abortIf` returns true, or the `timeout` occurs.
 */
export async function safeWaitFor<T>(...args: Parameters<typeof waitFor<T>>) {
    try {
        return await waitFor(...args);
    } catch {
        return undefined;
    }
}
