import React, { type FC, useState } from 'react';

import PanelStateless, { type BasePanelProps } from './PanelStateless';

type Props = BasePanelProps & {
    /** Defines whether the panel is expanded by default. */
    isDefaultExpanded?: boolean;
};

const PanelState: FC<Props> = ({ isDefaultExpanded = false, children, header }) => {
    const [isExpanded, setisExpanded] = useState(isDefaultExpanded);

    const handleChange = () => {
        setisExpanded(!isExpanded);
    };

    return (
        <PanelStateless header={header} isExpanded={isExpanded} onChange={handleChange}>
            {children}
        </PanelStateless>
    );
};

export default PanelState;
