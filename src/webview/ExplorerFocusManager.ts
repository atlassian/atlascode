import vscode, { Disposable, Event, EventEmitter } from 'vscode';

import { ProductBitbucket, ProductJira } from '../atlclients/authInfo';
import { AssignedJiraItemsViewId, PullRequestTreeViewId } from '../constants';
import { Container } from '../container';
import { SitesAvailableUpdateEvent } from '../siteManager';

export enum FocusEventActions {
    CREATEISSUE = 'Create an issue',
    VIEWISSUE = 'View an issue',
    CREATEPULLREQUEST = 'Create a pull request',
    VIEWPULLREQUEST = 'View a pull request',
}

export type FocusEvent = {
    action: FocusEventActions;
    openNode?: boolean;
};

export class ExplorerFocusManager extends Disposable {
    private _disposable: Disposable;
    private _onFocusEvent = new EventEmitter<FocusEvent>();
    constructor() {
        super(() => this.dispose());

        this._disposable = Disposable.from(
            Container.siteManager.onDidSitesAvailableChange(this.onDidSitesChange, this),
        );
    }

    fireEvent(eventType: FocusEventActions, openNode?: boolean) {
        this._onFocusEvent.fire({
            action: eventType,
            openNode: openNode,
        });
    }

    public get onFocusEvent(): Event<FocusEvent> {
        return this._onFocusEvent.event;
    }

    override dispose() {
        this._onFocusEvent.dispose();
        this._disposable.dispose();
    }

    private onDidSitesChange(updateEvent: SitesAvailableUpdateEvent) {
        if (updateEvent.newSites) {
            if (updateEvent.product.key === ProductJira.key) {
                vscode.commands.executeCommand(`${AssignedJiraItemsViewId}.focus`);
            } else if (updateEvent.product.key === ProductBitbucket.key) {
                vscode.commands.executeCommand(`${PullRequestTreeViewId}.focus`);
            }
        }
    }
}
