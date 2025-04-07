import { JQLErrors } from '@atlassianlabs/jira-pi-common-models';
import AwesomeDebouncePromise from 'awesome-debounce-promise';
import { useCallback, useContext, useRef } from 'react';
import useConstant from 'use-constant';

import { DetailedSiteInfo } from '../../../../../atlclients/authInfo';
import { ConfigControllerContext } from '../../configController';

export const useJqlValidator = (site: DetailedSiteInfo) => {
    const controller = useContext(ConfigControllerContext);
    const abortControllerRef = useRef<AbortController>();

    const debouncedValidator = useConstant(() =>
        AwesomeDebouncePromise(
            async (site: DetailedSiteInfo, jql: string, abortSignal?: AbortSignal): Promise<JQLErrors> => {
                return await controller.validateJql(site, jql, abortSignal);
            },
            300,
            { leading: false },
        ),
    );

    const validateJql = useCallback(
        async (jql: string): Promise<JQLErrors> => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
            // Create/store new abort controller for next async call
            const abortController = new AbortController();
            abortControllerRef.current = abortController;

            try {
                return await debouncedValidator(site, jql, abortController.signal);
            } finally {
                // Unset abortController ref if response is already there,
                // as it's not needed anymore to try to abort it (would it be no-op?)
                if (abortControllerRef.current === abortController) {
                    abortControllerRef.current = undefined;
                }
            }
        },
        [debouncedValidator, site],
    );

    return validateJql;
};
