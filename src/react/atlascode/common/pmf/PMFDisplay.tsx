import { Alert, AlertTitle } from '@mui/lab';
import { Box, Button, Collapse, Grid } from '@mui/material';
import React, { useCallback, useContext } from 'react';

import { CommonAction } from '../../../../lib/ipc/fromUI/common';
import { PMFData } from '../../../../lib/ipc/models/common';
import { PostMessageFunc } from '../../messagingApi';
import { PMFControllerContext, PMFDismissal, PMFStateContext } from './pmfController';
import { PMFDialog } from './PMFDialog';

export type PMFDisplayProps = {
    postMessageFunc: PostMessageFunc<CommonAction>;
};

export const PMFDisplay: React.FunctionComponent<PMFDisplayProps> = ({ postMessageFunc }) => {
    const state = useContext(PMFStateContext);
    const controller = useContext(PMFControllerContext);

    const handleLater = useCallback(() => {
        controller.dismissPMFBanner(PMFDismissal.LATER, postMessageFunc);
    }, [controller, postMessageFunc]);
    const handleNever = useCallback(() => {
        controller.dismissPMFBanner(PMFDismissal.NEVER, postMessageFunc);
    }, [controller, postMessageFunc]);

    const handleOpenSurvey = useCallback(() => {
        controller.showPMFSurvey(postMessageFunc);
    }, [controller, postMessageFunc]);

    const handleSubmitSurvey = useCallback(
        (data: PMFData) => {
            controller.submitPMFSurvey(data, postMessageFunc);
        },
        [controller, postMessageFunc],
    );

    return (
        <div>
            <Collapse in={state.isPMFBannerOpen}>
                <Alert severity="info">
                    <AlertTitle>Take a quick survey to let us know how we're doing</AlertTitle>
                    <Box marginBottom={2} />
                    <Grid spacing={3} container>
                        <Grid item>
                            <Button variant="contained" color="primary" size="small" onClick={handleOpenSurvey}>
                                Take Survey
                            </Button>
                        </Grid>
                        <Grid item>
                            <Button color="inherit" size="small" onClick={handleLater}>
                                Maybe Later
                            </Button>
                        </Grid>
                        <Grid item>
                            <Button color="inherit" size="small" onClick={handleNever}>
                                No Thanks
                            </Button>
                        </Grid>
                    </Grid>
                </Alert>
            </Collapse>
            <PMFDialog open={state.isPMFSurveyOpen} onCancel={handleLater} onSave={handleSubmitSurvey} />
        </div>
    );
};
