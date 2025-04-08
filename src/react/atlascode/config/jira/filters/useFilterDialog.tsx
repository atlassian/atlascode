import React, { useCallback, useMemo, useState } from 'react';

import { DetailedSiteInfo } from '../../../../../atlclients/authInfo';
import { JQLEntry } from '../../../../../config/model';
import { FilterSearchDialog } from './FilterSearchDialog';

export const useFilterDialog = (sites: DetailedSiteInfo[], onSave: (jqlEntry: JQLEntry[]) => void) => {
    const [open, setOpen] = useState(false);

    const openFilterDialog = useCallback((isOpen: boolean) => {
        setOpen(isOpen);
    }, []);

    const handleFilterCancel = useCallback(() => {
        setOpen(false);
    }, []);

    const handleFilterSave = useCallback(
        (entry: JQLEntry[]) => {
            onSave(entry);
            setOpen(false);
        },
        [onSave],
    );

    const filterDialog = useMemo(
        () => <FilterSearchDialog onCancel={handleFilterCancel} onSave={handleFilterSave} open={open} sites={sites} />,
        [handleFilterCancel, handleFilterSave, open, sites],
    );
    return {
        openFilterDialog,
        filterDialog,
    };
};
