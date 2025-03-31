/** Expands a partial implementation of T into T. This is just a cast, it doesn't mock extra values.
 * 
 * Useful to keep type-checking working while mocking objects.
 */
export function expansionCastTo<T>(obj: Partial<T>): T {
    return obj as T;
}

/** Forcefully casts anything to whatever you want.
 * 
 * Use it at your own risk.
 */
export function forceCastTo<T>(obj: any): T {
    return obj as unknown as T;
}

/** Returns a Promise-like object that resolves synchronously */
export function resolvePromiseSync<T>(value: T): Thenable<T> {
    return forceCastTo<Thenable<T>>({
        then: (onfulfilled: (val: T) => void) => onfulfilled(value),
    });
}
