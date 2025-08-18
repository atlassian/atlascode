import { SvgIcon, SvgIconProps } from '@mui/material';
import React from 'react';

export default function NotRunIcon(props: SvgIconProps) {
    return (
        <SvgIcon
            {...props}
            viewBox="0 0 16 16"
            component={(svgProps: SvgIconProps) => {
                return (
                    <svg {...svgProps} fill="currentColor" fill-rule="evenodd">
                        <title>{props.titleAccess}</title>
                        <path d="M8,14 C11.3137085,14 14,11.3137085 14,8 C14,4.6862915 11.3137085,2 8,2 C4.6862915,2 2,4.6862915 2,8 C2,11.3137085 4.6862915,14 8,14 Z" />
                    </svg>
                );
            }}
        />
    );
}
