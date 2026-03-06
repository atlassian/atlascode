import { IconLink } from '@atlassianlabs/guipi-core-components';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { Button, Grid } from '@mui/material';
import React, { memo, useCallback, useContext, useState } from 'react';

import { ConfigActionType } from '../../../lib/ipc/fromUI/config';
import { FeedbackUser, KnownLinkID } from '../../../lib/ipc/models/common';
import { FeedbackDialogButton } from '../common/feedback/FeedbackDialogButton';
import BitbucketIcon from '../icons/BitbucketIcon';
import { ConfigControllerContext } from './configController';

type SidebarButtonProps = {
    feedbackUser: FeedbackUser;
};

export const SidebarButtons: React.FunctionComponent<SidebarButtonProps> = memo(({ feedbackUser }) => {
    const controller = useContext(ConfigControllerContext);
    const [copied, setCopied] = useState(false);

    const handleCopyDiagnostics = useCallback(() => {
        controller.postMessage({ type: ConfigActionType.CopyLogsAndDiagnostics });
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }, [controller]);

    return (
        <Grid container direction="column" alignItems="center">
            <Grid item style={{ width: '100%', marginBottom: 16 }}>
                <Button
                    variant="contained"
                    color="primary"
                    size="large"
                    fullWidth
                    startIcon={<ContentCopyIcon />}
                    onClick={handleCopyDiagnostics}
                >
                    {copied ? 'Copied!' : 'Copy Logs & Diagnostics'}
                </Button>
            </Grid>
            <Grid item>
                <Grid container spacing={2} direction="column" alignItems="flex-start">
                    <Grid item>
                        <FeedbackDialogButton user={feedbackUser} postMessageFunc={controller.postMessage} />
                    </Grid>
                    <Grid item>
                        <IconLink
                            href="#"
                            onClick={() => controller.openLink(KnownLinkID.AtlascodeRepo)}
                            startIcon={<BitbucketIcon />}
                        >
                            Source Code
                        </IconLink>
                    </Grid>
                    <Grid item>
                        <IconLink
                            href="#"
                            onClick={() => controller.openLink(KnownLinkID.AtlascodeIssues)}
                            startIcon={<BitbucketIcon />}
                        >
                            Got Issues?
                        </IconLink>
                    </Grid>
                    <Grid item>
                        <IconLink
                            href="#"
                            onClick={() => controller.openLink(KnownLinkID.AtlascodeDocs)}
                            startIcon={<BitbucketIcon />}
                        >
                            User Guide
                        </IconLink>
                    </Grid>
                </Grid>
            </Grid>
        </Grid>
    );
});
