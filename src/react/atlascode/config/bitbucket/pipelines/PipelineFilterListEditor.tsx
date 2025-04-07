import { InlineTextEditorList } from '@atlassianlabs/guipi-core-components';
import { Box, Typography } from '@material-ui/core';
import React, { memo, useCallback, useContext, useEffect, useState } from 'react';

import { ConfigSection } from '../../../../../lib/ipc/models/config';
import { ConfigControllerContext } from '../../configController';

type PipelineFilterListEditorProps = {
    filters: string[];
    enabled: boolean;
};

export const PipelineFilterListEditor: React.FunctionComponent<PipelineFilterListEditorProps> = memo(
    ({ filters, enabled }) => {
        const controller = useContext(ConfigControllerContext);
        const [changes, setChanges] = useState<{ [key: string]: any }>({});

        const handleOptionsChange = useCallback((newOptions: string[]) => {
            const changes = Object.create(null);
            changes[`${ConfigSection.Bitbucket}.pipelines.branchFilters`] = newOptions;
            setChanges(changes);
        }, []);

        useEffect(() => {
            if (Object.keys(changes).length > 0) {
                controller.updateConfig(changes);
                setChanges({});
            }
        }, [changes, controller]);

        return (
            <InlineTextEditorList
                options={filters}
                reverseButtons={true}
                addOptionButtonContent="Add Filter"
                disabled={!enabled}
                inputLabel="Filter Text"
                onChange={handleOptionsChange}
                emptyComponent={
                    <Box width="100%">
                        <Typography align="center">No filters found.</Typography>
                    </Box>
                }
            />
        );
    },
);
