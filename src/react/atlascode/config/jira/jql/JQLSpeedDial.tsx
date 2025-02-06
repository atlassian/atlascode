import FilterListIcon from '@material-ui/icons/FilterList';
import InputIcon from '@material-ui/icons/Input';
import SpeedDial from '@material-ui/lab/SpeedDial';
import SpeedDialAction from '@material-ui/lab/SpeedDialAction';
import SpeedDialIcon from '@material-ui/lab/SpeedDialIcon';
import React, { memo, useCallback, useState } from 'react';
import { JQLEntry } from '../../../../../config/model';
import * as l10n from '@vscode/l10n';

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
            ariaLabel={l10n.t('Add issue list')}
            icon={<SpeedDialIcon />}
            onClose={handleClose}
            onOpen={handleOpen}
            open={speedDialOpen}
            direction="left"
        >
            <SpeedDialAction
                key="addJQL"
                icon={<InputIcon fontSize="small" />}
                tooltipTitle={l10n.t('Add JQL')}
                onClick={handleAddJql}
            />
            <SpeedDialAction
                key="addFilter"
                icon={<FilterListIcon fontSize="small" />}
                tooltipTitle={l10n.t('Import Filter')}
                onClick={handleAddFilter}
            />
        </SpeedDial>
    );
});
