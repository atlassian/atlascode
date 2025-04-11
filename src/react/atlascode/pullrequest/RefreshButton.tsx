import Button from '@atlaskit/button';
import React from 'react';

type RefreshButtonProps = {
    loading: boolean;
    onClick: () => void;
};

export function RefreshButton({ loading, onClick }: RefreshButtonProps) {
    return (
        <Button isDisabled={loading} onClick={onClick}>
            {loading ? 'Refreshing...' : 'Refresh'}
        </Button>
    );
}
