import Button, { ButtonGroup } from '@atlaskit/button';
import Form, { Field, FormFooter } from '@atlaskit/form';
import Modal, { ModalTransition } from '@atlaskit/modal-dialog';
import { RadioGroup } from '@atlaskit/radio';
import SectionMessage from '@atlaskit/section-message';
import * as React from 'react';

import { LegacyPMFData } from '../../ipc/messaging';
import * as FieldValidators from './fieldValidators';

const q1 = { id: 'q1', question: 'How would you feel if you could no longer use this extension?' };
const q2 = { id: 'q2', question: '(optional) How can we improve this extension for you?' };
const q3 = {
    id: 'q3',
    question: '(optional) What would you use as an alternative if this extension were no longer available?',
};
const q4 = { id: 'q4', question: '(optional) What is the main benefit you receive from this extension?' };

export default class PMFBBanner extends React.Component<
    {
        onPMFVisiblity: (visible: boolean) => void;
        onPMFOpen: () => void;
        onPMFLater: () => void;
        onPMFNever: () => void;
        onPMFSubmit: (data: LegacyPMFData) => void;
    },
    { isOpen: boolean; q1Value: string | undefined }
> {
    constructor(props: any) {
        super(props);
        this.state = { isOpen: false, q1Value: undefined };
    }

    handleOpen = () => {
        this.props.onPMFOpen();
        this.setState({ isOpen: true });
    };
    handleLater = () => {
        this.props.onPMFLater();
        this.props.onPMFVisiblity(false);
        this.setState({ isOpen: false });
    };
    handleNever = () => {
        this.props.onPMFNever();
        this.props.onPMFVisiblity(false);
        this.setState({ isOpen: false });
    };

    handleFeedback = (formData: LegacyPMFData) => {
        this.props.onPMFSubmit(formData);
        this.props.onPMFVisiblity(false);
        this.setState({ isOpen: false });
        return undefined;
    };

    updateQ1 = (val: string): string => {
        this.setState({ q1Value: val });
        return val;
    };

    override render() {
        const { isOpen } = this.state;

        const radioItems = [
            { name: '0', label: 'Very disappointed', value: '0' },
            { name: '1', label: 'Somewhat disappointed', value: '1' },
            { name: '2', label: 'Not disappointed', value: '2' },
        ];

        return (
            <div>
                <SectionMessage appearance="change" title="Take a quick survey to let us know how we're doing">
                    <div>
                        <ButtonGroup>
                            <Button className="ac-button" onClick={this.handleOpen}>
                                Take Survey
                            </Button>
                            <Button className="ac-banner-link-button" appearance="link" onClick={this.handleLater}>
                                Maybe Later
                            </Button>
                            <Button className="ac-banner-link-button" appearance="link" onClick={this.handleNever}>
                                No Thanks
                            </Button>
                        </ButtonGroup>
                    </div>
                </SectionMessage>

                {isOpen && (
                    <ModalTransition>
                        <Modal onClose={this.handleLater} heading="Send Survey" shouldCloseOnEscapePress={false}>
                            <Form name="pmf-collector" onSubmit={this.handleFeedback}>
                                {(frmArgs: any) => {
                                    return (
                                        <form {...frmArgs.formProps}>
                                            <Field
                                                label={q1.question}
                                                isRequired={false}
                                                id="q1"
                                                name="q1"
                                                value={this.state.q1Value}
                                                validate={FieldValidators.validateMultiSelect}
                                            >
                                                {(fieldArgs: any) => {
                                                    return (
                                                        <RadioGroup
                                                            {...fieldArgs.fieldProps}
                                                            options={radioItems}
                                                            onChange={FieldValidators.chain(
                                                                fieldArgs.fieldProps.onChange,
                                                                this.updateQ1,
                                                            )}
                                                        />
                                                    );
                                                }}
                                            </Field>

                                            <Field label={q2.question} isRequired={false} id="q2" name="q2">
                                                {(fieldArgs: any) => {
                                                    return (
                                                        <div>
                                                            <textarea
                                                                {...fieldArgs.fieldProps}
                                                                style={{ width: '100%', display: 'block' }}
                                                                className="ac-textarea"
                                                                rows={3}
                                                            />
                                                        </div>
                                                    );
                                                }}
                                            </Field>

                                            <Field label={q3.question} isRequired={false} id="q3" name="q3">
                                                {(fieldArgs: any) => {
                                                    return (
                                                        <div>
                                                            <textarea
                                                                {...fieldArgs.fieldProps}
                                                                style={{ width: '100%', display: 'block' }}
                                                                className="ac-textarea"
                                                                rows={3}
                                                            />
                                                        </div>
                                                    );
                                                }}
                                            </Field>

                                            <Field label={q4.question} isRequired={false} id="q4" name="q4">
                                                {(fieldArgs: any) => {
                                                    return (
                                                        <div>
                                                            <textarea
                                                                {...fieldArgs.fieldProps}
                                                                style={{ width: '100%', display: 'block' }}
                                                                className="ac-textarea"
                                                                rows={3}
                                                            />
                                                        </div>
                                                    );
                                                }}
                                            </Field>

                                            <FormFooter actions={{}}>
                                                <div
                                                    style={{
                                                        display: 'inline-flex',
                                                        marginRight: '4px',
                                                        marginLeft: '4px;',
                                                    }}
                                                >
                                                    <Button
                                                        type="submit"
                                                        className="ac-button"
                                                        isDisabled={this.state.q1Value === undefined}
                                                    >
                                                        Submit
                                                    </Button>
                                                </div>
                                                <div
                                                    style={{
                                                        display: 'inline-flex',
                                                        marginRight: '4px',
                                                        marginLeft: '4px;',
                                                    }}
                                                >
                                                    <Button className="ac-button" onClick={this.handleLater}>
                                                        Cancel
                                                    </Button>
                                                </div>
                                            </FormFooter>
                                            <div style={{ height: '20px' }} />
                                        </form>
                                    );
                                }}
                            </Form>
                        </Modal>
                    </ModalTransition>
                )}
            </div>
        );
    }
}
