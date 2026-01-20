import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Button, Fade, Grid } from '@mui/material';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import React, { useCallback, useContext } from 'react';

import { ConfigActionType } from '../../../../lib/ipc/fromUI/config';
import { ConfigSubSection } from '../../../../lib/ipc/models/config';
import { PanelSubtitle } from '../../common/PanelSubtitle';
import { PanelTitle } from '../../common/PanelTitle';
import { ConfigControllerContext } from '../configController';
import { RovoDevCredentialList } from './RovoDevCredentialList';

type RovoDevPanelProps = {
    visible: boolean;
    selectedSubSections: ConfigSubSection[];
    onSubsectionChange: (subSection: ConfigSubSection, expanded: boolean) => void;
    config: { [key: string]: any };
    rovoDevAuthInfo?: { user?: { email?: string } } | null;
};

export const RovoDevPanel: React.FunctionComponent<RovoDevPanelProps> = ({
    visible,
    selectedSubSections,
    onSubsectionChange,
    config,
    rovoDevAuthInfo,
}) => {
    const configController = useContext(ConfigControllerContext);

    const handleLoginClick = useCallback(() => {
        // Focus Rovo Dev view which will show login screen if no credential
        configController.postMessage({
            type: ConfigActionType.FocusRovoDevWindow,
        });
    }, [configController]);

    const handleOpenSettingsFile = useCallback(() => {
        configController.postMessage({
            type: ConfigActionType.OpenRovoDevConfig,
        });
    }, [configController]);

    const handleOpenGlobalMemory = useCallback(() => {
        configController.postMessage({
            type: ConfigActionType.OpenRovoDevGlobalMemory,
        });
    }, [configController]);

    const handleOpenMcpConfig = useCallback(() => {
        configController.postMessage({
            type: ConfigActionType.OpenRovoDevMcpJson,
        });
    }, [configController]);

    const hasCredential = rovoDevAuthInfo && rovoDevAuthInfo.user && rovoDevAuthInfo.user.email;
    const isLoginDisabled = Boolean(hasCredential);

    // Keep accordions always expanded for better UX
    const authExpanded = true;
    const configExpanded = true;

    return (
        <Fade in={visible}>
            <div hidden={!visible} role="tabpanel">
                <Grid container spacing={3} direction="column">
                    <Grid item>
                        <Accordion
                            expanded={authExpanded}
                            onChange={() => {}} // Prevent collapse
                        >
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                <PanelTitle>Authentication</PanelTitle>
                            </AccordionSummary>
                            <AccordionDetails>
                                <Grid container direction="column" spacing={2}>
                                    <Grid item>
                                        <PanelSubtitle>
                                            {hasCredential
                                                ? 'Manage your Rovo Dev credentials below.'
                                                : 'No Rovo Dev credential configured. Click the button below to login.'}
                                        </PanelSubtitle>
                                    </Grid>
                                    {hasCredential && (
                                        <Grid item>
                                            <RovoDevCredentialList rovoDevAuthInfo={rovoDevAuthInfo} />
                                        </Grid>
                                    )}
                                    <Grid item>
                                        <Button
                                            variant="contained"
                                            color="primary"
                                            onClick={handleLoginClick}
                                            disabled={isLoginDisabled}
                                            title={
                                                hasCredential
                                                    ? 'Please log out first using the logout button above'
                                                    : undefined
                                            }
                                        >
                                            Login to Rovo Dev
                                        </Button>
                                    </Grid>
                                </Grid>
                            </AccordionDetails>
                        </Accordion>
                    </Grid>
                    <Grid item>
                        <Accordion
                            expanded={configExpanded}
                            onChange={() => {}} // Prevent collapse
                        >
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                <PanelTitle>Configuration</PanelTitle>
                            </AccordionSummary>
                            <AccordionDetails>
                                <Grid container direction="column" spacing={2}>
                                    <Grid item>
                                        <PanelSubtitle>Manage Rovo Dev configuration files and settings.</PanelSubtitle>
                                    </Grid>
                                    <Grid item>
                                        <Grid container spacing={2}>
                                            <Grid item>
                                                <Button
                                                    variant="contained"
                                                    color="primary"
                                                    onClick={handleOpenSettingsFile}
                                                >
                                                    Open Settings File
                                                </Button>
                                            </Grid>
                                            <Grid item>
                                                <Button
                                                    variant="contained"
                                                    color="primary"
                                                    onClick={handleOpenGlobalMemory}
                                                >
                                                    Open Global Memory File
                                                </Button>
                                            </Grid>
                                            <Grid item>
                                                <Button
                                                    variant="contained"
                                                    color="primary"
                                                    onClick={handleOpenMcpConfig}
                                                >
                                                    Open MCP Configuration
                                                </Button>
                                            </Grid>
                                        </Grid>
                                    </Grid>
                                </Grid>
                            </AccordionDetails>
                        </Accordion>
                    </Grid>
                </Grid>
            </div>
        </Fade>
    );
};
