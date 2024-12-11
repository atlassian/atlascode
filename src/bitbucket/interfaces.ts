// Bitbucket-related interfaces to reduce coupling

/**
 * Methods for checking out branches and pulling repos given their urls and ref names.
 */
export interface CheckoutHelper {
    checkoutRef(cloneUrl: string, ref: string, refType: string, sourceCloneUrl?: string): Promise<boolean>;

    /**
     * If the user clicks a URL to check out a branch but that repo isn't checked out the extension will reload itself
     * as part of the process of opening the repo. Call this method on startup to check to see if we should check out
     * a branch.
     */
    completeBranchCheckOut(): Promise<void>;

    cloneRepository(repoUrl: string): Promise<void>;

    pullRequest(repoUrl: string, pullRequestId: number): Promise<void>;
}
