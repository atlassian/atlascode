import { Button, Tooltip, Typography } from '@mui/material';
import React from 'react';

type MergeButtonProps = {
    prState: string;
    isMerging: boolean;
    isDraft: boolean;
    onClick: () => void;
};

export const MergeButton: React.FC<MergeButtonProps> = ({ prState, isMerging, isDraft, onClick }) => {
    const isDisabled = prState !== 'OPEN' || isMerging || isDraft;
    const buttonText = prState === 'OPEN' ? 'Merge' : 'Merged';

    let tooltipText = ''; // do not show tooltip when enabled
    if (isDraft) {
        tooltipText = 'This is a draft pull request. Mark as "ready for review" to enable merging.';
    } else if (prState !== 'OPEN') {
        tooltipText = `Pull request has "${prState.toLowerCase()}" state and cannot be merged.`;
    } else if (isMerging) {
        tooltipText = 'Merging in progress';
    }

    return (
        <Tooltip title={tooltipText}>
            {/*
            By default disabled elements like <button> do not trigger user interactions so a Tooltip will not activate on normal events like hover.
            To accommodate disabled elements, add a simple wrapper element, such as a span.
            https://mui.com/material-ui/react-tooltip/#disabled-elements
            */}
            <div>
                <Button color="primary" variant="contained" onClick={onClick} disabled={isDisabled} title={tooltipText}>
                    <Typography variant="button" noWrap>
                        {buttonText}
                    </Typography>
                </Button>
            </div>
        </Tooltip>
    );
};
