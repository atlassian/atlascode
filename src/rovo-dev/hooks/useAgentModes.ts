import { useCallback, useEffect, useState } from 'react';
import { AgentMode, RovoDevModeInfo } from 'src/rovo-dev/client/rovoDevApiClientInterfaces';

import { RovoDevProviderMessage, RovoDevProviderMessageType } from '../rovoDevWebviewProviderMessages';
import { useMessagingApi } from '../ui/messagingApi';
import { RovoDevViewResponse, RovoDevViewResponseType } from '../ui/rovoDevViewMessages';

interface UseAgentModesOptions {
    enabled?: boolean;
}

export function useAgentModes({ enabled = true }: UseAgentModesOptions = {}) {
    const { postMessagePromise } = useMessagingApi<RovoDevViewResponse, RovoDevProviderMessage, RovoDevProviderMessage>(
        () => {},
    );

    const [currentMode, setCurrentMode] = useState<AgentMode | null>(null);
    const [availableModes, setAvailableModes] = useState<RovoDevModeInfo[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const getCurrentMode = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await postMessagePromise(
                { type: RovoDevViewResponseType.GetCurrentAgentMode },
                RovoDevProviderMessageType.GetCurrentAgentModeComplete,
                5000,
            );
            setCurrentMode(response.mode);
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setLoading(false);
        }
    }, [postMessagePromise]);

    const getAvailableModes = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await postMessagePromise(
                { type: RovoDevViewResponseType.GetAvailableAgentModes },
                RovoDevProviderMessageType.GetAvailableAgentModesComplete,
                5000,
            );
            setAvailableModes(response.modes);
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setLoading(false);
        }
    }, [postMessagePromise]);

    const setAgentMode = useCallback(
        async (mode: AgentMode) => {
            setLoading(true);
            setError(null);

            try {
                const response = await postMessagePromise(
                    { type: RovoDevViewResponseType.SetAgentMode, mode },
                    RovoDevProviderMessageType.SetAgentModeComplete,
                    5000,
                );

                setCurrentMode(response.mode);
            } catch (err) {
                setError(err instanceof Error ? err.message : String(err));
            } finally {
                setLoading(false);
            }
        },
        [postMessagePromise],
    );

    useEffect(() => {
        if (enabled) {
            getCurrentMode();
            getAvailableModes();
        }
    }, [enabled, getCurrentMode, getAvailableModes]);

    return {
        currentMode,
        availableModes,
        loading,
        error,
        getCurrentMode,
        getAvailableModes,
        setAgentMode,
    };
}
