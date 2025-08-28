import {
    InputBox,
    InputBoxOptions,
    InputBoxValidationSeverity,
    QuickInput,
    QuickInputButton,
    QuickInputButtons,
    QuickPickItem,
    QuickPickOptions,
    window,
} from 'vscode';

export enum UiAction {
    Next,
    Back,
}

export type UiResponse<T = string> = { value?: T; action: UiAction };

export type ExtraOptions = {
    step?: number;
    totalSteps?: number;
    buttons?: QuickInputButton[];
    buttonHandler?: (e: QuickInputButton) => void;
    value?: string;
    prompt?: string;
    debounceValidationMs?: number;
};

export class BaseUI {
    constructor(
        private readonly title: string,
        private readonly ignoreFocusOut: boolean = true,
    ) {}

    isInputValid(input: InputBox) {
        if (!input.validationMessage) {
            return true;
        }

        if (typeof input.validationMessage === 'string') {
            return false;
        }

        return input.validationMessage.severity !== InputBoxValidationSeverity.Error;
    }

    showInputBox(props: InputBoxOptions & ExtraOptions): Promise<UiResponse> {
        const input = window.createInputBox();

        // Common properties
        input.title = this.title;
        input.ignoreFocusOut = this.ignoreFocusOut;

        // Special properties
        input.placeholder = props.placeHolder;
        input.step = props.step;
        input.totalSteps = props.totalSteps;
        input.value = props.value || '';
        input.valueSelection = props.valueSelection;
        input.password = props.password || false;
        input.prompt = props.prompt;

        input.buttons = [QuickInputButtons.Back, ...(props.buttons || [])];

        return new Promise((resolve, reject) => {
            if (props.validateInput !== undefined) {
                if (props.debounceValidationMs) {
                    const debouncer = new Debouncer(input, props.validateInput, props.debounceValidationMs);
                    input.onDidChangeValue(async (value) => {
                        if (props.validateInput !== undefined) {
                            const result = await debouncer.run(value);
                            input.validationMessage = result === null ? undefined : result;
                        }
                    });
                } else {
                    input.onDidChangeValue(async (value) => {
                        const errorMessage = await props.validateInput?.(value);
                        input.validationMessage = errorMessage || undefined;
                    });
                }
            }

            input.onDidAccept(() => {
                // According to the docs, `string` validation errors should in
                // theory prevent accepting the form, but somehow they don't
                if (!this.isInputValid(input)) {
                    return;
                }
                resolve({ value: input.value, action: UiAction.Next });
                input.hide();
            });

            input.onDidTriggerButton((e) => {
                if (e === QuickInputButtons.Back) {
                    resolve({ value: input.value, action: UiAction.Back });
                    input.hide();
                } else {
                    props.buttonHandler?.(e);
                }
            });

            input.onDidHide(() => {
                input.dispose();
                resolve({ value: '', action: UiAction.Back });
            });

            input.show();
        });
    }

    public showQuickPick<T = string>(
        items: QuickPickItem[],
        props: QuickPickOptions & ExtraOptions & { validateSelection?: (items: readonly QuickPickItem[]) => boolean },
    ): Promise<UiResponse<T>> {
        const input = window.createQuickPick();

        // Common properties
        input.title = this.title;
        input.ignoreFocusOut = this.ignoreFocusOut;

        // Special properties
        input.placeholder = props.placeHolder;
        input.items = items;
        input.value = props.value || '';
        input.activeItems = [items[0]];
        input.totalSteps = props.step;
        input.ignoreFocusOut = props.ignoreFocusOut || true;

        input.buttons = [QuickInputButtons.Back, ...(props.buttons || [])];
        if (props.buttonHandler !== undefined) {
            input.onDidTriggerButton((e) => {
                props.buttonHandler?.(e);
            });
        }

        return new Promise((resolve, reject) => {
            input.onDidAccept(() => {
                const selection = input.selectedItems;
                if (props.validateSelection?.(selection) === false) {
                    return;
                }

                resolve({ value: selection[0].label as T, action: UiAction.Next });
                input.hide();
            });
            input.onDidHide(() => {
                input.dispose();
                resolve({ value: undefined, action: UiAction.Back });
            });
            input.show();
        });
    }
}

class Debouncer<T> {
    timeout: NodeJS.Timeout | null = null;
    lastPromise: Promise<T | undefined> = Promise.resolve(undefined);

    constructor(
        private input: QuickInput,
        private validator: (value: string) => T,
        private delay: number = 1000,
    ) {}

    get run(): (value: string) => Promise<T | undefined> {
        if (this.timeout) {
            clearTimeout(this.timeout);
        }

        // Return a function that will return a promise
        return (value: string) => {
            this.input.busy = true;
            if (this.timeout) {
                clearTimeout(this.timeout);
            }
            this.lastPromise = new Promise((resolve) => {
                this.timeout = setTimeout(async () => {
                    resolve(await this.validator(value));
                    this.input.busy = false;
                }, this.delay);
            });
            return this.lastPromise;
        };
    }
}
