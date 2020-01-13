import Button, { ButtonGroup } from "@atlaskit/button";
import TrashIcon from '@atlaskit/icon/glyph/trash';
import Tooltip from '@atlaskit/tooltip';
import debounce from "lodash.debounce";
import React from "react";

type changeObject = { [key: string]: any };
const defaultSites = ['http://atlassian.com', 'https://bitbucket.org'];

export default class URLPingList extends React.Component<
    {
        onConfigChange: (changes: changeObject, removes?: string[]) => void,
        optionsConfig: string,
        enabledDescription: string,
        promptString: string,
        options: string[]
    }, {
        options: string[]
    }> {

    constructor(props: any) {
        super(props);
        this.state = { options: props.options };
    }

    componentWillReceiveProps(props: any) {
        if (this.state.options.length === 0) {
            this.setState({ options: props.options });
        }
    }

    private htmlForOption(option: string, index: number) {
        return (
            <div id="multi-option-row" key={index}>
                <input className='ac-inputField-inline'
                    id="multi-option-input"
                    name="multi-option-option"
                    type="string"
                    value={option}
                    onChange={(e: any) => this.handleOptionChange(e.target.value, index)} 
                />
                <ButtonGroup>
                    <Tooltip content="Delete">
                        <Button
                            className="ac-button"
                            isDisabled={this.state.options.length <= 1}
                            iconBefore={<TrashIcon label="delete" />}
                            onClick={() => {
                                this.deleteOption(index);
                            }}
                        />
                    </Tooltip>
                </ButtonGroup>
            </div>
        );
    }

    handleOptionChange = (option: string, index: number) => {
        const options = [...this.state.options];
        options[index] = option;
        this.setState({ options: options });
        this.publishChanges();
    };

    deleteOption = (index: number) => {
        if(this.state.options.length > 1) {
            const options = [...this.state.options];
            options.splice(index, 1);
            this.setState({ options: options });
            this.publishChanges();
        }
    };

    publishChanges = debounce(() => {
        const options = this.state.options;
        const changes = Object.create(null);
        changes[this.props.optionsConfig] = options;
        if (this.props.onConfigChange) {
            this.props.onConfigChange(changes);
        }
    }, 400);

    onNewOption = () => {
        const options = [...this.state.options];
        options.push('');
        this.setState({ options: options });
        this.publishChanges();
    };
    
    restoreDefaultSites = () => {
        this.setState({ options: defaultSites });
    };

    render() {
        const options = this.state.options;
        return (
            <React.Fragment>
                <div>
                    {options.map((option: string, index: number) => {
                        return this.htmlForOption(option, index);
                    })}
                </div>
                <Button style={{marginRight: '5px'}} className="ac-button" onClick={this.onNewOption}>
                    {this.props.promptString}
                </Button>
                <Button className="ac-button" onClick={this.restoreDefaultSites}>
                    {'Restore Default Sites'}
                </Button>
            </React.Fragment>
        );
    }
}