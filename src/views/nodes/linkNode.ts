import vscode, { TreeItem, TreeItemCollapsibleState } from 'vscode';

import { Commands } from '../../commands';
import { HelpTreeViewId } from '../../constants';
import { KnownLinkID, knownLinkIdMap } from '../../lib/ipc/models/common';
import { iconSet, Resources } from '../../resources';
import { AbstractBaseNode } from './abstractBaseNode';

export class LinkNode extends AbstractBaseNode {
    constructor(
        readonly message: string,
        readonly description: string,
        readonly icon: iconSet,
        readonly linkId: KnownLinkID,
    ) {
        super();
    }

    getTreeItem() {
        const text = this.message;
        const node = new TreeItem(text, TreeItemCollapsibleState.None);
        node.tooltip = text;
        node.description = this.description;
        node.resourceUri = vscode.Uri.parse(knownLinkIdMap.get(this.linkId) ?? '');
        node.iconPath = Resources.icons.get(this.icon);
        node.command = {
            command: Commands.ViewInWebBrowser,
            title: '',
            arguments: [this, HelpTreeViewId, this.linkId],
        };

        return node;
    }
}
