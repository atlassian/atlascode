import './JiraWorkItem.css';

import * as React from 'react';

export interface JiraWorkItemProps {
    issueKey: string;
    summary: string;
    issueTypeIconUrl?: string;
    issueTypeName?: string;
    onClick: () => void;
}

/**
 * Handles Jira issue type icons with proper error handling.
 *
 * Problem: Icons often return 401/403 errors
 * Solution: onError handler + transparent placeholder -> clean console + consistent spacing
 */

export const JiraWorkItem: React.FC<JiraWorkItemProps> = ({
    issueKey,
    summary,
    issueTypeIconUrl,
    issueTypeName,
    onClick,
}) => {
    const [hasImageError, setHasImageError] = React.useState(false);

    // Check if this is a broken image placeholder
    const isBrokenImage = issueTypeIconUrl === 'images/no-image.svg';

    const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
        // Prevent the error from bubbling up to avoid console spam
        e.preventDefault();
        setHasImageError(true);
    };

    // Reset error state when URL changes
    React.useEffect(() => {
        setHasImageError(false);
    }, [issueTypeIconUrl]);

    const displayText = `${issueKey}: ${summary}`;

    return (
        <div className="jira-work-item" onClick={onClick} title={displayText}>
            {isBrokenImage || hasImageError ? (
                // Show transparent placeholder to maintain layout
                <div className="jira-work-item-icon" />
            ) : (
                issueTypeIconUrl && (
                    <img
                        src={issueTypeIconUrl}
                        alt={issueTypeName || 'Issue type'}
                        className="jira-work-item-icon"
                        onError={handleImageError}
                    />
                )
            )}
            <div className="jira-work-item-summary">{displayText}</div>
        </div>
    );
};
