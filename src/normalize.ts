import { commands, TabInputTextDiff, TextEditor, Uri, window } from 'vscode';

import { CommandContext, setCommandContext } from './commandContext';
import { Container } from './container';
import { Logger } from './logger';

interface CodeNormalizer {
    isRelevant: (u: Uri) => boolean;
    normalize: (code: string, uri: Uri) => string | Promise<string>;
}

const normalizers: CodeNormalizer[] = [];

const registerCodeNormalizer = (normalizer: CodeNormalizer) => {
    if (normalizers.indexOf(normalizer) < 0) {
        normalizers.push(normalizer);
    }
    return {
        dispose: () => {
            const idx = normalizers.indexOf(normalizer);
            if (idx >= 0) {
                normalizers.splice(idx, 1);
            }
        },
    };
};

const enableDiffNormalize = (e?: TextEditor) => {
    const relevant = e?.document.uri.scheme === 'atlascode.bbpr';
    const active = relevant && normalizers.some((n) => n.isRelevant(e.document.uri));
    setCommandContext(CommandContext.IsNormalizerEnabled, active);
};

const toggleNorm = (u: Uri) => {
    const q = JSON.parse(u.query);
    if (q.normalized) {
        delete q.normalized;
    } else {
        q.normalized = true;
    }
    return u.with({ query: JSON.stringify(q) });
};

export const toggleDiffNormalize = () => {
    try {
        const tab = window.tabGroups.activeTabGroup.activeTab;
        if (tab?.input instanceof TabInputTextDiff) {
            const { original, modified } = tab.input;
            const controller = Container.bitbucketContext.prCommentController;
            const origN = toggleNorm(original);
            const modifN = toggleNorm(modified);
            controller.provideComments(origN);
            controller.provideComments(modifN);
            return commands.executeCommand<void>('vscode.diff', origN, modifN, tab.label);
        }
    } catch (error) {
        Logger.debug('[Failed to toggle normalizer]', error);
    }
    return;
};

export const normalize = (original: string, uri: Uri) => {
    for (const n of normalizers) {
        if (n.isRelevant(uri)) {
            return n.normalize(original, uri);
        }
    }
    return original;
};

export const api = { registerCodeNormalizer };
window.onDidChangeActiveTextEditor(enableDiffNormalize);
