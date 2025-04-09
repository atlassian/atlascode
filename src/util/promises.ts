interface PromiseFulfilledResultWithSource<T> extends PromiseFulfilledResult<T> {
    key: number;
    source: Promise<T>;
}

interface PromiseRejectedResultWithSource<T> extends PromiseRejectedResult {
    key: number;
    source: Promise<T>;
}

type PromiseSettledResultWithSource<T> = PromiseFulfilledResultWithSource<T> | PromiseRejectedResultWithSource<T>;

/**
 * PromiseRacer allows a collection of promises to be awaited individually, in order of completion.
 *
 * The behavior is very similar to the built-in function Promise.race(), which resolves with the value of the
 * next promise that is going to either resolve or reject.
 *
 * The main difference is that Promise.race() is stateless and it doesn't change the input collection, while
 * this class maintain the input collection as a state and progressively removes the completed promises, allowing
 * the caller to await to each promise in order of completion.
 */
export class PromiseRacer<T> {
    private promises: Record<number, Promise<PromiseSettledResultWithSource<T>>> = {};
    private count = 0;

    constructor(iterable: Promise<T>[]) {
        for (let i = 0; i < iterable.length; ++i) {
            const promise = iterable[i];

            this.promises[i] = promise.then(
                (value) => ({ key: i, source: promise, status: 'fulfilled', value }),
                (reason) => ({ key: i, source: promise, status: 'rejected', reason }),
            );

            ++this.count;
        }
    }

    /** Returns true if the collection of promises is empty. */
    public isEmpty(): boolean {
        return !this.count;
    }

    /** Returns the next Promise that is going to either resolve or reject.
     *
     * @remarks
     * It'll reject immediately if the collection of promises is empty. You should first call `isEmpty()` to be safe.
     */
    public async next(): Promise<T> {
        if (this.count) {
            const next = await Promise.race(Object.values(this.promises));
            delete this.promises[next.key];
            --this.count;
            return next.source;
        } else {
            throw new Error('The collection of promises is empty');
        }
    }
}
/** Function similar to Promise.all(), except it never rejects when some promises in the array reject.
 *
 * If all promises of the array reject, it simply resolves with an empty array.
 */
export async function Promise_allSucceeded<T>(promises: Promise<T>[]): Promise<T[]> {
    const result: T[] = [];

    if (!promises.length) {
        return result;
    }

    const allSettled = await Promise.allSettled(promises);

    for (const settled of allSettled) {
        if (settled.status === 'fulfilled') {
            result.push(settled.value);
        }
    }

    return result;
}
