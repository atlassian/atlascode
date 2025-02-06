import Button from '@atlaskit/button';
import { Checkbox } from '@atlaskit/checkbox';
import { DateTimePicker } from '@atlaskit/datetime-picker';
import Form, { CheckboxField, ErrorMessage, Field, FormFooter, HelperMessage } from '@atlaskit/form';
import { format } from 'date-fns';
import * as React from 'react';
import { WorklogData } from '../../../ipc/issueActions';
import * as FieldValidators from '../fieldValidators';
import * as l10n from '@vscode/l10n';

type MyState = {
    comment: string;
    started: string;
    timeSpent: string;
    newEstimate: string;
    autoAdjust: boolean;
    savingDisabled: boolean;
};

type MyProps = {
    onSave: (data: any) => void;
    onCancel: () => void;
    originalEstimate: string;
};

const emptyForm = {
    comment: '',
    started: '',
    timeSpent: '',
    newEstimate: '',
    autoAdjust: true,
};

const formatString = "yyyy-MM-dd'T'HH:mm:ss.SSSXX";

export default class WorklogForm extends React.Component<MyProps, MyState> {
    constructor(props: any) {
        super(props);
        this.state = {
            ...emptyForm,
            savingDisabled: true,
            started: format(Date.now(), formatString),
        };
    }

    handleClose = () => {
        this.setState({ ...emptyForm });
        this.props.onCancel();
    };

    disableSaving = (): boolean => {
        return (
            this.state.started === '' ||
            this.state.timeSpent.trim() === '' ||
            (!this.state.autoAdjust && this.state.newEstimate.trim() === '')
        );
    };

    handleSave = (formData: any) => {
        const worklog: WorklogData = {
            comment: formData.comment,
            started: format(new Date(formData.started), formatString),
            timeSpent: formData.timeSpent,
            adjustEstimate: formData.newEstimate && formData.newEstimate !== '' ? 'new' : 'auto',
            newEstimate: formData.newEstimate,
        };

        if (this.props.onSave) {
            this.props.onSave(worklog);
        }

        this.handleClose();
    };

