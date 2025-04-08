import Button from '@atlaskit/button';
import CopyIcon from '@atlaskit/icon/glyph/copy';
import Tooltip from '@atlaskit/tooltip';
import * as React from 'react';

export default class NavItem extends React.Component<
    {
        text: string;
        href?: string;
        iconUrl?: string;
        onItemClick?: () => void;
        onCopy?: () => void;
    },
    {}
> {
    render() {
        return (
            <div className="ac-icon-with-text">
                {this.props.iconUrl && <img style={{ paddingRight: '5px' }} src={this.props.iconUrl} />}
                <div className="jira-issue-key">
                    <Button
                        className="ac-link-button"
                        appearance="link"
                        spacing="none"
                        href={this.props.href}
                        onClick={this.props.onItemClick}
                    >
                        {this.props.text}
                    </Button>
                    {this.props.onCopy && (
                        <div className="jira-issue-copy-icon" onClick={this.props.onCopy}>
                            <Tooltip content="Copy the web link to clipboard">
                                <CopyIcon label="copy issue link" size="small" />
                            </Tooltip>
                        </div>
                    )}
                </div>
            </div>
        );
    }
}
