import { darken, lighten, Theme } from '@mui/material';
import { makeStyles } from '@mui/styles';
import React, { useContext } from 'react';

import { VSCodeStyles, VSCodeStylesContext } from '../../vscode/theme/styles';

const useStyles = makeStyles(
    (theme: Theme) =>
        ({
            '@global': {
                p: {
                    margin: 0,
                },
                pre: (props: VSCodeStyles) => ({
                    'overflow-x': 'auto',
                    background: props.textCodeBlockBackground,
                }),
                code: {
                    display: 'inline-block',
                    'overflow-x': 'auto',
                    'vertical-align': 'middle',
                    color: 'var(--vscode-editor-foreground) !important',
                },
                'pre code': {
                    background: 'var(--vscode-editor-background) !important', // Ensure code blocks have the correct background
                    'border-radius': '4px',
                    border: '1px solid var(--vscode-editorWidget-border)',
                    width: '100%',
                    'font-size': 'var(--vscode-editor-font-size) !important', // Ensure code blocks have the correct font size
                    'font-family': 'var(--vscode-editor-font-family) !important', // Ensure code blocks have the correct font family
                },
                'img.emoji': {
                    'max-height': '1.5em',
                    'vertical-align': 'middle',
                },
                '.ap-mention': {
                    'background-color':
                        theme.palette.mode === 'dark'
                            ? lighten(theme.palette.background.default, 0.15)
                            : darken(theme.palette.background.default, 0.15),
                },
                '.user-mention': {
                    'background-color':
                        theme.palette.mode === 'dark'
                            ? lighten(theme.palette.background.default, 0.15)
                            : darken(theme.palette.background.default, 0.15),
                },
                // fix vertical alignment of headings in dropdown for formatting text (atlaskit editor)
                '.akEditor span[role="menuitem"] :is(h1, h2, h3, h4, h5, h6)': {
                    'margin-block-end': 0,
                    'font-weight': 'var(--ds-font-weight-medium, 500)',
                },
                // hide assistive element in atlaskit editor toolbar
                '.akEditor .assistive': {
                    border: '0 !important',
                    clip: 'rect(1px, 1px, 1px, 1px) !important',
                    height: '1px !important',
                    overflow: 'hidden !important',
                    padding: '0 !important',
                    position: 'absolute !important',
                    width: '1px !important',
                    'white-space': 'nowrap !important',
                },
            },
        }) as const,
);

const AtlGlobalStyles: React.FC = () => {
    const vscStyles = useContext(VSCodeStylesContext);
    useStyles(vscStyles);
    return <></>;
};

export default AtlGlobalStyles;
