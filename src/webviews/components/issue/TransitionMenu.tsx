import Lozenge from '@atlaskit/lozenge';
import Select, { components } from '@atlaskit/select';
import { emptyTransition, Status, Transition } from '@atlassianlabs/jira-pi-common-models';
import * as React from 'react';

import { colorToLozengeAppearanceMap } from '../colors';

const { Option } = components;

const StatusOption = (props: any) => (
    <Option {...props}>
        <Lozenge appearance={colorToLozengeAppearanceMap[props.data.to.statusCategory.colorName]}>
            {props.data.to.name}
        </Lozenge>
    </Option>
);

const StatusOptionWithTransitionName = (props: any) => (
    <Option {...props}>
        {`${props.data.name} → `}
        <Lozenge appearance={colorToLozengeAppearanceMap[props.data.to.statusCategory.colorName]}>
            {props.data.to.name}
        </Lozenge>
    </Option>
);

const StatusValue = (props: any) => (
    <components.SingleValue {...props}>
        <Lozenge appearance={colorToLozengeAppearanceMap[props.data.to.statusCategory.colorName]}>
            {props.data.to.name}
        </Lozenge>
    </components.SingleValue>
);

type Props = {
    transitions: Transition[];
    currentStatus: Status;
    isStatusButtonLoading: boolean;
    onStatusChange: (item: Transition) => void;
};

type State = {
    selectedTransition: Transition | undefined;
    showTransitionName: boolean;
};

export class TransitionMenu extends React.Component<Props, State> {
    constructor(props: any) {
        super(props);
        const selectedTransition = this.getCurrentTransition(props.currentStatus, props.transitions);
        this.state = {
            selectedTransition: selectedTransition,
            showTransitionName: this.shouldShowTransitionName(props.transitions),
        };
    }

    override componentWillReceiveProps(nextProps: any) {
        const selectedTransition = this.getCurrentTransition(nextProps.currentStatus, nextProps.transitions);
        this.setState({
            selectedTransition: selectedTransition,
            showTransitionName: this.shouldShowTransitionName(nextProps.transitions),
        });
    }

    // The transition list may not include the transition corresponding to current status.
    // Create a dummy transition for current status in that case.
    private getCurrentTransition(currentStatus: Status, transitions: Transition[]): Transition {
        const selectedTransition = transitions.find((transition: Transition) => transition.to.id === currentStatus.id);
        if (selectedTransition !== undefined) {
            return selectedTransition;
        }

        return { ...emptyTransition, to: currentStatus };
    }

    private shouldShowTransitionName(transitions: Transition[]) {
        return transitions.some((t) => t.name !== t.to.name);
    }

    handleStatusChange = (item: Transition) => {
        this.props.onStatusChange(item);
    };

    override render() {
        if (!Array.isArray(this.props.transitions) || this.props.transitions.length < 1) {
            return <div />;
        }

        return (
            <Select
                name="status"
                id="status"
                className="ac-select-container"
                classNamePrefix="ac-select"
                options={this.props.transitions}
                value={this.state.selectedTransition}
                components={{
                    Option: this.state.showTransitionName ? StatusOptionWithTransitionName : StatusOption,
                    SingleValue: StatusValue,
                }}
                getOptionLabel={(option: Transition) => option.to.name}
                getOptionValue={(option: Transition) => option.id}
                isDisabled={this.props.isStatusButtonLoading}
                isLoading={this.props.isStatusButtonLoading}
                onChange={this.handleStatusChange}
            />
        );
    }
}
