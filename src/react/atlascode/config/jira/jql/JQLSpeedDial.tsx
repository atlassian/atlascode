import FilterListIcon from '@mui/icons-material/FilterList';
import InputIcon from '@mui/icons-material/Input';
import SpeedDial from '@mui/material/SpeedDial';
import SpeedDialAction from '@mui/material/SpeedDialAction';
import SpeedDialIcon from '@mui/material/SpeedDialIcon';
import React, { memo, useCallback, useState } from 'react';

import { JQLEntry } from '../../../../../config/model';

type JQLSpeedDialProps = {
    openJqlDialog: (isOpen: boolean, entry?: JQLEntry) => void;
    openFilterDialog: (isOpen: boolean) => void;
};

export const JQLSpeedDial: React.FunctionComponent<JQLSpeedDialProps> = memo(({ openJqlDialog, openFilterDialog }) => {
    const [speedDialOpen, setSpeedDialOpen] = useState(false);

    const handleClose = useCallback(() => {
        setSpeedDialOpen(false);
    }, [setSpeedDialOpen]);

    const handleOpen = useCallback(() => {
        setSpeedDialOpen(true);
    }, [setSpeedDialOpen]);

    const handleAddJql = useCallback(() => {
        openJqlDialog(true);
    }, [openJqlDialog]);

    const handleAddFilter = useCallback(() => {
        openFilterDialog(true);
    }, [openFilterDialog]);

    return (
        <SpeedDial
            ariaLabel="Add issue list"
            icon={<SpeedDialIcon />}
            onClose={handleClose}
            onOpen={handleOpen}
            open={speedDialOpen}
            direction="left"
        >
            <SpeedDialAction
                key="addJQL"
                icon={<InputIcon fontSize="small" />}
                tooltipTitle="Add JQL"
                onClick={handleAddJql}
            />
            <SpeedDialAction
                key="addFilter"
                icon={<FilterListIcon fontSize="small" />}
                tooltipTitle="Import Filter"
                onClick={handleAddFilter}
            />
        </SpeedDial>
    );
});
