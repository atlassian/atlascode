/**
 * Basic hello function for testing purposes
 */
export function hello(name: string): string {
    return `Hello, ${name}!`;
}

/**
 * Test the hello function
 */
function testHello(): void {
    const result = hello('World');
    console.log(result); // Should output: Hello, World!
    
    const result2 = hello('TypeScript');
    console.log(result2); // Should output: Hello, TypeScript!
}

// Run the test
if (require.main === module) {
    testHello();
}
