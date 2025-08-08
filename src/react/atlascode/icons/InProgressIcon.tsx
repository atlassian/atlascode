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
                        <path d="M.052 8a7.77 7.77 0 0 0 .637 3.105 8.055 8.055 0 0 0 1.707 2.551 8.055 8.055 0 0 0 2.55 1.707A7.77 7.77 0 0 0 8.053 16a7.77 7.77 0 0 0 3.105-.637 8.055 8.055 0 0 0 2.55-1.707 8.055 8.055 0 0 0 1.708-2.551A7.77 7.77 0 0 0 16.052 8a7.77 7.77 0 0 0-.637-3.105 8.055 8.055 0 0 0-1.707-2.551A8.055 8.055 0 0 0 11.157.637 7.77 7.77 0 0 0 8.052 0a7.77 7.77 0 0 0-3.105.637 8.055 8.055 0 0 0-2.551 1.707A8.055 8.055 0 0 0 .689 4.895 7.77 7.77 0 0 0 .052 8zm12.39 1.396a4.675 4.675 0 0 0-5.883-5.883l.61 1.904a2.676 2.676 0 0 1 3.368 3.369l1.905.61zM8.74 10.583a2.677 2.677 0 0 1-2.715-.653 2.678 2.678 0 0 1-.653-2.715l-1.905-.611a4.677 4.677 0 0 0 5.883 5.884l-.61-1.905z" />
                    </svg>
                );
            }}
        />
    );
}
