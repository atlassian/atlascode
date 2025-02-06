import { Commands } from '../../commands';
import { SimpleNode } from './simpleNode';
import { l10n } from 'vscode';

export const emptyBitbucketNodes: SimpleNode[] = [
    new SimpleNode(l10n.t('No Bitbucket repositories found in this workspace')),
    new SimpleNode(l10n.t('Add a repository to this workspace...'), {
        command: Commands.WorkbenchOpenRepository,
        title: l10n.t('Add repository to workspace'),
        arguments: ['pullRequestsTreeView'],
    }),
    new SimpleNode(l10n.t('Clone a repository from Bitbucket...'), {
        command: Commands.CloneRepository,
        title: l10n.t('Clone repository'),
        arguments: ['pullRequestsTreeView'],
    }),
    new SimpleNode(l10n.t('Switch workspace...'), {
        command: Commands.WorkbenchOpenWorkspace,
        title: l10n.t('Switch workspace'),
        arguments: ['pullRequestsTreeView'],
    }),
];
