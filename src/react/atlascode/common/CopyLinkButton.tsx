import FileCopyOutlinedIcon from '@mui/icons-material/FileCopyOutlined';
import { IconButton, Tooltip } from '@mui/material';
import React, { useCallback } from 'react';

interface Props {
    tooltip: string;
    url: string;
    onClick: (url: string) => void;
}

export const CopyLinkButton: React.FC<Props> = (props: Props) => {
    const handleClick = useCallback(() => props.onClick(props.url), [props]);

    return (
        <Tooltip title={props.tooltip}>
            <IconButton aria-label="copy link" onClick={handleClick} size="large">
                <FileCopyOutlinedIcon />
            </IconButton>
        </Tooltip>
    );
};
