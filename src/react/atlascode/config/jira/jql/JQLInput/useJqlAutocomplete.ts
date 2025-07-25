import AwesomeDebouncePromise from 'awesome-debounce-promise';
import { useEffect, useState } from 'react';
import { useAsyncAbortable } from 'react-async-hook';
import useConstant from 'use-constant';

import { Suggestion } from '../jqlTypes';
import { JqlSuggestor } from './jqlSuggestor';

export const useJqlAutocomplete = (suggestor: JqlSuggestor, initialInput: string, initialIndex: number) => {
    const [inputValue, setInputValue] = useState(initialInput);
    const [cursorIndex, setCursorIndex] = useState(initialIndex);
    const debouncedSuggestor = useConstant(() =>
        AwesomeDebouncePromise(
            async (fetcher: JqlSuggestor, s: string, i: number, a?: AbortSignal): Promise<Suggestion[]> => {
                return await fetcher.getSuggestions(s, i, a);
            },
            300,
            { leading: true },
        ),
    );

    const jqlAutocomplete = useAsyncAbortable(
        async (abortSignal: AbortSignal) => {
            return await debouncedSuggestor(suggestor, inputValue, cursorIndex, abortSignal);
        },
        [inputValue, cursorIndex, suggestor],
    );

    useEffect(() => {
        setInputValue(initialInput);
    }, [initialInput]);
    // Return everything needed for the hook consumer
    return {
        inputValue,
        setInputValue,
        cursorIndex,
        setCursorIndex,
        jqlAutocomplete,
    };
};
