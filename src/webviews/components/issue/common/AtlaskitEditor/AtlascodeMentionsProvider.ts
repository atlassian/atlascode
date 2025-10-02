import {
    AbstractMentionResource,
    MentionNameDetails,
    MentionNameStatus,
    MentionResourceConfig,
    ResolvingMentionProvider,
} from '@atlaskit/mention';

import { MentionInfo } from '../../view-issue-screen/JiraIssuePage';

export class AtlascodeMentionProvider extends AbstractMentionResource implements ResolvingMentionProvider {
    private config: MentionResourceConfig;
    private fetchUsers: (input: string, accountId?: string) => Promise<MentionInfo[]>;

    constructor(
        _config: MentionResourceConfig,
        _fetchUsers: (input: string, accountId?: string) => Promise<MentionInfo[]>,
    ) {
        super();
        this.config = _config;
        this.fetchUsers = _fetchUsers;
    }

    override filter(query?: string): void {
        setTimeout(async () => {
            const users = await this.fetchUsers(query || '');
            const mentions = users.map((user) => ({
                id: `${user.accountId}`,
                name: user.displayName,
                mentionName: user.mention,
                avatarUrl: user.avatarUrl,
            }));
            this._notifyListeners({ mentions, query: query || '' }, {});
            this._notifyAllResultsListeners({ mentions, query: query || '' });
        }, 30 + 1);
        return;
    }

    resolveMentionName = async (id: string): Promise<MentionNameDetails> => {
        if (!this.config.mentionNameResolver) {
            return {
                id,
                name: '',
                status: MentionNameStatus.UNKNOWN,
            };
        }
        return await this.config.mentionNameResolver.lookupName(id);
    };

    supportsMentionNameResolving() {
        return true;
    }

    cacheMentionName(id: string, name: string) {
        // currently this method is never called by Atlaskit. So it is implemented only to satisfy the interface
        return;
    }
}
