import React, { useCallback, useMemo, useState } from 'react';

import { DetailedSiteInfo } from '../../../../../atlclients/authInfo';
import { JQLEntry } from '../../../../../config/model';
import { JQLEditDialog } from './JQLEditDialog';

export const useJqlEditDialog = (sites: DetailedSiteInfo[], onSave: (jqlEntry: JQLEntry) => void) => {
    const [open, setOpen] = useState(false);
    const [jqlEntry, setJqlEntry] = useState<JQLEntry | undefined>(undefined);

    const openJqlDialog = useCallback((isOpen: boolean, entry?: JQLEntry) => {
        setJqlEntry(entry);
        setOpen(isOpen);
    }, []);

    const handleJQLCancel = useCallback(() => {
        setJqlEntry(undefined);
        setOpen(false);
    }, []);

    const handleJQLSave = useCallback(
        (entry: JQLEntry) => {
            onSave(entry);
            setJqlEntry(undefined);
            setOpen(false);
        },
        [onSave],
    );

    const jqlDialog = useMemo(
        () => (
            <JQLEditDialog
                jqlEntry={jqlEntry}
                onCancel={handleJQLCancel}
                onSave={handleJQLSave}
                open={open}
                sites={sites}
            />
        ),
        [handleJQLCancel, handleJQLSave, jqlEntry, open, sites],
    );
    return {
        openJqlDialog,
        jqlDialog,
    };
};
