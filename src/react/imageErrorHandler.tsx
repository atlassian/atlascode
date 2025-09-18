export const attachImageErrorHandler = () => {
    window.addEventListener(
        'error',
        (ee: ErrorEvent) => {
            const targetEL = ee.target as HTMLImageElement;
            if (!ee || !targetEL || targetEL.nodeName !== 'IMG') {
                return;
            }

            const originalSrc = targetEL.getAttribute('src') || '';
            // Avoid infinite loops or repeated processing of our fallback
            if (originalSrc === 'images/no-image.svg') {
                return;
            }

            // Preserve current rendered size to prevent layout shift
            try {
                const computed = window.getComputedStyle(targetEL);
                const width = parseFloat(computed.width);
                const height = parseFloat(computed.height);
                if (width > 0 && height > 0) {
                    targetEL.style.width = `${width}px`;
                    targetEL.style.height = `${height}px`;
                }
            } catch {
                // Ignore if getComputedStyle fails
            }

            targetEL.setAttribute('atlascode-original-src', `${originalSrc}`);
            targetEL.setAttribute('src', 'images/no-image.svg');

            // Determine if the image is decorative (e.g., loaders, icons)
            const className = targetEL.getAttribute('class') || '';
            const isDecorative =
                targetEL.getAttribute('role') === 'presentation' ||
                targetEL.getAttribute('aria-hidden') === 'true' ||
                /(^|\s)(atl-loader|ac-atl-loader)(\s|$)/.test(className);

            // For decorative images, ensure empty alt to avoid visible fallback text
            if (isDecorative) {
                targetEL.setAttribute('alt', '');
                targetEL.removeAttribute('title');
            } else {
                targetEL.setAttribute('alt', 'Unable to load image');
                targetEL.setAttribute('title', `Unable to load image: ${originalSrc}`);
            }

            targetEL.classList.add('ac-broken-img');
            // Do not force a tiny 24x24 size; preserve layout instead
            targetEL.removeAttribute('width');
            targetEL.removeAttribute('height');
        },
        // `capture` must be set to true to handle errors caused by img failing to load
        // https://developer.mozilla.org/en-US/docs/Web/API/GlobalEventHandlers/onerror
        { capture: true },
    );
};
