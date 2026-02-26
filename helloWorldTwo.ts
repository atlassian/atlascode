/**
 * Hello World Two - Test file for Rovo Dev session restore testing
 * 
 * This file is used to test how the "updated files" drawer behaves
 * when restoring previous Rovo Dev sessions.
 */

/**
 * Bids farewell to a user
 * @param name - The name of the person to say goodbye to
 * @returns A farewell message
 */
export function farewellUser(name: string): string {
    return `Goodbye, ${name}! Thanks for visiting test file two.`;
}

/**
 * Multiplies two numbers together
 * @param a - First number
 * @param b - Second number
 * @returns The product of a and b
 */
export function multiplyNumbers(a: number, b: number): number {
    return a * b;
}

// Simple constant for testing
export const TEST_MESSAGE = "This is hello world two";
