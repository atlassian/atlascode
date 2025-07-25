export type Suggestion = { displayName: string; value: string };
export interface JqlFieldRestData {
    value: string;
    displayName: string;
    orderable?: string;
    searchable?: string;
    auto?: string;
    cfid?: string;
    operators: string[];
    types: string[];
}

export interface JqlFuncRestData {
    value: string;
    displayName: string;
    isList?: string;
    types: string[];
}

export interface JqlAutocompleteRestData {
    visibleFieldNames: JqlFieldRestData[];
    visibleFunctionNames: JqlFuncRestData[];
    jqlReservedWords: string[];
}
