import { Box, Button, Typography } from '@mui/material';
import React from 'react';
import { AnalyticsView } from 'src/analyticsTypes';

import { AtlascodeErrorBoundary } from '../../common/ErrorBoundary';
import { StartWorkControllerContext, useStartWorkController } from '../startWorkController';
import { CreateBranchSection, TaskInfoSection, UpdateStatusSection } from './components';

const StartWorkPageV3: React.FunctionComponent = () => {
    const [state, controller] = useStartWorkController();

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

                    <TaskInfoSection state={state} controller={controller} />
                    <CreateBranchSection state={state} controller={controller} />
                    <UpdateStatusSection state={state} controller={controller} />
                    <Button variant="contained" color="primary">
                        Create branch
                    </Button>
                </Box>
            </AtlascodeErrorBoundary>
        </StartWorkControllerContext.Provider>
    );
};

export default StartWorkPageV3;
