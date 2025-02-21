import React from 'react';
import { JiraBitbucketOnboarding } from '../common/JiraBitbucketOnboarding';
import { Product } from '../common/types';

type Props = {
    handleOptionChange: (value: string) => void;
    executeSetup: () => void;
    signInText: string;
    valueSet: {
        cloud: string;
        server: string;
        none: string;
    };
    handleBack?: () => void;
};

export const BitbucketOnboarding: React.FC<Props> = ({
    handleOptionChange,
    executeSetup,
    signInText,
    valueSet,
    handleBack,
}) => {
    const product: Product = 'Bitbucket';
    return (
        <JiraBitbucketOnboarding
            product={product}
            handleOptionChange={handleOptionChange}
            executeSetup={executeSetup}
            signInText={signInText}
            valueSet={valueSet}
            handleBack={handleBack}
        />
    );
};
