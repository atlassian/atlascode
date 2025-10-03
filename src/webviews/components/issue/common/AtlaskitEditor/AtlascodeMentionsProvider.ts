import {
    AbstractMentionResource,
    MentionNameDetails,
    MentionNameStatus,
    MentionResourceConfig,
    ResolvingMentionProvider,
} from '@atlaskit/mention';

import { MentionInfo } from '../../AbstractIssueEditorPage';

export class AtlascodeMentionProvider extends AbstractMentionResource implements ResolvingMentionProvider {
    static #instance: AtlascodeMentionProvider;

    private config: MentionResourceConfig;
    private fetchUsers: (input: string, accountId?: string) => Promise<MentionInfo[]>;
    private mentionRequests: Map<
        string,
        {
            promise: MentionNameDetails | Promise<MentionNameDetails>;
            expiry: number;
        }
    > = new Map();
    private cacheDuration = 300000; // 5 minutes

    public static init(
        config: MentionResourceConfig,
        fetchUsers: (input: string, accountId?: string) => Promise<MentionInfo[]>,
    ): AtlascodeMentionProvider {
        if (!AtlascodeMentionProvider.#instance) {
            AtlascodeMentionProvider.#instance = new AtlascodeMentionProvider(config, fetchUsers);
        }

        return AtlascodeMentionProvider.#instance;
    }

    // Making the constructor private to enforce singleton pattern
    private constructor(
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
            console.warn('No mentionNameResolver configured');
            return {
                id,
                name: '',
                status: MentionNameStatus.UNKNOWN,
            };
        }
        const cachedReq = this.mentionRequests.get(id);
        if (cachedReq && cachedReq.expiry > Date.now()) {
            return cachedReq.promise;
        }

        const requestPromise = this.config.mentionNameResolver.lookupName(id);
        this.mentionRequests.set(id, {
            promise: requestPromise,
            expiry: Date.now() + this.cacheDuration,
        });
        return requestPromise;
    };

    supportsMentionNameResolving() {
        return true;
    }

    cacheMentionName(id: string, name: string) {
        // currently this method is never called by Atlaskit. So it is implemented only to satisfy the interface
        return;
    }
}
