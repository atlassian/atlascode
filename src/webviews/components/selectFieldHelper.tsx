import Avatar from '@atlaskit/avatar';
import Lozenge from '@atlaskit/lozenge';
import { components } from '@atlaskit/select';
import { SelectFieldUI, ValueType } from '@atlassianlabs/jira-pi-meta-models';
import * as React from 'react';
import { colorToLozengeAppearanceMap } from './colors';

type OptionFunc = (option: any) => string;
type ComponentFunc = (props: any) => JSX.Element;

const returnOptionOrValueFunc = (option: any): any => {
    let value: any = '';
    if (typeof option === 'object') {
        if (option.value) {
            value = option.value;
        } else {
            value = JSON.stringify(option);
        }
    } else if (typeof option === 'string') {
        value = option;
    } else if (typeof option === 'number') {
        value = '' + option;
    }

    return value;
};

const returnValueOrNameFunc = (option: any) => {
    let value: string = '';
    if (option.value) {
        value = option.value;
    } else if (option.name) {
        value = option.name;
    } else {
        value = JSON.stringify(option);
    }
    return value;
};

const returnOptionOrLabelFunc = (option: any) => {
    let value: string = '';
    if (typeof option === 'object') {
        if (option.label) {
            value = option.label;
        } else {
            value = JSON.stringify(option);
        }
    } else if (typeof option === 'string') {
        value = option;
    }
    return value;
};
const returnIdFunc = (option: any) => {
    return option.id;
};
const returnNameFunc = (option: any) => {
    return option.label ? option.label : option.name;
};
const returnValueFunc = (option: any) => {
    return option.value;
};
const returnDisplayNameFunc = (option: any) => {
    return option.label ? option.label : option.displayName;
};
const returnAccountIdFunc = (option: any) => {
    return option.accountId;
};

const IconOption = (props: any) => {
    return (
        <components.Option {...props}>
            <div ref={props.innerRef} {...props.innerProps} className="ac-flex">
                {' '}
                <img src={props.data.iconUrl} width="24" height="24" />{' '}
                <span style={{ marginLeft: '10px' }}> {props.label} </span>
            </div>
        </components.Option>
    );
};

const SingleIconValue = (props: any) => {
    let label: string = '';
    if (props.data.name) {
        label = props.data.name;
    }
    if (props.data.value) {
        label = props.data.value;
    }
    if (typeof props.data === 'string') {
        label = props.data;
    }

    return (
        <components.SingleValue {...props}>
            <div className="ac-flex">
                <img src={props.data.iconUrl} width="16" height="16" />
                <span style={{ marginLeft: '10px' }}>{label}</span>
            </div>
        </components.SingleValue>
    );
};

const MultiIconValue = (props: any) => {
    let label: string = '';
    if (props.data.name) {
        label = props.data.name;
    }
    if (props.data.value) {
        label = props.data.value;
    }
    if (typeof props.data === 'string') {
        label = props.data;
    }

    return (
        <components.MultiValueLabel {...props}>
            <div className="ac-flex">
                <img src={props.data.iconUrl} width="16" height="16" />
                <span style={{ marginLeft: '10px' }}>{label}</span>
            </div>
        </components.MultiValueLabel>
    );
};

const AvatarOption = (props: any) => {
    let avatar = props.data.avatarUrls && props.data.avatarUrls['24x24'] ? props.data.avatarUrls['24x24'] : '';
    return (
        <components.Option {...props}>
            <div ref={props.innerRef} {...props.innerProps} className="ac-flex">
                <Avatar size="medium" borderColor="var(--vscode-dropdown-foreground)!important" src={avatar} />
                <span style={{ marginLeft: '4px' }}>{props.label}</span>
            </div>
        </components.Option>
    );
};

const SingleAvatarValue = (props: any) => {
    let label: string = '';
    if (props.data.name) {
        label = props.data.name;
    }
    if (props.data.displayName) {
        label = props.data.displayName;
    }
    if (typeof props.data === 'string') {
        label = props.data;
    }
    let avatar = props.data.avatarUrls && props.data.avatarUrls['24x24'] ? props.data.avatarUrls['24x24'] : '';
    return (
        <components.SingleValue {...props}>
            <div ref={props.innerRef} {...props.innerProps} className="ac-flex">
                <Avatar size="small" borderColor="var(--vscode-dropdown-foreground)!important" src={avatar} />
                <span style={{ marginLeft: '4px' }}>{label}</span>
            </div>
        </components.SingleValue>
    );
};

