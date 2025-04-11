import Button from '@atlaskit/button';
import ChevronDownIcon from '@atlaskit/icon/utility/migration/chevron-down';
import ChevronRightIcon from '@atlaskit/icon/utility/migration/chevron-right';
import { Box } from '@atlaskit/primitives';
import { colors } from '@atlaskit/theme';
import { token } from '@atlaskit/tokens';
import type { FC, HTMLProps } from 'react';
import React, { type ReactNode } from 'react';
import AnimateHeight from 'react-animate-height';
import { withFocusWithin } from 'react-focus-within';
import styled, { css } from 'styled-components';

const transition = css`
    transition: all 200ms ease-in-out;
`;

export const PanelWrapper = styled.div`
    margin: 0 auto ${token('space.200', '16px')};
`;

export const ButtonWrapper = styled.div<{ isHidden: boolean }>`
    left: 0;
    line-height: 0;
    opacity: ${({ isHidden }) => (isHidden ? 0 : 1)};
    position: absolute;
    ${transition};

    /* IE 11 needs these vertical positioning rules - the flexbox
  behavior for absolute-positioned children is not up to spec.
  https://googlechrome.github.io/samples/css-flexbox-abspos/ */
    top: 50%;
    transform: translateY(-50%);

    button {
        pointer-events: none;
    }
`;

export const PanelHeader: FC<HTMLProps<HTMLDivElement> & { isFocused?: boolean }> = withFocusWithin(styled.div<{
    isFocused?: boolean;
}>`
    align-items: center;
    background-color: ${(props) => props.isFocused && token('elevation.surface.hovered', colors.N20)};
    border-radius: ${token('border.radius.100', '3px')};
    display: flex;
    left: ${token('space.negative.300', '-24px')};
    margin-bottom: ${token('space.100', '8px')};
    margin-top: ${token('space.200', '16px')};
    padding: ${token('space.025', '2px')} ${token('space.0', '0px')} ${token('space.025', '2px')}
        ${token('space.300', '24px')};
    position: relative;
    ${transition};
    width: 100%;

    ${ButtonWrapper} {
        opacity: ${(props) => props.isFocused && 1};
    }

    &:hover {
        background-color: ${token('elevation.surface.hovered', colors.N20)};
        cursor: pointer;

        ${ButtonWrapper} {
            opacity: 1;
        }
    }
`);

export type BasePanelProps = {
    /** Content to be shown inside the panel. */
    children?: ReactNode;
    /** Header to render on the panel. Clicking the header expands and collapses the panel */
    header?: ReactNode;
};

type PanelState = BasePanelProps & {
    /** Defines whether the panel is expanded by default. */
    isExpanded: boolean;
    /** This callback is called when panel is expanded/collapsed */
    onChange: (isExpanded: boolean) => void;
};

const PanelStateless: FC<PanelState> = ({ children, header, isExpanded = false, onChange }) => {
    const i18nExpandText = 'expand';
    const i18nCollapseText = 'collapse';

    return (
        <PanelWrapper>
            <PanelHeader onClick={() => onChange(!isExpanded)}>
                <ButtonWrapper isHidden={isExpanded}>
                    <Button
                        appearance="subtle"
                        aria-expanded={isExpanded}
                        spacing="none"
                        iconBefore={
                            isExpanded ? (
                                <Box as="span" paddingInlineStart="space.050">
                                    <ChevronDownIcon
                                        color="currentColor"
                                        label={i18nCollapseText}
                                        LEGACY_margin="0 0 0 -4px"
                                    />
                                </Box>
                            ) : (
                                <Box as="span" paddingInlineStart="space.050">
                                    <ChevronRightIcon
                                        color="currentColor"
                                        label={i18nExpandText}
                                        LEGACY_margin="0 0 0 -4px"
                                    />
                                </Box>
                            )
                        }
                    />
                </ButtonWrapper>
                <span>{header}</span>
            </PanelHeader>
            <AnimateHeight duration={200} easing="linear" height={isExpanded ? 'auto' : 0} className="panel-content">
                {children}
            </AnimateHeight>
        </PanelWrapper>
    );
};

export default PanelStateless;
