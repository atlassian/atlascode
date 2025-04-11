import SVG, { SVGProps } from '@atlaskit/icon/svg';
import React from 'react';

const RequestedChangesIcon = (props: SVGProps) => {
    const { primaryColor, size = 'small', label } = props;
    return (
        <SVG primaryColor={primaryColor} size={size} label={label}>
            <path
                d="M12 0C18.6274 0 24 5.37258 24 12C24 18.6274 18.6274 24 12 24C5.37258 24 0 18.6274 0 12C0 5.37258 5.37258 0 12 0ZM9.33333 10.6667L9.17784 10.6756C8.51472 10.7527 8 11.3162 8 12C8 12.7364 8.59695 13.3333 9.33333 13.3333H14.6667L14.8222 13.3244C15.4853 13.2473 16 12.6838 16 12C16 11.2636 15.403 10.6667 14.6667 10.6667H9.33333Z"
                fill="currentColor"
            />
        </SVG>
    );
};

export default RequestedChangesIcon;
