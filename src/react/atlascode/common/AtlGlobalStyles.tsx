import { darken, lighten, makeStyles, Theme } from '@material-ui/core';
import React, { useContext } from 'react';
import { VSCodeStyles, VSCodeStylesContext } from '../../vscode/theme/styles';

const useStyles = makeStyles(
    (theme: Theme) =>
        ({
            '@global': {
                // Using Atlassian specific tokens
                '.vscode-dark': {
                    '--ds-icon-success': '#2ABB7F',
                    '--ds-icon-warning': '#F5CD47',
                    '--ds-skeleton': '#CECED912',
                    '--ds-skeleton-subtle': '#BDBDBD0A',
                },
                '.vscode-light': {
                    '--ds-icon-success': '#22A06B',
                    '--ds-icon-warning': '#E56910',
                    '--ds-skeleton': '#0515240F',
                    '--ds-skeleton-subtle': '#17171708',
                },
                ':root': {
                    /* Spacing tokens: Using Atlassian defaults */
                    '--ds-space-0': '0rem',
                    '--ds-space-025': '0.125rem',
                    '--ds-space-050': '0.25rem',
                    '--ds-space-075': '0.375rem',
                    '--ds-space-100': '0.5rem',
                    '--ds-space-150': '0.75rem',
                    '--ds-space-200': '1rem',
                    '--ds-space-250': '1.25rem',
                    '--ds-space-300': '1.5rem',
                    '--ds-space-400': '2rem',
                    '--ds-space-500': '2.5rem',
                    '--ds-space-600': '3rem',
                    '--ds-space-800': '4rem',
                    '--ds-space-1000': '5rem',
                    '--ds-space-negative-025': '-0.125rem',
                    '--ds-space-negative-050': '-0.25rem',
                    '--ds-space-negative-075': '-0.375rem',
                    '--ds-space-negative-100': '-0.5rem',
                    '--ds-space-negative-150': '-0.75rem',
                    '--ds-space-negative-200': '-1rem',
                    '--ds-space-negative-250': '-1.25rem',
                    '--ds-space-negative-300': '-1.5rem',
                    '--ds-space-negative-400': '-2rem',
                    /* Color Tokens: Text: Mapping to VSCode Tokens */
                    '--ds-text-inverse': 'var(--vscode-button-foreground)',
                    '--ds-text': 'var(--vscode-foreground)',
                    '--ds-text-input': 'var(--vscode-input-foreground)',
                    '--ds-text-selected': 'var(--vscode-list-activeSelectionForeground)',
                    /* Color Tokens: Borders: Mapping to VSCode Tokens */
                    '--ds-border': 'var(--vscode-input-border)',
                    '--ds-border-disabled': 'var(--vscode-radio-inactiveBorder)',
                    '--ds-border-focused': 'var(--vscode-inputOption-activeBorder)',
                    '--ds-border-input': 'var(--vscode-input-border)',
                    '--ds-border-inverse': 'var(--vscode-input-border)',
                    '--ds-border-selected': 'var(--vscode-inputOption-activeBorder)',
                    '--ds-border-danger': 'var(--vscode-inputValidation-errorBorder)',
                    '--ds-border-warning': 'var(--vscode-inputValidation-warningBorder)',
                    '--ds-border-success': 'var(--vscode-inputValidation-infoBorder)',
                    '--ds-border-discovery': 'var(--vscode-inputValidation-infoBorder)',
                    '--ds-border-information': 'var(--vscode-inputValidation-infoBorder)',
                    '--ds-border-bold': 'var(--vscode-input-border)',
                    /* Color Tokens: Backgrounds: Mapping to VSCode Tokens */
                    '--ds-background-brand-bold': 'var(--vscode-button-background)',
                    '--ds-background-input': 'var(--vscode-input-background)',
                    '--ds-background-input-hovered': 'var(--vscode-inputOption-hoverBackground)',
                    '--ds-background-input-pressed': 'var(--vscode-input-background)',
                    '--ds-background-selected': 'var(--vscode-list-activeSelectionBackground)',
                    '--ds-background-neutral': 'var(--vscode-input-background)',
                    '--ds-background-neutral-hovered': 'var(--vscode-inputOption-hoverBackground)',
                    '--ds-background-neutral-pressed': 'var(--vscode-inputOption-activeBackground)',
                    '--ds-background-neutral-subtle': 'var(--vscode-input-background)',
                    '--ds-background-neutral-subtle-hovered': 'var(--vscode-inputOption-hoverBackground)',
                    '--ds-background-neutral-subtle-pressed': 'var(--vscode-inputOption-activeBackground)',
                    /* Color Tokens: Overlays: Mapping to VSCode Tokens */
                    '--ds-surface-overlay': 'var(--vscode-menu-background)',
                    '--ds-surface-overlay-hovered': 'var(--vscode-menu-selectionBackground)',
                    /* Shape tokens: Using Atlassian defaults */
                    '--ds-border-radius-050': '0.125rem',
                    '--ds-border-radius': '0.25rem',
                    '--ds-border-radius-100': '0.25rem',
                    '--ds-border-radius-200': '0.5rem',
                    '--ds-border-radius-300': '0.75rem',
                    '--ds-border-radius-400': '1rem',
                    '--ds-border-radius-circle': '2002rem',
                    '--ds-border-width': '0.0625rem',
                    '--ds-border-width-0': '0rem',
                    '--ds-border-width-indicator': '0.1875rem',
                    '--ds-border-width-outline': '0.125rem',
                },
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
                },
                'img.emoji': {
                    'max-height': '1.5em',
                    'vertical-align': 'middle',
                },
                '.ap-mention': {
                    'background-color':
                        theme.palette.type === 'dark'
                            ? lighten(theme.palette.background.default, 0.15)
                            : darken(theme.palette.background.default, 0.15),
                },
                '.user-mention': {
                    'background-color':
                        theme.palette.type === 'dark'
                            ? lighten(theme.palette.background.default, 0.15)
                            : darken(theme.palette.background.default, 0.15),
                },
                '.ProseMirror': {
                    position: 'relative',
                    wordWrap: 'break-word',
                    whiteSpace: 'pre-wrap',
                    WebkitFontVariantLigatures: 'none',
                    fontVariantLigatures: 'none',
                    padding: '4px 8px 4px 14px',
                    lineHeight: '1.2',
                    outline: 'none',
                },
                '.ProseMirror pre': { whiteSpace: 'pre-wrap' },
                '.ProseMirror li': { position: 'relative' },
                '.ProseMirror-hideselection *::selection': { background: 'transparent' },
                '.ProseMirror-hideselection *::-moz-selection': { background: 'transparent' },
                '.ProseMirror-hideselection': { caretColor: 'transparent' },
                '.ProseMirror-selectednode': { outline: '2px solid #8cf' },
                'li.ProseMirror-selectednode': { outline: 'none' },
                'li.ProseMirror-selectednode:after': {
                    content: '""',
                    position: 'absolute',
                    left: '-32px',
                    right: '-2px',
                    top: '-2px',
                    bottom: '-2px',
                    border: '2px solid #8cf',
                    pointerEvents: 'none',
                },
                '.ProseMirror-textblock-dropdown': { minWidth: '3em' },
                '.ProseMirror-menu': { margin: '0 -4px', lineHeight: '1' },
                '.ProseMirror-tooltip .ProseMirror-menu': {
                    width: ['-webkit-fit-content', 'fit-content'],
                    whiteSpace: 'pre',
                },
                '.ProseMirror-menuitem': { marginRight: '3px', display: 'inline-block' },
                '.ProseMirror-menuseparator': {
                    borderRight: '1px solid #ddd',
                    marginRight: '3px',
                },
                '.ProseMirror-menu-dropdown, .ProseMirror-menu-dropdown-menu': {
                    fontSize: '90%',
                    whiteSpace: 'nowrap',
                },
                '.ProseMirror-menu-dropdown': {
                    verticalAlign: '1px',
                    cursor: 'pointer',
                    position: 'relative',
                    paddingRight: '15px',
                },
                '.ProseMirror-menu-dropdown-wrap': {
                    padding: '1px 0 1px 4px',
                    display: 'inline-block',
                    position: 'relative',
                },
                '.ProseMirror-menu-dropdown:after': {
                    content: '""',
                    borderLeft: '4px solid transparent',
                    borderRight: '4px solid transparent',
                    borderTop: '4px solid currentColor',
                    opacity: '.6',
                    position: 'absolute',
                    right: '4px',
                    top: 'calc(50% - 2px)',
                },
                '.ProseMirror-menu-dropdown-menu, .ProseMirror-menu-submenu': {
                    position: 'absolute',
                    background: 'white',
                    color: '#666',
                    border: '1px solid #aaa',
                    padding: '2px',
                },
                '.ProseMirror-menu-dropdown-menu': { zIndex: '15', minWidth: '6em' },
                '.ProseMirror-menu-dropdown-item': {
                    cursor: 'pointer',
                    padding: '2px 8px 2px 4px',
                },
                '.ProseMirror-menu-dropdown-item:hover': { background: '#f2f2f2' },
                '.ProseMirror-menu-submenu-wrap': {
                    position: 'relative',
                    marginRight: '-4px',
                },
                '.ProseMirror-menu-submenu-label:after': {
                    content: '""',
                    borderTop: '4px solid transparent',
                    borderBottom: '4px solid transparent',
                    borderLeft: '4px solid currentColor',
                    opacity: '.6',
                    position: 'absolute',
                    right: '4px',
                    top: 'calc(50% - 4px)',
                },
                '.ProseMirror-menu-submenu': {
                    display: 'none',
                    minWidth: '4em',
                    left: '100%',
                    top: '-3px',
                },
                '.ProseMirror-menu-active': { background: '#eee', borderRadius: '4px' },
                '.ProseMirror-menu-disabled': { opacity: '.3' },
                '.ProseMirror-menu-submenu-wrap:hover .ProseMirror-menu-submenu, .ProseMirror-menu-submenu-wrap-active .ProseMirror-menu-submenu':
                    {
                        display: 'block',
                    },
                '.ProseMirror-menubar': {
                    borderTopLeftRadius: 'inherit',
                    borderTopRightRadius: 'inherit',
                    position: 'relative',
                    minHeight: '1em',
                    //color: '#666',
                    padding: '1px 6px',
                    top: '0',
                    left: '0',
                    right: '0',
                    borderBottom: '1px solid silver',
                    //background: 'white',
                    zIndex: '10',
                    boxSizing: 'border-box',
                    overflow: 'visible',
                },
                '.ProseMirror-icon': {
                    display: 'inline-block',
                    lineHeight: '.8',
                    verticalAlign: '-2px',
                    padding: '2px 8px',
                    cursor: 'pointer',
                },
                '.ProseMirror-menu-disabled.ProseMirror-icon': { cursor: 'default' },
                '.ProseMirror-icon svg': { fill: 'currentColor', height: '1em' },
                '.ProseMirror-icon span': { verticalAlign: 'text-top' },
                '.ProseMirror-gapcursor': {
                    display: 'none',
                    pointerEvents: 'none',
                    position: 'absolute',
                },
                '.ProseMirror-gapcursor:after': {
                    content: '""',
                    display: 'block',
                    position: 'absolute',
                    top: '-2px',
                    width: '20px',
                    borderTop: '1px solid black',
                    animation: 'ProseMirror-cursor-blink 1.1s steps(2, start) infinite',
                },
                '@keyframes ProseMirror-cursor-blink': { to: { visibility: 'hidden' } },
                '.ProseMirror-focused .ProseMirror-gapcursor': { display: 'block' },
                '.ProseMirror-example-setup-style hr': {
                    padding: '2px 10px',
                    border: 'none',
                    margin: '1em 0',
                },
                '.ProseMirror-example-setup-style hr:after': {
                    content: '""',
                    display: 'block',
                    height: '1px',
                    backgroundColor: 'silver',
                    lineHeight: '2px',
                },
                '.ProseMirror ul, .ProseMirror ol': { paddingLeft: '30px' },
                '.ProseMirror blockquote': {
                    paddingLeft: '1em',
                    borderLeft: '3px solid #eee',
                    marginLeft: '0',
                    marginRight: '0',
                },
                '.ProseMirror-example-setup-style img': { cursor: 'default' },
                '.ProseMirror-prompt': {
                    background: 'white',
                    padding: '5px 10px 5px 15px',
                    border: '1px solid silver',
                    position: 'fixed',
                    borderRadius: '3px',
                    zIndex: '11',
                    boxShadow: '-.5px 2px 5px rgba(0, 0, 0, .2)',
                },
                '.ProseMirror-prompt h5': {
                    margin: '0',
                    fontWeight: 'normal',
                    fontSize: '100%',
                    color: '#444',
                },
                '.ProseMirror-prompt input[type="text"],.ProseMirror-prompt textarea': {
                    background: '#eee',
                    border: 'none',
                    outline: 'none',
                },
                '.ProseMirror-prompt input[type="text"]': { padding: '0 4px' },
                '.ProseMirror-prompt-close': {
                    position: 'absolute',
                    left: '2px',
                    top: '1px',
                    color: '#666',
                    border: 'none',
                    background: 'transparent',
                    padding: '0',
                },
                '.ProseMirror-prompt-close:after': { content: '"âœ•"', fontSize: '12px' },
                '.ProseMirror-invalid': {
                    background: '#ffc',
                    border: '1px solid #cc7',
                    borderRadius: '4px',
                    padding: '5px 10px',
                    position: 'absolute',
                    minWidth: '10em',
                },
                '.ProseMirror-prompt-buttons': { marginTop: '5px', display: 'none' },
                '.ProseMirror p:first-child,.ProseMirror h1:first-child,.ProseMirror h2:first-child,.ProseMirror h3:first-child,.ProseMirror h4:first-child,.ProseMirror h5:first-child,.ProseMirror h6:first-child':
                    {
                        marginTop: '10px',
                    },
                '.ProseMirror p': { marginBottom: '1em' },
                '.suggestion-item-active': { background: '#08c', color: '#fff' },
                '.prosemirror-mention-node': {
                    'background-color':
                        theme.palette.type === 'dark'
                            ? lighten(theme.palette.background.default, 0.15)
                            : darken(theme.palette.background.default, 0.15),
                },
                '.prosemirror-tag-node': { color: '#08c' },
                '.prosemirror-suggestion': {
                    background: 'rgba(0, 0, 0, 0.05)',
                    border: '1px solid #999',
                },
                '.suggestion-item-list': { background: '#fff', border: '1px solid #999' },
                '.suggestion-item': { padding: '5px' },
                '.suggestion-item:before': { borderTop: '1px solid' },
            },
        }) as const,
);

const AtlGlobalStyles: React.FC = () => {
    const vscStyles = useContext(VSCodeStylesContext);
    useStyles(vscStyles);
    return <></>;
};

export default AtlGlobalStyles;
