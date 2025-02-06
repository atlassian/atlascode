import path from 'path';
import * as vscode from 'vscode';
import {
    BitbucketSite,
    Comment,
    FileDiff,
    FileStatus,
    PaginatedComments,
    PullRequest,
    Task,
    User,
} from '../../bitbucket/model';
import { configuration } from '../../config/configuration';
import { Container } from '../../container';
import { Logger } from '../../logger';
import { addTasksToCommentHierarchy } from '../../webview/common/pullRequestHelperActions';
import { AbstractBaseNode } from '../nodes/abstractBaseNode';
import { DirectoryNode } from '../nodes/directoryNode';
import { PullRequestFilesNode } from '../nodes/pullRequestFilesNode';
import { SimpleNode } from '../nodes/simpleNode';
import { PullRequestNodeDataProvider } from '../pullRequestNodeDataProvider';
import { PullRequestCommentController } from './prCommentController';

export interface DiffViewArgs {
    diffArgs: any[];
    fileDisplayData: {
        prUrl: string;
        fileDisplayName: string;
        fileDiffStatus: FileStatus;
        isConflicted?: boolean;
        numberOfComments: number;
    };
}

export interface PRDirectory {
    name: string;
    files: DiffViewArgs[];
    subdirs: Map<string, PRDirectory>;
}

export interface FileDiffQueryParams {
    lhs: boolean;
    repoUri: string;
    branchName: string;
    commitHash: string;
    rhsCommitHash: string;
    isCommitLevelDiff?: boolean;
    path: string;
}

export interface PRFileDiffQueryParams extends FileDiffQueryParams {
    site: BitbucketSite;
    repoHref: string;
    prHref: string;
    prId: string;
    participants: User[];
    commentThreads: Comment[][];
    addedLines: number[];
    deletedLines: number[];
    lineContextMap: Object;
}

export function getInlineComments(allComments: Comment[]): Map<string, Comment[][]> {
    const inlineComments = allComments.filter((c) => c.inline && c.inline.path);
    const threads: Map<string, Comment[][]> = new Map();
    inlineComments.forEach((val) => {
        if (!threads.get(val.inline!.path)) {
            threads.set(val.inline!.path, []);
        }
        threads.get(val.inline!.path)!.push(traverse(val));
    });
    return threads;
}

function traverse(n: Comment): Comment[] {
    let result: Comment[] = [];
    result.push(n);
    for (let i = 0; i < n.children.length; i++) {
        result.push(...traverse(n.children[i]));
    }
    return result;
}

