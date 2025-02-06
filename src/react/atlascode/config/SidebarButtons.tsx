import { IconLink } from '@atlassianlabs/guipi-core-components';
import { Grid } from '@material-ui/core';
import React, { memo, useContext } from 'react';
import { FeedbackUser, KnownLinkID } from '../../../lib/ipc/models/common';
import { FeedbackDialogButton } from '../common/feedback/FeedbackDialogButton';
import BitbucketIcon from '../icons/BitbucketIcon';
import { ConfigControllerContext } from './configController';
import * as l10n from '@vscode/l10n';

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
                            {l10n.t('Source Code')}
                        </IconLink>
                    </Grid>
                    <Grid item>
                        <IconLink
                            href="#"
                            onClick={() => controller.openLink(KnownLinkID.AtlascodeIssues)}
                            startIcon={<BitbucketIcon />}
                        >
                            {l10n.t('Got Issues?')}
                        </IconLink>
                    </Grid>
                    <Grid item>
                        <IconLink
                            href="#"
                            onClick={() => controller.openLink(KnownLinkID.AtlascodeDocs)}
                            startIcon={<BitbucketIcon />}
                        >
                            {l10n.t('User Guide')}
                        </IconLink>
                    </Grid>
                </Grid>
            </Grid>
        </Grid>
    );
});
