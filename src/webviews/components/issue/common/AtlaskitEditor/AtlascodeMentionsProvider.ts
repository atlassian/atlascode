import {
    AbstractMentionResource,
    MentionDescription,
    MentionNameDetails,
    MentionNameStatus,
    MentionResourceConfig,
    ResolvingMentionProvider,
} from '@atlaskit/mention';
import { User } from 'src/bitbucket/model';

import { MentionInfo } from '../../AbstractIssueEditorPage';
type FetchJiraUsersFunc = (input: string, accountId?: string) => Promise<MentionInfo[]>;
type FetchBBUsersFunc = (input: string, abortSignal?: AbortSignal) => Promise<User[]>;

type ExtendedMentionResourceConfig = MentionResourceConfig & {
    isBitbucketCloud?: boolean;
};

export class AtlascodeMentionProvider extends AbstractMentionResource implements ResolvingMentionProvider {
    static instance: AtlascodeMentionProvider;

    private config: ExtendedMentionResourceConfig;
    private fetchUsers: FetchJiraUsersFunc | FetchBBUsersFunc;
    private mentionRequests: Map<
        string,
        {
            promise: MentionNameDetails | Promise<MentionNameDetails>;
            expiry: number;
        }
    > = new Map();
    private cacheDuration = 300000; // 5 minutes

    public static init(
        config: ExtendedMentionResourceConfig,
        fetchUsers: FetchJiraUsersFunc | FetchBBUsersFunc,
    ): AtlascodeMentionProvider {
        if (!AtlascodeMentionProvider.instance) {
            AtlascodeMentionProvider.instance = new AtlascodeMentionProvider(config, fetchUsers);
        }

        return AtlascodeMentionProvider.instance;
    }

    // Making the constructor private to enforce singleton pattern
    private constructor(_config: ExtendedMentionResourceConfig, _fetchUsers: FetchJiraUsersFunc | FetchBBUsersFunc) {
        super();
        this.config = _config;
        this.fetchUsers = _fetchUsers;
    }

    override filter(query?: string): void {
        const isBitbucketCloud = this.config.isBitbucketCloud;
        setTimeout(async () => {
            try {
                const users = await this.fetchUsers(query || '');
                const mentions = users.map((user) => {
                    const mention = {
                        id: isBitbucketCloud ? `{${user?.accountId}}` : `${user?.accountId}`,
                        name: user?.displayName,
                        mentionName: user?.mention,
                        avatarUrl: user?.avatarUrl,
                    };
                    return mention;
                });
                this._notifyListeners({ mentions, query: query || '' }, {});
                this._notifyAllResultsListeners({ mentions, query: query || '' });
            } catch (error) {
                console.error('Error fetching users:', error);
            }
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

    override shouldHighlightMention(_mention: MentionDescription) {
        return false;
    }

    cacheMentionName(id: string, name: string) {
        // currently this method is never called by Atlaskit. So it is implemented only to satisfy the interface
        return;
    }
}
