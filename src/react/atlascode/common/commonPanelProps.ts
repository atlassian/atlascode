import { ConfigV3SubSection } from '../../../lib/ipc/models/config';

export type CommonPanelProps = {
    visible: boolean;
    selectedSubSections: string[];
};

export type CommonSubpanelV3Props = {
    visible: boolean;
    expanded: boolean;
    onSubsectionChange: (subSection: ConfigV3SubSection, expanded: boolean) => void;
};
