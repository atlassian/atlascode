import { SiteWithAuthInfo } from 'src/lib/ipc/toUI/config';

export type Product = 'Jira' | 'Bitbucket';

export type InputElement = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

export type ValidationResult = string | undefined;
export type ValidateFunc = (fieldName: string, data: any) => ValidationResult | Promise<ValidationResult>;
export type FieldDescriptor = {
    inputRef: InputElement;
    error: ValidationResult;
    touched: boolean;
    validator: ValidateFunc | undefined;
    options: InputElement[];
};

export type Fields = {
    [k: string]: FieldDescriptor;
};

export type Errors<T> = {
    [key in keyof T]: string;
};

export type OnSubmit<FieldTypes> = (data: FieldTypes) => void | Promise<void>;

export type FormValidation<FieldTypes> = {
    register<Element extends InputElement = InputElement>(): (ref: Element | null) => void;
    register<Element extends InputElement = InputElement>(validate: ValidateFunc): (ref: Element | null) => void;
    register<Element extends InputElement = InputElement>(
        ref?: Element,
        validate?: ValidateFunc,
    ): ((ref: Element | null) => void) | void;
    watches: Partial<FieldTypes>;
    errors: Partial<Errors<FieldTypes>>;
    isValid: boolean;
    authFormType: string;
    authSiteFound: SiteWithAuthInfo | undefined;
    handleSubmit: (callback: OnSubmit<Partial<FieldTypes>>) => (e?: React.BaseSyntheticEvent) => Promise<void>;
    updateWatches: (updates: Partial<FieldTypes>) => void;
};
