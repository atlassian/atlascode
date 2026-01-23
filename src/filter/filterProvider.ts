import { QuickPick, QuickPickItem, window } from 'vscode';

import { AssigneeFilterProvider } from './assignee/assigneeFilterProvider';
import { ProjectFilterProvider } from './project/projectFilterProvider';

interface FilterQuickPickItem extends QuickPickItem {
    filterId: string;
}

export class FilterProvider {
    public static createFilterQuickPick(): void {
        const quickPick = window.createQuickPick<FilterQuickPickItem>();
        quickPick.title = 'Filter Jira Issues';
        quickPick.placeholder = 'Select a filter option';
        quickPick.matchOnDescription = true;
        quickPick.matchOnDetail = true;

        quickPick.items = this.getFilterItems();

        quickPick.show();

        quickPick.onDidHide(() => {
            quickPick.dispose();
        });

        quickPick.onDidAccept(() => this.handleAccept(quickPick));
    }

    private static getFilterItems(): FilterQuickPickItem[] {
        return [
            {
                label: 'Filter by Assignee',
                detail: 'Show issues assigned to specific people',
                filterId: 'filter:assignee',
            },
            {
                label: 'Filter by Project',
                detail: 'Show issues from specific projects',
                filterId: 'filter:project',
            },
        ];
    }

    private static handleAccept(quickPick: QuickPick<FilterQuickPickItem>) {
        const selected = quickPick.selectedItems[0];
        if (selected) {
            quickPick.hide();
            this.handleFilterSelection(selected.filterId);
        }
    }

    private static handleFilterSelection(filterId: string) {
        switch (filterId) {
            case 'filter:assignee':
                AssigneeFilterProvider.create();
                break;
            case 'filter:project':
                ProjectFilterProvider.create();
                break;
            default:
                console.warn(`Unknown filter type: ${filterId}`);
        }
    }
}
