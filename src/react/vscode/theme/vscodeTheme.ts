import { createTheme } from '@mui/material';

import { darken, lighten } from './colors';
import { VSCodeStyles } from './styles';

const body = document.body;
const isDark: boolean = body.getAttribute('class') === 'vscode-dark';
const isHighContrast: boolean = body.getAttribute('class') === 'vscode-high-contrast';

export const createVSCodeTheme = (vscStyles: VSCodeStyles): any => {
    // Colors that don't appear in vscode-high-contrast
    const buttonBackground = isHighContrast ? '#0088ff' : vscStyles.buttonBackground;
    const buttonHoverBackground = isHighContrast ? '#000000' : vscStyles.buttonHoverBackground;
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
                        '&:hover': {
                            color: vscStyles.buttonForeground,
                            backgroundColor: buttonHoverBackground,
                        },
                    },
                    text: {
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
        },
    });
};
