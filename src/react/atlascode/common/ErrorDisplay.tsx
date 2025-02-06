import { isErrorCollection, isErrorWithMessages } from '@atlassianlabs/jira-pi-common-models';
import { Collapse, IconButton, makeStyles, Snackbar, Theme } from '@material-ui/core';
import CloseIcon from '@material-ui/icons/Close';
import { Alert, AlertTitle } from '@material-ui/lab';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { v4 } from 'uuid';
import { ErrorControllerContext, ErrorStateContext } from './errorController';
import * as l10n from '@vscode/l10n';

export type ErrorDisplayProps = {};

const useStyles = makeStyles(
    (theme: Theme) =>
        ({
            indent: {
                marginLeft: theme.spacing(3),
            },
        }) as const,
);

export const ErrorDisplay: React.FunctionComponent<ErrorDisplayProps> = ({}) => {
    const classes = useStyles();
    const state = useContext(ErrorStateContext);
    const controller = useContext(ErrorControllerContext);

    const [snackbarOpen, setSnackbarOpen] = useState(state.isErrorBannerOpen);

    useEffect(() => {
        setSnackbarOpen((old) => {
            if (old !== state.isErrorBannerOpen) {
                return state.isErrorBannerOpen;
            }

            return old;
        });
    }, [state.isErrorBannerOpen]);

    const errorMarkup = [];
    if (isErrorCollection(state.errorDetails)) {
        Object.keys(state.errorDetails.errors).forEach((key) => {
            errorMarkup.push(
                <p key={key}>
                    <b>{key}:</b>
                    <span className={classes.indent}>{state.errorDetails.errors[key]}</span>
                </p>,
            );
        });

        state.errorDetails.errorMessages.forEach((msg) => {
            errorMarkup.push(
                <p key={v4()}>
                    <span className={classes.indent}>{msg}</span>
                </p>,
            );
        });
    } else if (isErrorWithMessages(state.errorDetails)) {
        state.errorDetails.errorMessages.forEach((msg) => {
            errorMarkup.push(
                <p key={v4()}>
                    <span className={classes.indent}>{msg}</span>
                </p>,
            );
        });
    } else if (typeof state.errorDetails === 'object') {
        Object.keys(state.errorDetails).forEach((key) => {
            errorMarkup.push(
                <p key={key}>
                    <b>{key}:</b>
                    <span className={classes.indent}>{JSON.stringify(state.errorDetails[key])}</span>
                </p>,
            );
        });
    } else {
        errorMarkup.push(<p key={v4()}>{state.errorDetails}</p>);
    }

    const handleClose = useCallback(() => {
        controller.dismissError();
        setSnackbarOpen(false);
    }, [controller]);

    const handleSnackbarClose = useCallback(() => {
        setSnackbarOpen(false);
    }, []);

    const title: string =
        state.errorDetails && state.errorDetails.title ? state.errorDetails.title : l10n.t('Something went wrong');

    return (
        <>
            <Collapse in={state.isErrorBannerOpen}>
                <Alert
                    variant="standard"
                    severity="error"
                    action={
                        <IconButton aria-label="close" color="inherit" size="small" onClick={handleClose}>
                            <CloseIcon fontSize="inherit" />
                        </IconButton>
                    }
                >
                    <AlertTitle>{title}</AlertTitle>
                    {errorMarkup}
                </Alert>
            </Collapse>
            <Snackbar
                open={snackbarOpen}
                autoHideDuration={6000}
                onClose={handleSnackbarClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            >
                <Alert
                    variant="standard"
                    severity="error"
                    action={
                        <IconButton aria-label="close" color="inherit" size="small" onClick={handleSnackbarClose}>
                            <CloseIcon fontSize="inherit" />
                        </IconButton>
                    }
                >
                    <AlertTitle>{title}</AlertTitle>
                    <p>{l10n.t('See details at the top of this page')}</p>
                </Alert>
            </Snackbar>
        </>
    );
};
