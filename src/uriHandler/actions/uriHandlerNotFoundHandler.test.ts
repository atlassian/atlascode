import { describe } from '@jest/globals';
import { Uri } from 'vscode';

import { ExtensionId } from '../../constants';
import { UriHandlerNotFoundHandler } from './uriHandlerNotFoundHandler';

describe('UriHandlerNotFoundHandler', () => {
    describe.each([
        '',
        'https://www.google.com',
        'http://www.example.com/some/path?query1=value1&query2&query3=value3',
        'vscode:whatever',
        'ftp://127.0.0.1/pub/images',
    ])('for any URI', (uriRaw) => {
        it('should always accept', () => {
            const handler = new UriHandlerNotFoundHandler();

            const uri = Uri.parse(uriRaw);
            expect(handler.isAccepted(uri)).toBe(true);
        });

        it('should return "unknown" as the source', () => {
            const handler = new UriHandlerNotFoundHandler();

            const uri = Uri.parse(uriRaw);
            expect(handler.getSource(uri)).toBe('unknown');
        });
    });

    it('should return the path as target if ExtensionId is not in the URI path', () => {
        const handler = new UriHandlerNotFoundHandler();

        const uri = Uri.parse('https://example.com/some/path');
        expect(handler.getTarget(uri)).toBe('/some/path');
    });

    it('should return the substring after ExtensionId in the URI path as target', () => {
        const handler = new UriHandlerNotFoundHandler();

        const uri = Uri.parse(`https://example.com/some/${ExtensionId}/target/path`);
        expect(handler.getTarget(uri)).toBe('target/path');
    });

    it('should handle cases where ExtensionId is at the end of the URI path', () => {
        const handler = new UriHandlerNotFoundHandler();

        const uri = Uri.parse(`https://example.com/some/${ExtensionId}`);
        expect(handler.getTarget(uri)).toBe('');
    });
});
