import { InlineTextEditorList } from '@atlassianlabs/guipi-core-components';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Box, Grid, Typography } from '@mui/material';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import React, { memo, useCallback, useContext, useEffect, useState } from 'react';

import { ConfigSection, ConfigSubSection } from '../../../../../lib/ipc/models/config';
import { CommonSubpanelProps } from '../../../common/commonPanelProps';
import { PanelSubtitle } from '../../../common/PanelSubtitle';
import { PanelTitle } from '../../../common/PanelTitle';
import { useBorderBoxStyles } from '../../../common/useBorderBoxStyles';
import { ConfigControllerContext } from '../../configController';

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
            <Accordion hidden={!visible} square={false} expanded={internalExpanded} onChange={expansionHandler}>
                <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    aria-controls={`${ConfigSection.Bitbucket}-${ConfigSubSection.PreferredRemotes}-content`}
                    id={`${ConfigSection.Bitbucket}-${ConfigSubSection.PreferredRemotes}-header`}
                >
                    <PanelTitle>Preferred Git Remotes</PanelTitle>
                    <PanelSubtitle>configure the preferred remotes</PanelSubtitle>
                </AccordionSummary>
                <AccordionDetails>
                    <Grid container direction="column">
                        <Typography>
                            The first remote that matches the list will be used to fetch pull requests, issues, and
                            pipelines. A random remote is chosen if a match is not found.
                        </Typography>

                        <Box className={boxClass.box} marginTop={1} paddingBottom={2}>
                            <InlineTextEditorList
                                options={preferredRemotes}
                                optionsOrdered={true}
                                reverseButtons={true}
                                addOptionButtonContent="Add remote"
                                inputLabel="Remote"
                                disabled={false}
                                onChange={handleOptionsChange}
                                emptyComponent={
                                    <Box width="100%">
                                        <Typography align="center">No preferred remotes configured.</Typography>
                                    </Box>
                                }
                            />
                        </Box>
                    </Grid>
                </AccordionDetails>
            </Accordion>
        );
    },
);
