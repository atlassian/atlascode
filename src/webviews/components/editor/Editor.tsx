import { debounce } from 'lodash';
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
import { liftItem, menuBar } from 'prosemirror-menu';
import { MarkType, Schema } from 'prosemirror-model';
import { EditorState, Plugin, PluginKey } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import React, { useCallback, useEffect, useRef, useState } from 'react';

function markInputRule(regexp: RegExp, markType: MarkType, getAttrs: any): typeof InputRule {
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

const buildInputRules = (schema: Schema) => {
    const rules: (typeof InputRule)[] = [];

    if (schema.marks.strong) {
        rules.push(markInputRule(/(?:\*)([^\*_]+)(?:\*)$/, schema.marks.strong, undefined));
    }
    if (schema.marks.em) {
        rules.push(markInputRule(/(^|[^_])(?:_)([^_]+)(?:_)$/, schema.marks.em, undefined));
    }
    if (schema.marks.code) {
        rules.push(markInputRule(/(^|[^`])(?:`)([^`]+)(?:`)$/, schema.marks.code, undefined));
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

const schema = new Schema({
    nodes: addMentionNodes(markdownSchema.spec.nodes),
    marks: markdownSchema.spec.marks,
});

// This is to find all mentions in the text node of the editor to be able to remove escape characters
function findAllMentions(str: string) {
    return str.match(/\[~[a-zA-Z0-9:-]+\]/g);
}

// https://github.com/ProseMirror/prosemirror-markdown/blob/master/src/to_markdown.js
const mdSerializer = new MarkdownSerializer(
    {
        ...defaultMarkdownSerializer.nodes,
        mention: (state: any, node: any) => {
            state.write(node.attrs.id);
        },
        text: (state: any, node: any) => {
            // Remove escape characters for jira mentions
            const matches = findAllMentions(node.text);
            let text: string = node.text!;
            if (matches && matches.length > 0) {
                for (const match of matches) {
                    const index = text.indexOf(match);
                    const before = text.slice(0, index);
                    const after = text.slice(index + match.length);

                    state.text(before, !state.isAutolink);
                    state.write(match);
                    text = after;
                }
            }

            state.text(text, !state.isAutolink);
        },
    },

    {
        ...defaultMarkdownSerializer.marks,
        em: { open: '_', close: '_', mixable: true, expelEnclosingWhitespace: true },
        strong: { open: '*', close: '*', mixable: true, expelEnclosingWhitespace: true },
    },
);

const mdParser = new MarkdownParser(schema, defaultMarkdownParser.tokenizer, {
    ...defaultMarkdownParser.tokens,
    mention: {
        node: 'mention',
    },
});

/**
 * IMPORTANT: outer div's "suggestion-item-list" class is mandatory. The plugin uses this class for querying.
 * IMPORTANT: inner div's "suggestion-item" class is mandatory too for the same reasons
 */
const getMentionSuggestionsHTML = (items: any[]) =>
    '<div class="suggestion-item-list">' +
    items.map((i) => `<div class="suggestion-item">${i.name}</div>`).join('') +
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

interface UserType {
    displayName: string;
    mention: string;
    emailAddress?: string;
    avatarUrl?: string;
}

export function useEditor<T extends UserType>(props: {
    value: string;
    enabled: boolean;
    onSave?: (input: string) => void;
    onChange: (input: string) => void;
    fetchUsers?: (input: string) => Promise<T[]>;
}) {
    const viewHost = useRef<HTMLDivElement>(null);
    const view = useRef<EditorView | null>(null);
    const [content, setContent] = useState(props.value || '');

    // Prevents unnecessary calls to fetchUsers
    const debouncedFetch = props.fetchUsers && debounce(props.fetchUsers, 1500, { leading: true, maxWait: 1 });

    const handleSave = useCallback(() => {
        if (!props.onSave || !view.current) {
            return;
        }

        const mdContent: string = props.enabled ? mdSerializer.serialize(view.current.state.doc) : content;

        if (mdContent.trim().length > 0) {
            props.onSave(mdContent);
        }
    }, [props, content, view]);

    // Update content when the editor is toggled
    useEffect(() => {
        if (!view.current) {
            return;
        }
        if (props.enabled) {
            view.current.state.doc = mdParser.parse(content);
            const slice = view.current.state.doc.slice(0);
            const tr = view.current.state.tr.replaceWith(0, slice?.size || 0, mdParser.parse(content));
            view.current.dispatch(tr);
        } else {
            setContent(mdSerializer.serialize(view.current.state.doc));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [props.enabled]);

    // Initialize editor
    useEffect(() => {
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
                    [menuItems.wrapBulletList, menuItems.wrapOrderedList, menuItems.wrapBlockQuote, liftItem],
                ],
            }),
            history(),
            inputRules({ rules: buildInputRules(schema) }),
        ];

        if (debouncedFetch) {
            plugins.unshift(
                // https://github.com/joelewis/prosemirror-mentions
                getMentionsPlugin({
                    getSuggestions: async (type: any, text: string, done: any) => {
                        if (type === 'mention') {
                            const users = await debouncedFetch(text);

                            const formattedUsers = users
                                ? users.map((u) => ({
                                      name: u.displayName,
                                      id: u.mention,
                                      avatarUrl: u.avatarUrl || '',
                                      email: u.emailAddress || '',
                                  }))
                                : [];

                            done(formattedUsers);
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

        const currView = new EditorView(viewHost.current!, {
            state,
            dispatchTransaction(tr) {
                const state = currView.state.apply(tr);
                currView.updateState(state);

                if (tr.docChanged) {
                    const mdContent: string = props.enabled ? mdSerializer.serialize(state.doc) : content;
                    setContent(mdContent);
                    props.onChange(mdContent);
                }
            },
        });

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

    return { viewHost, handleSave };
}
