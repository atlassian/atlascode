import { createTheme, Theme } from '@material-ui/core';

export const atlascodeTheme = (baseTheme: Theme, usedefault?: boolean): Theme => {
    if (usedefault) {
        return createTheme();
    }

    return createTheme({
        ...baseTheme,
        spacing: 6,
        typography: {
            ...baseTheme.typography,
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
        overrides: {
            ...baseTheme.overrides,
            MuiDialog: {
                container: {
                    alignItems: 'flex-start',
                    paddingTop: baseTheme.spacing(10),
                },
            },
        },
        props: {
            ...baseTheme.props,
            MuiTextField: {
                variant: 'outlined',
                margin: 'dense',
            },
            MuiButton: {
                size: 'small',
            },
            MuiFilledInput: {
                margin: 'dense',
            },
            MuiFormControl: {
                margin: 'dense',
            },
            MuiFormHelperText: {
                margin: 'dense',
            },
            MuiIconButton: {
                size: 'small',
            },
            MuiInputBase: {
                margin: 'dense',
            },
            MuiInputLabel: {
                margin: 'dense',
            },
            MuiListItem: {
                dense: true,
            },
            MuiOutlinedInput: {
                margin: 'dense',
            },
            MuiFab: {
                size: 'small',
            },
            MuiTable: {
                size: 'small',
            },
            MuiToolbar: {
                variant: 'dense',
            },
            MuiDialogTitle: {
                // It renders as h6 by default which is too small
                // https://github.com/mui-org/material-ui/issues/16569
                disableTypography: true,
            },
        },
        zIndex: {
            ...baseTheme.zIndex,
            appBar: 9999,
        },
    });
};
