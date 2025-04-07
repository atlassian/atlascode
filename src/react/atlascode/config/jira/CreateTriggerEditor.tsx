import { InlineTextEditorList, ToggleWithLabel } from '@atlassianlabs/guipi-core-components';
import { Box, Grid, Switch, Typography } from '@material-ui/core';
import React, { memo, useCallback, useContext, useEffect, useState } from 'react';

import { useBorderBoxStyles } from '../../common/useBorderBoxStyles';
import { ConfigControllerContext } from '../configController';

type CreateTriggerEditorProps = {
    triggers: string[];
    disabled: boolean;
};

export const CreateTriggerEditor: React.FunctionComponent<CreateTriggerEditorProps> = memo(({ triggers, disabled }) => {
    const controller = useContext(ConfigControllerContext);
    const [changes, setChanges] = useState<{ [key: string]: any }>({});
    const boxClass = useBorderBoxStyles();
    const handleEnableToggle = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const changes = Object.create(null);
        changes['jira.todoIssues.enabled'] = e.target.checked;
        setChanges(changes);
    }, []);

    const handleOptionsChange = useCallback((newOptions: string[]) => {
        const changes = Object.create(null);
        changes['jira.todoIssues.triggers'] = newOptions;
        setChanges(changes);
    }, []);

    useEffect(() => {
        if (Object.keys(changes).length > 0) {
            controller.updateConfig(changes);
            setChanges({});
        }
    }, [changes, controller]);

    return (
        <Grid container direction="column" spacing={2}>
            <Grid item>
                <ToggleWithLabel
                    control={
                        <Switch
                            size="small"
                            color="primary"
                            id="jiraHoverEnabled"
                            checked={!disabled}
                            onChange={handleEnableToggle}
                        />
                    }
                    label="Show code action to 'Create Jira issue' for comment triggers"
                    spacing={1}
                    variant="body1"
                />
            </Grid>
            <Grid item>
                <Box marginTop={2}>
                    <Typography variant="h4">Comment Triggers</Typography>

                    <Typography variant="caption">
                        Strings (in comments) that will cause the 'Create Jira issue' code action to show
                    </Typography>

                    <Box className={boxClass.box} marginTop={1} paddingBottom={2}>
                        <InlineTextEditorList
                            options={triggers}
                            reverseButtons={true}
                            addOptionButtonContent="Add Trigger"
                            disabled={disabled}
                            inputLabel="Trigger Text"
                            onChange={handleOptionsChange}
                            emptyComponent={
                                <Box width="100%">
                                    <Typography align="center">No triggers found.</Typography>
                                </Box>
                            }
                        />
                    </Box>
                </Box>
            </Grid>
        </Grid>
    );
});
