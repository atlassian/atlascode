import { addComment } from './addComment.spec';
import { assigningFlow } from './assigningFlow.spec';
import { attachFile } from './attachFile.spec';
import { authFlowJira } from './authFlow.spec';
import { checkImageInDescription } from './checkImageInDescription.spec';
import { createIssue } from './createIssue.spec';
import { startWorkFlow } from './startWorkFlow.spec';
import { updateDescription } from './updateDescription.spec';
import { updateIssueStatus } from './updateIssueStatus.spec';
import { updateLabelsFlow } from './updateLabelsFlow.spec';
import { viewCommentWithImage } from './viewCommentWithImage.spec';

export const jiraScenarios = [
    { name: 'Authenticate with Jira', run: authFlowJira },
    { name: 'Create issue', run: createIssue },
    { name: 'Update issue description', run: updateDescription },
    { name: 'Update issue status', run: updateIssueStatus },
    { name: 'Add comment to issue', run: addComment },
    { name: 'View comment with image in issue', run: viewCommentWithImage },
    { name: 'Attach file to issue', run: attachFile },
    { name: 'Assigning issue to myself', run: assigningFlow },
    { name: 'Add and remove existing labels', run: updateLabelsFlow },
    { name: 'Check image in description', run: checkImageInDescription },
    { name: 'Start work on Jira issue', run: startWorkFlow },
    // TODO: add 'Rename issue' scenario after AXON-833 is merged
];
