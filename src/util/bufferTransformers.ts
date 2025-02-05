export function arrayBufferToBase64(buffer: ArrayBuffer | null | undefined): string | undefined {
    if (!buffer) {
        return undefined;
    }
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; ++i) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

export function base64ToBuffer(data: string): Buffer {
    let binaryString = atob(data);
    let bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; ++i) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return Buffer.from(bytes);
}
