import React, { createContext, ReactNode, useContext, useState } from 'react';
import { CommonMessageType } from 'src/lib/ipc/toUI/common';
import { Features } from 'src/util/features';

type FeatureFlags = Record<string, boolean>;

interface FeatureFlagContextType {
    flags: FeatureFlags;
    setFlag: (key: string, value: boolean) => void;
}

const FeatureFlagContext = createContext<FeatureFlagContextType | undefined>(undefined);

// re-export features for convenience
export { Features };

export const useFeatureFlags = (): FeatureFlagContextType => {
    const context = useContext(FeatureFlagContext);
    if (!context) {
        throw new Error('useFeatureFlags must be used within a FeatureFlagProvider');
    }
    return context;
};

export const FeatureFlagProvider: React.FC<{ initialFlags?: FeatureFlags; children: ReactNode }> = ({
    initialFlags = {},
    children,
}) => {
    const [flags, setFlags] = useState<FeatureFlags>(initialFlags);

    window.onmessage = (event) => {
        const { command, featureFlags } = event.data;
        if (command === CommonMessageType.UpdateFeatureFlags) {
            setFlags(featureFlags);
        }
    };

    const setFlag = (key: string, value: boolean) => {
        setFlags((prev) => ({ ...prev, [key]: value }));
    };

    return <FeatureFlagContext.Provider value={{ flags, setFlag }}>{children}</FeatureFlagContext.Provider>;
};