    render() {
        const defaultDate = this.state.started.trim() !== '' ? this.state.started : format(Date.now(), formatString);
        return (
            <div>
                <Form name="worklog-form" onSubmit={this.handleSave}>
                    {(frmArgs: any) => {
                        return (
                            <form {...frmArgs.formProps}>
                                <Field
                                    label={l10n.t('Description')}
                                    isRequired={false}
                                    id="comment"
                                    name="comment"
                                    defaultValue={this.state.comment}
                                >
                                    {(fieldArgs: any) => {
                                        return (
                                            <textarea
                                                {...fieldArgs.fieldProps}
                                                style={{ width: '100%', display: 'block' }}
                                                className="ac-textarea"
                                                rows={3}
                                                onChange={FieldValidators.chain(
                                                    fieldArgs.fieldProps.onChange,
                                                    (item: any) => {
                                                        this.setState({ comment: item.target.value }, () => {
                                                            this.setState({ savingDisabled: this.disableSaving() });
                                                        });
                                                    },
                                                )}
                                            />
                                        );
                                    }}
                                </Field>
                                <Field
                                    label={l10n.t('Date')}
                                    id="started"
                                    name="started"
                                    isRequired={true}
                                    validate={FieldValidators.validateString}
                                    defaultValue={defaultDate}
                                >
                                    {(fieldArgs: any) => {
                                        let errDiv = <span />;
                                        if (fieldArgs.error === 'EMPTY') {
                                            errDiv = <ErrorMessage>{l10n.t('Date is required')}</ErrorMessage>;
                                        }
                                        return (
                                            <div>
                                                <DateTimePicker
                                                    defaultValue={defaultDate}
                                                    timeIsEditable
                                                    className="ac-select-container"
                                                    datePickerSelectProps={{
                                                        className: 'ac-select-container',
                                                        classNamePrefix: 'ac-select',
                                                    }}
                                                    timePickerSelectProps={{
                                                        className: 'ac-select-container',
                                                        classNamePrefix: 'ac-select',
                                                    }}
                                                    onChange={FieldValidators.chain(
                                                        fieldArgs.fieldProps.onChange,
                                                        (item: any) => {
                                                            // DatePicker re-opens when it gains focus with no way to turn that off.
                                                            // this is why we have to blur so a re-render doesn't re-open it.
                                                            (document.activeElement as HTMLElement).blur();
                                                            this.setState({ started: item }, () => {
                                                                this.setState({ savingDisabled: this.disableSaving() });
                                                            });
                                                        },
                                                    )}
                                                />
                                                {errDiv}
                                            </div>
                                        );
                                    }}
                                </Field>
                                <Field
                                    label={l10n.t('Time spent')}
                                    id="timeSpent"
                                    name="timeSpent"
                                    isRequired={true}
                                    defaultValue={this.state.timeSpent}
                                    validate={FieldValidators.validateString}
                                >
                                    {(fieldArgs: any) => {
                                        let errDiv = <span />;
                                        if (fieldArgs.error === 'EMPTY') {
                                            errDiv = <ErrorMessage>Time spent is required</ErrorMessage>;
                                        }
                                        return (
                                            <div>
                                                <input
                                                    {...fieldArgs.fieldProps}
                                                    style={{ width: '100%', display: 'block' }}
                                                    className="ac-inputField"
                                                    onChange={FieldValidators.chain(
                                                        fieldArgs.fieldProps.onChange,
                                                        (item: any) => {
                                                            this.setState({ timeSpent: item.target.value }, () => {
                                                                this.setState({ savingDisabled: this.disableSaving() });
                                                            });
                                                        },
                                                    )}
                                                />
                                                <HelperMessage>(eg. 3w 4d 12h)</HelperMessage>
                                                {errDiv}
                                            </div>
                                        );
                                    }}
                                </Field>
                                <CheckboxField
                                    name="autoAdjust"
                                    id="autoAdjust"
                                    value="autoAdjust"
                                    defaultIsChecked={this.state.autoAdjust}
                                >
                                    {(fieldArgs: any) => {
                                        return (
                                            <Checkbox
                                                {...fieldArgs.fieldProps}
                                                label={l10n.t('Auto adjust remaining estimate')}
                                                onChange={FieldValidators.chain(
                                                    fieldArgs.fieldProps.onChange,
                                                    (item: any) => {
                                                        this.setState({ autoAdjust: item.target.checked }, () => {
                                                            this.setState({ savingDisabled: this.disableSaving() });
                                                        });
                                                    },
                                                )}
                                            />
                                        );
                                    }}
                                </CheckboxField>
                                {!this.state.autoAdjust && (
                                    <Field
                                        label={l10n.t('Remaining estimate')}
                                        id="newEstimate"
                                        name="newEstimate"
                                        isRequired={!this.state.autoAdjust}
                                        defaultValue={this.state.newEstimate}
                                        validate={FieldValidators.validateString}
                                    >
                                        {(fieldArgs: any) => {
                                            let errDiv = <span />;
                                            if (fieldArgs.error === 'EMPTY') {
                                                errDiv = <ErrorMessage>Remaining estimate is required</ErrorMessage>;
                                            }
                                            return (
                                                <div>
                                                    <div className="ac-flex">
                                                        <input
                                                            {...fieldArgs.fieldProps}
                                                            disabled={this.state.autoAdjust}
                                                            style={{ width: '100%', display: 'block' }}
                                                            className="ac-inputField"
                                                            onChange={FieldValidators.chain(
                                                                fieldArgs.fieldProps.onChange,
                                                                (item: any) => {
                                                                    this.setState(
                                                                        { newEstimate: item.target.value },
                                                                        () => {
                                                                            this.setState({
                                                                                savingDisabled: this.disableSaving(),
                                                                            });
                                                                        },
                                                                    );
                                                                },
                                                            )}
                                                        />
                                                    </div>
                                                    <HelperMessage>
                                                        (eg. 3w 4d 12h) original estimate {this.props.originalEstimate}
                                                    </HelperMessage>
                                                    {errDiv}
                                                </div>
                                            );
                                        }}
                                    </Field>
                                )}
                                <FormFooter actions={{}}>
                                    <div style={{ display: 'inline-flex', marginRight: '4px', marginLeft: '4px;' }}>
                                        <Button
                                            type="submit"
                                            className="ac-button"
                                            isDisabled={this.state.savingDisabled}
                                        >
                                            {l10n.t('Submit')}
                                        </Button>
                                    </div>
                                    <div style={{ display: 'inline-flex', marginRight: '4px', marginLeft: '4px;' }}>
                                        <Button className="ac-button" onClick={this.handleClose}>
                                            {l10n.t('Cancel')}
                                        </Button>
                                    </div>
                                </FormFooter>
                                <div style={{ height: '20px' }} />
                            </form>
                        );
                    }}
                </Form>
            </div>
        );
    }
}
