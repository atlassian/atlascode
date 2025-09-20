import React, { useEffect, useRef } from 'react';

interface Props {
    html: string;
    fetchImage?: (url: string) => Promise<string>;
}
export const RenderedContent: React.FC<Props> = (props: Props) => {
    const ref = useRef<HTMLParagraphElement>(null);

    useEffect(() => {
        if (!ref.current || !props.fetchImage) {
            return;
        }
        ref.current.addEventListener(
            'error',
            async (ee: ErrorEvent) => {
                if ((ee?.target as HTMLElement)?.nodeName === 'IMG') {
                    const targetEL = ee.target as HTMLImageElement;
                    const originalSrc = targetEL.getAttribute('atlascode-original-src');
                    const handled = targetEL.getAttribute('atlascode-original-src-handled');
                    if (originalSrc !== null && handled === null) {
                        targetEL.setAttribute('atlascode-original-src-handled', 'handled');

                        const imgData = await props.fetchImage?.(originalSrc);
                        if (imgData && imgData.length > 0) {
                            targetEL.src = `data:image/*;base64,${imgData}`;
                            targetEL.alt = '';
                            targetEL.title = '';
                            targetEL.setAttribute('width', 'auto');
                            targetEL.setAttribute('height', 'auto');
                        }
                    }
                }
            },
            { capture: true },
        );
    }, [props.fetchImage, ref]); // eslint-disable-line react-hooks/exhaustive-deps

    // eslint-disable-next-line react-dom/no-dangerously-set-innerhtml -- TODO check if needed
    return <p ref={ref} dangerouslySetInnerHTML={{ __html: props.html }} />;
};
