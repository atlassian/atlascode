import { Box } from '@mui/material';
import React from 'react';

export type TabPanelProps = {
    children?: React.ReactNode;
    dir?: string;
    index: any;
    value: any;
};

export function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`full-width-tabpanel-${index}`}
            aria-labelledby={`full-width-tab-${index}`}
            {...other}
        >
            {value === index && <Box p={3}>{children}</Box>}
        </div>
    );
}
