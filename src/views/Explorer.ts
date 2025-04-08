import { Project } from '@atlassianlabs/jira-pi-common-models';
import { Disposable, TreeDataProvider, TreeItem, TreeView, TreeViewVisibilityChangeEvent, window } from 'vscode';

import { viewScreenEvent } from '../analytics';
import { Product } from '../atlclients/authInfo';
import { Container } from '../container';
import { Logger } from '../logger';
import { AbstractBaseNode } from './nodes/abstractBaseNode';

export abstract class Explorer extends Disposable {
    protected treeDataProvider: BaseTreeDataProvider | undefined;
    protected treeView: TreeView<AbstractBaseNode> | undefined;

    abstract viewId(): string;
    abstract product(): Product;

    protected newTreeView(): TreeView<AbstractBaseNode> | undefined {
        if (this.treeDataProvider) {
            const treeView = window.createTreeView(this.viewId(), { treeDataProvider: this.treeDataProvider });
            treeView.onDidChangeVisibility((e) => this.onDidChangeVisibility(e));
            this.treeView = treeView;
            return treeView;
        }
        return undefined;
    }

    private async onDidChangeVisibility(event: TreeViewVisibilityChangeEvent) {
        if (event.visible && Container.siteManager.productHasAtLeastOneSite(this.product())) {
            viewScreenEvent(this.viewId(), undefined, this.product()).then((e) => {
                Container.analyticsClient.sendScreenEvent(e);
            });
        }
    }

    getDataProvider(): BaseTreeDataProvider | undefined {
        return this.treeDataProvider;
    }

    async reveal(
        node: AbstractBaseNode,
        options?: {
            select?: boolean;
            focus?: boolean;
            expand?: boolean | number;
        },
    ) {
        if (this.treeView === undefined) {
            return;
        }

        try {
            await this.treeView.reveal(node, options);
        } catch (e) {
            Logger.error(e);
        }
    }

    dispose() {
        console.log('explorer disposed');
        if (this.treeDataProvider) {
            this.treeDataProvider.dispose();
        }
    }
}

export abstract class BaseTreeDataProvider implements TreeDataProvider<AbstractBaseNode>, Disposable {
    getTreeItem(element: AbstractBaseNode): Promise<TreeItem> | TreeItem {
        return element.getTreeItem();
    }

    abstract getChildren(element?: AbstractBaseNode): Promise<AbstractBaseNode[]>;
    setProject(project: Project) {}

    refresh() {}
    dispose() {}
    getParent(node: AbstractBaseNode): AbstractBaseNode | undefined {
        return node.getParent();
    }
}