const MultiAvatarValue = (props: any) => {
    let label: string = '';
    if (props.data.name) {
        label = props.data.name;
    }
    if (props.data.displayName) {
        label = props.data.displayName;
    }
    if (typeof props.data === 'string') {
        label = props.data;
    }

    let avatar = props.data.avatarUrls && props.data.avatarUrls['24x24'] ? props.data.avatarUrls['24x24'] : '';
    return (
        <components.MultiValueLabel {...props}>
            <div ref={props.innerRef} {...props.innerProps} className="ac-flex">
                <Avatar size="small" borderColor="var(--vscode-dropdown-foreground)!important" src={avatar} />
                <span style={{ marginLeft: '4px' }}>{label}</span>
            </div>
        </components.MultiValueLabel>
    );
};

const LabelOption = (props: any) => {
    let label: string = '';
    if (typeof props.label === 'object') {
        if (props.label.label) {
            label = props.label.label;
        } else if (props.label.value) {
            label = props.label.value;
        }
    } else if (typeof props.label === 'string') {
        label = props.label;
    }

    return (
        <components.Option {...props}>
            <div ref={props.innerRef} {...props.innerProps} dangerouslySetInnerHTML={{ __html: label }} />
        </components.Option>
    );
};

const LabelValue = (props: any) => {
    let value: string = '';
    if (typeof props.data === 'string') {
        value = props.data;
    }

    if (typeof props.data === 'object') {
        if (props.data.name) {
            value = props.data.name;
        } else if (props.data.displayName) {
            value = props.data.displayName;
        } else if (props.data.label) {
            value = props.data.label;
        } else if (props.data.value) {
            value = props.data.value;
        }
    } else if (typeof props.data === 'string') {
        value = props.data;
    } else if (typeof props.data === 'number') {
        value = '' + props.data;
    } else {
        value = JSON.stringify(props.data);
    }

    value = value.replace(/<b>/g, '').replace(/<\/b>/g, '');
    return (
        <components.SingleValue {...props}>
            <div ref={props.innerRef} {...props.innerProps}>
                {value}
            </div>
        </components.SingleValue>
    );
};

const MultiLabelValue = (props: any) => {
    let value: string = '';
    if (typeof props.data === 'object') {
        if (props.data.name) {
            value = props.data.name;
        } else if (props.data.displayName) {
            value = props.data.displayName;
        } else if (props.data.label) {
            value = props.data.label;
        } else if (props.data.value) {
            value = props.data.value;
        }
    } else if (typeof props.data === 'string') {
        value = props.data;
    } else if (typeof props.data === 'number') {
        value = '' + props.data;
    } else {
        value = JSON.stringify(props.data);
    }
    value = value.replace(/<b>/g, '').replace(/<\/b>/g, '');
    return (
        <components.MultiValueLabel {...props}>
            <div ref={props.innerRef} {...props.innerProps}>
                {value}
            </div>
        </components.MultiValueLabel>
    );
};

const StatusOption = (props: any) => {
    const lozColor: string = colorToLozengeAppearanceMap[props.data.to.statusCategory.colorName];
    return (
        <components.Option {...props}>
            <Lozenge appearance={lozColor}>{props.label}</Lozenge>
        </components.Option>
    );
};

const StatusValue = (props: any) => {
    const lozColor: string = colorToLozengeAppearanceMap[props.data.to.statusCategory.colorName];
    return (
        <components.SingleValue {...props}>
            <Lozenge appearance={lozColor}>{props.data.to.name}</Lozenge>
        </components.SingleValue>
    );
};

const IssueLinkTypeOption = (props: any) => (
    <components.Option {...props}>
        <div ref={props.innerRef} {...props.innerProps} className="ac-flex">
            <span style={{ marginLeft: '10px' }}>{props.label}</span>
        </div>
    </components.Option>
);

const IssueLinkTypeValue = (props: any) => (
    <components.SingleValue {...props}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ marginLeft: '10px' }}>{props.data.name}</span>
        </div>
    </components.SingleValue>
);

