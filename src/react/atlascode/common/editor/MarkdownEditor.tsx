import { ToggleWithLabel } from '@atlassianlabs/guipi-core-components';
import { Box, Button, CircularProgress, Grid, makeStyles, Switch, TextField, Theme, useTheme } from '@material-ui/core';
import { baseKeymap } from 'prosemirror-commands';
import { dropCursor } from 'prosemirror-dropcursor';
import { buildKeymap, buildMenuItems } from 'prosemirror-example-setup';
import { gapCursor } from 'prosemirror-gapcursor';
import { history } from 'prosemirror-history';
import { InputRule, inputRules, textblockTypeInputRule, wrappingInputRule } from 'prosemirror-inputrules';
import { keymap } from 'prosemirror-keymap';
import {
    defaultMarkdownParser,
    defaultMarkdownSerializer,
    MarkdownParser,
    MarkdownSerializer,
    schema as markdownSchema,
} from 'prosemirror-markdown';
import { addMentionNodes, getMentionsPlugin } from 'prosemirror-mentions';
import { menuBar } from 'prosemirror-menu';
import { Schema } from 'prosemirror-model';
import { EditorState, Plugin, PluginKey } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { User } from '../../../../bitbucket/model';
import * as l10n from '@vscode/l10n';

function markInputRule(regexp: RegExp, markType: any, getAttrs: any) {
    return new InputRule(regexp, (state: EditorState, match: string[], start: number, end: number) => {
        const attrs = getAttrs instanceof Function ? getAttrs(match) : getAttrs;
        const tr = state.tr;
        const completeMatch = match[0];
        const prefix = match.length > 2 ? match[1] : '';
        const text = match.length > 2 ? match[2] : match[1];
        if (text) {
            const textStart = start + completeMatch.indexOf(text);
            const textEnd = textStart + text.length;
            if (textEnd < end) {
                tr.delete(textEnd, end);
            }
            if (textStart > start) {
                tr.delete(start + prefix.length, textStart);
            }
            end = start + prefix.length + text.length;
        }

        tr.addMark(start + prefix.length, end, markType.create(attrs));
        tr.removeStoredMark(markType); // Do not continue with mark.
        return tr;
    });
}

