import { Disposable } from 'vscode';

import { emptyProduct, Product } from '../atlclients/authInfo';
import { HelpTreeViewId } from '../constants';
import { FocusEvent } from '../webview/ExplorerFocusManager';
import { Explorer } from './Explorer';
import { HelpDataProvider } from './helpDataProvider';

export class HelpExplorer extends Explorer implements Disposable {
    constructor() {
        super(() => this.dispose());
        this.treeDataProvider = new HelpDataProvider();
        this.newTreeView();
    }

    viewId(): string {
        return HelpTreeViewId;
    }

    product(): Product {
        return emptyProduct;
    }

    override dispose() {
        super.dispose();
    }

    async handleFocusEvent(e: FocusEvent) {
        //No focus available for now
    }
}
