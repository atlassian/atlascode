import { InlineTextEditorList } from '@atlassianlabs/guipi-core-components';
import { Box, Typography } from '@material-ui/core';
import React, { memo, useCallback, useContext, useEffect, useState } from 'react';
import { ConfigSection } from '../../../../../lib/ipc/models/config';
import { ConfigControllerContext } from '../../configController';
import * as l10n from '@vscode/l10n';

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
                addOptionButtonContent={l10n.t('Add Filter')}
                disabled={!enabled}
                inputLabel={l10n.t('Filter Text')}
                onChange={handleOptionsChange}
                emptyComponent={
                    <Box width="100%">
                        <Typography align="center">{l10n.t('No filters found.')}</Typography>
                    </Box>
                }
            />
        );
    },
);