const buildInputRules = (schema: any) => {
    const rules = [];

    if (schema.marks.strong) {
        rules.push(markInputRule(/(?:\*\*)([^\*_]+)(?:\*\*|__)$/, schema.marks.strong, undefined));
        rules.push(markInputRule(/(?:__)([^_]+)(?:__)$/, schema.marks.strong, undefined));
    }
    if (schema.marks.em) {
        rules.push(markInputRule(/(^|[^\*])(?:\*)([^\*]+)(?:\*)$/, schema.marks.em, undefined));
        rules.push(markInputRule(/(^|[^_])(?:_)([^_]+)(?:_)$/, schema.marks.em, undefined));
    }
    if (schema.marks.link) {
        rules.push(
            markInputRule(/(^|[^!])\[(.*?)\]\((\S+)\)$/, schema.marks.link, (match: string[]) => ({ href: match[3] })),
        );
    }
    rules.push(
        wrappingInputRule(/^\s*>\s$/, schema.nodes.blockquote),
        wrappingInputRule(
            /^(\d+)\.\s$/,
            schema.nodes.ordered_list,
            (match: string[]) => ({ order: +match[1] }),
            (match: string[], node: any) => node.childCount + node.attrs.order === +match[1],
        ),
        wrappingInputRule(/^\s*([-+*])\s$/, schema.nodes.bullet_list),
        textblockTypeInputRule(/^```$/, schema.nodes.code_block),
        textblockTypeInputRule(new RegExp('^(#{1,6})\\s$'), schema.nodes.heading, (match: string[]) => ({
            level: match[1].length,
        })),
    );
    return rules;
};

var schema = new Schema({
    nodes: addMentionNodes(markdownSchema.spec.nodes),
    marks: markdownSchema.spec.marks,
});

// https://github.com/ProseMirror/prosemirror-markdown/blob/master/src/to_markdown.js
const mdSerializer = new MarkdownSerializer(
    {
        ...defaultMarkdownSerializer.nodes,
        mention: (state: any, node: any) => {
            state.write(node.attrs.id);
        },
    },
    defaultMarkdownSerializer.marks,
);

const mdParser = new MarkdownParser(schema, defaultMarkdownParser.tokenizer, {
    ...defaultMarkdownParser.tokens,
    // mention node can be added here - mention: { node: 'mention' },
});

/**
 * IMPORTANT: outer div's "suggestion-item-list" class is mandatory. The plugin uses this class for querying.
 * IMPORTANT: inner div's "suggestion-item" class is mandatory too for the same reasons
 */
var getMentionSuggestionsHTML = (items: any[]) =>
    '<div class="suggestion-item-list">' +
    items.map((i) => '<div class="suggestion-item">' + i.name + '</div>').join('') +
    '</div>';

const reactPropsKey = new PluginKey('reactProps');

function reactProps(initialProps: any) {
    return new Plugin({
        key: reactPropsKey,
        state: {
            init: () => initialProps,
            apply: (tr, prev) => tr.getMeta(reactPropsKey) || prev,
        },
    });
}

// https://github.com/mui-org/material-ui/blob/master/packages/material-ui/src/OutlinedInput/OutlinedInput.js
const useStyles = makeStyles(
    (theme: Theme) =>
        ({
            editor: {
                borderWidth: 1,
                borderStyle: 'solid',
                borderColor: theme.palette.type === 'light' ? 'rgba(0, 0, 0, 0.23)' : 'rgba(255, 255, 255, 0.23)',
                borderRadius: theme.shape.borderRadius,
                '&:hover': {
                    borderColor: theme.palette.text.primary,
                },
                '&:focus-within': {
                    borderColor: theme.palette.primary.main,
                    borderWidth: 2,
                },
            },
        }) as const,
);

interface PropsType {
    initialContent?: string;
    onSave: (text: string, abortSignal?: AbortSignal) => Promise<void>;
    onCancel?: () => void;
    fetchUsers?: (input: string) => Promise<User[]>;
}

export const MarkdownEditor: React.FC<PropsType> = (props: PropsType) => {
    const theme = useTheme();
    const classes = useStyles();

    const viewHost = useRef<HTMLDivElement>(null);
    const view = useRef<EditorView | null>(null);
    const [enableRichTextEditor, setEnableRichTextEditor] = useState(true);
    const [content, setContent] = useState(props.initialContent || '');
    const [submitState, setSubmitState] = useState<'initial' | 'submitting'>('initial');

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setEnableRichTextEditor(e.target.checked);
    }, []);

    const handlePlainTextChange = useCallback(
        (event: React.ChangeEvent<{ name?: string | undefined; value: string }>) => setContent(event.target.value),
        [],
    );

    const clearEditor = useCallback(() => {
        if (enableRichTextEditor) {
            const slice = view.current?.state.doc.slice(0);
            const tr = view.current!.state.tr.delete(0, slice?.size || 0);
            view.current?.dispatch(tr);
        } else {
            setContent('');
        }
        props.onCancel?.();
    }, [enableRichTextEditor, props.onCancel]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleSave = useCallback(async () => {
        const mdContent: string = enableRichTextEditor ? mdSerializer.serialize(view.current!.state.doc) : content;
        if (mdContent.trim().length > 0) {
            try {
                setSubmitState('submitting');
                await props.onSave(mdContent);
                clearEditor();
            } finally {
                setSubmitState('initial');
            }
        }
    }, [props, clearEditor, content, enableRichTextEditor]);

    useEffect(() => {
        if (!view.current) {
            return;
        }
        if (enableRichTextEditor) {
            const slice = view.current.state.doc.slice(0);
            const tr = view.current.state.tr.replaceWith(0, slice?.size || 0, mdParser.parse(content));
            view.current.dispatch(tr);
        } else {
            setContent(mdSerializer.serialize(view.current.state.doc));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enableRichTextEditor]);

    useEffect(() => {
        // initial render
        const menuItems = buildMenuItems(schema);
        const plugins = [
            reactProps(props),
            keymap(buildKeymap(schema)),
            keymap(baseKeymap),
            dropCursor(),
            gapCursor(),
            menuBar({
                floating: false,
                content: [
                    [menuItems.toggleStrong, menuItems.toggleEm, menuItems.toggleCode],
                    [menuItems.wrapBulletList, menuItems.wrapOrderedList, menuItems.wrapBlockQuote],
                ],
            }),
            history(),
            inputRules({ rules: buildInputRules(schema) }),
        ];

        if (props.fetchUsers) {
            plugins.unshift(
                // https://github.com/joelewis/prosemirror-mentions
                getMentionsPlugin({
                    getSuggestions: async (type: any, text: string, done: any) => {
                        if (type === 'mention') {
                            const users = await props.fetchUsers!(text);
                            done(
                                users.map((u) => ({
                                    name: u.displayName,
                                    id: u.mention,
                                    email: u.emailAddress || '',
                                })),
                            );
                        }
                    },
                    getSuggestionsHTML: (items: any[], type: any) => {
                        if (type === 'mention') {
                            return getMentionSuggestionsHTML(items);
                        } else {
                            return <></>;
                        }
                    },
                }),
            );
        }

        const state = EditorState.create({
            schema,
            doc: mdParser.parse(content),
            plugins: plugins,
        });
        const currView = new EditorView(viewHost.current!, { state });
        view.current = currView;
        return () => currView.destroy();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        // every render
        if (view.current) {
            const tr = view.current.state.tr.setMeta(reactPropsKey, props);
            view.current.dispatch(tr);
        }
    });

    return (
        <Grid container spacing={1} direction="column">
            <Grid item>
                {/* https://github.com/mui-org/material-ui/issues/17010 */}
                <Box
                    hidden={!enableRichTextEditor}
                    minHeight="8em"
                    className={classes.editor}
                    {...({ ref: viewHost } as any)}
                />
                <Box hidden={enableRichTextEditor} minHeight="8em">
                    <TextField
                        multiline
                        fullWidth
                        rows={4}
                        rowsMax={20}
                        value={content}
                        onChange={handlePlainTextChange}
                    />
                </Box>
            </Grid>
            <Grid item>
                <Grid container spacing={1}>
                    <Grid item>
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={handleSave}
                            disabled={submitState === 'submitting'}
                            endIcon={
                                submitState === 'submitting' ? (
                                    <CircularProgress color="inherit" size={theme.typography.fontSize} />
                                ) : null
                            }
                        >
                            {l10n.t('Save')}
                        </Button>
                    </Grid>
                    <Grid item>
                        <Button variant="contained" onClick={clearEditor}>
                            {l10n.t('Cancel')}
                        </Button>
                    </Grid>
                    <Grid item xs />
                    <Grid item>
                        <ToggleWithLabel
                            label="Rich text editor"
                            control={
                                <Switch
                                    size="small"
                                    color="primary"
                                    checked={enableRichTextEditor}
                                    onChange={handleChange}
                                />
                            }
                            spacing={1}
                            variant="body2"
                        />
                    </Grid>
                </Grid>
            </Grid>
        </Grid>
    );
};
