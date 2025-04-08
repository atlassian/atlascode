import { createMuiTheme } from '@material-ui/core';

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
    const muiSvg = isHighContrast ? { root: { color: '#ffffff' } } : undefined;

    return createMuiTheme({
        palette: {
            type: isDark ? 'dark' : 'light',
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
        overrides: {
            MuiIconButton: {
                sizeSmall: {
                    // Adjust spacing to reach minimal touch target hitbox
                    marginLeft: 4,
                    marginRight: 4,
                    padding: 12,
                },
            },
            MuiChip: {
                root: {
                    backgroundColor: isDark
                        ? lighten(vscStyles.editorBackground, 20)
                        : darken(vscStyles.editorBackground, 3),
                    color: vscStyles.editorForeground,
                },
            },
            MuiButton: {
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
            MuiAppBar: {
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
            MuiExpansionPanelSummary: {
                root: {
                    backgroundColor: sideBarSectionHeaderBackground,
                    color: sideBarTitleForeground,
                },
            },
            MuiFilledInput: {
                root: {
                    backgroundColor: vscStyles.dropdownBackground,
                    color: vscStyles.dropdownForeground,
                },
            },
            MuiFormLabel: {
                root: {
                    color: vscStyles.inputPlaceholderForeground,
                    marginBottom: 4,
                },
            },
            MuiFormGroup: {
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
            MuiCheckbox: {
                colorSecondary: {
                    '&$checked': {
                        color: vscStyles.buttonBackground,
                    },
                },
            },
            MuiFormControl: {
                root: {
                    marginLeft: 2,
                },
            },
            MuiRadio: {
                colorSecondary: {
                    '&$checked': {
                        color: vscStyles.buttonBackground,
                    },
                },
            },
            MuiOutlinedInput: {
                notchedOutline: {
                    borderColor: vscStyles.editorWidgetBorder,
                },
            },
            MuiLink: {
                root: {
                    color: vscStyles.textLinkForeground,
                },
            },
            MuiSvgIcon: muiSvg,
            MuiTableRow: {
                root: {
                    '&$selected, &$selected:hover': {
                        backgroundColor: listActiveSelectionBackground,
                    },
                },
            },
        },
    });
};
