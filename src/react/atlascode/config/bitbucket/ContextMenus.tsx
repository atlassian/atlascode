import { ToggleWithLabel } from '@atlassianlabs/guipi-core-components';
import { Switch } from '@mui/material';
import React, { memo, useContext } from 'react';

import { ConfigControllerContext } from '../configController';

type ContextMenuProps = {
    enabled: boolean;
};

export const ContextMenus: React.FunctionComponent<ContextMenuProps> = memo(({ enabled }) => {
    const controller = useContext(ConfigControllerContext);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const changes = Object.create(null);
        changes['bitbucket.contextMenus.enabled'] = e.target.checked;
        controller.updateConfig(changes);
    };

    return (
        <ToggleWithLabel
            control={
                <Switch
                    size="small"
                    color="primary"
                    id="bitbucketContextMenusEnabled"
                    checked={enabled}
                    onChange={handleChange}
                />
            }
            label="Enable Bitbucket context menus in editor"
            spacing={1}
            variant="body1"
        />
    );
});
