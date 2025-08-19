import { IconLink } from '@atlassianlabs/guipi-core-components';
import { Grid } from '@mui/material';
import React, { memo, useContext } from 'react';

import { FeedbackUser, KnownLinkID } from '../../../lib/ipc/models/common';
import { FeedbackDialogButton } from '../common/feedback/FeedbackDialogButton';
import BitbucketIcon from '../icons/BitbucketIcon';
import { ConfigControllerContext } from './configController';

type SidebarButtonProps = {
    feedbackUser: FeedbackUser;
};

export const SidebarButtons: React.FunctionComponent<SidebarButtonProps> = memo(({ feedbackUser }) => {
    const controller = useContext(ConfigControllerContext);

    return (
        <Grid container direction="column" alignItems="center">
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
