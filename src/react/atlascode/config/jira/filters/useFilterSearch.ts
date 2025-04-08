import { FilterSearchResults } from '@atlassianlabs/jira-pi-common-models';
import AwesomeDebouncePromise from 'awesome-debounce-promise';
import { useState } from 'react';
import { useAsyncAbortable } from 'react-async-hook';
import useConstant from 'use-constant';

import { DetailedSiteInfo } from '../../../../../atlclients/authInfo';

export type FilterFetcher = (
    site: DetailedSiteInfo,
    query: string,
    maxResults?: number,
    startAt?: number,
    abortSignal?: AbortSignal,
) => Promise<FilterSearchResults>;

export const useFilterSearch = (
    fetcher: FilterFetcher,
    site: DetailedSiteInfo,
    startAt: number = 0,
    maxResults?: number,
) => {
    const [inputText, setInputText] = useState('');

    const debouncedSearch = useConstant(() =>
        AwesomeDebouncePromise(
            async (
                fetcher: FilterFetcher,
                site: DetailedSiteInfo,
                text: string,
                maxResults?: number,
                startAt?: number,
                abortSignal?: AbortSignal,
            ): Promise<FilterSearchResults> => {
                return await fetcher(site, text, maxResults, startAt, abortSignal);
            },
            300,
            { leading: true },
        ),
    );

    const filterSearch = useAsyncAbortable(
        async (abortSignal) => {
            return debouncedSearch(fetcher, site, inputText, maxResults, startAt, abortSignal);
        },
        [inputText, site, startAt, maxResults],
        { setLoading: (state) => ({ ...state, loading: true }) },
    );

    return {
        inputText,
        setInputText,
        filterSearch,
    };
};
