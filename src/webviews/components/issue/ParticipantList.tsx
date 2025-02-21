import Avatar from '@atlaskit/avatar';
import * as React from 'react';

type Props = {
    users: any[];
};

type State = {};

export class ParticipantList extends React.Component<Props, State> {
    constructor(props: any) {
        super(props);
    }

    userList(): any[] {
        const result: any[] = [];
        if (Array.isArray(this.props.users)) {
            // depending on GDPR settings, the user list could be strings or user objects :facepalm:
            this.props.users.forEach((user: any) => {
                if (typeof user === 'string') {
                    result.push(<div>{user}</div>);
                } else if (user.displayName) {
                    const avatar = user.avatarUrls && user.avatarUrls['24x24'] ? user.avatarUrls['24x24'] : '';
                    result.push(
                        <div className="ac-inline-watcher">
                            <Avatar size="small" src={avatar} />
                            <div className="ac-inline-watcher-name">{user.displayName}</div>
                        </div>,
                    );
                }
            });
        }

        return result;
    }

    render() {
        return <React.Fragment>{this.userList()}</React.Fragment>;
    }
}
