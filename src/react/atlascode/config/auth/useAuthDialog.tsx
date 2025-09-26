import { createContext, useCallback, useMemo, useState } from 'react';

import { Product, ProductJira } from '../../../../atlclients/authInfo';
import { SiteWithAuthInfo } from '../../../../lib/ipc/toUI/config';

interface AuthDialogController {
    openDialog: (product: Product, entry: SiteWithAuthInfo | undefined, authSites: SiteWithAuthInfo[]) => void;
    close: () => void;
    onExited: () => void;
}

const emptyController: AuthDialogController = {
    openDialog: (product: Product, entry: SiteWithAuthInfo | undefined, authSites: SiteWithAuthInfo[]) => {},
    close: () => {},
    onExited: () => {},
};
export const AuthDialogControllerContext = createContext<AuthDialogController>(emptyController);

export const useAuthDialog = () => {
    const [authDialogOpen, setOpen] = useState(false);
    const [authDialogEntry, setAuthEntry] = useState<SiteWithAuthInfo | undefined>(undefined);
    const [allSitesWithAuth, setAllSitesWithAuth] = useState<SiteWithAuthInfo[]>([]);
    const [authDialogProduct, setProduct] = useState<Product>(ProductJira);

    const openDialog = useCallback(
        (product: Product, entry: SiteWithAuthInfo | undefined, authSites: SiteWithAuthInfo[]) => {
            setAuthEntry(entry);
            setAllSitesWithAuth(authSites);
            setProduct(product);
            setOpen(true);
        },
        [],
    );

    const close = useCallback(() => {
        setOpen(false);
    }, []);

    const onExited = useCallback(() => {
        setAuthEntry(undefined);
    }, []);

    const authDialogController = useMemo(() => {
        return { close, openDialog, onExited };
    }, [close, openDialog, onExited]);

    return {
        authDialogController,
        authDialogProduct,
        authDialogOpen,
        authDialogEntry,
        allSitesWithAuth,
    };
};
