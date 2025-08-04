import Button from '@atlaskit/button';
import Lozenge from '@atlaskit/lozenge';
import Tooltip from '@atlaskit/tooltip';
import React from 'react';

import { PullRequestData } from '../../../bitbucket/model';

export default class PullRequests extends React.Component<
    {
        pullRequests: PullRequestData[];
        onClick: (pr: any) => any;
    },
    {}
> {
    private prState(pr: any): any {
        switch (pr.state) {
            case 'MERGED':
                return <Lozenge appearance="success">Merged</Lozenge>;
            case 'SUPERSEDED':
                return <Lozenge appearance="moved">Superseded</Lozenge>;
            case 'OPEN':
                return <Lozenge appearance="inprogress">Open</Lozenge>;
            case 'DECLINED':
                return <Lozenge appearance="removed">Declined</Lozenge>;
            default:
                return <div />;
        }
    }

    override render() {
        return this.props.pullRequests.map((pr: PullRequestData) => {
            const title = `${pr.destination!.repo!.displayName} - Pull request #${pr.id}`;
            return (
                <Tooltip content={`${pr.author.displayName}: ${title}`}>
                    <div key={pr.url} style={{ display: 'flex', alignItems: 'center' }}>
                        <div style={{ maxLines: 1, textOverflow: 'ellipsis', overflow: 'auto' }}>
                            <Button appearance="link" onClick={() => this.props.onClick(pr)}>
                                {title}
                            </Button>
                        </div>
                        <div style={{ overflow: 'visible' }}>{this.prState(pr)}</div>
                    </div>
                </Tooltip>
            );
        });
    }
}
