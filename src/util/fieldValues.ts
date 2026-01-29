/**
 * Checks if a field value is considered "filled" (non-empty).
 * A field is considered empty if it is:
 * - undefined, null, or empty string
 * - an empty array
 * - an empty object (but not null)
 *
 * @param value - The field value to check
 * @returns true if the value is considered filled, false otherwise
 */
export function isFieldValueFilled(value: unknown): boolean {
    if (value === undefined || value === null || value === '') {
        return false;
    }
    if (Array.isArray(value) && value.length === 0) {
        return false;
    }
    if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value as object).length === 0) {
        return false;
    }
    return true;
}

/**
 * Extracts the keys of all filled fields from a field values object.
 *
 * @param fieldValues - An object mapping field keys to their values
 * @returns An array of field keys that have filled (non-empty) values
 */
export function getFilledFieldKeys(fieldValues: Record<string, unknown> | undefined | null): string[] {
    if (!fieldValues) {
        return [];
    }

    return Object.entries(fieldValues)
        .filter(([_, value]) => isFieldValueFilled(value))
        .map(([key]) => key);
}
