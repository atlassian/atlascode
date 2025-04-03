import React from 'react';
import Avatar from '@atlaskit/avatar';
import Tooltip from '@atlaskit/tooltip';
import { User } from '../../../bitbucket/model';

function UserAvatar({ user }: { user: User }) {
    const message = user.emailAddress ? `${user.displayName} <${user.emailAddress}>` : user.displayName;
    return (
        <Tooltip content={message}>
            <Avatar name={user.displayName} src={user.avatarUrl} />
        </Tooltip>
    );
}

export default UserAvatar;
