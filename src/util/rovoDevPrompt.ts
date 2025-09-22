/**
 * Utility functions for building Rovo Dev prompts from Jira issues
 */

/**
 * Removes Jira-specific markup from text to make it readable for Rovo Dev prompts.
 * Converts: +bold text+ → bold text, [~accountid:123:user] → @user, !image.png! → [image attachment]
 */
const cleanJiraMarkup = (text: string): string => {
    return text
        .replace(/\+([^+]+)\+/g, '$1') // Remove bold markup
        .replace(/\[~accountid:[^:]+:([^\]]+)\]/g, '@user') // Replace user mentions with @user
        .replace(/!.*?!/g, '[image attachment]') // Replace image markup with placeholder
        .trim();
};

export const buildRovoDevPrompt = (summary: string, description: string): string => {
    // Clean Jira markup from description if present
    const cleanDescription = description ? cleanJiraMarkup(description) : '';

    return [
        "Let's work on this issue:",
        '',
        'Summary:',
        summary,
        '',
        ...(cleanDescription ? ['Description:', cleanDescription, ''] : []),
        '',
        'Please provide a detailed plan to resolve this issue, including any necessary steps, code snippets, or references to documentation.',
        'Make sure to consider the context of the issue and provide a comprehensive solution.',
        'Feel free to ask for any additional information if needed.',
    ].join('\n');
};
