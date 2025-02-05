import * as bufferTransformers from './bufferTransformers';

describe('BufferTransformers util', () => {

    describe('encoding/decoding to base64', () => {

        it('arrayBufferToBase64: encoding to base64 works', () => {
            const str = 'Atlassian';
            const bytes = new Uint8Array(str.length);
            for (let i = 0; i < str.length; ++i) {
                bytes[i] = str.charCodeAt(i);
            }

            const encoded = bufferTransformers.arrayBufferToBase64(bytes.buffer);
            expect(encoded).toBe("QXRsYXNzaWFu");
        });

        it ('arrayBufferToBase64: null input is correctly handled', () => {
            expect(bufferTransformers.arrayBufferToBase64(null)).toBeUndefined();
            expect(bufferTransformers.arrayBufferToBase64(undefined)).toBeUndefined();
        });

        it('base64ToBuffer: decoding from base64 works', () => {
            const str = "QXRsYXNzaWFu";
            const decoded = bufferTransformers.base64ToBuffer(str);
            expect(decoded.toString()).toBe("Atlassian");
        });

    });

});
