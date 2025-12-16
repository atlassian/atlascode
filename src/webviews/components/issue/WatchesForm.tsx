import Avatar from '@atlaskit/avatar';
import AvatarGroup from '@atlaskit/avatar-group';
import EyeOpenIcon from '@atlaskit/icon/core/eye-open';
import EyeOpenFilledIcon from '@atlaskit/icon/core/eye-open-filled';
import { AsyncSelect } from '@atlaskit/select';
import { User, Watches } from '@atlassianlabs/jira-pi-common-models';
import { ValueType } from '@atlassianlabs/jira-pi-meta-models';
import debounce from 'lodash.debounce';
import * as React from 'react';

import * as SelectFieldHelper from '../selectFieldHelper';

type MyState = {
    isLoading: boolean;
};

type MyProps = {
    onFetchUsers: (data: string) => Promise<any[]>;
    onClose: () => void;
    onAddWatcher: (watcher: any) => void;
    onRemoveWatcher: (watcher: any) => void;
    watches: Watches;
    currentUser: User;
};

const emptyForm = {
    isLoading: false,
};

export default class WatchesForm extends React.Component<MyProps, MyState> {
    constructor(props: any) {
        super(props);
        this.state = {
            ...emptyForm,
        };
    }

    toggleWatching = () => {
        if (!this.props.watches.isWatching) {
            this.handleAddWatcher(this.props.currentUser);
        } else {
            this.props.onRemoveWatcher(this.props.currentUser);
            this.setState({ ...emptyForm });
            this.props.onClose();
        }
    };

    handleAddWatcher = (user: any) => {
        this.props.onAddWatcher(user);
        this.setState({ ...emptyForm });
        this.props.onClose();
    };

    getEmptyWatchers = () => {
        const data = [
            <Avatar size="large" />,
            <Avatar size="large" />,
            <Avatar size="large" />,
            <Avatar size="large" />,
        ];

        return (
            <div>
                <AvatarGroup appearance="stack" data={data} size="large" />
                <span>No watchers yet</span>
            </div>
        );
    };

    getStartStop = (): JSX.Element => {
        if (this.props.watches.isWatching) {
            return (
                <div
                    className="ac-icon-with-text ac-inline-watcher-hover"
                    style={{ cursor: 'pointer' }}
                    onClick={this.toggleWatching}
                >
                    <EyeOpenFilledIcon label="watchfilledicon" size="medium" />
                    <span style={{ marginLeft: '8px' }}>Stop watching</span>
                </div>
            );
        }

        return (
            <div
                className="ac-icon-with-text ac-inline-watcher-hover"
                style={{ cursor: 'pointer' }}
                onClick={this.toggleWatching}
            >
                <EyeOpenIcon label="watchicon" size="medium" />
                <span style={{ marginLeft: '8px' }}>Start watching</span>
            </div>
        );
    };

    getWatchers = (): JSX.Element => {
        if (this.props.watches.watchCount < 1) {
            return this.getEmptyWatchers();
        }

        const watcherList = this.props.watches.watchers.map((watcher, index) => {
            const avatar = watcher.avatarUrls && watcher.avatarUrls['48x48'] ? watcher.avatarUrls['48x48'] : '';
            return (
                <div key={index} className="ac-inline-watcher ac-inline-watcher-hover">
                    <Avatar size="small" src={avatar} />
                    <div className="ac-inline-watcher-name">{watcher.displayName}</div>
                    <div className="ac-inline-watcher-delete" onClick={() => this.props.onRemoveWatcher(watcher)}></div>
                </div>
            );
        });

        return (
            <div>
                <div className="ac-inline-watcher-list-heading">watching this issue</div>
                {watcherList}
            </div>
        );
    };

    override render() {
        const commonSelectProps: any = {
            isMulti: false,
            className: 'ac-select-container',
            classNamePrefix: 'ac-select',
            getOptionLabel: SelectFieldHelper.labelFuncForValueType(ValueType.User),
            getOptionValue: SelectFieldHelper.valueFuncForValueType(ValueType.User),
            components: SelectFieldHelper.getComponentsForValueType(ValueType.User),
            placeholder: 'Add watchers',
        };

        return (
            <div className="ac-inline-items-container">
                <div className="ac-inline-item">{this.getStartStop()}</div>
                <div className="ac-inline-item">{this.getWatchers()}</div>
                <div className="ac-inline-item">
                    <AsyncSelect
                        {...commonSelectProps}
                        isLoading={this.state.isLoading}
                        onChange={debounce(this.handleAddWatcher, 100)} //https://github.com/JedWatson/react-select/issues/2326
                        loadOptions={this.props.onFetchUsers}
                    />
                </div>
            </div>
        );
    }
}
