import { InlineTextEditorList } from '@atlassianlabs/guipi-core-components';
import { Box, ExpansionPanel, ExpansionPanelDetails, ExpansionPanelSummary, Grid, Typography } from '@material-ui/core';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import React, { memo, useCallback, useContext, useEffect, useState } from 'react';
import { ConfigSection, ConfigSubSection } from '../../../../../lib/ipc/models/config';
import { CommonSubpanelProps } from '../../../common/commonPanelProps';
import { PanelSubtitle } from '../../../common/PanelSubtitle';
import { PanelTitle } from '../../../common/PanelTitle';
import { useBorderBoxStyles } from '../../../common/useBorderBoxStyles';
import { ConfigControllerContext } from '../../configController';
import * as l10n from '@vscode/l10n';

type PreferredRemotesPanelProps = CommonSubpanelProps & {
    preferredRemotes: string[];
};

export const PreferredRemotesPanel: React.FunctionComponent<PreferredRemotesPanelProps> = memo(
    ({ visible, expanded, onSubsectionChange, preferredRemotes }) => {
        const boxClass = useBorderBoxStyles();
        const controller = useContext(ConfigControllerContext);

        const [internalExpanded, setInternalExpanded] = useState(expanded);
        const [changes, setChanges] = useState<{ [key: string]: any }>({});

        const expansionHandler = useCallback(
            (event: React.ChangeEvent<{}>, expanded: boolean) => {
                setInternalExpanded(expanded);
                onSubsectionChange(ConfigSubSection.PreferredRemotes, expanded);
            },
            [onSubsectionChange],
        );

        useEffect(() => {
            setInternalExpanded((oldExpanded) => {
                if (oldExpanded !== expanded) {
                    return expanded;
                }
                return oldExpanded;
            });
        }, [expanded]);

        const handleOptionsChange = useCallback((newOptions: string[]) => {
            const changes = Object.create(null);
            changes[`${ConfigSection.Bitbucket}.preferredRemotes`] = newOptions;
            setChanges(changes);
        }, []);

        useEffect(() => {
            if (Object.keys(changes).length > 0) {
                controller.updateConfig(changes);
                setChanges({});
            }
        }, [changes, controller]);

        return (
            <ExpansionPanel hidden={!visible} square={false} expanded={internalExpanded} onChange={expansionHandler}>
                <ExpansionPanelSummary
                    expandIcon={<ExpandMoreIcon />}
                    aria-controls={`${ConfigSection.Bitbucket}-${ConfigSubSection.PreferredRemotes}-content`}
                    id={`${ConfigSection.Bitbucket}-${ConfigSubSection.PreferredRemotes}-header`}
                >
                    <PanelTitle>{l10n.t('Preferred Git Remotes')}</PanelTitle>
                    <PanelSubtitle>{l10n.t('configure the preferred remotes')}</PanelSubtitle>
                </ExpansionPanelSummary>
                <ExpansionPanelDetails>
                    <Grid container direction="column">
                        <Typography>
                            {l10n.t(
                                'The first remote that matches the list will be used to fetch pull requests, issues, and pipelines. A random remote is chosen if a match is not found.',
                            )}
                        </Typography>

                        <Box className={boxClass.box} marginTop={1} paddingBottom={2}>
                            <InlineTextEditorList
                                options={preferredRemotes}
                                optionsOrdered={true}
                                reverseButtons={true}
                                addOptionButtonContent={l10n.t('Add remote')}
                                inputLabel={l10n.t('Remote')}
                                disabled={false}
                                onChange={handleOptionsChange}
                                emptyComponent={
                                    <Box width="100%">
                                        <Typography align="center">
                                            {l10n.t('No preferred remotes configured.')}
                                        </Typography>
                                    </Box>
                                }
                            />
                        </Box>
                    </Grid>
                </ExpansionPanelDetails>
            </ExpansionPanel>
        );
    },
);
