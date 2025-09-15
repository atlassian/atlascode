import CustomizeIcon from '@atlaskit/icon/core/customize';
import Popup, { PopupComponentProps } from '@atlaskit/popup';
import React from 'react';
interface PromptSettingsPopupProps {
    onToggleDeepPlan: () => void;
    isDeepPlanEnabled: boolean;
    onClose: () => void;
}

const PopupContainer = React.forwardRef<HTMLDivElement, PopupComponentProps>(
    ({ children, 'data-testid': testId, xcss: _xcss, ...props }, ref) => (
        <div className="popup-container" {...props} ref={ref}>
            {children}
        </div>
    ),
);

const PromptSettingsPopup: React.FC<PromptSettingsPopupProps> = ({ onToggleDeepPlan, isDeepPlanEnabled, onClose }) => {
    const [isOpen, setIsOpen] = React.useState(false);
    return (
        <Popup
            shouldRenderToParent
            isOpen={isOpen}
            trigger={(props) => (
                <button {...props} onClick={() => setIsOpen((prev) => !prev)}>
                    <CustomizeIcon label="Prompt settings" />
                </button>
            )}
            content={() => <PromptSettingsItem label="Deep Plan" description="Enable deep planning feature" />}
            placement="auto"
            popupComponent={PopupContainer}
        />
    );
};

const PromptSettingsItem: React.FC<{
    label: string;
    description: string;
}> = ({ label, description }) => {
    return (
        <div>
            <h3>{label}</h3>
            <p>{description}</p>
        </div>
    );
};

export default PromptSettingsPopup;