export const IssueSuggestionOption = (props: any) => (
    <components.Option {...props}>
        <div ref={props.innerRef} {...props.innerProps} className="ac-flex">
            <span style={{ marginLeft: '10px' }}>{props.data.key}</span>
            <span style={{ marginLeft: '1em' }}>{props.data.summaryText}</span>
        </div>
    </components.Option>
);

export const IssueSuggestionValue = (props: any) => (
    <components.SingleValue {...props}>
        <div ref={props.innerRef} {...props.innerProps} className="ac-flex">
            <span style={{ marginLeft: '4px' }}>{props.data.key}</span>
            <span style={{ marginLeft: '4px', marginRight: '4px' }}>{props.data.summaryText}</span>
        </div>
    </components.SingleValue>
);

export enum SelectComponentType {
    Select = 'select',
    Creatable = 'creatable',
    Async = 'async',
    AsyncCreatable = 'asynccreatable',
}

export function selectComponentType(field: SelectFieldUI): SelectComponentType {
    if (field.isCreateable && field.autoCompleteUrl.trim() !== '') {
        return SelectComponentType.AsyncCreatable;
    }

    if (field.isCreateable) {
        return SelectComponentType.Creatable;
    }

    if (field.autoCompleteUrl.trim() !== '') {
        return SelectComponentType.Async;
    }

    return SelectComponentType.Select;
}

export function labelFuncForValueType(vt: ValueType): OptionFunc {
    switch (vt) {
        case ValueType.Number:
        case ValueType.String: {
            return returnOptionOrLabelFunc;
        }
        case ValueType.IssueLinks:
        case ValueType.Component:
        case ValueType.Version:
        case ValueType.Project:
        case ValueType.IssueType:
        case ValueType.Transition:
        case ValueType.Priority: {
            return returnNameFunc;
        }

        case ValueType.Option: {
            return returnValueFunc;
        }

        case ValueType.User:
        case ValueType.Watches: {
            return returnDisplayNameFunc;
        }

        default: {
            return returnOptionOrLabelFunc;
        }
    }
}

export function valueFuncForValueType(vt: ValueType): OptionFunc {
    switch (vt) {
        case ValueType.Number:
        case ValueType.String: {
            return returnOptionOrValueFunc;
        }
        case ValueType.Component:
        case ValueType.Version:
        case ValueType.Project:
        case ValueType.IssueType:
        case ValueType.Priority:
        case ValueType.Transition:
        case ValueType.Option: {
            return returnIdFunc;
        }

        case ValueType.IssueLinks: {
            return returnNameFunc;
        }

        case ValueType.Group: {
            return returnValueOrNameFunc;
        }

        case ValueType.User:
        case ValueType.Watches: {
            return returnAccountIdFunc;
        }

        default: {
            return returnOptionOrValueFunc;
        }
    }
}

export function getComponentsForValueType(vt: ValueType): Object {
    return {
        ...{ Option: getOptionComponentForValueType(vt) },
        ...getValueComponentForValueType(vt),
    };
}

function getOptionComponentForValueType(vt: ValueType): ComponentFunc {
    switch (vt) {
        case ValueType.Priority:
        case ValueType.IssueType: {
            return IconOption;
        }

        case ValueType.Project:
        case ValueType.User:
        case ValueType.Watches: {
            return AvatarOption;
        }

        case ValueType.Transition: {
            return StatusOption;
        }

        case ValueType.IssueLinks: {
            return IssueLinkTypeOption;
        }

        default: {
            return LabelOption;
        }
    }
}

function getValueComponentForValueType(vt: ValueType): Object {
    switch (vt) {
        case ValueType.Priority:
        case ValueType.IssueType: {
            return {
                SingleValue: SingleIconValue,
                MultiValueLabel: MultiIconValue,
            };
        }

        case ValueType.Project:
        case ValueType.User:
        case ValueType.Watches: {
            return {
                SingleValue: SingleAvatarValue,
                MultiValueLabel: MultiAvatarValue,
            };
        }

        case ValueType.Transition: {
            return {
                SingleValue: StatusValue,
            };
        }

        case ValueType.IssueLinks: {
            return {
                SingleValue: IssueLinkTypeValue,
            };
        }

        default: {
            return {
                SingleValue: LabelValue,
                MultiValueLabel: MultiLabelValue,
            };
        }
    }
}
