import { Disposable, TreeItem } from 'vscode';

function isDisposable(obj: Object): obj is Disposable {
    return Object.hasOwn(obj, 'dispose');
}

// BaseNode is an abstract tree node which all other *nodes* must extend.
// It also takes care of disposables if they are added to the `disposables` field.
export abstract class AbstractBaseNode implements Disposable {
    abstract getTreeItem(): Promise<TreeItem> | TreeItem;
    async getChildren(element?: AbstractBaseNode): Promise<AbstractBaseNode[]> {
        return [];
    }

    dispose() {
        this.getChildren().then((children) => {
            for (const child of children) {
                if (isDisposable(child)) {
                    child.dispose();
                }
            }
        });
    }
}
