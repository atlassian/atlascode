// Mock crypto module at the top
class MockHash {
    private data: string = '';

    update(data: any): this {
        this.data += data.toString();
        return this;
    }

    digest(): Buffer {
        // Return a predictable hash for testing
        const hash = Buffer.alloc(32);
        for (let i = 0; i < 32; i++) {
            hash[i] = (this.data.charCodeAt(i % this.data.length) + i) % 256;
        }
        return hash;
    }
}

jest.mock('crypto', () => ({
    default: {
        createHash: () => new MockHash(),
        randomBytes: (size: number) => {
            // Return predictable bytes for testing
            const buffer = Buffer.alloc(size);
            for (let i = 0; i < size; i++) {
                buffer[i] = i % 256;
            }
            return buffer;
        },
    },
}));

import { base64URLEncode, basicAuth, createVerifier, sha256 } from './strategyCrypto';

describe('strategyCrypto', () => {
    describe('basicAuth', () => {
        it('should create basic auth string with username and password', () => {
            const result = basicAuth('testuser', 'testpass');
            expect(result).toBe('Basic dGVzdHVzZXI6dGVzdHBhc3M=');
        });

        it('should handle empty username and password', () => {
            const result = basicAuth('', '');
            expect(result).toBe('Basic Og==');
        });

        it('should handle special characters in username and password', () => {
            const result = basicAuth('user@domain.com', 'p@ssw0rd!');
            expect(result).toBe('Basic dXNlckBkb21haW4uY29tOnBAc3N3MHJkIQ==');
        });

        it('should handle unicode characters', () => {
            const result = basicAuth('用户', '密码');
            expect(result).toContain('Basic ');
            expect(result.length).toBeGreaterThan('Basic '.length);
        });
    });

    describe('base64URLEncode', () => {
        it('should encode buffer to base64 URL safe string', () => {
            const buffer = Buffer.from('hello world');
            const result = base64URLEncode(buffer);
            expect(result).toBe('aGVsbG8gd29ybGQ');
        });

        it('should replace URL unsafe characters', () => {
            // Create a buffer that will have + and / characters in base64
            const buffer = Buffer.from('hello>world?test');
            const result = base64URLEncode(buffer);
            expect(result).not.toContain('+');
            expect(result).not.toContain('/');
            expect(result).not.toContain('=');
        });

        it('should handle empty buffer', () => {
            const buffer = Buffer.from('');
            const result = base64URLEncode(buffer);
            expect(result).toBe('');
        });

        it('should handle binary data', () => {
            const buffer = Buffer.from([0x00, 0x01, 0x02, 0x03, 0xff]);
            const result = base64URLEncode(buffer);
            expect(result).toBe('AAECA_8'); // Corrected expected value
        });
    });

    describe('sha256', () => {
        it('should create sha256 hash from string', () => {
            const result = sha256('hello world');
            expect(result).toBeInstanceOf(Buffer);
            expect(result.length).toBe(32); // SHA256 produces 32 bytes
        });

        it('should create sha256 hash from buffer', () => {
            const buffer = Buffer.from('test data');
            const result = sha256(buffer);
            expect(result).toBeInstanceOf(Buffer);
            expect(result.length).toBe(32);
        });

        it('should produce consistent hash for same input', () => {
            const input = 'consistent input';
            const result1 = sha256(input);
            const result2 = sha256(input);
            expect(result1.equals(result2)).toBe(true);
        });

        it('should produce different hashes for different inputs', () => {
            const result1 = sha256('input1');
            const result2 = sha256('input2');
            expect(result1.equals(result2)).toBe(false);
        });

        it('should handle empty string', () => {
            const result = sha256('');
            expect(result).toBeInstanceOf(Buffer);
            expect(result.length).toBe(32);
        });
    });

    describe('createVerifier', () => {
        it('should create a verifier string', () => {
            const result = createVerifier();
            expect(typeof result).toBe('string');
            expect(result.length).toBeGreaterThan(0);
        });

        it('should create consistent verifiers with mocked crypto', () => {
            const result1 = createVerifier();
            const result2 = createVerifier();
            // With our mock, results should be the same
            expect(result1).toBe(result2);
        });

        it('should create URL-safe verifier string', () => {
            const result = createVerifier();
            expect(result).not.toContain('+');
            expect(result).not.toContain('/');
            expect(result).not.toContain('=');
        });

        it('should create verifier of expected length', () => {
            const result = createVerifier();
            // 32 bytes base64URL encoded should be 43 characters (without padding)
            expect(result.length).toBe(43);
        });
    });
});
