import * as vscode from 'vscode';
import { Comment, PaginatedComments, FileChange, PullRequest, FileStatus } from '../../bitbucket/model';
import { PullRequestCommentController } from './prCommentController';
import { PRFileDiffQueryParams } from './pullRequestNode';
import { PullRequestNodeDataProvider } from '../pullRequestNodeDataProvider';
import { Logger } from '../../logger';

export interface DiffViewArgs {
    diffArgs: any[]; 
    fileDisplayData: {
        prUrl: string;
        fileDisplayName: string;
        fileChangeStatus: FileStatus;
        numberOfComments: number;
    }
}

export async function getInlineComments(allComments: Comment[]): Promise<Map<string, Comment[][]>> {
    const inlineComments = allComments.filter(c => c.inline && c.inline.path);
    const threads: Map<string, Comment[][]> = new Map();
    inlineComments.forEach(val => {
        if (!threads.get(val.inline!.path)) {
            threads.set(val.inline!.path, []);
        }
        threads.get(val.inline!.path)!.push(traverse(val));
    });
    return threads;
};

function traverse(n: Comment): Comment[] {
    let result: Comment[] = [];
    result.push(n);
    for (let i = 0; i < n.children.length; i++) {
        result.push(...traverse(n.children[i]));
    }
    return result;
};

export async function getArgsForDiffView(allComments: PaginatedComments, fileChange: FileChange, pr: PullRequest, commentController: PullRequestCommentController): Promise<DiffViewArgs> {
    const commentsMap = await getInlineComments(allComments.data);

    // Use merge base to diff from common ancestor of source and destination.
    // This will help ignore any unrelated changes in destination branch.
    const destination = `${pr.remote.name}/${pr.data.destination!.branchName}`;
    const source = `${pr.sourceRemote ? pr.sourceRemote.name : pr.remote.name}/${pr.data.source!.branchName}`;
    let mergeBase = pr.data.destination!.commitHash;
    try {
        mergeBase = await pr.repository.getMergeBase(destination, source);
    } catch (e) {
        Logger.debug('error getting merge base: ', e);
    }

    const lhsFilePath = fileChange.oldPath;
    const rhsFilePath = fileChange.newPath;

    let fileDisplayName = '';
    const comments: Comment[][] = [];

    if (rhsFilePath && lhsFilePath && rhsFilePath !== lhsFilePath) {
        fileDisplayName = `${lhsFilePath} → ${rhsFilePath}`;
        comments.push(...(commentsMap.get(lhsFilePath) || []));
        comments.push(...(commentsMap.get(rhsFilePath) || []));
    } else if (rhsFilePath) {
        fileDisplayName = rhsFilePath;
        comments.push(...(commentsMap.get(rhsFilePath) || []));
    } else if (lhsFilePath) {
        fileDisplayName = lhsFilePath;
        comments.push(...(commentsMap.get(lhsFilePath) || []));
    }

    //@ts-ignore
    if (fileChange.status === 'merge conflict') {
        fileDisplayName = `⚠️ CONFLICTED: ${fileDisplayName}`;
    }

    let lhsCommentThreads: Comment[][] = [];
    let rhsCommentThreads: Comment[][] = [];

    comments.forEach((c: Comment[]) => {
        const parentComment = c[0];
        if (parentComment.inline!.from) {
            lhsCommentThreads.push(c);
        } else {
            rhsCommentThreads.push(c);
        }
    });

    const lhsQueryParam = {
        query: JSON.stringify({
            lhs: true,
            prHref: pr.data.url,
            prId: pr.data.id,
            participants: pr.data.participants,
            repoUri: pr.repository.rootUri.toString(),
            remote: pr.remote,
            branchName: pr.data.destination!.branchName,
            commitHash: mergeBase,
            path: lhsFilePath,
            commentThreads: lhsCommentThreads
        } as PRFileDiffQueryParams)
    };
    const rhsQueryParam = {
        query: JSON.stringify({
            lhs: false,
            prHref: pr.data.url,
            prId: pr.data.id,
            participants: pr.data.participants,
            repoUri: pr.repository.rootUri.toString(),
            remote: pr.sourceRemote || pr.remote,
            branchName: pr.data.source!.branchName,
            commitHash: pr.data.source!.commitHash,
            path: rhsFilePath,
            commentThreads: rhsCommentThreads
        } as PRFileDiffQueryParams)
    };

    const lhsUri = vscode.Uri.parse(`${PullRequestNodeDataProvider.SCHEME}://${fileDisplayName}`).with(lhsQueryParam);
    const rhsUri = vscode.Uri.parse(`${PullRequestNodeDataProvider.SCHEME}://${fileDisplayName}`).with(rhsQueryParam);

    const diffArgs = [
        async () => {
            commentController.provideComments(lhsUri);
            commentController.provideComments(rhsUri);
        },
        lhsUri,
        rhsUri,
        fileDisplayName
    ];

    return {
        diffArgs: diffArgs, 
        fileDisplayData: {
            prUrl: pr.data.url, 
            fileDisplayName: fileDisplayName,
            fileChangeStatus: fileChange.status,
            numberOfComments: comments.length ? comments.length : 0
        }
    };
}