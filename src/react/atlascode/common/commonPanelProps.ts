import { ConfigSubSection } from '../../../lib/ipc/models/config';

export type CommonPanelProps = {
    visible: boolean;
    selectedSubSections: string[];
};

export type CommonSubpanelProps = {
    visible: boolean;
    expanded: boolean;
    onSubsectionChange: (subSection: ConfigSubSection, expanded: boolean) => void;
};
