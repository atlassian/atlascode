import React from 'react';

export const AtlLoader: React.FunctionComponent = () => {
    return (
        <div className="ac-atl-loader-container">
            <img className="ac-atl-loader" src={`images/atlassian-icon.svg`} alt="" role="presentation" aria-hidden="true" />
            <div>Loading data...</div>
        </div>
    );
};
