import React from 'react';
import Button from '@atlaskit/button';

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
