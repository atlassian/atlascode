export const attachImageErrorHandler = () => {
    window.addEventListener(
        'error',
        (ee: ErrorEvent) => {
            const targetEL = ee.target as HTMLElement;

            // Prevent re-processing the same image and avoid loops if the fallback fails
            if (targetEL.getAttribute('src') === 'images/no-image.svg') {
                return;
            }

            if (ee && targetEL && targetEL.nodeName === 'IMG') {
                const originalSrc = targetEL.getAttribute('src');
                targetEL.setAttribute('atlascode-original-src', `${originalSrc}`);
                targetEL.setAttribute('src', 'images/no-image.svg');
                targetEL.setAttribute('alt', `Unable to load image: ${originalSrc}`);
                targetEL.setAttribute('title', `Unable to load image: ${originalSrc}`);
                targetEL.setAttribute('class', 'ac-broken-img');
                targetEL.setAttribute('width', '24');
                targetEL.setAttribute('height', '24');
            }
        },
        // `capture` must be set to true to handle errors caused by img failing to load
        // https://developer.mozilla.org/en-US/docs/Web/API/GlobalEventHandlers/onerror
        { capture: true },
    );
};
