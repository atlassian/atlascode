import { render, waitFor } from '@testing-library/react';
import React from 'react';
import { disableConsole } from 'testsutil';

import { RenderedContent } from './RenderedContent';

describe('RenderedContent', () => {
    beforeAll(() => {
        disableConsole('warn', 'error');
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('basic rendering', () => {
        it('renders HTML content correctly', () => {
            const html = '<div>Test content</div>';
            const { container } = render(<RenderedContent html={html} />);

            expect(container.querySelector('p')).toBeTruthy();
            expect(container.innerHTML).toContain('Test content');
        });

        it('renders complex HTML with multiple elements', () => {
            const html = '<h1>Title</h1><p>Paragraph</p><ul><li>Item 1</li><li>Item 2</li></ul>';
            const { container } = render(<RenderedContent html={html} />);

            expect(container.textContent).toContain('Title');
            expect(container.textContent).toContain('Paragraph');
            expect(container.textContent).toContain('Item 1');
            expect(container.textContent).toContain('Item 2');
        });

        it('renders empty string without error', () => {
            const html = '';
            const { container } = render(<RenderedContent html={html} />);

            expect(container.querySelector('p')).toBeTruthy();
            expect(container.querySelector('p')?.innerHTML).toBe('');
        });
    });

    describe('image handling without fetchImage', () => {
        it('renders images without fetchImage prop', () => {
            const html = '<img src="test.jpg" alt="Test image" />';
            const { container } = render(<RenderedContent html={html} />);

            const img = container.querySelector('img');
            expect(img).toBeTruthy();
            expect(img?.getAttribute('src')).toBe('test.jpg');
        });
    });

    describe('image handling with fetchImage', () => {
        let mockFetchImage: jest.Mock;

        beforeEach(() => {
            mockFetchImage = jest.fn();
        });

        it('does not call fetchImage when image loads successfully', async () => {
            const html = '<img src="valid.jpg" alt="Valid image" />';
            render(<RenderedContent html={html} fetchImage={mockFetchImage} />);

            await waitFor(() => {
                expect(mockFetchImage).not.toHaveBeenCalled();
            });
        });

        it('fetches and replaces image on error when atlascode-original-src is present', async () => {
            const base64Data = 'base64encodeddata';
            mockFetchImage.mockResolvedValue(base64Data);

            const html = '<img src="broken.jpg" atlascode-original-src="original.jpg" alt="Test" />';
            const { container } = render(<RenderedContent html={html} fetchImage={mockFetchImage} />);

            const img = container.querySelector('img') as HTMLImageElement;

            const errorEvent = new ErrorEvent('error', { target: img } as any);
            Object.defineProperty(errorEvent, 'target', { value: img, enumerable: true });
            img.dispatchEvent(errorEvent);

            await waitFor(() => {
                expect(mockFetchImage).toHaveBeenCalledWith('original.jpg');
            });

            await waitFor(() => {
                expect(img.src).toContain(`data:image/*;base64,${base64Data}`);
            });
        });

        it('sets proper attributes after successful image fetch', async () => {
            const base64Data = 'imagedata123';
            mockFetchImage.mockResolvedValue(base64Data);

            const html =
                '<img src="broken.jpg" atlascode-original-src="original.jpg" alt="Original Alt" title="Original Title" />';
            const { container } = render(<RenderedContent html={html} fetchImage={mockFetchImage} />);

            const img = container.querySelector('img') as HTMLImageElement;

            const errorEvent = new ErrorEvent('error', { target: img } as any);
            Object.defineProperty(errorEvent, 'target', { value: img, enumerable: true });
            img.dispatchEvent(errorEvent);

            await waitFor(() => {
                expect(img.getAttribute('atlascode-original-src-handled')).toBe('handled');
                expect(img.getAttribute('data-vscode-context')).toBeTruthy();
                expect(img.alt).toBe('');
                expect(img.title).toBe('');
                expect(img.getAttribute('width')).toBe('auto');
                expect(img.getAttribute('height')).toBe('auto');
            });
        });

        it('does not fetch image if already handled', async () => {
            const html =
                '<img src="broken.jpg" atlascode-original-src="original.jpg" atlascode-original-src-handled="handled" />';
            const { container } = render(<RenderedContent html={html} fetchImage={mockFetchImage} />);

            const img = container.querySelector('img') as HTMLImageElement;

            const errorEvent = new ErrorEvent('error', { target: img } as any);
            Object.defineProperty(errorEvent, 'target', { value: img, enumerable: true });
            img.dispatchEvent(errorEvent);

            await waitFor(
                () => {
                    expect(mockFetchImage).not.toHaveBeenCalled();
                },
                { timeout: 500 },
            );
        });

        it('does not fetch image if atlascode-original-src is missing', async () => {
            const html = '<img src="broken.jpg" alt="Test" />';
            const { container } = render(<RenderedContent html={html} fetchImage={mockFetchImage} />);

            const img = container.querySelector('img') as HTMLImageElement;

            const errorEvent = new ErrorEvent('error', { target: img } as any);
            Object.defineProperty(errorEvent, 'target', { value: img, enumerable: true });
            img.dispatchEvent(errorEvent);

            await waitFor(
                () => {
                    expect(mockFetchImage).not.toHaveBeenCalled();
                },
                { timeout: 500 },
            );
        });

        it('handles empty response from fetchImage', async () => {
            mockFetchImage.mockResolvedValue('');

            const html = '<img src="broken.jpg" atlascode-original-src="original.jpg" />';
            const { container } = render(React.createElement(RenderedContent, { html, fetchImage: mockFetchImage }));

            const img = container.querySelector('img') as HTMLImageElement;
            const originalSrc = img.src;

            const errorEvent = new ErrorEvent('error', { target: img } as any);
            Object.defineProperty(errorEvent, 'target', { value: img, enumerable: true });
            img.dispatchEvent(errorEvent);

            await waitFor(() => {
                expect(mockFetchImage).toHaveBeenCalledWith('original.jpg');
            });

            // Image src should not be updated when fetchImage returns empty string
            expect(img.src).toBe(originalSrc);
        });

        it('ignores error events from non-image elements', async () => {
            const html = '<div>Text</div><img src="test.jpg" atlascode-original-src="original.jpg" />';
            const { container } = render(<RenderedContent html={html} fetchImage={mockFetchImage} />);

            const div = container.querySelector('div') as HTMLDivElement;

            const errorEvent = new ErrorEvent('error', { target: div } as any);
            Object.defineProperty(errorEvent, 'target', { value: div, enumerable: true });
            div.dispatchEvent(errorEvent);

            await waitFor(
                () => {
                    expect(mockFetchImage).not.toHaveBeenCalled();
                },
                { timeout: 500 },
            );
        });

        it('sets correct vscode context on image', async () => {
            const base64Data = 'testdata';
            mockFetchImage.mockResolvedValue(base64Data);

            const html = '<img src="broken.jpg" atlascode-original-src="original.jpg" />';
            const { container } = render(<RenderedContent html={html} fetchImage={mockFetchImage} />);

            const img = container.querySelector('img') as HTMLImageElement;

            const errorEvent = new ErrorEvent('error', { target: img } as any);
            Object.defineProperty(errorEvent, 'target', { value: img, enumerable: true });
            img.dispatchEvent(errorEvent);

            await waitFor(() => {
                const context = img.getAttribute('data-vscode-context');
                expect(context).toBe(
                    JSON.stringify({ webviewSection: 'jiraImageElement', preventDefaultContextMenuItems: true }),
                );
            });
        });
    });

    describe('multiple images', () => {
        it('handles multiple images with errors independently', async () => {
            const mockFetchImage = jest.fn();
            mockFetchImage.mockResolvedValueOnce('data1').mockResolvedValueOnce('data2');

            const html = `
                <img src="broken1.jpg" atlascode-original-src="original1.jpg" />
                <img src="broken2.jpg" atlascode-original-src="original2.jpg" />
            `;
            const { container } = render(React.createElement(RenderedContent, { html, fetchImage: mockFetchImage }));

            const images = container.querySelectorAll('img');
            expect(images.length).toBe(2);

            images.forEach((img) => {
                const errorEvent = new ErrorEvent('error', { target: img } as any);
                Object.defineProperty(errorEvent, 'target', { value: img, enumerable: true });
                img.dispatchEvent(errorEvent);
            });

            await waitFor(() => {
                expect(mockFetchImage).toHaveBeenCalledTimes(2);
                expect(mockFetchImage).toHaveBeenCalledWith('original1.jpg');
                expect(mockFetchImage).toHaveBeenCalledWith('original2.jpg');
            });
        });
    });
});
