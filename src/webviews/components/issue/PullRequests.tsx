import Avatar from '@atlaskit/avatar';
import Button from '@atlaskit/button';
import Lozenge from '@atlaskit/lozenge';
import React from 'react';
import { PullRequestData } from '../../../bitbucket/model';
import * as l10n from '@vscode/l10n';

export default class PullRequests extends React.Component<
    {
        pullRequests: PullRequestData[];
        onClick: (pr: any) => any;
    },
    {}
> {
    private avatar(pr: PullRequestData): any {
        const url = pr.author.avatarUrl;
        if (url) {
            return <Avatar src={url} size="small" />;
        }
        return <div />;
    }

    private prState(pr: any): any {
        switch (pr.state) {
            case 'MERGED':
                return <Lozenge appearance="success">{l10n.t('Merged')}</Lozenge>;
            case 'SUPERSEDED':
                return <Lozenge appearance="moved">{l10n.t('Superseded')}</Lozenge>;
            case 'OPEN':
                return <Lozenge appearance="inprogress">{l10n.t('Open')}</Lozenge>;
            case 'DECLINED':
                return <Lozenge appearance="removed">{l10n.t('Declined')}</Lozenge>;
            default:
                return <div />;
        }
    }

    render() {
        return this.props.pullRequests.map((pr: PullRequestData) => {
            return (
                <div key={pr.url} style={{ display: 'flex', alignItems: 'center' }}>
                    {this.avatar(pr)}
                    <Button appearance="link" onClick={() => this.props.onClick(pr)}>{`${
                        pr.destination!.repo!.displayName
                    } - Pull request #${pr.id}`}</Button>
                    {this.prState(pr)}
                </div>
            );
        });
    }
}
