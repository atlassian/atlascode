export function forceCastTo<T>(obj: any): T {
    return obj as unknown as T;
}