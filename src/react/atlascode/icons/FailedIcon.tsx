import { SvgIcon, SvgIconProps } from '@mui/material';
import React from 'react';

export default function FailedIcon(props: SvgIconProps) {
    return (
        <SvgIcon
            {...props}
            viewBox="0 0 16 16"
            component={(svgProps: SvgIconProps) => {
                return (
                    <svg {...svgProps} fill="currentColor" fill-rule="evenodd">
                        <title>{props.titleAccess}</title>
                        <path d="M7.061 9h2V4h-2v5zm0 3h2v-2h-2v2zm8.367-7.102a8.039 8.039 0 0 0-1.703-2.546A8.122 8.122 0 0 0 11.17.641 7.765 7.765 0 0 0 8.061 0a7.792 7.792 0 0 0-3.102.633 8.055 8.055 0 0 0-2.547 1.703A8.11 8.11 0 0 0 .701 4.891 7.764 7.764 0 0 0 .061 8c0 1.083.21 2.117.632 3.102.422.984.99 1.833 1.703 2.546a8.122 8.122 0 0 0 2.555 1.711 7.77 7.77 0 0 0 3.11.641 7.788 7.788 0 0 0 3.101-.633 8.055 8.055 0 0 0 2.547-1.703 8.1 8.1 0 0 0 1.711-2.555A7.765 7.765 0 0 0 16.061 8a7.796 7.796 0 0 0-.633-3.102z" />
                    </svg>
                );
            }}
        />
    );
}
