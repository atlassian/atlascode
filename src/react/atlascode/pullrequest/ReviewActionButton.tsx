import React, { ReactElement } from 'react';

import CustomThemeButton from '@atlaskit/button/custom-theme-button';
import WarningIcon from '@atlaskit/icon/glyph/warning';
import Spinner from '@atlaskit/spinner';
import { borderRadius, colors } from '@atlaskit/theme';
import { token } from '@atlaskit/tokens';

type ReviewerActionButtonProps = {
    tabIndex?: number;
    mainIcon?: ReactElement;
    isError: boolean;
    isLoading: boolean;
    isSelected?: boolean;
    isDisabled: boolean;
    actionDate?: string | Date;
    onClick: () => void;
    removeRightBorderRadius?: boolean;
    removeLeftBorderRadius?: boolean;
    label: string;
};

export const ReviewerActionButton = ({
    tabIndex,
    mainIcon,
    isError,
    isLoading,
    isSelected,
    isDisabled,
    label,
    onClick,
    removeRightBorderRadius,
    removeLeftBorderRadius,
}: ReviewerActionButtonProps) => {
    const buttonTheme = (currentTheme: any, props: any) => ({
        ...currentTheme(props),
        buttonStyles: {
            ...currentTheme(props).buttonStyles,
            borderRadius: removeRightBorderRadius
                ? `${borderRadius()}px 0 0 ${borderRadius()}px`
                : removeLeftBorderRadius
                  ? `0 ${borderRadius()}px ${borderRadius()}px 0`
                  : `${borderRadius()}px`,
        },
    });
    let icon = mainIcon;
    if (isError) {
        icon = (
            <WarningIcon
                label=""
                size="medium"
                primaryColor={token('color.icon.warning', colors.Y300)}
                testId="warning-icon"
            />
        );
    }
    if (isLoading) {
        icon = <Spinner size="small" delay={0} testId="spinner" />;
    }

    return (
        <CustomThemeButton
            appearance="default"
            aria-pressed={isSelected}
            isSelected={isSelected}
            iconBefore={icon}
            isDisabled={isDisabled}
            onClick={onClick}
            tabIndex={tabIndex}
            theme={buttonTheme}
        >
            {label}
        </CustomThemeButton>
    );
};

export default React.memo(ReviewerActionButton);
