import Avatar from '@atlaskit/avatar';
import AvatarGroup from '@atlaskit/avatar-group';
import StarIcon from '@atlaskit/icon/glyph/star';
import StarFilledIcon from '@atlaskit/icon/glyph/star-filled';
import { User, Votes } from '@atlassianlabs/jira-pi-common-models';
import * as React from 'react';
import * as l10n from '@vscode/l10n';

type MyState = {
    isLoading: boolean;
};

type MyProps = {
    onClose: () => void;
    onAddVote: (voter: any) => void;
    onRemoveVote: (voter: any) => void;
    votes: Votes;
    currentUser: User;
    allowVoting: boolean;
};

const emptyForm = {
    isLoading: false,
};

export default class VotesForm extends React.Component<MyProps, MyState> {
    constructor(props: any) {
        super(props);
        this.state = {
            ...emptyForm,
        };
    }

    toggleVote = () => {
        if (!this.props.votes.hasVoted) {
            this.handleAddVote(this.props.currentUser);
        } else {
            this.props.onRemoveVote(this.props.currentUser);
            this.setState({ ...emptyForm });
            this.props.onClose();
        }
    };

    handleAddVote = (user: any) => {
        this.props.onAddVote(user);
        this.setState({ ...emptyForm });
        this.props.onClose();
    };

    getEmptyVoters = () => {
        const data = [
            <Avatar size="large" />,
            <Avatar size="large" />,
            <Avatar size="large" />,
            <Avatar size="large" />,
        ];

        return (
            <div>
                <AvatarGroup appearance="stack" data={data} size="large" />
                <span>{l10n.t('No voters yet')}</span>
            </div>
        );
    };

    getStartStop = (): JSX.Element => {
        if (this.props.votes.hasVoted) {
            return (
                <div
                    className="ac-icon-with-text ac-inline-watcher-hover"
                    style={{ cursor: 'pointer' }}
                    onClick={this.toggleVote}
                >
                    <StarFilledIcon label="starfilledicon" size="medium" />
                    <span style={{ marginLeft: '8px' }}>{l10n.t('Remove vote')}</span>
                </div>
            );
        }

        return (
            <div
                className="ac-icon-with-text ac-inline-watcher-hover"
                style={{ cursor: 'pointer' }}
                onClick={this.toggleVote}
            >
                <StarIcon label="staricon" size="medium" />
                <span style={{ marginLeft: '8px' }}>{l10n.t('Vote for this issue')}</span>
            </div>
        );
    };

    getVoters = (): JSX.Element => {
        if (this.props.votes.votes < 1) {
            return this.getEmptyVoters();
        }

        let voterList = this.props.votes.voters.map((voter) => {
            let avatar = voter.avatarUrls && voter.avatarUrls['24x24'] ? voter.avatarUrls['24x24'] : '';
            return (
                <div className="ac-inline-watcher ac-inline-watcher-hover">
                    <Avatar size="small" src={avatar} />
                    <div className="ac-inline-watcher-name">{voter.displayName}</div>
                </div>
            );
        });

        return (
            <div>
                <div className="ac-inline-watcher-list-heading">{l10n.t('voted for this issue')}</div>
                {voterList}
            </div>
        );
    };
    render() {
        return (
            <div className="ac-inline-items-container">
                {this.props.allowVoting && <div className="ac-inline-item">{this.getStartStop()}</div>}
                <div className="ac-inline-item">{this.getVoters()}</div>
            </div>
        );
    }
}
