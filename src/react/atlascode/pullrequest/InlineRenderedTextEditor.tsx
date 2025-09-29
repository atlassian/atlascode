import EditIcon from '@mui/icons-material/Edit';
import { Box, darken, Grid, lighten, Theme, Tooltip, Typography } from '@mui/material';
import { makeStyles } from '@mui/styles';
import React, { useCallback, useState } from 'react';

import { User } from '../../../bitbucket/model';
import { MarkdownEditor } from '../common/editor/MarkdownEditor';

const useStyles = makeStyles(
    (theme: Theme) =>
        ({
            container: {
                borderWidth: 1,
                borderRadius: 4,
                borderStyle: 'solid',
                borderColor: 'transparent',
                '&:hover': {
                    borderColor: 'initial',
                },
            },
            editbutton: {
                cursor: 'pointer',
                height: '100%',
                display: 'flex',
                'align-items': 'center',
                'background-color':
                    theme.palette.mode === 'dark'
                        ? lighten(theme.palette.background.default, 0.15)
                        : darken(theme.palette.background.default, 0.15),
            },
        }) as const,
);

type InlineTextEditorProps = {
    rawContent: string;
    htmlContent: string;
    onSave?: (value: string) => void;
    fetchUsers?: (input: string) => Promise<User[]>;
};

const InlineRenderedTextEditor: React.FC<InlineTextEditorProps> = (props: InlineTextEditorProps) => {
    const classes = useStyles();
    const [editMode, setEditMode] = useState(false);
    const [showEditButton, setShowEditButton] = useState(false);

    const enterEditMode = useCallback(() => setEditMode(true), []);
    const exitEditMode = useCallback(() => setEditMode(false), []);

    const handleFocusIn = useCallback(() => setShowEditButton(true), []);
    const handleFocusOut = useCallback(() => setShowEditButton(false), []);

    const handleSave = useCallback(
        async (value: string) => {
            props.onSave?.(value);
            exitEditMode();
        },
        [exitEditMode, props.onSave], // eslint-disable-line react-hooks/exhaustive-deps
    );

    return editMode ? (
        <MarkdownEditor
            initialContent={props.rawContent}
            onSave={handleSave}
            onCancel={exitEditMode}
            fetchUsers={props.fetchUsers}
        />
    ) : (
        <Grid
            container
            spacing={1}
            direction="row"
            className={classes.container}
            onMouseEnter={handleFocusIn}
            onMouseLeave={handleFocusOut}
        >
            <Grid item xs>
                {/* eslint-disable-next-line react-dom/no-dangerously-set-innerhtml -- TODO check if needed */}
                <Typography variant="body1" dangerouslySetInnerHTML={{ __html: props.htmlContent }} />
            </Grid>
            <Grid item>
                <Box
                    className={classes.editbutton}
                    onClick={enterEditMode}
                    visibility={showEditButton === true && props.onSave !== undefined ? 'visible' : 'hidden'}
                >
                    <Tooltip title="Click to edit">
                        <EditIcon />
                    </Tooltip>
                </Box>
            </Grid>
        </Grid>
    );
};

export default InlineRenderedTextEditor;
