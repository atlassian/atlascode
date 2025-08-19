import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Box, CircularProgress } from '@mui/material';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import { makeStyles } from '@mui/styles';
import React, { memo, useCallback, useState } from 'react';

import { PanelTitle } from '../common/PanelTitle';
import { PanelSubtitle } from './PanelSubtitle';
interface BasicPanelProps {
    title: string;
    subtitle?: string;
    isDefaultExpanded?: boolean;
    hidden?: boolean;
    isLoading: boolean;
    children?: React.ReactNode;
}
const useStyles = makeStyles(() => ({
    expansionPanelSummary: {
        backgroundColor: 'unset',
        border: 'unset',
        boxShadow: 'unset',
        flexDirection: 'row-reverse',
        marginLeft: 0,
        paddingLeft: 0,
        // we want to flatten and modernize the material ui default styles so unsetting the theme changes
        '& .MuiExpansionPanelSummary-expandIcon': {
            padding: 0,
            marginRight: '8px',
            marginLeft: 0,
            // To make the expand icon face towards right when closed
            transform: 'rotate(270deg)',
            '&.Mui-expanded': {
                transform: 'rotate(0deg)',
            },
        },
    },
    expansionPanel: {
        boxShadow: 'none',
    },
    root: {
        '& .MuiPaper-root': {
            backgroundColor: 'transparent',
            boxShadow: 'none',
        },
    },
}));

export const BasicPanel: React.FC<BasicPanelProps> = memo(
    ({ title, subtitle, isDefaultExpanded = true, isLoading, hidden, children }) => {
        const classes = useStyles();
        const [internalExpanded, setInternalExpanded] = useState<boolean>(!!isDefaultExpanded);
        const expansionHandler = useCallback((event: React.ChangeEvent<{}>, expanded: boolean) => {
            setInternalExpanded(expanded);
        }, []);
        return (
            <Box hidden={!isLoading && hidden} className={classes.root}>
                <Accordion
                    square={false}
                    expanded={internalExpanded}
                    onChange={expansionHandler}
                    className={classes.expansionPanel}
                >
                    <AccordionSummary expandIcon={<ExpandMoreIcon />} className={classes.expansionPanelSummary}>
                        <PanelTitle>{title}</PanelTitle>
                        {subtitle && <PanelSubtitle>{subtitle}</PanelSubtitle>}
                    </AccordionSummary>
                    <AccordionDetails>{isLoading ? <CircularProgress /> : children}</AccordionDetails>
                </Accordion>
            </Box>
        );
    },
);
