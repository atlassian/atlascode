import SectionMessage from '@atlaskit/section-message';
import { isErrorCollection, isErrorWithMessages } from '@atlassianlabs/jira-pi-common-models';
import * as React from 'react';
import * as l10n from '@vscode/l10n';

export default class ErrorBanner extends React.Component<
    { errorDetails: any; onDismissError: () => void },
    { errorDetails: any }
> {
    constructor(props: any) {
        super(props);
        this.state = {
            errorDetails: this.props.errorDetails,
        };
    }

    componentWillReceiveProps(nextProps: any) {
        this.setState({
            errorDetails: nextProps.errorDetails,
        });
    }

    render() {
        let errorMarkup = [];
        if (isErrorCollection(this.state.errorDetails)) {
            Object.keys(this.state.errorDetails.errors).forEach((key) => {
                errorMarkup.push(
                    <p className="force-wrap">
                        <b>{key}:</b>
                        <span className="force-wrap" style={{ marginLeft: '5px' }}>
                            {this.state.errorDetails.errors[key]}
                        </span>
                    </p>,
                );
            });

            this.state.errorDetails.errorMessages.forEach((msg) => {
                errorMarkup.push(
                    <p className="force-wrap">
                        <span className="force-wrap" style={{ marginLeft: '5px' }}>
                            {msg}
                        </span>
                    </p>,
                );
            });
        } else if (isErrorWithMessages(this.state.errorDetails)) {
            this.state.errorDetails.errorMessages.forEach((msg) => {
                errorMarkup.push(
                    <p className="force-wrap">
                        <span className="force-wrap" style={{ marginLeft: '5px' }}>
                            {msg}
                        </span>
                    </p>,
                );
            });
        } else if (typeof this.state.errorDetails === 'object') {
            Object.keys(this.state.errorDetails).forEach((key) => {
                errorMarkup.push(
                    <p className="force-wrap">
                        <b>{key}:</b>
                        <span className="force-wrap" style={{ marginLeft: '5px' }}>
                            {JSON.stringify(this.state.errorDetails[key])}
                        </span>
                    </p>,
                );
            });
        } else {
            errorMarkup.push(<p className="force-wrap">{this.state.errorDetails}</p>);
        }

        const title: string = this.state.errorDetails.title
            ? this.state.errorDetails.title
            : l10n.t('Something went wrong');
        return (
            <SectionMessage appearance="warning" title={title}>
                <div>{errorMarkup}</div>
                <button
                    onClick={() => {
                        this.setState({ errorDetails: undefined });
                        this.props.onDismissError();
                    }}
                >
                    {l10n.t('Dismiss')}
                </button>
            </SectionMessage>
        );
    }
}
