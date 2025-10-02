import { Box, Button, CircularProgress, Typography } from '@mui/material';
import React, { useContext } from 'react';
import { AnalyticsView } from 'src/analyticsTypes';

import { AtlascodeErrorBoundary } from '../../common/ErrorBoundary';
import { ErrorStateContext } from '../../common/errorController';
import { ErrorDisplay } from '../../common/ErrorDisplay';
import { StartWorkControllerContext, useStartWorkController } from '../startWorkController';
import {
    CreateBranchSection,
    RovoDevToggle,
    SnackbarNotification,
    SuccessAlert,
    TaskInfoSection,
    UpdateStatusSection,
} from './components';
import { useStartWorkFormState } from './hooks/useStartWorkFormState';

const StartWorkPageV3: React.FunctionComponent = () => {
    const [state, controller] = useStartWorkController();
    const errorState = useContext(ErrorStateContext);

    const {
        formState,
        formActions,
        updateStatusFormState,
        updateStatusFormActions,
        handleCreateBranch,
        handleSnackbarClose,
        submitState,
        submitResponse,
        snackbarOpen,
    } = useStartWorkFormState(state, controller);

    return (
        <StartWorkControllerContext.Provider value={controller}>
            <AtlascodeErrorBoundary
                context={{ view: AnalyticsView.StartWorkPageV3 }}
                postMessageFunc={controller.postMessage}
            >
                <Box marginTop={7} maxWidth="654px" padding={3} marginX="auto">
                    <Box marginBottom={2}>
                        <Typography variant="h3" style={{ fontWeight: 700 }}>
                            Start work
                        </Typography>
                    </Box>

                    {submitState === 'submit-success' && <SuccessAlert submitResponse={submitResponse} />}

                    {errorState.isErrorBannerOpen && (
                        <Box marginBottom={2}>
                            <ErrorDisplay />
                        </Box>
                    )}

                    <TaskInfoSection state={state} controller={controller} />
                    <CreateBranchSection
                        state={state}
                        controller={controller}
                        formState={formState}
                        formActions={formActions}
                    />
                    <UpdateStatusSection
                        state={state}
                        controller={controller}
                        formState={updateStatusFormState}
                        formActions={updateStatusFormActions}
                    />

                    {submitState !== 'submit-success' && (
                        <Box>
                            {state.isRovoDevEnabled && (
                                <Box marginBottom={2}>
                                    <RovoDevToggle
                                        checked={formState.startWithRovoDev}
                                        onChange={formActions.onStartWithRovoDevChange}
                                    />
                                </Box>
                            )}
                            <Button
                                variant="contained"
                                color="primary"
                                disabled={submitState === 'submitting'}
                                onClick={handleCreateBranch}
                                endIcon={
                                    submitState === 'submitting' ? <CircularProgress color="inherit" size={20} /> : null
                                }
                            >
                                {formState.branchSetupEnabled ? 'Create branch' : 'Start work'}
                            </Button>
                        </Box>
                    )}

                    {submitState === 'submit-success' && (
                        <Button variant="contained" color="inherit" onClick={controller.closePage}>
                            Close
                        </Button>
                    )}
                </Box>

                {submitState === 'submit-success' && (
                    <SnackbarNotification
                        open={snackbarOpen}
                        onClose={handleSnackbarClose}
                        title="Success!"
                        message="See details at the top of this page"
                        severity="success"
                    />
                )}
            </AtlascodeErrorBoundary>
        </StartWorkControllerContext.Provider>
    );
};

export default StartWorkPageV3;