export async function getArgsForDiffView(
    allComments: PaginatedComments,
    fileDiff: FileDiff,
    pr: PullRequest,
    commentController: PullRequestCommentController,
    commitRange?: { lhs: string; rhs: string },
): Promise<DiffViewArgs> {
    const remotePrefix = pr.workspaceRepo ? `${pr.workspaceRepo.mainSiteRemote.remote.name}/` : '';
    // Use merge base to diff from common ancestor of source and destination.
    // This will help ignore any unrelated changes in destination branch.
    const destination = `${remotePrefix}${pr.data.destination!.branchName}`;
    // TODO Handle case when source and destination remotes are not the same
    //const source = `${pr.sourceRemote ? pr.sourceRemote.name : pr.remote.name}/${pr.data.source!.branchName}`;
    const source = `${remotePrefix}${pr.data.source!.branchName}`;
    let mergeBase = pr.data.destination!.commitHash;
    try {
        if (pr.workspaceRepo) {
            const scm = Container.bitbucketContext.getRepositoryScm(pr.workspaceRepo.rootUri);
            if (scm) {
                mergeBase = await scm.getMergeBase(destination, source);
            }
        }
    } catch (e) {
        Logger.debug('error getting merge base: ', e);
    }

    const lhsFilePath = fileDiff.oldPath;
    const rhsFilePath = fileDiff.newPath;

    let fileDisplayName = getFileNameFromPaths(lhsFilePath, rhsFilePath);
    const comments: Comment[][] = [];
    const commentsMap = getInlineComments(allComments.data);

    if (rhsFilePath && lhsFilePath && rhsFilePath !== lhsFilePath) {
        comments.push(...(commentsMap.get(lhsFilePath) || []));
        comments.push(...(commentsMap.get(rhsFilePath) || []));
    } else if (rhsFilePath) {
        comments.push(...(commentsMap.get(rhsFilePath) || []));
    } else if (lhsFilePath) {
        comments.push(...(commentsMap.get(lhsFilePath) || []));
    }

    //@ts-ignore
    if (fileDiff.status === 'merge conflict') {
        fileDisplayName = vscode.l10n.t('{0} CONFLICTED: ${fileDisplayName}', '⚠️');
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

    const repoUri = pr.workspaceRepo ? pr.workspaceRepo.rootUri : '';

    const lhsQueryParam = {
        query: JSON.stringify({
            site: pr.site,
            lhs: true,
            repoHref: pr.data.destination.repo.url,
            prHref: pr.data.url,
            prId: pr.data.id,
            participants: pr.data.participants,
            repoUri: repoUri,
            branchName: pr.data.destination!.branchName,
            commitHash: commitRange ? commitRange.lhs : mergeBase,
            rhsCommitHash: commitRange ? commitRange.rhs : pr.data.source!.commitHash,
            isCommitLevelDiff: !!commitRange,
            path: lhsFilePath,
            commentThreads: lhsCommentThreads,
            addedLines: fileDiff.hunkMeta!.oldPathAdditions,
            deletedLines: fileDiff.hunkMeta!.oldPathDeletions,
            lineContextMap: fileDiff.hunkMeta!.newPathContextMap,
        } as PRFileDiffQueryParams),
    };
    const rhsQueryParam = {
        query: JSON.stringify({
            site: pr.site,
            lhs: false,
            repoHref: pr.data.source.repo.url,
            prHref: pr.data.url,
            prId: pr.data.id,
            participants: pr.data.participants,
            repoUri: repoUri,
            branchName: pr.data.source!.branchName,
            commitHash: commitRange ? commitRange.rhs : pr.data.source!.commitHash,
            rhsCommitHash: commitRange ? commitRange.rhs : pr.data.source!.commitHash,
            isCommitLevelDiff: !!commitRange,
            path: rhsFilePath,
            commentThreads: rhsCommentThreads,
            addedLines: fileDiff.hunkMeta!.newPathAdditions,
            deletedLines: fileDiff.hunkMeta!.newPathDeletions,
            lineContextMap: fileDiff.hunkMeta!.newPathContextMap,
        } as PRFileDiffQueryParams),
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
        fileDisplayName,
    ];

    return {
        diffArgs: diffArgs,
        fileDisplayData: {
            prUrl: pr.data.url,
            fileDisplayName: fileDisplayName,
            fileDiffStatus: fileDiff.status,
            numberOfComments: comments.length ? comments.length : 0,
            isConflicted: fileDiff.isConflicted,
        },
    };
}

export function getFileNameFromPaths(oldPath: string | undefined, newPath: string | undefined): string {
    let fileDisplayName: string = '';
    if (newPath && oldPath) {
        fileDisplayName = mergePaths(oldPath, newPath);
    } else if (newPath) {
        fileDisplayName = newPath;
    } else if (oldPath) {
        fileDisplayName = oldPath;
    }
    return fileDisplayName;
}

/* This function aims to mimic Git's (and therefore Bitbucket's) file rename behavior.
 * Assuming oldPath = 'A/B/C/D/file.txt' and newPath = 'A/B/E/D/file.txt', this function will return
 * "A/B/{C/D/file.txt -> E/D/file.txt}". It does not attempt to convert it to:
 * "A/B/{C -> E}/D/file.txt", though this behavior could be implemented in the future if it's desired.
 */
export function mergePaths(oldPath: string, newPath: string): string {
    //In this case there is nothing to do
    if (oldPath === newPath) {
        return oldPath;
    }

    //For sections that are the same, add them as-is to the combined path
    //The min check is not necessary but it's a sanity/safety check
    const oldPathArray = oldPath.split('/');
    const newPathArray = newPath.split('/');
    let i = 0;
    while (oldPathArray[i] === newPathArray[i] && i < Math.min(oldPathArray.length, newPathArray.length)) {
        i++;
    }

    //If absolutely nothing is similar, don't bother with the curly brackets
    if (i === 0) {
        return `${oldPath} → ${newPath}`;
    }

    //The loop stops when we hit a difference, which means the remainder of both arrays is the difference.
    //We want our new path string to end with "{oldPathEnding -> newPathEnding}""
    const mergedPathArray = [
        ...oldPathArray.slice(0, i),
        `{${oldPathArray.slice(i).join('/')} → ${newPathArray.slice(i).join('/')}}`,
    ];

    //It was convenient to work with an array, but we actually need a string
    return mergedPathArray.join('/');
}

export async function createFileChangesNodes(
    pr: PullRequest,
    allComments: PaginatedComments,
    fileDiffs: FileDiff[],
    tasks: Task[],
    commitRange?: { lhs: string; rhs: string },
): Promise<AbstractBaseNode[]> {
    const allDiffData = await Promise.all(
        fileDiffs.map(async (fileDiff) => {
            const commentsWithTasks = { ...allComments, data: addTasksToCommentHierarchy(allComments.data, tasks) }; //Comments need to be infused with tasks now because they are gathered separately
            return await getArgsForDiffView(
                commentsWithTasks,
                fileDiff,
                pr,
                Container.bitbucketContext.prCommentController,
                commitRange,
            );
        }),
    );

    if (configuration.get<boolean>('bitbucket.explorer.nestFilesEnabled')) {
        //Create a dummy root directory data structure to hold the files
        let rootDirectory: PRDirectory = {
            name: '',
            files: [],
            subdirs: new Map<string, PRDirectory>(),
        };
        allDiffData.forEach((diffData) => createdNestedFileStructure(diffData, rootDirectory));
        flattenFileStructure(rootDirectory);

        //While creating the directory, we actually put all the files/folders inside of a root directory. We now want to go one level in.
        let directoryNodes: DirectoryNode[] = Array.from(
            rootDirectory.subdirs.values(),
            (subdir) => new DirectoryNode(subdir),
        );
        let childNodes: AbstractBaseNode[] = rootDirectory.files.map(
            (diffViewArg) => new PullRequestFilesNode(diffViewArg),
        );
        return childNodes.concat(directoryNodes);
    }

    const result: AbstractBaseNode[] = [];
    result.push(...allDiffData.map((diffData) => new PullRequestFilesNode(diffData)));
    if (allComments.next) {
        result.push(
            new SimpleNode(
                vscode.l10n.t(
                    '{0} All file comments are not shown. This PR has more comments than what is supported by this extension.',
                    '⚠️',
                ),
            ),
        );
    }
    return result;
}

export function createdNestedFileStructure(diffViewData: DiffViewArgs, directory: PRDirectory) {
    const baseName = path.basename(diffViewData.fileDisplayData.fileDisplayName);
    const dirName = path.dirname(diffViewData.fileDisplayData.fileDisplayName);
    //If we just have a file, the dirName will be '.', but we don't want to tuck that in the '.' directory, so there's a ternary operation to deal with that
    const splitFileName = [...(dirName === '.' ? [] : dirName.split('/')), baseName];
    let currentDirectory = directory;
    for (let i = 0; i < splitFileName.length; i++) {
        if (i === splitFileName.length - 1) {
            currentDirectory.files.push(diffViewData); //The last name in the path is the name of the file, so we've reached the end of the file tree
        } else {
            //Traverse the file tree, and if a folder doesn't exist, add it
            if (!currentDirectory.subdirs.has(splitFileName[i])) {
                currentDirectory.subdirs.set(splitFileName[i], {
                    name: splitFileName[i],
                    files: [],
                    subdirs: new Map<string, PRDirectory>(),
                });
            }
            currentDirectory = currentDirectory.subdirs.get(splitFileName[i])!;
        }
    }
}

//Directories that contain only one child which is also a directory should be flattened. E.g A > B > C > D.txt => A/B/C/D.txt
export function flattenFileStructure(directory: PRDirectory) {
    // Keep flattening until there's nothing left to flatten, and only then move on to children.
    // The initial input is a dummy root directory with empty string as the name, which is ignored to maintain it as the root node.
    while (directory.name !== '' && directory.subdirs.size === 1 && directory.files.length === 0) {
        const currentFolderName: string = directory.name;
        const childDirectory = directory.subdirs.values().next().value;
        directory.name = `${currentFolderName}/${childDirectory.name ? childDirectory.name : ''}`;
        directory.subdirs = childDirectory.subdirs;
        directory.files = childDirectory.files;
    }
    for (const [, subdir] of directory.subdirs) {
        flattenFileStructure(subdir);
    }
}
