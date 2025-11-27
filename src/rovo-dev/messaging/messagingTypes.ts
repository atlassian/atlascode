export type ReducerAction<K, V = void> = V extends void ? { type: K } : { type: K } & V;

export function defaultStateGuard<S>(state: S, a: never) {
    return state;
}

export function defaultActionGuard(a: never) {
    return;
}
