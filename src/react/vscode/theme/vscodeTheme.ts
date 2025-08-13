import { createTheme } from '@mui/material';

import { darken, lighten } from './colors';
import { VSCodeStyles } from './styles';

const body = document.body;

export const createVSCodeTheme = (vscStyles: VSCodeStyles): any => {
    const isDark: boolean = body.getAttribute('class') === 'vscode-dark';
    const isHighContrast: boolean = body.getAttribute('class') === 'vscode-high-contrast';

    // Colors that don't appear in vscode-high-contrast
    const buttonBackground = isHighContrast ? '#0088ff' : vscStyles.buttonBackground;
    // const buttonHoverBackground = isHighContrast ? '#000000' : vscStyles.buttonHoverBackground;
    const sideBarTitleForeground = isHighContrast ? '#ffffff' : vscStyles.sideBarTitleForeground;
    const sideBarSectionHeaderBackground = isHighContrast ? '#000000' : vscStyles.tabInactiveBackground;
    const listActiveSelectionBackground = isHighContrast ? '#000000' : vscStyles.listActiveSelectionBackground;

    // Icons don't always have a useful color in high-contrast
    const muiSvg = isHighContrast ? { styleOverrides: { root: { color: '#ffffff' } } } : { styleOverrides: undefined };

    return createTheme({
        palette: {
            mode: isDark ? 'dark' : 'light',
            primary: {
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
                        backgroundColor: isDark
                            ? lighten(vscStyles.editorBackground, 20)
                            : darken(vscStyles.editorBackground, 3),
                        color: vscStyles.editorForeground,
                    },
                },
            },
            MuiButton: {
                styleOverrides: {
                    root: {},
                    contained: {
                        // this one didn't work previously but started working after the update to MUI5
                        // '&:hover': {
                        //     color: vscStyles.buttonForeground,
                        //     backgroundColor: buttonHoverBackground,
                        // },
                    },
                    text: {
                        color: buttonBackground,
                        // this one didn't work previously but started working after the update to MUI5
                        // '&:hover': {
                        //     backgroundColor: buttonHoverBackground,
                        // },
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
                        color: sideBarTitleForeground,
                    },
                    colorPrimary: {
                        backgroundColor: vscStyles.sideBarBackground,
                        color: sideBarTitleForeground,
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
                    underline: 'hover',
                },
                styleOverrides: {
                    root: {
                        color: vscStyles.textLinkForeground,
                    },
                },
            },
            MuiSvgIcon: muiSvg,
            MuiTableRow: {
                styleOverrides: {
                    root: {
                        '&$selected, &$selected:hover': {
                            backgroundColor: listActiveSelectionBackground,
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
                            backgroundColor: vscStyles.buttonBackground,
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
