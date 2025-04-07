import Avatar from '@atlaskit/avatar';
import Button, { ButtonProps } from '@atlaskit/button';
import { AsyncSelect, components } from '@atlaskit/select';
import Tooltip from '@atlaskit/tooltip';
import React from 'react';

const UserOption = (props: any) => {
    return (
        <components.Option {...props}>
            <div ref={props.innerRef} style={{ display: 'flex', alignItems: 'center' }}>
                <Avatar
                    size="medium"
                    borderColor="var(--vscode-dropdown-foreground)!important"
                    src={props.data.avatarUrl}
                />
                <Tooltip content={props.data.mention}>
                    <span style={{ marginLeft: '4px' }}>{props.data.displayName}</span>
                </Tooltip>
            </div>
        </components.Option>
    );
};

type State = { isOpen: boolean; value: any };

// PopoutMentionPicker is a modified version of `Popout` example from https://react-select.com/advanced#experimental
export default class PopoutMentionPicker extends React.Component<
    {
        targetButtonProps?: Partial<ButtonProps>;
        targetButtonContent: string;
        targetButtonTooltip: string;
        onUserMentioned: (user: any) => void;
        loadUserOptions: (input: string) => Promise<{ displayName: string; mention: string; avatarUrl?: string }[]>;
    },
    State
> {
    constructor(props: any) {
        super(props);
        this.state = { isOpen: false, value: undefined };
    }

    toggleOpen = () => {
        this.setState((state) => ({ isOpen: !state.isOpen }));
    };

    onSelectChange = (value: any) => {
        this.setState({ value, isOpen: false });
        this.props.onUserMentioned(value);
    };

    render() {
        const { isOpen } = this.state;
        return (
            <Dropdown
                isOpen={isOpen}
                onClose={this.toggleOpen}
                target={
                    <Tooltip content={this.props.targetButtonTooltip}>
                        <Button {...this.props.targetButtonProps} onClick={this.toggleOpen}>
                            {this.props.targetButtonContent}
                        </Button>
                    </Tooltip>
                }
            >
                <AsyncSelect
                    className="ac-select-container"
                    classNamePrefix="ac-select"
                    autoFocus
                    backspaceRemovesValue={false}
                    components={{ Option: UserOption, DropdownIndicator, IndicatorSeparator: null }}
                    menuIsOpen
                    onChange={this.onSelectChange}
                    loadOptions={this.props.loadUserOptions}
                    placeholder="Search..."
                    tabSelectsValue={false}
                    controlShouldRenderValue={false}
                />
            </Dropdown>
        );
    }
}

// styled components

const Menu = (props: any) => {
    const shadow = 'hsla(218, 50%, 10%, 0.1)';
    return (
        <div
            style={{
                backgroundColor: 'white',
                borderRadius: 4,
                boxShadow: `0 0 0 1px ${shadow}, 0 4px 11px ${shadow}`,
                marginTop: 8,
                position: 'absolute',
                zIndex: 2,
                width: '350px',
            }}
            {...props}
        />
    );
};
const Blanket = (props: any) => (
    <div
        style={{
            bottom: 0,
            left: 0,
            top: 0,
            right: 0,
            position: 'fixed',
            zIndex: 1,
        }}
        {...props}
    />
);
const Dropdown = ({ children, isOpen, target, onClose }: any) => (
    <React.Fragment>
        <div style={{ position: 'relative' }}>
            {target}
            {isOpen ? <Menu>{children}</Menu> : null}
            {isOpen ? <Blanket onClick={onClose} /> : null}
        </div>
    </React.Fragment>
);
const Svg = (p: any) => <svg width="24" height="24" viewBox="0 0 24 24" focusable="false" role="presentation" {...p} />;
const DropdownIndicator = () => (
    <div style={{ color: 'gray', height: 24, width: 32 }}>
        <Svg>
            <path
                d="M16.436 15.085l3.94 4.01a1 1 0 0 1-1.425 1.402l-3.938-4.006a7.5 7.5 0 1 1 1.423-1.406zM10.5 16a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11z"
                fill="currentColor"
                fillRule="evenodd"
            />
        </Svg>
    </div>
);
