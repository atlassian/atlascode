import crypto from 'crypto';

// for some reason jest doesn't play nice with crypto,
// so these are now in a separate file for easy mocking

export function createVerifier() {
    return base64URLEncode(crypto.randomBytes(32));
}

export function base64URLEncode(str: Buffer): string {
    return str.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

export function sha256(buffer: any) {
    return crypto.createHash('sha256').update(buffer).digest();
}

export function basicAuth(username: string, password: string) {
    return 'Basic ' + Buffer.from(username + ':' + password).toString('base64');
}
