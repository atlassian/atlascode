/**
 * Hello World One - Test file for Rovo Dev session restore testing
 * 
 * This file is used to test how the "updated files" drawer behaves
 * when restoring previous Rovo Dev sessions.
 */

/**
 * Greets a user with a personalized message
 * @param name - The name of the person to greet
 * @returns A greeting message
 */
export function greetUser(name: string): string {
    return `Hello, ${name}! Welcome to test file one.`;
}

/**
 * Calculates the sum of two numbers
 * @param a - First number
 * @param b - Second number
 * @returns The sum of a and b
 */
export function addNumbers(a: number, b: number): number {
    return a + b;
}

// Simple constant for testing
export const TEST_MESSAGE = "This is hello world one";
