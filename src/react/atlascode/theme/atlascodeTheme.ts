import { createTheme, Theme } from '@mui/material';
import { deepmerge } from '@mui/utils';

// https://v5.mui.com/material-ui/migration/troubleshooting/#types-property-quot-palette-quot-quot-spacing-quot-does-not-exist-on-type-defaulttheme
declare module '@mui/styles/defaultTheme' {
    // eslint-disable-next-line no-unused-vars
    interface DefaultTheme extends Theme {}
}

export const atlascodeTheme = (baseTheme: Theme, usedefault?: boolean): Theme => {
    if (usedefault) {
        return createTheme();
    }

    const newTheme = createTheme(
        deepmerge(baseTheme, {
            spacing: 6,
            typography: {
                h1: {
                    fontSize: baseTheme.typography.pxToRem(52),
                    fontWeight: 400,
                },
                h2: {
                    fontSize: baseTheme.typography.pxToRem(36),
                    fontWeight: 400,
                },
                h3: {
                    fontSize: baseTheme.typography.pxToRem(24),
                    fontWeight: 400,
                },
                h4: {
                    fontSize: baseTheme.typography.pxToRem(20),
                    fontWeight: 400,
                },
                h5: {
                    fontSize: baseTheme.typography.pxToRem(14),
                    fontWeight: 400,
                },
                h6: {
                    fontSize: baseTheme.typography.pxToRem(12),
                    fontWeight: 400,
                },
            },
            mixins: {
                ...baseTheme.mixins,
                toolbar: {
                    minHeight: 50,
                },
            },
            components: {
                MuiDialog: {
                    styleOverrides: {
                        container: {
                            alignItems: 'flex-start',
                            paddingTop: baseTheme.spacing(10),
                        },
                    },
                },
                MuiTextField: {
                    defaultProps: {
                        variant: 'outlined',
                        size: 'small',
                    },
                },
                MuiButton: {
                    defaultProps: {
                        size: 'small',
                        // MUI 5 removed "default" color, and all buttons are now "primary".
                        // Setting color "secondary" for all buttons without attr color to differentiate them from the primary buttons.
                        color: 'secondary',
                    },
                },
                MuiFilledInput: {
                    defaultProps: {
                        margin: 'dense',
                    },
                },
                MuiFormControl: {
                    defaultProps: {
                        margin: 'dense',
                    },
                },
                MuiFormHelperText: {
                    defaultProps: {
                        margin: 'dense',
                    },
                },
                MuiIconButton: {
                    defaultProps: {
                        size: 'small',
                    },
                },
                MuiInputBase: {
                    defaultProps: {
                        margin: 'dense',
                    },
                },
                MuiInputLabel: {
                    defaultProps: {
                        margin: 'dense',
                    },
                },
                MuiListItem: {
                    defaultProps: {
                        dense: true,
                    },
                },
                MuiOutlinedInput: {
                    defaultProps: {
                        margin: 'dense',
                    },
                },
                MuiFab: {
                    defaultProps: {
                        size: 'small',
                    },
                },
                MuiTable: {
                    defaultProps: {
                        size: 'small',
                    },
                },
                MuiToolbar: {
                    defaultProps: {
                        variant: 'dense',
                    },
                },
                MuiDialogTitle: {
                    defaultProps: {
                        variant: 'h2',
                    },
                },
            },
            zIndex: {
                ...baseTheme.zIndex,
                appBar: 9999,
            },
        }),
    );
    console.debug('Created new theme', newTheme);
    return newTheme;
};
