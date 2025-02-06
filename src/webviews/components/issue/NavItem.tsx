import * as React from 'react';
import Button from '@atlaskit/button';
import Tooltip from '@atlaskit/tooltip';
import CopyIcon from '@atlaskit/icon/glyph/copy';
import * as l10n from '@vscode/l10n';

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
                            <Tooltip content={l10n.t('Copy the web link to clipboard')}>
                                <CopyIcon label={l10n.t('copy issue link')} size="small" />
                            </Tooltip>
                        </div>
                    )}
                </div>
            </div>
        );
    }
}
