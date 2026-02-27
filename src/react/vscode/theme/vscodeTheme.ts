import { createTheme } from '@mui/material';

import { darken, lighten } from './colors';
import { VSCodeStyles } from './styles';

const body = document.body;

export const createVSCodeTheme = (vscStyles: VSCodeStyles): any => {
    const isDark: boolean = body.getAttribute('class') === 'vscode-dark';
    const isHighContrast: boolean = body.classList.contains('vscode-high-contrast');

    // Colors that don't appear in vscode-high-contrast
    const buttonBackground = isHighContrast ? '#0088ff' : vscStyles.buttonBackground;
    const buttonHoverBackground = isHighContrast ? '#000000' : vscStyles.buttonHoverBackground;
    const sideBarTitleForeground = isHighContrast ? '#ffffff' : vscStyles.sideBarTitleForeground;
    const sideBarSectionHeaderBackground = isHighContrast ? '#000000' : vscStyles.tabInactiveBackground;
    const listActiveSelectionBackground = isHighContrast ? '#000000' : vscStyles.listActiveSelectionBackground;

    return createTheme({
        palette: {
            mode: isDark ? 'dark' : 'light',
            primary: {
                contrastText: vscStyles.buttonForeground,
                main: buttonBackground,
            },
            secondary: {
                contrastText: vscStyles.buttonForeground,
                main: buttonBackground,
            },
            text: {
                primary: vscStyles.foreground,
            },
            background: {
                default: vscStyles.editorBackground,
                paper: isDark ? lighten(vscStyles.editorBackground, 3) : darken(vscStyles.editorBackground, 3),
            },
        },
        typography: {
            htmlFontSize: 14,
            fontSize: 11,
            fontFamily: vscStyles.fontFamily,
        },
        components: {
            MuiIconButton: {
                styleOverrides: {
                    sizeSmall: {
                        // Adjust spacing to reach minimal touch target hitbox
                        marginLeft: 4,
                        marginRight: 4,
                        padding: 12,
                    },
                },
            },
            MuiChip: {
                styleOverrides: {
                    root: {
                        // this one didn't work previously but started working after the update to MUI5
                        // backgroundColor: isDark
                        //     ? lighten(vscStyles.editorBackground, 20)
                        //     : darken(vscStyles.editorBackground, 3),
                        // color: vscStyles.editorForeground,
                    },
                },
            },
            MuiButton: {
                styleOverrides: {
                    root: {},
                    // MUI v5 Rewriting secondary button styles to match what we had in v4 for "default" color.
                    containedSecondary: ({ theme }) => ({
                        color: theme.palette.common.black,
                        backgroundColor: theme.palette.grey[300],
                        '&:hover': {
                            color: vscStyles.buttonForeground,
                            backgroundColor: buttonHoverBackground,
                        },
                    }),
                    outlinedSecondary: ({ theme }) => ({
                        backgroundColor: theme.palette.background.default,
                        boxShadow: theme.shadows[2],
                        color: theme.palette.text.primary,
                        '&:hover': {
                            backgroundColor: 'var(--vscode-button-secondaryHoverBackground)',
                            color: 'var(--vscode-button-secondaryForeground)',
                        },
                    }),
                    textSecondary: {
                        color: buttonBackground,
                        '&:hover': {
                            backgroundColor: buttonHoverBackground,
                        },
                    },
                },
            },
            MuiAppBar: {
                styleOverrides: {
                    root: {
                        marginTop: 4,
                    },
                    colorDefault: {
                        backgroundColor: vscStyles.sideBarBackground,
                        color: vscStyles.foreground,
                    },
                    colorPrimary: {
                        backgroundColor: vscStyles.sideBarBackground,
                        color: vscStyles.foreground,
                    },
                },
            },
            MuiAccordionSummary: {
                styleOverrides: {
                    root: {
                        backgroundColor: sideBarSectionHeaderBackground,
                        color: sideBarTitleForeground,
                    },
                },
            },
            MuiFilledInput: {
                styleOverrides: {
                    root: {
                        backgroundColor: vscStyles.dropdownBackground,
                        color: vscStyles.dropdownForeground,
                    },
                },
            },
            MuiFormLabel: {
                styleOverrides: {
                    root: {
                        color: vscStyles.inputPlaceholderForeground,
                        marginBottom: 4,
                    },
                },
            },
            MuiFormGroup: {
                styleOverrides: {
                    root: {
                        marginTop: 4,
                        paddingTop: 4,
                        paddingLeft: 4,
                        paddingRight: 8,
                        marginLeft: 4,
                        borderColor: vscStyles.editorWidgetBorder,
                        borderWidth: 1,
                        borderStyle: 'solid',
                    },
                },
            },
            MuiCheckbox: {
                styleOverrides: {
                    colorSecondary: {
                        '&$checked': {
                            color: vscStyles.buttonBackground,
                        },
                    },
                },
            },
            MuiFormControl: {
                styleOverrides: {
                    root: {
                        marginLeft: 2,
                    },
                },
            },
            MuiRadio: {
                styleOverrides: {
                    colorSecondary: {
                        '&$checked': {
                            color: vscStyles.buttonBackground,
                        },
                    },
                },
            },
            MuiOutlinedInput: {
                styleOverrides: {
                    notchedOutline: {
                        borderColor: vscStyles.editorWidgetBorder,
                    },
                },
            },
            MuiLink: {
                defaultProps: {
                    // https://v5.mui.com/material-ui/migration/v5-component-changes/#%E2%9C%85-update-default-underline-prop
                    underline: 'hover',
                },
                styleOverrides: {
                    root: {
                        color: vscStyles.textLinkForeground,
                    },
                },
            },
            // Icons don't always have a useful color in high-contrast
            ...(isHighContrast && {
                MuiSvgIcon: {
                    styleOverrides: {
                        root: { color: '#ffffff' },
                    },
                },
            }),
            MuiTableRow: {
                styleOverrides: {
                    root: {
                        '&$selected, &$selected:hover': {
                            backgroundColor: listActiveSelectionBackground,
                        },
                    },
                },
            },
            MuiToggleButton: {
                styleOverrides: {
                    root: {
                        // SVG icons within toggle buttons
                        '& .MuiSvgIcon-root': {
                            color: isHighContrast
                                ? '#ffffff' // Dark high contrast: white
                                : body.classList.contains('vscode-high-contrast-light')
                                  ? '#000000' // Light high contrast: black
                                  : vscStyles.foreground, // Normal: VSCode theme color
                        },
                        // Selected state (when Mui-selected class is present)
                        '&.Mui-selected .MuiSvgIcon-root': {
                            color: isHighContrast
                                ? '#ffffff'
                                : body.classList.contains('vscode-high-contrast-light')
                                  ? '#000000'
                                  : vscStyles.foreground,
                        },
                    },
                },
            },
            // MUI v5 overrides
            MuiTab: {
                // MUI 5 default color for tabs titles is invisible
                styleOverrides: {
                    root: {
                        color: vscStyles.tabInactiveForeground,
                        '&.Mui-selected': {
                            // change from blue to theme color
                            color: vscStyles.tabActiveForeground,
                        },
                    },
                },
            },
            MuiPaper: {
                // MUI 5 changed background color for paper https://v5.mui.com/material-ui/migration/v5-component-changes/#change-dark-mode-background-opacity
                styleOverrides: { root: { backgroundImage: 'unset' } },
            },
            MuiSlider: {
                // MUI 5 changed default shape and color for sliders labels.
                styleOverrides: {
                    root: {
                        '& .MuiSlider-track': {
                            border: 'none',
                            height: '2px',
                        },
                        '& .MuiSlider-rail': {
                            height: '2px',
                        },
                        '& .MuiSlider-thumb': {
                            width: '12px',
                            height: '12px',
                            '&:focus, &:hover, &.Mui-active, &.Mui-focusVisible': {
                                boxShadow: 'inherit',
                            },
                            '&::before': {
                                display: 'none',
                            },
                        },
                        '& .MuiSlider-valueLabel': {
                            lineHeight: 1.2,
                            fontSize: 12,
                            background: 'unset',
                            padding: 0,
                            width: 32,
                            height: 32,
                            borderRadius: '50% 50% 50% 0',
                            backgroundColor: buttonBackground,
                            transformOrigin: 'bottom left',
                            transform: 'translate(50%, -100%) rotate(-45deg) scale(0)',
                            '&::before': { display: 'none' },
                            '&.MuiSlider-valueLabelOpen': {
                                transform: 'translate(50%, -100%) rotate(-45deg) scale(1)',
                            },
                            '& > *': {
                                transform: 'rotate(45deg)',
                            },
                        },
                    },
                },
            },
        },
    });
};
