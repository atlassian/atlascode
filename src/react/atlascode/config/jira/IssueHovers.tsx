import { ToggleWithLabel } from '@atlassianlabs/guipi-core-components';
import { Switch } from '@material-ui/core';
import React, { memo, useCallback, useContext, useEffect, useState } from 'react';
import { ConfigControllerContext } from '../configController';
import * as l10n from '@vscode/l10n';

type IssueHoversProps = {
    enabled: boolean;
};

export const IssueHovers: React.FunctionComponent<IssueHoversProps> = memo(({ enabled }) => {
    const controller = useContext(ConfigControllerContext);

    const [changes, setChanges] = useState<{ [key: string]: any }>({});

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const changes = Object.create(null);
        changes['jira.hover.enabled'] = e.target.checked;
        setChanges(changes);
    }, []);

    useEffect(() => {
        if (Object.keys(changes).length > 0) {
            controller.updateConfig(changes);
            setChanges({});
        }
    }, [changes, controller]);

    return (
        <ToggleWithLabel
            control={
                <Switch size="small" color="primary" id="jiraHoverEnabled" checked={enabled} onChange={handleChange} />
            }
            label={l10n.t('Show details when hovering over issue keys in the editor')}
            spacing={1}
            variant="body1"
        />
    );
});
